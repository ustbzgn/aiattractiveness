export const APP_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Attractiveness AI',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,
} as const;

export interface CreditPackageConfig {
  id: string;
  name: string;
  credits: number;
  bonusCredits?: number;
  totalCredits: number;
  priceUsd: number;
  badge?: string;
  description: string;
  features: string[];
  waffoProductIdEnvKey: string;
}

/**
 * Single source of truth for feature credit pricing
 * - Fast Test: 10 credits ($0.50)
 * - Deep Evaluation: 40 credits ($2.00)
 * - Side-by-Side Comparison: 50 credits ($2.50)
 */
export const FEATURE_CREDIT_COSTS = {
  fast: 10,
  deep: 40,
  compare: 50,
} as const;

/**
 * Server-controlled credit package definitions (One-time top-ups).
 * - $1  -> 20 credits
 * - $5  -> 100 credits
 * - $10 -> 250 credits + 50 bonus credits (300 total)
 * - $100 -> 2500 credits
 */
export const CREDIT_PACKAGES: CreditPackageConfig[] = [
  {
    id: 'pack_1usd',
    name: 'Starter Tier',
    credits: 40,
    totalCredits: 40,
    priceUsd: 1.9,
    description: 'Essential lighting and framing check for selected portrait shots.',
    features: [
      '40 portrait credits',
      '4 Fast tests or 1 full Deep assessment',
      'Instant access to all analysis modes',
    ],
    waffoProductIdEnvKey: 'WAFFO_PACK_1USD_PRODUCT_ID',
  },
  {
    id: 'pack_5usd',
    name: 'Standard Tier',
    credits: 100,
    totalCredits: 100,
    priceUsd: 4.9,
    description: 'Comprehensive review across multiple portrait angles and expressions.',
    features: [
      '100 portrait credits',
      '10 Fast tests or 2 Deep assessments + 2 Fast tests',
      'Side-by-side comparative diagnostics',
    ],
    waffoProductIdEnvKey: 'WAFFO_PACK_5USD_PRODUCT_ID',
  },
  {
    id: 'pack_10usd',
    name: 'Popular Tier',
    credits: 250,
    bonusCredits: 50,
    totalCredits: 300,
    priceUsd: 9.9,
    badge: 'Best Value (+50 Bonus)',
    description: 'Full evaluation for portfolio curation and multi-shot selection.',
    features: [
      '300 total credits (250 + 50 bonus)',
      'Up to 30 Fast tests or 7 Deep evaluations',
      'Full facial lighting & composition feedback',
      'Priority processing queue',
    ],
    waffoProductIdEnvKey: 'WAFFO_PACK_10USD_PRODUCT_ID',
  },
  {
    id: 'pack_100usd',
    name: 'Studio Tier',
    credits: 2500,
    totalCredits: 2500,
    priceUsd: 99.9,
    badge: 'Pro / Studio',
    description: 'High-capacity allocation for photography studios and creative projects.',
    features: [
      '2,500 portrait credits',
      'Up to 250 Fast tests or 62 Deep assessments',
      'Side-by-side portrait comparisons',
      'Full access to all current and upcoming metrics',
    ],
    waffoProductIdEnvKey: 'WAFFO_PACK_100USD_PRODUCT_ID',
  },
];

export const ILLUSTRATIVE_CREDIT_PACKAGES = CREDIT_PACKAGES;
