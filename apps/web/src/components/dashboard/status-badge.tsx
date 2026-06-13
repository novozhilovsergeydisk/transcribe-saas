import type { TranscriptionStatus } from "@repo/db";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  TranscriptionStatus,
  { label: string; variant: "secondary" | "warning" | "success" | "destructive" }
> = {
  PENDING: { label: "В очереди", variant: "secondary" },
  DOWNLOADING: { label: "Скачивание", variant: "warning" },
  PROCESSING: { label: "Обработка", variant: "warning" },
  COMPLETED: { label: "Готово", variant: "success" },
  FAILED: { label: "Ошибка", variant: "destructive" },
};

export function StatusBadge({ status }: { status: TranscriptionStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
