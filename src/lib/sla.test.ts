import { describe, it, expect } from "vitest";
import { computeSLAMetrics } from "./sla";

const T0 = new Date("2020-01-01T00:00:00.000Z");
function daysAfter(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 24 * 60 * 60 * 1000);
}

function metricById(metrics: ReturnType<typeof computeSLAMetrics>, id: string) {
  const found = metrics.find((m) => m.id === id);
  if (!found) throw new Error(`metric not found: ${id}`);
  return found;
}

describe("computeSLAMetrics — declaration (12mo, NOTIFIED -> DECLARED)", () => {
  it("is not-applicable when NOTIFIED hasn't happened yet", () => {
    const metrics = computeSLAMetrics(
      { stageHistory: [], compensations: [], rrHistory: [] },
      T0
    );
    for (const m of metrics) {
      expect(m.status).toBe("not-applicable");
      expect(m.startedAt).toBeNull();
      expect(m.daysRemaining).toBeNull();
    }
  });

  it("is on-track when incomplete with plenty of time left", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 30)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("on-track");
    expect(declaration.completedAt).toBeNull();
    expect(declaration.daysRemaining).toBeGreaterThan(0);
  });

  it("is at-risk when less than 20% of the 12-month window remains", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 300)
    );
    expect(metricById(metrics, "declaration").status).toBe("at-risk");
  });

  it("is breached when the deadline passed with no declaration", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "NOTIFIED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 400)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("breached");
    expect(declaration.daysRemaining).toBeLessThan(0);
  });

  it("is on-track when declared comfortably before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [
          { toStage: "NOTIFIED", createdAt: T0 },
          { toStage: "DECLARED", createdAt: daysAfter(T0, 60) },
        ],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 400)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("on-track");
    expect(declaration.completedAt).toEqual(daysAfter(T0, 60));
    expect(declaration.daysRemaining).toBeGreaterThan(0);
  });

  it("is breached when declared after the deadline had already passed", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [
          { toStage: "NOTIFIED", createdAt: T0 },
          { toStage: "DECLARED", createdAt: daysAfter(T0, 400) },
        ],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 450)
    );
    const declaration = metricById(metrics, "declaration");
    expect(declaration.status).toBe("breached");
    expect(declaration.daysRemaining).toBeLessThan(0);
  });
});

describe("computeSLAMetrics — compensation (3mo, AWARDED -> all paid)", () => {
  it("is not-applicable before AWARDED, regardless of compensation records", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [],
        compensations: [{ paidAt: null }],
        rrHistory: [],
      },
      T0
    );
    expect(metricById(metrics, "compensation").status).toBe("not-applicable");
  });

  it("is on-track once every compensation record is paid before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [
          { paidAt: daysAfter(T0, 20) },
          { paidAt: daysAfter(T0, 30) },
        ],
        rrHistory: [],
      },
      daysAfter(T0, 200)
    );
    const compensation = metricById(metrics, "compensation");
    expect(compensation.status).toBe("on-track");
    expect(compensation.completedAt).toEqual(daysAfter(T0, 30));
  });

  it("is breached past the deadline with zero compensation records (not vacuously complete)", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [],
        rrHistory: [],
      },
      daysAfter(T0, 100)
    );
    const compensation = metricById(metrics, "compensation");
    expect(compensation.status).toBe("breached");
    expect(compensation.completedAt).toBeNull();
  });
});

describe("computeSLAMetrics — rr-award (6mo, AWARDED -> RR_AWARDED)", () => {
  it("is not-applicable before AWARDED", () => {
    const metrics = computeSLAMetrics(
      { stageHistory: [], compensations: [], rrHistory: [] },
      T0
    );
    expect(metricById(metrics, "rr-award").status).toBe("not-applicable");
  });

  it("is on-track once RR_AWARDED is reached before the deadline", () => {
    const metrics = computeSLAMetrics(
      {
        stageHistory: [{ toStage: "AWARDED", createdAt: T0 }],
        compensations: [],
        rrHistory: [
          { toStage: "SURVEYED", createdAt: daysAfter(T0, 10) },
          { toStage: "RR_AWARDED", createdAt: daysAfter(T0, 90) },
        ],
      },
      daysAfter(T0, 200)
    );
    const rrAward = metricById(metrics, "rr-award");
    expect(rrAward.status).toBe("on-track");
    expect(rrAward.completedAt).toEqual(daysAfter(T0, 90));
  });
});

describe("computeSLAMetrics — full project integration", () => {
  it("computes all three metrics together for one realistic timeline", () => {
    const metrics = computeSLAMetrics({
      stageHistory: [
        { toStage: "NOTIFIED", createdAt: T0 },
        { toStage: "DECLARED", createdAt: daysAfter(T0, 60) },
        { toStage: "AWARDED", createdAt: daysAfter(T0, 90) },
      ],
      compensations: [{ paidAt: daysAfter(T0, 100) }],
      rrHistory: [],
    }, daysAfter(T0, 95));

    expect(metrics.map((m) => m.id)).toEqual(["declaration", "compensation", "rr-award"]);
    expect(metricById(metrics, "declaration").status).toBe("on-track");
    expect(metricById(metrics, "compensation").status).toBe("on-track");
    expect(metricById(metrics, "rr-award").status).toBe("on-track");
  });
});
