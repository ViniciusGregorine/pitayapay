import { useEffect, useState } from 'react'
import { TYPE_LABELS, formatCents } from '@pitayapay/shared'
import { loginFromUrl, hasSession, fetchTransactions, updateTransaction, deleteTransaction } from './api.js'
import EditRow from './EditRow.jsx'

const NO_SESSION_MESSAGE = 'Envie /painel para o bot no Telegram para receber seu link de acesso.'
const CONFIRM_DELETE_MESSAGE = 'Excluir este lançamento? Essa ação não pode ser desfeita.'

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function Totals({ totals }) {
  const balance = totals.incomeCents - totals.expenseCents
  return (
    <section className="totals">
      <div className="income">Receitas<strong>{formatCents(totals.incomeCents)}</strong></div>
      <div className="expense">Despesas<strong>{formatCents(totals.expenseCents)}</strong></div>
      <div>Saldo<strong>{formatCents(balance)}</strong></div>
    </section>
  )
}

function TransactionRow({ transaction: t, onEdit, onDelete }) {
  return (
    <tr className={t.type}>
      <td>{formatDate(t.date)}</td>
      <td>{TYPE_LABELS[t.type]}</td>
      <td className="amount">{formatCents(t.amountCents)}</td>
      <td>{t.category}</td>
      <td>{t.description}</td>
      <td className="actions">
        <button type="button" className="secondary" onClick={onEdit}>Editar</button>
        <button type="button" className="danger" onClick={onDelete}>Excluir</button>
      </td>
    </tr>
  )
}

function TransactionTable({ transactions, editingId, onEdit, onCancelEdit, onSave, onDelete }) {
  if (transactions.length === 0) {
    return <p>Nenhum lançamento ainda. Mande uma mensagem para o bot no Telegram!</p>
  }
  return (
    <table>
      <thead>
        <tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Categoria</th><th>Descrição</th><th aria-label="Ações" /></tr>
      </thead>
      <tbody>
        {transactions.map((t) =>
          t.id === editingId ? (
            <EditRow key={t.id} transaction={t} onSave={(fields) => onSave(t.id, fields)} onCancel={onCancelEdit} />
          ) : (
            <TransactionRow key={t.id} transaction={t} onEdit={() => onEdit(t.id)} onDelete={() => onDelete(t.id)} />
          ),
        )}
      </tbody>
    </table>
  )
}

async function loadPanel() {
  await loginFromUrl()
  if (!hasSession()) throw new Error(NO_SESSION_MESSAGE)
  return fetchTransactions()
}

// The magic link is single-use, so the load must not run twice (e.g. StrictMode effects).
let panelRequest
function loadPanelOnce() {
  panelRequest ??= loadPanel()
  return panelRequest
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadPanelOnce().then(setData).catch((err) => setError(err.message))
  }, [])

  async function reload() {
    setData(await fetchTransactions())
  }

  // Errors here are shown inside the edit row, which stays open so nothing typed is lost.
  async function handleSave(id, fields) {
    await updateTransaction(id, fields)
    setEditingId(null)
    await reload()
  }

  async function handleDelete(id) {
    if (!window.confirm(CONFIRM_DELETE_MESSAGE)) return
    setError(null)
    try {
      await deleteTransaction(id)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main>
      <h1>🌵 PitayaPay</h1>
      {error && <p className="error">{error}</p>}
      {!error && !data && <p>Carregando…</p>}
      {data && (
        <>
          <Totals totals={data.totals} />
          <TransactionTable
            transactions={data.transactions}
            editingId={editingId}
            onEdit={setEditingId}
            onCancelEdit={() => setEditingId(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </>
      )}
    </main>
  )
}
