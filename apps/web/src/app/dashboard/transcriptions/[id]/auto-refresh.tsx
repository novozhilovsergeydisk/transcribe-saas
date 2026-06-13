"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Перезагружает серверные данные страницы, пока транскрипция в обработке. */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
