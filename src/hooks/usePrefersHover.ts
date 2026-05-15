"use client";

import * as React from "react";

/** True when the primary input supports hover (typically mouse/trackpad). */
export function usePrefersHover(): boolean {
  const [prefersHover, setPrefersHover] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setPrefersHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersHover;
}
