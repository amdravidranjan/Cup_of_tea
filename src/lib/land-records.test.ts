import { describe, it, expect } from "vitest";
import { surveyNumberFor, pattaNumberFor } from "./land-records";

describe("surveyNumberFor", () => {
  it("groups consecutive indices under the same base survey number", () => {
    expect(surveyNumberFor(0)).toBe("100/1");
    expect(surveyNumberFor(1)).toBe("100/2");
    expect(surveyNumberFor(2)).toBe("100/3");
    expect(surveyNumberFor(3)).toBe("101/1");
  });

  it("is deterministic for the same index", () => {
    expect(surveyNumberFor(17)).toBe(surveyNumberFor(17));
  });
});

describe("pattaNumberFor", () => {
  it("derives a district code and pads the sequence", () => {
    expect(pattaNumberFor("Krishnagiri", 0)).toBe("KRI-PTA-00001");
    expect(pattaNumberFor("Koraput", 141)).toBe("KOR-PTA-00142");
  });

  it("strips non-letters and falls back when the district has no letters", () => {
    expect(pattaNumberFor("24 Parganas", 0)).toBe("PAR-PTA-00001");
    expect(pattaNumberFor("", 0)).toBe("GEN-PTA-00001");
  });
});
