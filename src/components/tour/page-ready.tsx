"use client";

/**
 * Says on the console when a page is actually ready.
 *
 * "Ready" here means the route's markup is mounted *and* the browser has
 * finished its load work and gone idle for a frame — which is much later than
 * React's first paint on the heavy pages (the project workspace mounts a map,
 * the 3D view loads terrain tiles). The demo recorder waits for this line
 * rather than guessing with a sleep, so the narration starts when the screen
 * it describes is really on screen.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { mark } from "@/lib/tour/clock";

export function PageReady() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const announce = () => {
      if (cancelled) return;
      // One more frame, so anything that renders on mount has painted.
      requestAnimationFrame(() => {
        if (!cancelled) mark("page:ready", pathname);
      });
    };

    if (document.readyState === "complete") {
      announce();
    } else {
      window.addEventListener("load", announce, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("load", announce);
    };
  }, [pathname]);

  return null;
}
