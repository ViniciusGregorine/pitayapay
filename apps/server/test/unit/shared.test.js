import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAmountToCents, centsToAmountInput } from '@pitayapay/shared'

const VALID_AMOUNTS = {
  '250': 25000,
  '250,1': 25010,
  '250,10': 25010,
  '0,01': 1,
  '1.250': 125000,
  '1.250,10': 125010,
  '1.000.000,99': 100000099,
  '12.5': 1250,
  '1250.10': 125010,
  ' R$ 99,90 ': 9990,
}

for (const [text, cents] of Object.entries(VALID_AMOUNTS)) {
  test(`parses "${text}" as ${cents} cents`, () => {
    assert.equal(parseAmountToCents(text), cents)
  })
}

for (const text of ['', '0', '0,00', '-5', 'abc', '12,345', '1,234,56', '10,5,0']) {
  test(`rejects "${text}" as an amount`, () => {
    assert.equal(parseAmountToCents(text), null)
  })
}

test('formats cents as an editable amount in pt-BR without thousand separators', () => {
  assert.deepEqual([1, 25010, 125000].map(centsToAmountInput), ['0,01', '250,10', '1250,00'])
})

test('formatted input amounts parse back to the same cents', () => {
  for (const cents of [1, 99, 100, 25010, 123456789]) {
    assert.equal(parseAmountToCents(centsToAmountInput(cents)), cents)
  }
})
