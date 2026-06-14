import Link from "next/link";
import { Clock, Loader2, FileText, Plus } from "lucide-react";
import { transcriptions } from "@repo/db";
import { auth } from "@/lib/auth";
import { getUsageSeconds, getUserPlan } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [plan, usedSeconds, activeCount, recent] = await Promise.all([
    getUserPlan(userId),
    getUsageSeconds(userId),
    transcriptions.count({
      userId,
      statuses: ["PENDING", "DOWNLOADING", "PROCESSING"],
    }),
    transcriptions.list({ userId, take: 5 }),
  ]);

  const planConfig = PLANS[plan];
  const limitMinutes = planConfig.minutesPerMonth;
  const usedMinutes = Math.round(usedSeconds / 60);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Обзор</h1>
          <p className="text-sm text-muted-foreground">
            Здравствуйте, {session!.user.name ?? session!.user.email}!
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Новая транскрипция
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden />
              Использовано в этом месяце
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {usedMinutes}
              <span className="text-base font-normal text-muted-foreground">
                {limitMinutes === null ? " мин (безлимит)" : ` / ${limitMinutes} мин`}
              </span>
            </div>
            {limitMinutes !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (usedMinutes / limitMinutes) * 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4" aria-hidden />
              В обработке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden />
              Тариф
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="text-3xl font-bold">{planConfig.name}</div>
            {plan === "FREE" && (
              <Link href="/#pricing">
                <Badge variant="secondary" className="cursor-pointer">
                  Улучшить
                </Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние транскрипции</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Пока пусто — создайте первую транскрипцию.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/transcriptions/${item.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-primary"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                        {item.durationSec ? ` · ${formatDuration(item.durationSec)}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
