import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StoryForge — AI Short Drama Generator",
  description:
    "One prompt → full vertical drama reel. AI script, panel art, neural narration, and FFmpeg video — all free-tier APIs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="site-logo">
            Story<span>Forge</span>
          </Link>
          <nav>
            <Link href="/generate" className="btn-primary">
              + New Reel
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
