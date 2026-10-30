import { CATEGORIES, TRANSACTION_TYPES, TYPE_LABELS } from '@pitayapay/shared'

export const NO_FILTERS = { from: '', to: '', type: '', category: '' }

export default function Filters({ filters, onChange }) {
  const bind = (field) => ({
    value: filters[field],
    onChange: (event) => onChange({ ...filters, [field]: event.target.value }),
  })

  return (
    <section className="filters" aria-label="Filtros">
      <label>De <input type="date" max={filters.to || undefined} {...bind('from')} /></label>
      <label>Até <input type="date" min={filters.from || undefined} {...bind('to')} /></label>
      <select aria-label="Tipo" {...bind('type')}>
        <option value="">Receitas e despesas</option>
        {TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
      </select>
      <select aria-label="Categoria" {...bind('category')}>
        <option value="">Todas as categorias</option>
        {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
      </select>
      <button type="button" className="secondary" onClick={() => onChange(NO_FILTERS)}>Limpar filtros</button>
    </section>
  )
}
