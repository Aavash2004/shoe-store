/**
 * Type-safe debounce utility.
 * Delays invoking `fn` until after `wait` milliseconds have elapsed since the last time
 * the debounced function was invoked.
 */

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  /** Immediately abort any pending execution and clear the timer */
  cancel: () => void;
  /** If an execution is pending, immediately execute it with the latest arguments and clear the timer */
  flush: () => void;
  /** Check if an execution is currently scheduled */
  isPending: () => boolean;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): DebouncedFunction<T> {
  let timerId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  const flush = () => {
    if (timerId !== null && lastArgs !== null) {
      const args = lastArgs;
      const context = lastThis;
      cancel();
      fn.apply(context, args);
    }
  };

  const isPending = () => timerId !== null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      const callArgs = lastArgs;
      const callContext = lastThis;
      lastArgs = null;
      lastThis = null;
      if (callArgs !== null) {
        fn.apply(callContext, callArgs);
      }
    }, wait);
  };

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.isPending = isPending;

  return debounced;
}
