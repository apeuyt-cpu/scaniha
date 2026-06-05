export const TND_BASE_RATES: Record<string, number> = {
  TND: 1,
  USD: 0.32,
  EUR: 0.29,
  GBP: 0.25,
  JPY: 47,
  CAD: 0.44,
  AUD: 0.49,
  CHF: 0.31,
  CNY: 2.35,
  AED: 1.18,
  SAR: 1.20,
  KWD: 0.098,
  BHD: 0.12,
  QAR: 1.17,
  OMR: 0.12,
  EGP: 15.50,
  MAD: 3.18,
  DZD: 43.50,
  LYD: 1.55,
  NOK: 3.40,
  SEK: 3.30,
  DKK: 2.20,
  PLN: 1.25,
  TRY: 10.80,
  RUB: 28.50,
  INR: 26.50,
  PKR: 88,
  BDT: 35,
  MYR: 1.40,
  SGD: 0.43,
  HKD: 2.50,
  KRW: 425,
  ZAR: 5.80,
  BRL: 1.65,
  MXN: 5.50,
  NGN: 420,
}

export function isRateAvailable(code: string): boolean {
  return code in TND_BASE_RATES
}

export function convertFromTnd(amountTnd: number, targetCurrency: string): number {
  const rate = TND_BASE_RATES[targetCurrency]
  if (!rate) return amountTnd
  return amountTnd * rate
}
