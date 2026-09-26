import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Recovery Manager",
  description: "Review fee lines against upstream evidence and prepare supported recovery claims.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
