import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBrowserLocale, i18n } from '../src/i18n.js'
import english from '../src/locales/en-US.js'
import chinese from '../src/locales/zh-CN.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const placeholders = (message) =>
  [...message.matchAll(/\{([A-Za-z]+)\}/g)].map((match) => match[1]).sort()

function sourceFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? sourceFiles(path.join(dir, entry.name))
        : /\.(vue|js)$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : []
    )
}

test('uses Simplified Chinese only for Simplified Chinese browser locales', () => {
  for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans-CN'])
    assert.equal(getBrowserLocale(language), 'zh-CN')
  for (const language of ['en-US', 'fr-FR', 'zh-TW', 'zh-HK', 'zh-Hant-TW', ''])
    assert.equal(getBrowserLocale(language), 'en-US')
})

test('both languages contain every translation used by the frontend', () => {
  const used = new Set()
  assert.deepEqual(Object.keys(chinese).sort(), Object.keys(english).sort())
  for (const section of Object.keys(english)) {
    assert.deepEqual(Object.keys(chinese[section]).sort(), Object.keys(english[section]).sort())
    for (const key of Object.keys(english[section])) {
      assert.ok(chinese[section][key], `Empty Chinese translation: ${section}.${key}`)
      assert.ok(english[section][key], `Empty English translation: ${section}.${key}`)
      assert.deepEqual(
        placeholders(chinese[section][key]),
        placeholders(english[section][key]),
        `Placeholder mismatch: ${section}.${key}`
      )
    }
  }
  for (const file of sourceFiles(root)) {
    if (file.includes(`${path.sep}locales${path.sep}`)) continue
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /\p{Script=Han}/u, `Untranslated source text: ${file}`)
    for (const match of source.matchAll(/(?:\$t|\bt)\(\s*['"]([a-z]+\.[A-Za-z0-9]+)['"]/g)) {
      const [section, name] = match[1].split('.')
      used.add(match[1])
      assert.ok(english[section]?.[name], `Missing key ${match[1]} in ${file}`)
    }
  }
  for (const [section, messages] of Object.entries(english)) {
    if (section === 'api') continue
    for (const key of Object.keys(messages))
      assert.ok(used.has(`${section}.${key}`), `Unused translation: ${section}.${key}`)
  }
})

test('interpolates amounts in both languages', () => {
  const original = i18n.global.locale.value
  try {
    i18n.global.locale.value = 'en-US'
    assert.equal(
      i18n.global.t('swap.swapEstimate', { fee: 1, amount: 2, token: 'USDT' }),
      'Estimated fee: 1 TRX; minimum received: 2 USDT'
    )
    i18n.global.locale.value = 'zh-CN'
    assert.match(
      i18n.global.t('swap.swapEstimate', { fee: 1, amount: 2, token: 'USDT' }),
      /1.*2.*USDT/
    )
  } finally {
    i18n.global.locale.value = original
  }
})

test('compiles every message in both languages', () => {
  const original = i18n.global.locale.value
  const params = {
    amount: 2,
    fee: 1,
    token: 'TRX',
    change: 'gain',
    resource: 'energy',
    deduct: 3,
    kind: 'smart contract'
  }
  try {
    for (const language of ['zh-CN', 'en-US']) {
      i18n.global.locale.value = language
      for (const [section, messages] of Object.entries(english)) {
        for (const key of Object.keys(messages)) {
          const rendered = i18n.global.t(`${section}.${key}`, params)
          assert.ok(rendered, `Failed to render ${language} ${section}.${key}`)
        }
      }
    }
  } finally {
    i18n.global.locale.value = original
  }
})
