import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Driven Intelligent Academic Assessment & Analytics System",
  description: "Agentic AI platform with automated rubric evaluation, RAG-grounded feedback, dual Student/Faculty portals, and real-time performance analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
