const metrics = {
  scrapes: { total: 0, success: 0, failed: 0, fastpath: 0, playwright: 0 },
  cache: { hits: 0, misses: 0 },
  queue: { enqueued: 0, completed: 0 },
  startTime: Date.now(),
};

export function recordScrape(method) {
  metrics.scrapes.total++;
  if (method === "fastpath-parser") metrics.scrapes.fastpath++;
  else if (method?.startsWith("playwright")) metrics.scrapes.playwright++;
}

export function recordSuccess() {
  metrics.scrapes.success++;
}

export function recordFailure() {
  metrics.scrapes.failed++;
}

export function recordCacheHit() {
  metrics.cache.hits++;
}

export function recordCacheMiss() {
  metrics.cache.misses++;
}

export function recordEnqueue() {
  metrics.queue.enqueued++;
}

export function recordComplete() {
  metrics.queue.completed++;
}

export function getMetrics() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const total = metrics.scrapes.total || 1;
  return {
    uptime_seconds: uptime,
    scrapes: {
      total: metrics.scrapes.total,
      success: metrics.scrapes.success,
      failed: metrics.scrapes.failed,
      success_rate: ((metrics.scrapes.success / total) * 100).toFixed(1) + "%",
      fastpath_pct: ((metrics.scrapes.fastpath / total) * 100).toFixed(1) + "%",
      playwright_pct: ((metrics.scrapes.playwright / total) * 100).toFixed(1) + "%",
    },
    cache: {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      hit_rate: metrics.cache.hits + metrics.cache.misses > 0
        ? ((metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100).toFixed(1) + "%"
        : "0%",
    },
    queue: metrics.queue,
    memory_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
  };
}
