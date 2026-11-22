export interface PortalAppEntry {
  id: string;
  name: string;
  tagline: string;
  href: string;
  status: 'live' | 'coming_soon';
  previewImage?: string;
  accentSwatches?: string[];
}

/**
 * Static metadata registry for ColorAI Portal apps.
 * Keep this file pure data only — NEVER import feature code here so
 * reading the registry never pulls other apps into context.
 */
export const PORTAL_APPS: readonly PortalAppEntry[] = [
  {
    id: 'attractiveness',
    name: 'Attractiveness Test',
    tagline: 'Portrait lighting, framing, symmetry diagnostics & side-by-side comparison.',
    href: '/attractiveness-test',
    status: 'live',
    previewImage: '/imgs/analysis.png',
  },
  {
    id: 'color-analysis',
    name: 'Personal Color Analysis',
    tagline: 'Seasonal undertone palette, wardrobe shades, hair & makeup color harmony.',
    href: '/color-analysis',
    status: 'coming_soon',
    accentSwatches: ['#f3d5c1', '#d98a7c', '#b95068', '#6b7d65', '#2f3e4e'],
  },
] as const;

export function getPortalAppById(id: string): PortalAppEntry | undefined {
  return PORTAL_APPS.find((app) => app.id === id);
}
