export interface CreditCheckoutParams {
  userId: string;
  userEmail: string;
  packId: string;
  credits: number;
  priceUsd: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  orderId?: string;
}

export interface WebhookEventPayload {
  id: string; // provider delivery ID
  eventType: string; // 'order.completed' | 'order.refunded' etc.
  timestamp: string;
  mode: string; // 'test' | 'prod'
  storeId?: string;
  data: {
    orderId: string;
    buyerEmail?: string;
    amount?: string;
    currency?: string;
    productName?: string;
    orderMetadata?: Record<string, string>;
    productMetadata?: Record<string, string>;
    merchantProvidedBuyerIdentity?: string;
  };
}

export interface PaymentProvider {
  readonly name: string;
  createCreditCheckout(params: CreditCheckoutParams): Promise<CheckoutResult>;
  verifyWebhook(request: Request): Promise<WebhookEventPayload>;
}
