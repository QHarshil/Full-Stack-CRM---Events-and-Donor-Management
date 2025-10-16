import { Request } from 'express';

export function extractRequestIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];

  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }

  if (typeof forwarded === 'string') {
    const [ip] = forwarded.split(',').map(part => part.trim()).filter(Boolean);
    if (ip) {
      return ip;
    }
  }

  return req.ip || req.socket?.remoteAddress || undefined;
}
