import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "충남반도체마이스터고 학생 건의함",
  description: "학생들의 의견으로 더 나은 학교를 만듭니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
