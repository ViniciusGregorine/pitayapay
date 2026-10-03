import { useEffect, useState } from 'react'
import { TYPE_LABELS, formatCents } from '@pitayapay/shared'
import { loginFromUrl, hasSession, fetchTransactions } from './api.js'

const NO_SESSION_MESSAGE = 'Envie /painel para o bot no Telegram para receber seu link de acesso.'

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

function TransactionTable({ transactions }) {
  if (transactions.length === 0) {
    return <p>Nenhum lançamento ainda. Mande uma mensagem para o bot no Telegram!</p>
  }
  return (
    <table>
      <thead>
        <tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Categoria</th><th>Descrição</th></tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} className={t.type}>
            <td>{formatDate(t.date)}</td>
            <td>{TYPE_LABELS[t.type]}</td>
            <td className="amount">{formatCents(t.amountCents)}</td>
            <td>{t.category}</td>
            <td>{t.description}</td>
          </tr>
        ))}
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

  useEffect(() => {
    loadPanelOnce().then(setData).catch((err) => setError(err.message))
  }, [])

  return (
    <main>
      <h1>🌵 PitayaPay</h1>
      {error && <p className="error">{error}</p>}
      {!error && !data && <p>Carregando…</p>}
      {data && (
        <>
          <Totals totals={data.totals} />
          <TransactionTable transactions={data.transactions} />
        </>
      )}
    </main>
  )
}
