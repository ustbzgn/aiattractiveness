import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { ColorAnalysisApp } from '@/features/color-analysis';

export const metadata: Metadata = {
  title: `Personal Color Analysis - ${APP_CONFIG.appName}`,
  description:
    'Find your seasonal color palette, skin undertone, and flattering wardrobe, hair, and makeup shades.',
  alternates: {
    canonical: '/color-analysis',
  },
};

export default function ColorAnalysisPage() {
  return <ColorAnalysisApp />;
}
