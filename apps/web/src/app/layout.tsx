import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Голос в текст — транскрибация аудио и видео онлайн",
    template: "%s — Голос в текст",
  },
  description:
    "Точная AI-транскрибация аудио и видео на русском и 90+ языках. Загружайте файлы или вставляйте ссылки на YouTube. Экспорт в TXT, DOCX, SRT, VTT. Попробуйте бесплатно.",
  keywords: [
    "транскрибация",
    "аудио в текст",
    "видео в текст",
    "расшифровка аудио",
    "субтитры",
    "whisper",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: appUrl,
    siteName: "Голос в текст",
    title: "Голос в текст — транскрибация аудио и видео онлайн",
    description:
      "Точная AI-транскрибация аудио и видео. Загрузка файлов и обработка по URL. Экспорт в TXT, DOCX, SRT, VTT.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
