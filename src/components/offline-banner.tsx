"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { listQueued, makeLocalStorageQueue, replayQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueuedCount(listQueued(makeLocalStorageQueue()).length);

    async function sync() {
      setOnline(true);
      const storage = makeLocalStorageQueue();
      const before = listQueued(storage).length;
      if (before === 0) return;
      const { succeeded, remaining } = await replayQueue(storage);
      setQueuedCount(remaining);
      if (succeeded > 0) {
        toast.success(`Synced ${succeeded} queued update${succeeded === 1 ? "" : "s"}`);
        router.refresh();
      }
    }
    function goOffline() {
      setOnline(false);
    }

    window.addEventListener("online", sync);
    window.addEventListener("offline", goOffline);
    // attempt a sync on mount too, in case actions were queued in a
    // previous offline session and the page is reloaded while online
    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (online && queuedCount === 0) return null;

  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        online ? "border-brand/40 bg-secondary/60" : "border-destructive/40 bg-destructive/10"
      }`}
    >
      {online
        ? `Back online — syncing ${queuedCount} queued update${queuedCount === 1 ? "" : "s"}…`
        : `Offline${queuedCount > 0 ? ` — ${queuedCount} update${queuedCount === 1 ? "" : "s"} queued` : " — changes will be queued until you're back online"}`}
    </div>
  );
}
