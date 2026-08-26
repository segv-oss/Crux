import { pool } from '../../config/db.js';
import { redisClient } from '../../config/redis.js';
import { signToken, JwtPayload } from '../../middleware/auth.js';
import { UserSession } from '../../types/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { config } from '../../config/env.js';
import { createLogger } from '../../middleware/logger.js';
import crypto from 'crypto';

const logger = createLogger('auth-service');

interface GitHubOAuthUser {
  id: number | string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export async function exchangeGitHubCode(code: string) {
  let githubUser: GitHubOAuthUser;

  // Real OAuth exchange if credentials are configured
  if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
    try {
      // 1. Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.error || !tokenData.access_token) {
        throw new AppError({
          status: 401,
          code: 'OAUTH_EXCHANGE_FAILED',
          message: tokenData.error_description || 'GitHub OAuth token exchange failed.',
        });
      }

      // 2. Fetch authenticated GitHub user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Crux-App',
        },
      });

      if (!userRes.ok) {
        throw new AppError({
          status: 401,
          code: 'GITHUB_PROFILE_FETCH_FAILED',
          message: `Failed to fetch user profile from GitHub API: status ${userRes.status}`,
        });
      }

      const rawUser = (await userRes.json()) as any;
      let email = rawUser.email;

      // 3. Fallback to /user/emails if primary email is private
      if (!email) {
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'Crux-App',
            },
          });
          if (emailsRes.ok) {
            const emails = (await emailsRes.json()) as any[];
            const primary = emails.find((e) => e.primary && e.verified) || emails[0];
            if (primary) email = primary.email;
          }
        } catch {
          logger.warn('Could not fetch user/emails fallback');
        }
      }

      githubUser = {
        id: rawUser.id,
        login: rawUser.login,
        name: rawUser.name || rawUser.login,
        email: email || `${rawUser.login}@users.noreply.github.com`,
        avatar_url: rawUser.avatar_url || '',
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError({
        status: 502,
        code: 'GITHUB_API_ERROR',
        message: 'Network or protocol error communicating with GitHub OAuth service.',
      });
    }
  } else {
    // In production, missing credentials must fail secure
    if (config.NODE_ENV === 'production') {
      throw new AppError({
        status: 500,
        code: 'AUTH_CONFIGURATION_ERROR',
        message: 'Production OAuth credentials missing. GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.',
      });
    }

    // Deterministic mock payload for development/test
    const mockHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);
    githubUser = {
      id: parseInt(mockHash, 16) % 1000000,
      login: `dev_user_${mockHash}`,
      name: `Developer ${mockHash}`,
      email: `dev_${mockHash}@crux.dev`,
      avatar_url: `https://avatars.githubusercontent.com/u/${mockHash}?v=4`,
    };
  }

  // Upsert user in PostgreSQL
  const userResult = await pool.query(
    `INSERT INTO users (github_id, email, name, avatar_url, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (github_id) DO UPDATE
     SET email = EXCLUDED.email,
         name = EXCLUDED.name,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = CURRENT_TIMESTAMP
     RETURNING id, github_id, email, name, avatar_url, created_at, updated_at`,
    [githubUser.id.toString(), githubUser.email, githubUser.name, githubUser.avatar_url]
  );

  const dbUser = userResult.rows[0];

  const jwtPayload: JwtPayload = {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatar_url,
  };

  // Fetch or ensure organization membership
  const orgsRes = await pool.query(
    `SELECT o.id, o.name, o.slug, om.role
     FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = $1 AND o.deleted_at IS NULL AND om.deleted_at IS NULL`,
    [dbUser.id]
  );

  let orgs = orgsRes.rows;
  if (orgs.length === 0) {
    const defaultOrgRes = await pool.query(`SELECT id, name, slug FROM organizations WHERE id = 'org_crux'`);
    if (defaultOrgRes.rowCount && defaultOrgRes.rowCount > 0) {
      await pool.query(
        `INSERT INTO org_members (id, org_id, user_id, role)
         VALUES ($1, 'org_crux', $2, 'member')
         ON CONFLICT (org_id, user_id) DO NOTHING`,
        [`mem_${dbUser.id}`, dbUser.id]
      );
      orgs = [{ id: 'org_crux', name: 'crux-oss', slug: 'crux-oss', role: 'member' }];
    }
  }

  const accessToken = signToken(jwtPayload, String(config.JWT_EXPIRES_IN));
  const refreshToken = `rf_${crypto.randomUUID()}`;

  try {
    const ttlSeconds = 86400 * 30; // 30 days
    const pipeline = redisClient.pipeline();
    pipeline.set(`auth:refresh:${refreshToken}`, JSON.stringify({ userId: dbUser.id }), 'EX', ttlSeconds);
    pipeline.sadd(`user:refresh:${dbUser.id}`, refreshToken);
    pipeline.expire(`user:refresh:${dbUser.id}`, ttlSeconds);
    await pipeline.exec();
  } catch (redisErr) {
    logger.warn({ redisErr }, 'Failed to persist refresh token in Redis');
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: config.JWT_EXPIRES_IN,
    user: jwtPayload,
    organizations: orgs,
  };
}

