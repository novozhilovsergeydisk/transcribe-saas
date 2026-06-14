import { usageRecords } from "@repo/db";

/** Списывает использованные секунды в текущем календарном месяце. */
export async function addUsage(userId: string, seconds: number): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await usageRecords.addSeconds(userId, periodStart, periodEnd, seconds);
}
