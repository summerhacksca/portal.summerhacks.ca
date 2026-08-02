"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 1-second tick for every countdown on a page.
 *
 * Why an external store rather than useEffect + setState: this keeps Date.now()
 * out of render entirely (react-hooks/purity), the same reason pickUpNext()
 * lives in ./schedule.ts as a plain module function. React reads the snapshot
 * outside the render phase, which is the sanctioned escape hatch for a mutable
 * external source - CheckinPanel.tsx uses the same shape for localStorage.
 *
 * nowMs is cached at module scope rather than returned fresh from getSnapshot:
 * a getSnapshot that returns Date.now() directly yields a new value on every
 * call, and React loops with "getSnapshot should be cached".
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let nowMs = 0;

function subscribeToTick(onChange: () => void) {
  listeners.add(onChange);

  if (!timer) {
    nowMs = Date.now();
    timer = setInterval(() => {
      nowMs = Date.now();
      listeners.forEach((listener) => listener());
    }, 1000);
  }

  return () => {
    listeners.delete(onChange);

    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getTickSnapshot = () => nowMs;

/** 0 means "not ticking yet" - there is no clock the server could agree with. */
const getTickServerSnapshot = () => 0;

/**
 * Current time in ms, or 0 on the server snapshot and the first client render.
 * Callers fall back to a server-computed value while it is 0, so first paint
 * matches SSR exactly and no hydration mismatch is possible.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribeToTick, getTickSnapshot, getTickServerSnapshot);
}
