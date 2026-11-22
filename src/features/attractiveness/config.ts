export const ATTRACTIVENESS_CREDIT_COSTS = {
  fast: 10,
  deep: 40,
  compare: 50,
} as const;

export const ATTRACTIVENESS_CONFIG = {
  id: 'attractiveness',
  name: 'Attractiveness Test',
  href: '/attractiveness-test',
  apiEndpoint: '/api/apps/attractiveness/portrait',
  jobEndpoint: '/api/jobs',
  creditCosts: ATTRACTIVENESS_CREDIT_COSTS,
} as const;
