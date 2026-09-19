/**
 * Lightweight in-memory rate limiter middleware (zero external dependencies)
 * Tracks request counts per client IP or custom key within a rolling window.
 */

function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests, please try again later.',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
} = {}) {
  const hits = new Map();

  // Periodically purge expired records every 5 minutes to avoid memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > max) {
      const retryAfterSecs = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSecs);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSecs
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
