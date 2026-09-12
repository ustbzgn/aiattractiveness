import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_CONFIG } from '@/lib/config';
import { messages } from '@/lib/messages/en';
import { History, CreditCard } from 'lucide-react';
import { NavbarAuth } from '@/components/navbar-auth';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_CONFIG.appName} - Portrait Feedback & Lighting Suggestions`,
  description: messages.hero.subtitle,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-[#1f1d1e] selection:bg-[#fdf2f4] selection:text-[#e05670]">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 border-b border-[#f0e6e8] bg-white/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[#1f1d1e] hover:text-[#e05670] transition-colors group"
            >
              <div className="flex flex-col">
                <span className="font-heading text-xl sm:text-2xl tracking-tight text-[#1f1d1e] leading-tight font-extrabold">
                  {APP_CONFIG.appName}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#8a8486] font-semibold tracking-wider uppercase">
                  {messages.nav.tagline}
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-7">
              <Link
                href="/history"
                className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-[#575254] hover:text-[#e05670] transition-colors"
              >
                <History size={17} />
                <span className="hidden sm:inline">{messages.nav.history}</span>
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-[#575254] hover:text-[#e05670] transition-colors"
              >
                <CreditCard size={17} />
                <span>{messages.nav.pricing}</span>
              </Link>
              <NavbarAuth />
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#f0e6e8] bg-[#faf8f9] py-10 text-xs sm:text-sm text-[#8a8486]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>{messages.footer.copyright}</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-[#f43f5e] cursor-pointer transition-colors">
                {messages.footer.terms}
              </span>
              <span className="hover:text-[#f43f5e] cursor-pointer transition-colors">
                {messages.footer.privacy}
              </span>
              <span className="hover:text-[#f43f5e] cursor-pointer transition-colors">
                {messages.footer.contact}
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
