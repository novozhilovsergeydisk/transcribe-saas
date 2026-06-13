import Link from "next/link";
import { ArrowLeft, AudioLines } from "lucide-react";
import { Footer } from "@/components/landing/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <AudioLines className="h-6 w-6 text-primary" aria-hidden />
            Голос в текст
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> На главную
          </Link>
        </div>
      </header>
      <main className="container max-w-3xl py-12">
        <article className="prose-sm space-y-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </article>
      </main>
      <Footer />
    </>
  );
}
