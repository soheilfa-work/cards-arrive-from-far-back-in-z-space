import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Grand Theft Auto",
  description: "A Vice City sunset tour through the Grand Theft Auto series.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} min-h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
