import React from 'react';
import Link from 'next/link';
import { History, ArrowRight } from 'lucide-react';
import { messages } from '@/lib/messages/en';

export default function HistoryPage() {
  return (
    <div className="max-w-[720px] mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 text-[#24141b] tracking-tight">
          {messages.routes.history.title}
        </h1>
        <p className="text-base sm:text-lg text-[#5e4651] max-w-[540px] mx-auto leading-relaxed">
          {messages.routes.history.subtitle}
        </p>
      </div>

      <div className="card-panel p-10 sm:p-14 text-center flex flex-col items-center justify-center bg-white border-[#f0e6e8] shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#fdf2f4] flex items-center justify-center mb-6 text-[#e05670] shadow-xs">
          <History size={32} />
        </div>

        <h3 className="text-xl font-bold text-[#1f1d1e] mb-2">
          {messages.routes.history.emptyTitle}
        </h3>

        <p className="text-sm sm:text-base text-[#575254] max-w-[460px] leading-relaxed mb-8">
          {messages.routes.history.emptyMessage}
        </p>

        <Link href="/" className="btn btn-rose py-3 px-8 shadow-md shadow-[#e05670]/25">
          <span>{messages.routes.history.action}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
