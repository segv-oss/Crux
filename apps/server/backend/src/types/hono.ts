import { JwtPayload } from '../middleware/auth.js';

export interface AppEnv {
  Variables: {
    user?: JwtPayload;
    userId?: string;
    orgId?: string;
    userRole?: 'owner' | 'admin' | 'member' | string;
    idempotencyKey?: string;
    idempotencyHit?: boolean;
    rawBody?: string;
  };
}
