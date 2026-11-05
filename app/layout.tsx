import type { Metadata } from "next";
import "./globals.css";
import { MarketShell } from "@/components/shell/market-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "ComicBookStockExchange.com | Autonomous Comic Equity Exchange & Valuation",
  description:
    "ComicBookStockExchange.com: Autonomous comic-book equity exchange, valuation clearinghouse, and market intelligence platform indexing 3,481,445 authoritative comic records.",
  keywords: [
    "ComicBookStockExchange.com",
    "Comic Book Stock Exchange",
    "CBSE",
    "Comic Equity Valuation",
    "Comic Catalog",
    "Comic Market Intelligence",
    "CGC 9.8 Sovereign Benchmark",
  ],
};

export const revalidate = 60;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark font-hind">
      <body className="flex min-h-screen flex-col bg-[#07080B] text-slate-100 antialiased">
        <QueryProvider>
          <MarketShell>{children}</MarketShell>
        </QueryProvider>
      </body>
    </html>
  );
}
