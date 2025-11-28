
export enum BillingType {
  UNDEFINED = 'UNDEFINED',
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX',
}

export enum Cycle {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUALLY = 'SEMIANNUALLY',
  YEARLY = 'YEARLY',
}

export interface Discount {
  value: number;
  dueDateLimitDays: number;
  type: 'FIXED' | 'PERCENTAGE';
}

export interface Interest {
  value: number;
}

export interface Fine {
  value: number;
  type: 'FIXED' | 'PERCENTAGE';
}

export interface Split {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  externalReference?: string;
  description?: string;
}

export interface Callback {
  successUrl: string;
  autoRedirect: boolean;
}

export interface Signature {
  customer: string;
  billingType: BillingType;
  value: number;
  nextDueDate: Date;
  discount?: Discount;
  interest?: Interest;
  fine?: Fine;
  cycle: Cycle;
  description?: string;
  endDate?: Date;
  maxPayments?: number;
  externalReference?: string;
  split?: Split[];
  callback?: Callback;
}
