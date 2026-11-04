export interface PaymentOrderParams {
  orderId: string;
  jobId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  gateway?: 'PHONEPE' | 'RAZORPAY' | 'MOCK';
}

export interface PaymentInitiationResult {
  paymentId: string;
  gateway: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
  paymentToken?: string;
}

/**
 * Centralized payment gateway adapter
 */
export async function initiatePaymentOrder(
  params: PaymentOrderParams
): Promise<PaymentInitiationResult> {
  const gateway = params.gateway || 'MOCK';

  // In production, instantiate PhonePe / Razorpay SDK with platform credentials
  if (gateway === 'PHONEPE') {
    return {
      paymentId: `PAY_PHONEPE_${Date.now()}`,
      gateway: 'PHONEPE',
      amount: params.amount,
      currency: 'INR',
      redirectUrl: `/track/${params.jobId}?gateway=phonepe&mockPay=1`,
      paymentToken: `token_phonepe_${params.jobId}`,
    };
  }

  // Default Mock / Sandbox Provider for immediate offline & testing capability
  return {
    paymentId: `PAY_MOCK_${Date.now()}`,
    gateway: 'MOCK',
    amount: params.amount,
    currency: 'INR',
    redirectUrl: `/track/${params.jobId}?mockPay=1`,
    paymentToken: `mock_token_${params.jobId}`,
  };
}

export function verifyPaymentSignature(
  transactionId: string,
  signature?: string
): boolean {
  // In sandbox, accept all valid string signatures
  return Boolean(transactionId);
}

