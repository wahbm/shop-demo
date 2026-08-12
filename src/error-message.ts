export function getErrorMessage(error: unknown, fallback = '请求失败，请稍后再试'): string {
  if (typeof error === 'string' && error.trim()) return error;

  if (error instanceof Error) {
    if (error.message && error.message !== '[object Object]') return error.message;
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause !== undefined) return getErrorMessage(cause, fallback);
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'msg', 'error_description', 'details', 'error']) {
      if (record[key] === error || record[key] === undefined || record[key] === null) continue;
      const message = getErrorMessage(record[key], '');
      if (message) return message;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Fall through to the stable fallback for circular SDK error objects.
    }
  }

  return fallback;
}
