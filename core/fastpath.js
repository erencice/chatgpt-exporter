export async function tryFastPath(_shareUrl) {
  // Fast path not available - turbo-stream data parsing is complex.
  // Instead we use optimized batched Playwright extraction (stride=6, 30s).
  return null;
}
