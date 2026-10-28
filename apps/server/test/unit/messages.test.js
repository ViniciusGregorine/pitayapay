import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as msg from '../../src/bot/messages.js'

const PARSED = { type: 'expense', amountCents: 25010, date: '2026-10-02', category: 'Combustível', description: 'Diesel' }

function buttons(keyboard) {
  return keyboard.inline_keyboard.flat().map(({ text, callback_data }) => [text, callback_data])
}

test('summarizes a draft in Portuguese with BRL amount and DD/MM/YYYY date', () => {
  const summary = msg.draftSummary(PARSED)

  assert.equal(summary, [
    'Tipo: Despesa',
    'Valor: R$\u00a0250,10', // Intl puts a non-breaking space after R$
    'Data: 02/10/2026',
    'Categoria: Combustível',
    'Descrição: Diesel',
  ].join('\n'))
})

test('shows a dash when the description is empty', () => {
  assert.match(msg.draftSummary({ ...PARSED, description: '' }), /Descrição: —$/)
})

test('asks for a single missing field', () => {
  assert.equal(msg.askMissing(['type']), 'Para registrar, preciso saber se é receita ou despesa. Pode me dizer?')
})

test('asks for every missing field in a single sentence', () => {
  assert.equal(msg.askMissing(['amountCents', 'date']), 'Para registrar, preciso saber o valor e a data. Pode me dizer?')
})

test('confirm keyboard carries the draft id in every button', () => {
  assert.deepEqual(buttons(msg.confirmKeyboard(12)), [
    ['✅ Confirmar', 'confirm:12'],
    ['✏️ Corrigir', 'correct:12'],
    ['❌ Cancelar', 'cancel:12'],
  ])
})

test('cancel keyboard offers only the cancel button', () => {
  assert.deepEqual(buttons(msg.cancelKeyboard(7)), [['❌ Cancelar', 'cancel:7']])
})

test('confirm prompt and saved message include the draft summary', () => {
  assert.equal(msg.confirmPrompt(PARSED), `Confere o lançamento?\n\n${msg.draftSummary(PARSED)}`)
  assert.equal(msg.savedMessage(PARSED), `✅ Lançamento salvo!\n\n${msg.draftSummary(PARSED)}`)
})

test('cancelled message confirms the cancellation', () => {
  assert.equal(msg.cancelledMessage(), '❌ Lançamento cancelado.')
})

test('panel link message contains the url and its validity', () => {
  const text = msg.panelLink('http://x/?token=abc')

  assert.match(text, /15 minutos, uso único/)
  assert.match(text, /\nhttp:\/\/x\/\?token=abc$/)
})
