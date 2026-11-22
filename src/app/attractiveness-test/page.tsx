import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { AttractivenessApp } from '@/features/attractiveness';

export const metadata: Metadata = {
  title: `Attractiveness Test & Portrait Feedback - ${APP_CONFIG.appName}`,
  description:
    'Objective portrait analysis of lighting, framing, facial harmony, and expression with side-by-side comparison.',
  alternates: {
    canonical: '/attractiveness-test',
  },
};

export default function AttractivenessTestPage() {
  return <AttractivenessApp />;
}
