import type { Metadata } from "next";
import { Fraunces, Nunito_Sans, Caveat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

const nunito = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
});

const siteTitle = process.env.SITE_TITLE ?? "The Garden Diary";
const siteTagline =
  process.env.SITE_TAGLINE ?? "Pages from our garden, petal by petal.";

export const metadata: Metadata = {
  title: { default: siteTitle, template: `%s · ${siteTitle}` },
  description: siteTagline,
  icons: { icon: "/art/bloom.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${nunito.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
