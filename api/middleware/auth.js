// api/middleware/auth.js

// Simple API key authentication middleware
function authenticateApiKey(req, res, next) {
  const headerApiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  const bearerApiKey =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  const apiKey = headerApiKey || bearerApiKey;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const validApiKey = process.env.GPT_API_KEY;
  if (!validApiKey) {
    console.error('GPT_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

// Optional: in-memory rate limiting per API key
const limits = new Map();

/**
 * Returns an Express middleware that rate-limits by API key.
 */
function rateLimitByApiKey({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  return (req, res, next) => {
    const headerApiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    const bearerApiKey =
      typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null;

    const apiKey = headerApiKey || bearerApiKey;

    if (!apiKey) {
      // If no key, skip this limiter (auth middleware will handle it)
      return next();
    }

    const now = Date.now();
    let info = limits.get(apiKey);

    if (!info || info.resetTime <= now) {
      info = { count: 0, resetTime: now + windowMs };
      limits.set(apiKey, info);
    }

    info.count += 1;

    if (info.count > max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((info.resetTime - now) / 1000),
      });
    }

    next();
  };
}

module.exports = {
  authenticateApiKey,
  rateLimitByApiKey,
};
