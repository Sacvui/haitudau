import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Hải Từ Đâu | Dashboard",
  description: "Stock Investment Analyzer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0f172a] text-slate-100 antialiased overflow-y-auto lg:overflow-hidden selection:bg-indigo-500/30 h-full w-full font-[Inter]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
