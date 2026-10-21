import Decimal from 'decimal.js'

export function toSun(value, allowZero = false) {
  const text = String(value ?? '').trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text)) {
    throw new Error('请输入有效的数量，最多六位小数')
  }
  const [whole, fraction = ''] = text.split('.')
  const units = new Decimal(whole).mul(1000000).plus(fraction.padEnd(6, '0'))
  if (!allowZero && units.isZero()) throw new Error('数量必须大于零')
  return units
}
