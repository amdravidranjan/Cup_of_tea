"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline support is a progressive enhancement — silently skip
        // if registration fails (unsupported browser, blocked, etc.)
      });
    }
  }, []);
  return null;
}
