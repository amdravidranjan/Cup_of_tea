export interface CompensationInput {
  areaHectares: number;
  ratePerHectare: number;
  multiplier: number;
  assetsValue: number;
  sIANotificationDate: Date;
  awardDate: Date;
}

export interface CompensationBreakdown {
  marketValue: number;
  multipliedMarketValue: number;
  assetsValue: number;
  solatium: number;
  interest: number;
  total: number;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const SOLATIUM_RATE = 1.0; // 100% minimum per Section 30(1)
const INTEREST_RATE_PER_ANNUM = 0.12; // Section 30(3)

export function calculateCompensation(input: CompensationInput): CompensationBreakdown {
  const marketValue = input.areaHectares * input.ratePerHectare;
  const multipliedMarketValue = marketValue * input.multiplier;
  const years =
    (input.awardDate.getTime() - input.sIANotificationDate.getTime()) / MS_PER_YEAR;
  const interest = years > 0 ? marketValue * INTEREST_RATE_PER_ANNUM * years : 0;
  const solatium = (multipliedMarketValue + input.assetsValue) * SOLATIUM_RATE;
  const total = multipliedMarketValue + input.assetsValue + solatium + interest;
  return {
    marketValue,
    multipliedMarketValue,
    assetsValue: input.assetsValue,
    solatium,
    interest,
    total,
  };
}

export interface StageHistoryEntry {
  action: string;
  toStage: string;
  createdAt: Date;
}

export interface CompensationDates {
  sIANotificationDate: Date;
  awardDate: Date;
}

export function resolveCompensationDates(
  history: StageHistoryEntry[]
): CompensationDates | null {
  const notification = history.find(
    (h) => h.action === "COMPLETE" && h.toStage === "NOTIFIED"
  );
  const award = history.find((h) => h.action === "PASS_AWARD" && h.toStage === "AWARDED");
  if (!notification || !award) return null;
  return { sIANotificationDate: notification.createdAt, awardDate: award.createdAt };
}
