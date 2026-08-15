import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Mediator Markaz Arabiyah",
  description: "Pendaftaran dan Pemberkasan Santri Markaz Arabiyah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans relative">
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
