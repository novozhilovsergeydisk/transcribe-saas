import Link from "next/link";
import { AudioLines } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <AudioLines className="h-6 w-6 text-primary" aria-hidden />
        Голос в текст
      </Link>
      {children}
    </main>
  );
}
