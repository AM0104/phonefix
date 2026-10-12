import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { SERVICE_CATEGORIES, formatPrice } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { Field, Loading, Modal, StatusBadge } from '../../components/ui.jsx'

const EMPTY = {
  title: '',
  category: 'diagnostics',
  short_description: '',
  description: '',
  price_from: 0,
  price_to: '',
  duration_minutes: 60,
  warranty: '',
  is_active: true,
  is_popular: false,
  sort_order: 0,
}

export default function AdminServices() {
  const toast = useToast()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .services({ category: category || undefined })
      .then((data) => setServices(data.data || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [category, toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (service) => {
    setForm({
      title: service.title,
      category: service.category,
      short_description: service.short_description,
      description: service.description || '',
      price_from: service.price_from,
      price_to: service.price_to ?? '',
      duration_minutes: service.duration_minutes,
      warranty: service.warranty || '',
      is_active: service.is_active,
      is_popular: service.is_popular,
      sort_order: service.sort_order,
    })
    setEditingId(service.id)
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      price_from: Number(form.price_from),
      price_to: form.price_to === '' ? null : Number(form.price_to),
      duration_minutes: Number(form.duration_minutes),
      sort_order: Number(form.sort_order),
    }

    try {
      const response = editingId ? await adminApi.updateService(editingId, payload) : await adminApi.createService(payload)
      toast.success(response.message)
      setOpen(false)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (service) => {
    if (!window.confirm(`Удалить услугу «${service.title}»?`)) return

    try {
      const response = await adminApi.deleteService(service.id)
      toast.success(response.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Услуги и цены</h1>
          <p>Управляйте каталогом: тексты, цены «от» и «до», сроки, гарантия и порядок вывода.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          + Добавить услугу
        </button>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 20 }}>
        <button type="button" className={`chip${category === '' ? ' chip--active' : ''}`} onClick={() => setCategory('')}>
          Все
        </button>
        {Object.entries(SERVICE_CATEGORIES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip${category === value ? ' chip--active' : ''}`}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Срок</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>
                    {service.title}
                    {service.is_popular && <span className="badge badge--accent" style={{ marginLeft: 8 }}>Хит</span>}
                  </td>
                  <td>{service.category_label}</td>
                  <td>{service.price_label || formatPrice(service.price_from)}</td>
                  <td>{service.duration_minutes} мин</td>
                  <td>
                    <StatusBadge status={service.is_active ? 'published' : 'rejected'} labels={{ published: 'Активна', rejected: 'Скрыта' }} />
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(service)}>
                        Изменить
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(service)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          title={editingId ? 'Редактирование услуги' : 'Новая услуга'}
          subtitle="Поля с звёздочкой обязательны. Цена «до» можно оставить пустой."
          onClose={() => setOpen(false)}
          wide
        >
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Название *" full>
                <input
                  value={form.title}
                  onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))}
                  required
                  placeholder="Замена дисплейного модуля"
                />
              </Field>

              <Field label="Категория *">
                <select value={form.category} onChange={(event) => setForm((c) => ({ ...c, category: event.target.value }))}>
                  {Object.entries(SERVICE_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Срок выполнения, минут *">
                <input
                  type="number"
                  min="15"
                  value={form.duration_minutes}
                  onChange={(event) => setForm((c) => ({ ...c, duration_minutes: event.target.value }))}
                  required
                />
              </Field>

              <Field label="Цена от, ₽ *">
                <input
                  type="number"
                  min="0"
                  value={form.price_from}
                  onChange={(event) => setForm((c) => ({ ...c, price_from: event.target.value }))}
                  required
                />
              </Field>

              <Field label="Цена до, ₽">
                <input
                  type="number"
                  min="0"
                  value={form.price_to}
                  onChange={(event) => setForm((c) => ({ ...c, price_to: event.target.value }))}
                  placeholder="Пусто — цена «от»"
                />
              </Field>

              <Field label="Гарантия">
                <input
                  value={form.warranty}
                  onChange={(event) => setForm((c) => ({ ...c, warranty: event.target.value }))}
                  placeholder="6 месяцев"
                />
              </Field>

              <Field label="Порядок вывода">
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) => setForm((c) => ({ ...c, sort_order: event.target.value }))}
                />
              </Field>

              <Field label="Краткое описание *" full hint="Показывается в карточке услуги">
                <textarea
                  value={form.short_description}
                  onChange={(event) => setForm((c) => ({ ...c, short_description: event.target.value }))}
                  required
                  maxLength={500}
                />
              </Field>

              <Field label="Полное описание" full hint="Каждая строка — отдельный абзац">
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
                  style={{ minHeight: 150 }}
                />
              </Field>
            </div>

            <div className="row" style={{ gap: 22 }}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((c) => ({ ...c, is_active: event.target.checked }))}
                />
                Показывать на сайте
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.is_popular}
                  onChange={(event) => setForm((c) => ({ ...c, is_popular: event.target.checked }))}
                />
                Отметить как популярную
              </label>
            </div>

            <div className="row">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}