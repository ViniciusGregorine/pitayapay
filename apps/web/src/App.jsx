import { useEffect, useRef, useState } from 'react'
import { TYPE_LABELS, formatCents } from '@pitayapay/shared'
import { loginFromUrl, hasSession, fetchTransactions, updateTransaction, deleteTransaction } from './api.js'
import EditRow from './EditRow.jsx'
import Filters, { NO_FILTERS } from './Filters.jsx'

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

function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event) => !menuRef.current.contains(event.target) && setOpen(false)
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (action) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className="row-menu" ref={menuRef}>
      <button
        type="button"
        className="secondary"
        aria-label="Ações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⋯
      </button>
      {open && (
        <div className="row-menu-items" role="menu">
          <button type="button" role="menuitem" className="secondary" onClick={choose(onEdit)}>Editar</button>
          <button type="button" role="menuitem" className="danger" onClick={choose(onDelete)}>Excluir</button>
        </div>
      )}
    </div>
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
        <RowMenu onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function TransactionTable({ transactions, filtered, editingId, onEdit, onCancelEdit, onSave, onDelete }) {
  if (transactions.length === 0) {
    return filtered
      ? <p>Nenhum lançamento encontrado com esses filtros.</p>
      : <p>Nenhum lançamento ainda. Mande uma mensagem para o bot no Telegram!</p>
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

async function startSession() {
  await loginFromUrl()
  if (!hasSession()) throw new Error(NO_SESSION_MESSAGE)
}

// The magic link is single-use, so the login must not run twice (e.g. StrictMode effects).
let sessionRequest
function startSessionOnce() {
  sessionRequest ??= startSession()
  return sessionRequest
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState(NO_FILTERS)

  // A response for filters that already changed again is ignored, so the list never goes back to old filters.
  useEffect(() => {
    let stale = false
    startSessionOnce()
      .then(() => fetchTransactions(filters))
      .then((result) => {
        if (stale) return
        setData(result)
        setError(null)
      })
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [filters])

  async function reload() {
    setData(await fetchTransactions(filters))
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
          <Filters filters={filters} onChange={setFilters} />
          <Totals totals={data.totals} />
          <TransactionTable
            transactions={data.transactions}
            filtered={Object.values(filters).some(Boolean)}
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
