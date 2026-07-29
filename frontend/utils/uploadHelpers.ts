// Helpers for robust file uploads: bounded concurrency + retry with backoff.
// A folder upload (e.g. a Minecraft map) can be hundreds of small files; firing
// them all at once saturates the ~6-connections-per-host browser limit and the
// server, and a single transient failure would mark a file "Failed" for good.

// Process `items` with at most `limit` workers in flight. Remaining items wait
// for a slot. Rejections propagate — wrap the worker's own errors if needed.
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

// Retry only transient failures: network errors, timeouts, aborted connections
// and 5xx. A definitive 4xx (validation, 413 too large, 409 conflict) is not
// retried — retrying it would never succeed.
export function isRetryableUploadError(err: any): boolean {
  const status = err?.response?.status;
  if (typeof status === 'number') return status >= 500 && status < 600;
  // No HTTP response means the request never completed: network / timeout / reset.
  return true;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number; shouldRetry?: (err: any) => boolean },
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 500;
  const shouldRetry = opts?.shouldRetry ?? isRetryableUploadError;

  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts - 1 || !shouldRetry(err)) throw err;
      // 500ms → 1s → 2s …
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
