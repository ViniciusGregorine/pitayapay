import { useState } from 'react'
import { CATEGORIES, TRANSACTION_TYPES, TYPE_LABELS, parseAmountToCents, centsToAmountInput } from '@pitayapay/shared'

const COLUMN_COUNT = 6

export default function EditRow({ transaction, onSave, onCancel }) {
  const [form, setForm] = useState({ ...transaction, amount: centsToAmountInput(transaction.amountCents) })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const bind = (field) => ({
    value: form[field],
    onChange: (event) => setForm({ ...form, [field]: event.target.value }),
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const amountCents = parseAmountToCents(form.amount)
    if (!amountCents) return setError('Informe um valor válido, por exemplo 1.250,00.')

    setSaving(true)
    try {
      const { type, date, category, description } = form
      await onSave({ type, amountCents, date, category, description })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <tr className="editing">
      <td colSpan={COLUMN_COUNT}>
        <form className="edit-form" onSubmit={handleSubmit}>
          <input type="date" required aria-label="Data" {...bind('date')} />
          <select aria-label="Tipo" {...bind('type')}>
            {TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
          </select>
          <input inputMode="decimal" required aria-label="Valor (R$)" {...bind('amount')} />
          <select aria-label="Categoria" {...bind('category')}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <input aria-label="Descrição" placeholder="Descrição" {...bind('description')} />
          <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </td>
    </tr>
  )
}
