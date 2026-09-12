'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { messages } from '@/lib/messages/en';
import { authClient, isAuthConfigured } from '@/lib/auth-client';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  const handleSocialSignIn = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    setStatusMessage(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: '/',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to sign in with ${provider}.`,
      });
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (isRegister) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
        });
        if (error) {
          setStatusMessage({ type: 'error', text: error.message || 'Registration failed. Check server logs.' });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Account registered and signed in! Redirecting to portrait panel...',
          });
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          setStatusMessage({ type: 'error', text: error.message || 'Sign in failed. Check your credentials.' });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Signed in successfully! Redirecting...',
          });
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Authentication service encountered an error.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[460px] mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2 text-[#24141b] tracking-tight">
          {messages.routes.signIn.title}
        </h1>
        <p className="text-sm text-[#5e4651]">
          {messages.routes.signIn.subtitle}
        </p>
      </div>

      <div className="card-panel p-7 sm:p-8 mb-6 border-[#f0e6e8] shadow-sm">
        {/* Notice of missing or local preview config state */}
        {!isAuthConfigured && (
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-[#92400e]">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Service Notice: </strong>
              <span>{messages.routes.signIn.missingConfigNotice}</span>
            </div>
          </div>
        )}

        {statusMessage && (
          <div
            role="alert"
            className={`rounded-xl p-3 mb-6 text-xs flex items-start gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534]'
                : 'bg-[#fff1f2] border border-[#fecdd3] text-[#be123c]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <div>
              <label
                htmlFor="name-input"
                className="block text-xs font-bold text-[#1f1d1e] mb-1.5 uppercase tracking-wider"
              >
                Display Name
              </label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                className="w-full px-3.5 py-2.5 border border-[#e2d3d6] rounded-xl text-sm outline-none bg-white focus:border-[#e05670] focus:ring-2 focus:ring-[#e05670]/20 transition-all text-[#1f1d1e]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-bold text-[#1f1d1e] mb-1.5 uppercase tracking-wider"
            >
              {messages.routes.signIn.emailLabel}
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={messages.routes.signIn.emailPlaceholder}
              className="w-full px-3.5 py-2.5 border border-[#e2d3d6] rounded-xl text-sm outline-none bg-white focus:border-[#e05670] focus:ring-2 focus:ring-[#e05670]/20 transition-all text-[#1f1d1e]"
            />
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-bold text-[#1f1d1e] mb-1.5 uppercase tracking-wider"
            >
              {messages.routes.signIn.passwordLabel}
            </label>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-[#e2d3d6] rounded-xl text-sm outline-none bg-white focus:border-[#e05670] focus:ring-2 focus:ring-[#e05670]/20 transition-all text-[#1f1d1e]"
            />
          </div>

          <button
            type="submit"
            className="btn btn-rose w-full h-11 mt-2 text-sm shadow-md shadow-[#e05670]/25"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Mail size={16} />
                <span>{isRegister ? 'Create Account' : messages.routes.signIn.button}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#f0e6e8]" />
          </div>
          <span className="relative bg-white px-3 text-[11px] font-semibold text-[#8a8486] uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            disabled={isLoading || socialLoading !== null}
            onClick={() => handleSocialSignIn('google')}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#e2d3d6] bg-white hover:bg-[#faf8f9] hover:border-[#e05670] text-[#1f1d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <Loader2 size={14} className="animate-spin text-[#e05670]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Google</span>
          </button>

          <button
            type="button"
            disabled={isLoading || socialLoading !== null}
            onClick={() => handleSocialSignIn('github')}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#e2d3d6] bg-white hover:bg-[#faf8f9] hover:border-[#e05670] text-[#1f1d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'github' ? (
              <Loader2 size={14} className="animate-spin text-[#e05670]" />
            ) : (
              <svg className="w-4 h-4 shrink-0 fill-[#1f1d1e]" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            )}
            <span>GitHub</span>
          </button>
        </div>

        <div className="mt-5 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setStatusMessage(null);
            }}
            className="bg-transparent border-none text-[#e05670] hover:text-[#c43d56] cursor-pointer underline font-semibold transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        <p className="text-[11px] text-[#8a8486] text-center mt-5 leading-relaxed">
          {messages.routes.signIn.disclaimer}
        </p>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="text-[#e05670] hover:text-[#c43d56] text-xs underline font-medium transition-colors"
        >
          Back to test panel
        </Link>
      </div>
    </div>
  );
}
