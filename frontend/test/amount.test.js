import test from 'node:test'
import assert from 'node:assert/strict'
import { toSun } from '../src/common/amount.js'

test('keeps six decimal places exact when adding amounts and fees', () => {
  assert.equal(toSun('999.999999').plus(toSun('0.000001')).toString(), '1000000000')
  assert.equal(toSun('123456789012.123456').toString(), '123456789012123456')
})

test('rejects invalid transaction amounts', () => {
  for (const value of ['0', '-1', '1.0000001', '1e3', '1,000', '']) {
    assert.throws(() => toSun(value))
  }
  assert.equal(toSun('0', true).toString(), '0')
})
