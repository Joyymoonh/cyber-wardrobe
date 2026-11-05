import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "衣间 · Closet Atelier", template: "%s · 衣间" },
  description: "数字化你的衣柜：拍照导入单品，身材扫描，AI 自动搭配多种风格穿搭。",
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="relative min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
