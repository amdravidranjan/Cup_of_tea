import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Noto_Sans, Noto_Sans_Tamil, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { LangProvider } from "@/components/lang-provider";
import { DemoGuide } from "@/components/tour/demo-guide";
import { PageReady } from "@/components/tour/page-ready";
import { SECOND_LANG_COOKIE, parseSecondLang } from "@/lib/lang";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-noto-sans-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NILAMS - National Integrated Land Acquisition Management System",
  description: "SIH PS 26016 — Dept. of Land Resources demo prototype",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const l2 = parseSecondLang((await cookies()).get(SECOND_LANG_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-l2={l2}
      className={`${notoSans.variable} ${notoSansTamil.variable} ${notoSansDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider initial={l2}>
          {children}
          {/* The walkthrough sits above every page: it drives the real UI. */}
          <DemoGuide />
          {/* Announces on the console when each route is really loaded, which
              is what the demo recording cuts against. */}
          <PageReady />
        </LangProvider>
        <Toaster position="top-right" />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
