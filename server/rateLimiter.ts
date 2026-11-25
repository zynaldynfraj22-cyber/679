import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './firebaseAdmin';

interface RateWindowConfig {
  maxRequests: number;
  windowMs: number;
  messageAr: string;
}

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, number[]>();
  private readonly config: RateWindowConfig;

  constructor(config: RateWindowConfig) {
    this.config = config;
  }

  check(key: string, nowMs = Date.now()): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    const cutoff = nowMs - this.config.windowMs;
    const prev = this.buckets.get(key) ?? [];
    const recent = prev.filter((ts) => ts > cutoff);

    if (recent.length >= this.config.maxRequests) {
      const oldest = recent[0] ?? nowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.config.windowMs - nowMs) / 1000));
      this.buckets.set(key, recent);
      return { allowed: false, retryAfterSeconds, remaining: 0 };
    }

    recent.push(nowMs);
    this.buckets.set(key, recent);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, this.config.maxRequests - recent.length),
    };
  }

  clear(): void {
    this.buckets.clear();
  }
}

export function getClientKey(req: AuthenticatedRequest, prefix: string): string {
  const uid = req.authUser?.uid;
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  return uid ? `${prefix}:uid:${uid}` : `${prefix}:ip:${ip}`;
}

export function createRateLimitMiddleware(
  limiter: SlidingWindowLimiter,
  prefix: string,
  errorMessageAr: string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const key = getClientKey(req, prefix);
    const result = limiter.check(key);
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({
        error: `${errorMessageAr} يرجى الانتظار ${result.retryAfterSeconds} ثانية ثم المحاولة مجدداً.`,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }
    next();
  };
}

export const studentTutorMinuteLimiter = new SlidingWindowLimiter({
  maxRequests: 15,
  windowMs: 60_000,
  messageAr: 'تم تجاوز حد الرسائل المسموح به للمعلم الذكي في الدقيقة الواحدة.',
});

export const studentTutorHourLimiter = new SlidingWindowLimiter({
  maxRequests: 80,
  windowMs: 60 * 60_000,
  messageAr: 'تم بلوغ الحد الأقصى الساعي لاستخدام المعلم الذكي.',
});

export const adminAiLimiter = new SlidingWindowLimiter({
  maxRequests: 10,
  windowMs: 60_000,
  messageAr: 'تم تجاوز حد طلبات التوليد الإداري في الدقيقة الواحدة.',
});

export const assessmentApiLimiter = new SlidingWindowLimiter({
  maxRequests: 60,
  windowMs: 60_000,
  messageAr: 'عدد كبير من طلبات التقييم في وقت قصير.',
});
