import { CREDIT_PACKAGES, CreditPackageConfig } from '@/lib/config';

/**
 * Server-controlled credit packages.
 * No client-supplied credit grants or price manipulation permitted.
 */
export function getCreditPackageById(packId: string): CreditPackageConfig | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packId);
}

export function getAllCreditPackages(): CreditPackageConfig[] {
  return [...CREDIT_PACKAGES];
}

export function getWaffoProductIdForPack(pack: CreditPackageConfig): string {
  // Check starter product ID alias
  if ((pack.id === 'pack_1usd' || pack.id === 'pack_starter') && process.env.WAFFO_PACK_STARTER_PRODUCT_ID) {
    return process.env.WAFFO_PACK_STARTER_PRODUCT_ID;
  }

  const envProductId = process.env[pack.waffoProductIdEnvKey];
  if (envProductId) return envProductId;

  // Fallback to generic product ID if specific pack ID is not defined
  const fallbackId = process.env.WAFFO_CREDITS_PRODUCT_ID;
  if (fallbackId) return fallbackId;

  // If running locally in development without credentials, provide predictable mock ID
  return `mock_product_${pack.id}`;
}
