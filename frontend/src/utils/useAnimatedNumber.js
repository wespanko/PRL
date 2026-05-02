import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a numeric target with a cubic ease-out curve.
 * Returns the current animated value for use in render.
 *
 * If `target` is null/undefined, the hook returns it directly without animating.
 */
export function useAnimatedNumber(target, duration = 700) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setValue(target);
      prevTarget.current = target;
      return;
    }
    if (prevTarget.current === target) return;

    const start = Number.isFinite(prevTarget.current) ? prevTarget.current : target;
    const delta = target - start;
    if (delta === 0) {
      prevTarget.current = target;
      return;
    }

    const startTime = performance.now();
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(start + delta * eased);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(step);
    prevTarget.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
