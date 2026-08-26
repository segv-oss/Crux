import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { config } from '../../config/env.js';
import type { AppEnv } from '../../types/hono.js';
import * as authService from './auth.service.js';

export async function initiateGitHub(c: Context<AppEnv>) {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.GITHUB_CLIENT_ID || 'mock_client_id'}&scope=user:email,read:org,repo`;
  return c.redirect(githubAuthUrl, 302);
}

export async function handleGitHubCallback(c: Context<AppEnv>) {
  const code = c.req.query('code') as string;
  const result = await authService.exchangeGitHubCode(code);

  // Set secure refresh token cookie (httpOnly to prevent XSS exfiltration)
  setCookie(c, 'auth_refresh', result.refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return c.json(
    {
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: result.user,
        organizations: result.organizations,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
}

export async function refreshAccessToken(c: Context<AppEnv>) {
  const cookieToken = getCookie(c, 'auth_refresh');
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = cookieToken || body.refreshToken;

  const result = await authService.refreshAccessToken(refreshToken);

  // Rotate refresh token cookie
  setCookie(c, 'auth_refresh', result.refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return c.json(
    {
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: result.user,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
}

export async function getCurrentUser(c: Context<AppEnv>) {
  const user = c.get('user')!;
  const profile = await authService.getUserProfile(user.userId);
  return c.json(
    {
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
}

export async function logout(c: Context<AppEnv>) {
  const user = c.get('user');
  if (user) {
    await authService.revokeSession(user.userId);
  }

  deleteCookie(c, 'auth_token', { path: '/' });
  deleteCookie(c, 'auth_refresh', { path: '/' });

  return c.json(
    {
      data: { success: true },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
}

export async function getDevToken(c: Context<AppEnv>) {
  const userId = (c.req.query('userId') || c.req.query('user') || 'usr_sarah') as string;
  const result = await authService.getDevToken(userId);

  return c.json(
    {
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
        user: result.user,
        organizations: result.organizations,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
}
