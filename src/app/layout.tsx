import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// next/font: Self-hosted fonts, zero layout shift, better performance
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  variable: "--font-dancing",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Hải Từ Đâu | Phân Tích Đầu Tư Chứng Khoán",
    template: "%s | Hải Từ Đâu",
  },
  description:
    "Hệ thống mô phỏng đầu tư chứng khoán Việt Nam cao cấp. Phân tích DCA, cổ tức, Monte Carlo, và screener cổ phiếu VN30 với dữ liệu realtime từ SSI, VNDirect.",
  keywords: [
    "chứng khoán việt nam",
    "đầu tư cổ phiếu",
    "phân tích cổ tức",
    "DCA",
    "VN30",
    "screener",
    "monte carlo",
    "stock analyzer",
  ],
  authors: [{ name: "Hải Từ Đâu" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Hải Từ Đâu",
    title: "Hải Từ Đâu | Phân Tích Đầu Tư Chứng Khoán",
    description:
      "Hệ thống mô phỏng đầu tư chứng khoán Việt Nam. Data Realtime • Phân tích Kỹ thuật • Lãi kép.",
  },
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
    <html lang="vi" className={`dark ${inter.variable} ${outfit.variable} ${dancingScript.variable}`}>
      <body className="bg-[#0f172a] text-slate-100 antialiased overflow-y-auto lg:overflow-hidden selection:bg-indigo-500/30 h-full w-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
