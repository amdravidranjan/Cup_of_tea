import { describe, it, expect, vi } from "vitest";
import { createMemoryStorage, enqueue, dequeue, listQueued, replayQueue } from "./offline-queue";

describe("enqueue / dequeue / listQueued", () => {
  it("adds an action and lists it back", () => {
    const storage = createMemoryStorage();
    const action = enqueue(storage, {
      url: "/api/parcels/p-1/advance-status",
      method: "POST",
      label: "Mark Similiguda as ACQUIRED",
    });
    expect(listQueued(storage)).toHaveLength(1);
    expect(listQueued(storage)[0].id).toBe(action.id);
    expect(listQueued(storage)[0].label).toBe("Mark Similiguda as ACQUIRED");
  });

  it("removes an action by id", () => {
    const storage = createMemoryStorage();
    const action = enqueue(storage, { url: "/x", method: "POST", label: "test" });
    dequeue(storage, action.id);
    expect(listQueued(storage)).toHaveLength(0);
  });

  it("preserves insertion order across multiple enqueues", () => {
    const storage = createMemoryStorage();
    enqueue(storage, { url: "/a", method: "POST", label: "first" });
    enqueue(storage, { url: "/b", method: "POST", label: "second" });
    expect(listQueued(storage).map((a) => a.label)).toEqual(["first", "second"]);
  });
});

describe("replayQueue", () => {
  it("replays every queued action and clears them all on success", async () => {
    const storage = createMemoryStorage();
    enqueue(storage, { url: "/api/a", method: "POST", label: "first" });
    enqueue(storage, { url: "/api/b", method: "POST", label: "second" });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const result = await replayQueue(storage, fetchMock);

    expect(result).toEqual({ succeeded: 2, remaining: 0 });
    expect(listQueued(storage)).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at the first network failure and leaves the rest queued in order", async () => {
    const storage = createMemoryStorage();
    enqueue(storage, { url: "/api/a", method: "POST", label: "first" });
    enqueue(storage, { url: "/api/b", method: "POST", label: "second" });

    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await replayQueue(storage, fetchMock);

    expect(result).toEqual({ succeeded: 0, remaining: 2 });
    expect(listQueued(storage).map((a) => a.label)).toEqual(["first", "second"]);
  });

  it("drops only the actions the server actually accepted", async () => {
    const storage = createMemoryStorage();
    enqueue(storage, { url: "/api/a", method: "POST", label: "accepted" });
    enqueue(storage, { url: "/api/b", method: "POST", label: "rejected" });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    const result = await replayQueue(storage, fetchMock);

    expect(result).toEqual({ succeeded: 1, remaining: 1 });
    expect(listQueued(storage).map((a) => a.label)).toEqual(["rejected"]);
  });
});
