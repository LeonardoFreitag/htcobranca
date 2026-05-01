import type { ClientModel } from "./ClientModel";

export const PaymentStatus = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  CONFIRMED: 'CONFIRMED',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  RECEIVED_IN_CASH: 'RECEIVED_IN_CASH',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_IN_PROGRESS: 'REFUND_IN_PROGRESS',
  CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL: 'AWAITING_CHARGEBACK_REVERSAL',
  DUNNING_REQUESTED: 'DUNNING_REQUESTED',
  DUNNING_RECEIVED: 'DUNNING_RECEIVED',
  AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const PaymentBillingType = {
  BOLETO: 'BOLETO',
  CREDIT_CARD: 'CREDIT_CARD',
  PIX: 'PIX',
  UNDEFINED: 'UNDEFINED',
} as const;

export type PaymentBillingType = typeof PaymentBillingType[keyof typeof PaymentBillingType];

export const DiscountType = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const;

export type DiscountType = typeof DiscountType[keyof typeof DiscountType];

export const FineType = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const;

export type FineType = typeof FineType[keyof typeof FineType];

export const InterestType = {
  PERCENTAGE: 'PERCENTAGE',
} as const;

export type InterestType = typeof InterestType[keyof typeof InterestType];

export interface PaymentDiscount {
  value: number;
  limitDate: string | null;
  dueDateLimitDays: number;
  type: DiscountType;
}

export interface PaymentFine {
  value: number;
  type: FineType;
}

export interface PaymentInterest {
  value: number;
  type: InterestType;
}

export interface PaymentModel {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  clientDetail: ClientModel | null;
  subscription: string | null;
  checkoutSession: string | null;
  paymentLink: string | null;
  value: number;
  netValue: number;
  originalValue: number | null;
  interestValue: number | null;
  description: string | null;
  billingType: PaymentBillingType;
  canBePaidAfterDueDate: boolean;
  pixTransaction: string | null;
  status: PaymentStatus;
  dueDate: string;
  originalDueDate: string;
  paymentDate: string | null;
  clientPaymentDate: string | null;
  installmentNumber: number | null;
  invoiceUrl: string;
  invoiceNumber: string;
  externalReference: string | null;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  creditDate: string | null;
  estimatedCreditDate: string | null;
  transactionReceiptUrl: string | null;
  nossoNumero: string | null;
  bankSlipUrl: string | null;
  lastInvoiceViewedDate: string | null;
  lastBankSlipViewedDate: string | null;
  discount: PaymentDiscount;
  fine: PaymentFine;
  interest: PaymentInterest;
  postalService: boolean;
  escrow: any | null;
  refunds: any | null;
}

export interface PaymentListResponse {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: PaymentModel[];
}
