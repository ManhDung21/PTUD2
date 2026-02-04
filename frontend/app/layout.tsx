import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FruitText AI",
  description: "FruitText AI tạo mô tả sản phẩm trái cây bằng FastAPI và Gemini",
  icons: {
    icon: "/fruittext_logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
