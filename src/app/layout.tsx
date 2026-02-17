
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Impostor Game",
  description: "Who is the impostor?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
