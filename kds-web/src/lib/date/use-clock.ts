import { useEffect, useState } from "react";

/** Returns `Date.now()` updated every second. */
export function useKdsClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(clockTimer);
    };
  }, []);

  return now;
}
