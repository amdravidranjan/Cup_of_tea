import { NextResponse } from "next/server";
import { getPublicPortfolioStats, listPublicNotices } from "@/db/public";

export async function GET() {
  const [stats, notices] = await Promise.all([getPublicPortfolioStats(), listPublicNotices(20)]);
  return NextResponse.json({ stats, notices });
}
