'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { messages } from '@/lib/messages/en';

function CheckoutStatusContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId');
  const [orderStatus, setOrderStatus] = useState<'pending' | 'paid' | 'failed' | 'unknown'>('pending');
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrderStatus('unknown');
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`);
        if (!res.ok) {
          if (res.status === 401) {
            setErrorMessage('Please log in to review your order settlement status.');
            return;
          }
          if (res.status === 404) {
            // Order may still be registering from gateway
            setPollCount((prev) => prev + 1);
            return;
          }
        }

        const data = await res.json();
        if (!isMounted) return;

        if (data.status === 'paid') {
          setOrderStatus('paid');
          setCreditsAdded(data.credits);
          return;
        } else if (data.status === 'failed') {
          setOrderStatus('failed');
          return;
        } else {
          setOrderStatus('pending');
          setPollCount((prev) => prev + 1);
        }
      } catch (err) {
        if (!isMounted) return;
        setPollCount((prev) => prev + 1);
      }
    };

    checkStatus();

    // Poll every 3 seconds for up to 10 attempts (30s), then leave honest pending notice
    if (orderStatus === 'pending' && pollCount < 10) {
      timer = setTimeout(checkStatus, 3000);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [orderId, pollCount, orderStatus]);

  return (
    <div className="max-w-[640px] mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-[#24141b] tracking-tight">
          {messages.routes.checkoutStatus.title}
        </h1>
        <p className="text-base text-[#5e4651]">
          {messages.routes.checkoutStatus.subtitle}
        </p>
      </div>

      <div className="card-panel p-8 sm:p-10 text-center border-[#f0e6e8] bg-white mb-8 shadow-xs">
        {/* Status icon display */}
        <div className="mb-6 flex justify-center">
          {orderStatus === 'pending' && (
            <div className="w-16 h-16 rounded-2xl bg-[#fffbeb] text-[#b45309] flex items-center justify-center border border-[#fde68a] shadow-xs">
              <Clock size={32} />
            </div>
          )}

          {orderStatus === 'paid' && (
            <div className="w-16 h-16 rounded-2xl bg-[#f0fdf4] text-[#166534] flex items-center justify-center border border-[#bbf7d0] shadow-xs">
              <CheckCircle2 size={32} />
            </div>
          )}

          {orderStatus === 'failed' && (
            <div className="w-16 h-16 rounded-2xl bg-[#fff1f2] text-[#be123c] flex items-center justify-center border border-[#fecdd3] shadow-xs">
              <XCircle size={32} />
            </div>
          )}

          {orderStatus === 'unknown' && (
            <div className="w-16 h-16 rounded-2xl bg-[#f5f5f4] text-[#57534e] flex items-center justify-center border border-[#e7e5e4] shadow-xs">
              <Clock size={32} />
            </div>
          )}
        </div>

        {/* Status text */}
        {orderStatus === 'pending' && (
          <div>
            <h3 className="text-xl font-bold text-[#1f1d1e] mb-2">
              Payment Processing
            </h3>
            <p className="text-sm text-[#575254] leading-relaxed mb-6">
              {messages.routes.checkoutStatus.pendingMessage}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#8a8486] bg-[#faf8f9] px-4 py-2 rounded-xl border border-[#f0e6e8]">
              <Loader2 size={14} className="animate-spin text-[#e05670]" />
              <span>Awaiting merchant webhook confirmation... (attempt {pollCount + 1})</span>
            </div>
          </div>
        )}

        {orderStatus === 'paid' && (
          <div>
            <h3 className="text-xl font-bold text-[#166534] mb-2">
              Credits Added Successfully
            </h3>
            <p className="text-sm text-[#575254] leading-relaxed mb-6">
              {messages.routes.checkoutStatus.successMessage}
            </p>
            {creditsAdded && (
              <div className="inline-block bg-[#f0fdf4] border border-[#bbf7d0] px-6 py-2.5 rounded-xl mb-6 shadow-xs">
                <span className="text-2xl font-extrabold text-[#166534]">
                  +{creditsAdded} Credits
                </span>
              </div>
            )}
          </div>
        )}

        {orderStatus === 'failed' && (
          <div>
            <h3 className="text-xl font-bold text-[#be123c] mb-2">
              Order Not Completed
            </h3>
            <p className="text-sm text-[#575254] leading-relaxed mb-6">
              {messages.routes.checkoutStatus.failedMessage}
            </p>
          </div>
        )}

        {orderStatus === 'unknown' && (
          <div>
            <h3 className="text-xl font-bold text-[#1f1d1e] mb-2">
              No Order Reference Provided
            </h3>
            <p className="text-sm text-[#575254] leading-relaxed mb-6">
              No order ID was found in the return query parameters.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 p-3 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] text-xs">
            {errorMessage}
          </div>
        )}

        {orderId && (
          <div className="mt-6 pt-5 border-t border-[#f0e6e8] text-xs text-[#8a8486]">
            <span>Order ID: </span>
            <code className="font-mono text-[#1f1d1e] bg-[#faf8f9] px-2 py-0.5 rounded-md text-[11px]">
              {orderId}
            </code>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link href="/" className="btn btn-rose shadow-md shadow-[#e05670]/25">
            <span>{messages.routes.checkoutStatus.startTesting}</span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/pricing" className="btn btn-secondary">
            <span>{messages.routes.checkoutStatus.returnToPricing}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Loader2 size={32} className="animate-spin text-[#f43f5e] mx-auto mb-4" />
          <p className="text-sm text-[#5e4651]">Loading order status...</p>
        </div>
      }
    >
      <CheckoutStatusContent />
    </Suspense>
  );
}
