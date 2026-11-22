export const COLOR_ANALYSIS_CREDIT_COSTS = {
  quick: 10,
  full: 40,
} as const;

export const COLOR_ANALYSIS_CONFIG = {
  id: 'color-analysis',
  name: 'Personal Color Analysis',
  href: '/color-analysis',
  apiEndpoint: '/api/apps/color-analysis',
  jobEndpoint: '/api/jobs',
  creditCosts: COLOR_ANALYSIS_CREDIT_COSTS,
} as const;
