import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Upstash REST client speaks HTTP, so it's fine on serverless. The
// in-memory ratelimit you'd use on a long-lived server is wrong here
// because every request can land on a fresh worker.

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type Limiter = {
  limit: (key: string) => Promise<LimitResult>;
};

const env = process.env;
const enabled = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const redis = enabled
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const cache = new Map<string, Limiter>();

const noop: Limiter = {
  limit: async () => ({
    success: true,
    limit: Infinity,
    remaining: Infinity,
    reset: 0,
  }),
};

/** Build (or fetch from cache) a sliding-window limiter. Bucket name
 *  becomes part of the Redis key prefix so different limiter purposes
 *  don't share counters. */
export function getLimiter(
  bucket: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Limiter {
  if (!redis) return noop;
  const key = `${bucket}:${max}:${window}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `os:rl:${bucket}`,
    analytics: false,
  });
  cache.set(key, limiter);
  return limiter;
}

export function tooManyRequests(result: LimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "You're doing that too fast. Try again in a few seconds.",
      },
    },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfter),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": String(result.remaining),
        "x-ratelimit-reset": String(result.reset),
      },
    },
  );
}

/** Convenience: limit + return a 429 response when blocked, or null when
 *  the request may proceed. */
export async function enforce(
  limiter: Limiter,
  key: string,
): Promise<NextResponse | null> {
  const result = await limiter.limit(key);
  if (!result.success) return tooManyRequests(result);
  return null;
}

export const ratelimitsEnabled = enabled;
