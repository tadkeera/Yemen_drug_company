import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "دليل أسعار الأدوية في اليمن | Yemen Drug Company",
  description: "المنصة الإلكترونية للتحقق من أسعار الأدوية والمستلزمات الطبية المعتمدة في الجمهورية اليمنية - للبحث والاستفسار والمقارنة.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="font-sans antialiased min-h-full bg-slate-50 text-slate-800 flex flex-col">
        {children}
      </body>
    </html>
  );
}
