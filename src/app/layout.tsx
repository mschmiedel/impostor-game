import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/shared/i18n/LanguageContext";
import AdBanner from "@/app/components/AdBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Impostor Game",
  description: "Find the impostor among us",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-[100dvh] flex flex-col`}>
        <LanguageProvider>
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          <AdBanner />
        </LanguageProvider>
      </body>
    </html>
  );
}
