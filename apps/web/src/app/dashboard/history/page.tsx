import type { Metadata } from "next";
import Link from "next/link";
import { prisma, type TranscriptionStatus } from "@repo/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DeleteButton } from "./delete-button";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "История транскрипций" };

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "PROCESSING", label: "В обработке" },
  { value: "COMPLETED", label: "Готовые" },
  { value: "FAILED", label: "С ошибкой" },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string };
}) {
  const session = await auth();
  const userId = session!.user.id;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const query = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "ALL";

  const where = {
    userId,
    ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
    ...(status !== "ALL" ? { status: status as TranscriptionStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transcription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        source: true,
        status: true,
        durationSec: true,
        createdAt: true,
      },
    }),
    prisma.transcription.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status !== "ALL") params.set("status", status);
    for (const [key, value] of Object.entries(overrides)) {
      params.set(key, String(value));
    }
    const str = params.toString();
    return `/dashboard/history${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">История транскрипций</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex gap-2" action="/dashboard/history">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Поиск по названию…"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
          />
          <Button type="submit" variant="outline">
            Найти
          </Button>
        </form>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по статусу">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildHref({ status: filter.value, page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                status === filter.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Ничего не найдено.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Название</th>
                    <th className="px-4 py-3 font-medium">Дата</th>
                    <th className="px-4 py-3 font-medium">Длительность</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="max-w-xs truncate px-4 py-3 font-medium">
                        <Link
                          href={`/dashboard/transcriptions/${item.id}`}
                          className="hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.durationSec ? formatDuration(item.durationSec) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteButton id={item.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Пагинация">
          {page > 1 && (
            <Link href={buildHref({ page: page - 1 })}>
              <Button variant="outline" size="sm">
                Назад
              </Button>
            </Link>
          )}
          <span className="px-3 text-sm text-muted-foreground">
            {page} из {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildHref({ page: page + 1 })}>
              <Button variant="outline" size="sm">
                Вперёд
              </Button>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
