import { subscriptions, usageRecords, type PlanType } from "@repo/db";
import { getPlanLimitSeconds } from "@/lib/plans";

function currentPeriod(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const subscription = await subscriptions.findByUserId(userId);
  return subscription?.plan ?? "FREE";
}

export async function getUsageSeconds(userId: string): Promise<number> {
  const { periodStart } = currentPeriod();
  const record = await usageRecords.find(userId, periodStart);
  return record?.secondsUsed ?? 0;
}

/** Остаток секунд в текущем периоде; null = безлимит */
export async function getRemainingSeconds(userId: string): Promise<number | null> {
  const plan = await getUserPlan(userId);
  const limit = getPlanLimitSeconds(plan);
  if (limit === null) return null;
  const used = await getUsageSeconds(userId);
  return Math.max(0, limit - used);
}

export async function addUsage(userId: string, seconds: number): Promise<void> {
  const { periodStart, periodEnd } = currentPeriod();
  await usageRecords.addSeconds(userId, periodStart, periodEnd, seconds);
}
