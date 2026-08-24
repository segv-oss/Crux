import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crux — Unified Developer Collaboration Platform",
  description:
    "End context-switching. GitHub PRs, Linear tasks, and Slack discussions converge into a single real-time cockpit.",
  icons: {
    icon: "/crux-logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col bg-[#0c0d10] text-[#f0f2f5]">
        {children}
      </body>
    </html>
  );
}
