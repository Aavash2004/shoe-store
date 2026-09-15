"use client";

import { useEffect, useRef, useState } from "react";
import { debounce, type DebouncedFunction } from "@/lib/utils/debounce";

export interface UseDebouncedCallbackOptions {
  /**
   * If true, fires any pending execution immediately on unmount with the latest arguments.
   * If false (default), cancels any pending execution on unmount.
   */
  flushOnUnmount?: boolean;
}

/**
 * Hook that returns a stable debounced callback.
 * Uses a ref to ensure the callback closure stays fresh without recreating the debounced
 * instance on every render.
 *
 * Uses lazy-initialized useRef instead of useMemo to guarantee identity stability
 * independently of React's memoization discard semantics.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options?: UseDebouncedCallbackOptions
): DebouncedFunction<T> {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  const flushOnUnmount = options?.flushOnUnmount ?? false;

  // Lazy-initialized ref for semantic guarantee of stable identity
  const debouncedRef = useRef<DebouncedFunction<T> | null>(null);
  if (!debouncedRef.current) {
    debouncedRef.current = debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay);
  }

  // Cleanup on unmount (cancel or flush depending on options)
  useEffect(() => {
    return () => {
      if (flushOnUnmount) {
        debouncedRef.current?.flush();
      } else {
        debouncedRef.current?.cancel();
      }
    };
  }, [flushOnUnmount]);

  return debouncedRef.current;
}

/**
 * Hook that delays updating a value until after `delay` milliseconds have elapsed
 * since the last change. Ideal for search inputs and filtering states.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
