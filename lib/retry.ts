export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
    // Check if it's a transient error (e.g. rate limit, 5xx, timeout)
    const status = error?.status || error?.response?.status;
    const isTransient = 
      status === 429 || 
      status >= 500 || 
      error?.message?.toLowerCase().includes('timeout') ||
      error?.name === 'TimeoutError';

    if (!isTransient) {
      throw error; // Don't retry permanent errors (like 400 Bad Request)
    }

    console.warn(`Transient error encountered (${status || error?.message}). Retrying in 2 seconds...`);
    await new Promise(r => setTimeout(r, 2000));
    return await fn(); // Retry once
  }
}
