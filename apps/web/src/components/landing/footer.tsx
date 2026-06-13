import Link from "next/link";
import { AudioLines } from "lucide-react";

const footerLinks = {
  Продукт: [
    { href: "#features", label: "Возможности" },
    { href: "#pricing", label: "Тарифы" },
    { href: "#faq", label: "FAQ" },
  ],
  Компания: [
    { href: "mailto:support@example.com", label: "Поддержка" },
    { href: "#", label: "Блог" },
    { href: "#", label: "API документация" },
  ],
  "Правовая информация": [
    { href: "/privacy-policy", label: "Политика конфиденциальности" },
    { href: "/personal-data-consent", label: "Обработка персональных данных" },
    { href: "/terms-of-service", label: "Пользовательское соглашение" },
    { href: "/cookie-policy", label: "Cookie политика" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <AudioLines className="h-6 w-6 text-primary" aria-hidden />
              Голос в текст
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-транскрибация аудио и видео на русском и 90+ языках.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Голос в текст. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
