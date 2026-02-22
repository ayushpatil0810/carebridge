// ============================================================
// useIdleTimeout — Detect user inactivity
// Calls onWarn after `warnAfter` ms, onTimeout after `timeoutAfter` ms
// Both timers reset on any mouse/keyboard/touch/scroll activity.
// ============================================================

import { useEffect, useRef, useCallback } from "react";

export default function useIdleTimeout({
  onWarn,
  onTimeout,
  warnAfter = 4 * 60 * 1000, // 4 minutes
  timeoutAfter = 5 * 60 * 1000, // 5 minutes
  enabled = true,
}) {
  const warnTimer = useRef(null);
  const timeoutTimer = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(timeoutTimer.current);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    warnTimer.current = setTimeout(onWarn, warnAfter);
    timeoutTimer.current = setTimeout(onTimeout, timeoutAfter);
  }, [onWarn, onTimeout, warnAfter, timeoutAfter, clearTimers]);

  useEffect(() => {
    if (!enabled) return;

    const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    EVENTS.forEach((e) =>
      document.addEventListener(e, reset, { passive: true }),
    );
    reset(); // kick off initial timers

    return () => {
      EVENTS.forEach((e) => document.removeEventListener(e, reset));
      clearTimers();
    };
  }, [enabled, reset, clearTimers]);
}
