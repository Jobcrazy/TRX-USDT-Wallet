import { t } from '../i18n.js'
import Decimal from 'decimal.js'

export function toSun(value, allowZero = false) {
  const text = String(value ?? '').trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text)) {
    throw new Error(t('common.invalidAmount'))
  }
  const [whole, fraction = ''] = text.split('.')
  const units = new Decimal(whole).mul(1000000).plus(fraction.padEnd(6, '0'))
  if (!allowZero && units.isZero()) throw new Error(t('common.positiveAmount'))
  return units
}
