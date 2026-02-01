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
      <body className="bg-[#0f172a] text-slate-100 antialiased overflow-hidden selection:bg-indigo-500/30 h-full w-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
