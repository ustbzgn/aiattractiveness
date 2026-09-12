'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { User, LogOut, ChevronDown, FileText, Coins, Plus } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
import { messages } from '@/lib/messages/en';

export function NavbarAuth() {
  const { data: session, isPending } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [credits, setCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Fetch user credit balance
  const fetchCredits = useCallback(async () => {
    if (!session?.user) return;
    try {
      setIsLoadingCredits(true);
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setCredits(data.wallet.balance);
        }
      }
    } catch (err) {
      console.error('[NavbarAuth] Failed to load credits:', err);
    } finally {
      setIsLoadingCredits(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      fetchCredits();
    } else {
      setCredits(null);
    }
  }, [session?.user, fetchCredits]);

  // Listen for custom event to refresh credits after analysis
  useEffect(() => {
    const handleRefresh = () => {
      fetchCredits();
    };
    window.addEventListener('refresh-user-credits', handleRefresh);
    return () => window.removeEventListener('refresh-user-credits', handleRefresh);
  }, [fetchCredits]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.reload();
    } catch {
      // ignore
    }
  };

  if (isPending) {
    return (
      <div className="h-8 w-20 rounded-full bg-[#ffe4eb]/50 animate-pulse" />
    );
  }

  if (session?.user) {
    const displayName = session.user.name || session.user.email?.split('@')[0] || 'User';
    const email = session.user.email;
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="flex items-center gap-2">
        {/* Credits Badge with Direct Top-Up Link */}
        <Link
          href="/pricing"
          title="Click to recharge credits"
          className="group flex items-center gap-1.5 py-1 px-3 rounded-full bg-gradient-to-r from-[#fff1f4] to-[#fdf2f4] border border-[#fecdd6] text-[#e11d48] hover:border-[#f43f5e] hover:shadow-xs transition-all text-xs font-semibold"
        >
          <Coins size={14} className="text-[#f43f5e] animate-pulse" />
          <span>
            {isLoadingCredits && credits === null ? (
              '...'
            ) : (
              `${credits ?? 0} Credits`
            )}
          </span>
          <span className="w-4 h-4 rounded-full bg-[#f43f5e] text-white flex items-center justify-center text-[10px] ml-0.5 group-hover:scale-110 transition-transform">
            <Plus size={10} strokeWidth={3} />
          </span>
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 py-1 px-2.5 rounded-full border border-[#f7d6de] bg-white text-[#24141b] hover:bg-[#fff1f4] hover:border-[#fecdd6] transition-all cursor-pointer shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#fb7185] to-[#f43f5e] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {initial}
            </div>
            <span className="text-xs font-semibold max-w-[90px] sm:max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown size={14} className="text-[#8e727e]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#f7d6de] py-2 z-50 text-[#24141b] animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-[#f7d6de]">
                <p className="text-xs font-bold truncate text-[#24141b]">{displayName}</p>
                {email && <p className="text-[11px] text-[#8e727e] truncate">{email}</p>}
                <div className="mt-2 pt-2 border-t border-[#f7d6de]/60 flex items-center justify-between">
                  <span className="text-[11px] text-[#8e727e]">Wallet Balance</span>
                  <span className="text-xs font-bold text-[#e11d48]">
                    {credits ?? 0} Credits
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/pricing"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-between px-4 py-2 text-xs font-medium text-[#5e4651] hover:bg-[#fff1f4] hover:text-[#f43f5e] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Coins size={14} className="text-[#f43f5e]" />
                    <span>Top Up Credits</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fdf2f4] text-[#e11d48] font-bold">
                    Buy Packs
                  </span>
                </Link>

                <Link
                  href="/history"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#5e4651] hover:bg-[#fff1f4] hover:text-[#f43f5e] transition-colors"
                >
                  <FileText size={14} className="text-[#f43f5e]" />
                  <span>My Reports</span>
                </Link>
              </div>

              <div className="border-t border-[#f7d6de] pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#be123c] hover:bg-[#fff1f2] transition-colors cursor-pointer text-left"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/pricing"
        className="hidden sm:inline-flex text-xs font-semibold text-[#8e727e] hover:text-[#f43f5e] transition-colors px-2 py-1"
      >
        Pricing
      </Link>
      <Link
        href="/sign-in"
        className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border border-[#f7d6de] bg-white text-[#f43f5e] hover:bg-[#fff1f4] hover:border-[#fecdd6] transition-all shadow-xs"
      >
        <User size={15} />
        <span>{messages.nav.signIn}</span>
      </Link>
    </div>
  );
}
