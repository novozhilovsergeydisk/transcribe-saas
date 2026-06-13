import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт и получите 30 минут транскрибации бесплатно. Без привязки карты.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