export async function getUserProfile(userId: string) {
  const userRes = await pool.query(
    `SELECT id, github_id, email, name, avatar_url FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  if (userRes.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'Authenticated user not found or deleted.',
    });
  }

  const user = userRes.rows[0];
  const orgsRes = await pool.query(
    `SELECT o.id, o.name, o.slug, om.role, o.avatar_url
     FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = $1 AND o.deleted_at IS NULL AND om.deleted_at IS NULL`,
    [userId]
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    organizations: orgsRes.rows,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  if (!refreshToken) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Refresh token is required.',
    });
  }

  let sessionData: { userId: string } | null = null;
  try {
    const raw = await redisClient.get(`auth:refresh:${refreshToken}`);
    if (raw) {
      sessionData = JSON.parse(raw);
    }
  } catch (err) {
    logger.warn({ err }, 'Redis error reading refresh token');
  }

  if (!sessionData || !sessionData.userId) {
    throw new AppError({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token is invalid or has expired.',
    });
  }

  const userRes = await pool.query(
    `SELECT id, email, name, avatar_url FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [sessionData.userId]
  );

  if (userRes.rowCount === 0) {
    throw new AppError({
      status: 401,
      code: 'USER_NOT_FOUND',
      message: 'User belonging to refresh token not found.',
    });
  }

  const user = userRes.rows[0];
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
  };

  const newAccessToken = signToken(jwtPayload, String(config.JWT_EXPIRES_IN));
  const newRefreshToken = `rf_${crypto.randomUUID()}`;

  // Rotate refresh token atomically in Redis
  try {
    const ttlSeconds = 86400 * 30; // 30 days
    const pipeline = redisClient.pipeline();
    pipeline.del(`auth:refresh:${refreshToken}`);
    pipeline.srem(`user:refresh:${user.id}`, refreshToken);
    pipeline.set(`auth:refresh:${newRefreshToken}`, JSON.stringify({ userId: user.id }), 'EX', ttlSeconds);
    pipeline.sadd(`user:refresh:${user.id}`, newRefreshToken);
    pipeline.expire(`user:refresh:${user.id}`, ttlSeconds);
    await pipeline.exec();
  } catch (redisErr) {
    logger.warn({ redisErr }, 'Failed to rotate refresh token in Redis');
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: config.JWT_EXPIRES_IN,
    user: jwtPayload,
  };
}

export async function revokeSession(userId: string): Promise<void> {
  try {
    const tokens = await redisClient.smembers(`user:refresh:${userId}`);
    if (tokens && tokens.length > 0) {
      const pipeline = redisClient.pipeline();
      for (const token of tokens) {
        pipeline.del(`auth:refresh:${token}`);
      }
      pipeline.del(`user:refresh:${userId}`);
      await pipeline.exec();
    }
  } catch (err) {
    logger.warn({ err, userId }, 'Failed to clear user refresh sessions from Redis');
  }
}
