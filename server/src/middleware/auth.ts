import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // Accept token from Authorization header OR ?token= query param (for img/video/audio tags)
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  const raw = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;
  if (!raw) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = raw;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      displayName: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        username: string;
        displayName: string;
      };
      req.user = decoded;
    } catch {
      // ignore
    }
  }
  next();
}

export function requireUser(username: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.username !== username) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    next();
  };
}
