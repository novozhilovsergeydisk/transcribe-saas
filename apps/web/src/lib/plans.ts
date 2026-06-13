import type { PlanType } from "@repo/db";

export interface PlanConfig {
  id: PlanType;
  name: string;
  priceMonth: number; // ₽/мес
  priceYear: number; // ₽/год
  minutesPerMonth: number | null; // null = безлимит
  exportFormats: string[];
  historyLimit: number | null; // null = без ограничений
  watermark: boolean;
  apiAccess: boolean;
  teamSize: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonth: 0,
    priceYear: 0,
    minutesPerMonth: 30,
    exportFormats: ["TXT"],
    historyLimit: 5,
    watermark: true,
    apiAccess: false,
    teamSize: 1,
    features: [
      "30 минут транскрибации в месяц",
      "Экспорт в TXT",
      "История: последние 5 транскрипций",
      "Водяной знак на экспортах",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonth: 790,
    priceYear: 7900,
    minutesPerMonth: 600,
    exportFormats: ["TXT", "DOCX", "SRT", "VTT", "PDF"],
    historyLimit: null,
    watermark: false,
    apiAccess: false,
    teamSize: 1,
    features: [
      "10 часов транскрибации в месяц",
      "Экспорт в DOCX, SRT, VTT, PDF",
      "Без водяных знаков",
      "Приоритетная обработка",
      "Полная история транскрипций",
      "Email поддержка",
    ],
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    priceMonth: 2990,
    priceYear: 29900,
    minutesPerMonth: null,
    exportFormats: ["TXT", "DOCX", "SRT", "VTT", "PDF"],
    historyLimit: null,
    watermark: false,
    apiAccess: true,
    teamSize: 10,
    features: [
      "Безлимитная транскрибация",
      "API доступ",
      "Команда до 10 пользователей",
      "Приоритетная поддержка 24/7",
      "Кастомная интеграция",
      "SLA 99.9%",
    ],
  },
};

export function getPlanLimitSeconds(plan: PlanType): number | null {
  const minutes = PLANS[plan].minutesPerMonth;
  return minutes === null ? null : minutes * 60;
}
