import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OurStory — a home for original stories",
  description:
    "A quiet library for writers who'd rather be read than reposted. Independent, ad-supported, no algorithm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
