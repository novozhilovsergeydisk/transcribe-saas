"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email,
        password,
        privacyAccepted: formData.get("privacy") === "on",
        personalDataAccepted: formData.get("personal-data") === "on",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Не удалось зарегистрироваться. Попробуйте ещё раз.");
      setLoading(false);
      return;
    }

    // Сразу входим после регистрации
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>30 минут транскрибации бесплатно. Без привязки карты.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Иван Петров" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Минимум 8 символов"
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="privacy" name="privacy" required />
            <Label htmlFor="privacy" className="cursor-pointer font-normal leading-snug">
              Я согласен с{" "}
              <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline">
                Политикой конфиденциальности
              </Link>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="personal-data" name="personal-data" required />
            <Label htmlFor="personal-data" className="cursor-pointer font-normal leading-snug">
              Я даю согласие на{" "}
              <Link
                href="/personal-data-consent"
                target="_blank"
                className="text-primary hover:underline"
              >
                обработку персональных данных
              </Link>
            </Label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создаём аккаунт…" : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
