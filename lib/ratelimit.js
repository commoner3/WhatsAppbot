// Rate limiting module
class RateLimit {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const times = this.requests.get(key).filter(t => now - t < this.windowMs);
    times.push(now);
    this.requests.set(key, times);

    return times.length <= this.maxRequests;
  }
}

module.exports = RateLimit;
