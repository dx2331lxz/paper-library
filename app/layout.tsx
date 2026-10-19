import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Shelf · 论文库",
  description: "从 GitHub 同步原文与译文，搜索、预览并下载你的论文资料。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
