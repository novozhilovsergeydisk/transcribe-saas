import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { faqItems } from "@/components/landing/faq-data";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { PLANS } from "@/lib/plans";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Голос в текст",
      url: appUrl,
      description: "AI-транскрибация аудио и видео на русском и 90+ языках",
    },
    {
      "@type": "Product",
      name: "Голос в текст — транскрибация аудио и видео",
      description:
        "Сервис автоматической транскрибации: загрузка файлов, обработка по URL, экспорт в TXT, DOCX, SRT, VTT.",
      offers: (["FREE", "PRO", "BUSINESS"] as const).map((id) => ({
        "@type": "Offer",
        name: `Тариф ${PLANS[id].name}`,
        price: PLANS[id].priceMonth,
        priceCurrency: "RUB",
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
