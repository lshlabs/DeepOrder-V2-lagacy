import { useEffect, useState } from "react";

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
