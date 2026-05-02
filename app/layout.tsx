import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { Topbar } from "@/components/Topbar";
import { Footer } from "@/components/Footer";
import { Tweaks } from "@/components/Tweaks";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OurStory — a home for original stories",
  description:
    "A quiet library for writers who'd rather be read than reposted. Independent, ad-supported, no algorithm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}
    >
      <body data-theme="paper" data-density="normal" data-ads="visible">
        <div className="ribbon" id="ribbon"></div>
        <AuthProvider>
          <div className="app">
            <Suspense fallback={<div className="topbar" />}>
              <Topbar />
            </Suspense>
            {children}
            <Footer />
          </div>
          <Tweaks />
        </AuthProvider>
      </body>
    </html>
  );
}
