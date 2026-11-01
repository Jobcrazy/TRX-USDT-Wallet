import Decimal from 'decimal.js'

export const nearUsd = (amount, price) => {
  if (!/^\d+(?:\.\d{1,6})?$/.test(String(amount ?? '')) || !price) return ''
  try {
    const value = new Decimal(amount).mul(price)
    return value.isFinite() && value.gt(0)
      ? value.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed(2)
      : ''
  } catch {
    return ''
  }
}
