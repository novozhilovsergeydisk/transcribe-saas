"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onDelete() {
    if (!confirm("Удалить транскрипцию вместе с исходным файлом?")) return;
    setBusy(true);
    const res = await fetch(`/api/transcriptions/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Удалить транскрипцию"
      disabled={busy}
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
    </Button>
  );
}
