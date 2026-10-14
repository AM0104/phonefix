import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { APPOINTMENT_STATUSES, formatDateTime } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, Field, Loading, Modal, Pagination, StatusBadge } from '../../components/ui.jsx'

export default function AdminAppointments() {
  const toast = useToast()

  const [data, setData] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  // Переписка с клиентом по заявке.
  const [chatFor, setChatFor] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatText, setChatText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    setLoading(true)

    adminApi
      .appointments({ page, status: filters.status || undefined, search: filters.search || undefined })
      .then(setData)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [page, filters.status, filters.search, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    adminApi.technicians().then((response) => setTechnicians(response.data || []))
  }, [])

  const openEdit = (appointment) => {
    setEditing(appointment)
    setForm({
      status: appointment.status,
      technician_id: appointment.technician_id,
      estimated_price: appointment.estimated_price ?? '',
      final_price: appointment.final_price ?? '',
      admin_comment: appointment.admin_comment || '',
    })
  }

  const save = async (event) => {
    event.preventDefault()

    try {
      const payload = {
        status: form.status,
        technician_id: Number(form.technician_id),
        estimated_price: form.estimated_price === '' ? null : Number(form.estimated_price),
        final_price: form.final_price === '' ? null : Number(form.final_price),
        admin_comment: form.admin_comment,
      }

      const response = await adminApi.updateAppointment(editing.id, payload)
      toast.success(response.message)
      setEditing(null)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const loadMessages = useCallback(
    (appointmentId) => {
      setChatLoading(true)

      adminApi
        .messages(appointmentId)
        .then((response) => setMessages(response.data || []))
        .catch((error) => toast.error(error.message))
        .finally(() => setChatLoading(false))
    },
    [toast],
  )

  const openChat = (appointment) => {
    setChatFor(appointment)
    setChatText('')
    setMessages([])
    loadMessages(appointment.id)
  }

  const sendMessage = async (event) => {
    event.preventDefault()

    const body = chatText.trim()
    if (!body || !chatFor) return

    setSending(true)

    try {
      const response = await adminApi.sendMessage(chatFor.id, body)
      toast.success(response.message || 'Сообщение отправлено')
      setChatText('')
      loadMessages(chatFor.id)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSending(false)
    }
  }

  const remove = async (appointment) => {
    if (!window.confirm(`Удалить заявку №${appointment.id}?`)) return

    try {
      const response = await adminApi.deleteAppointment(appointment.id)
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
          <h1>Заявки клиентов</h1>
          <p>Меняйте статус ремонта, назначайте мастера и фиксируйте итоговую стоимость.</p>
        </div>
      </div>

      <div className="toolbar">
        <Field label="Статус">
          <select value={filters.status} onChange={(event) => { setPage(1); setFilters((c) => ({ ...c, status: event.target.value })) }}>
            <option value="">Все статусы</option>
            {Object.entries(APPOINTMENT_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Поиск">
          <input
            value={filters.search}
            onChange={(event) => setFilters((c) => ({ ...c, search: event.target.value }))}
            placeholder="Клиент, телефон, модель"
          />
        </Field>

        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setFilters({ status: '', search: '' }); setPage(1) }}>
          Сбросить
        </button>
      </div>

      {loading && <Loading />}

      {!loading && data?.data?.length === 0 && <EmptyState title="Заявок нет" text="По выбранным фильтрам ничего не найдено." />}

      {!loading && data?.data?.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>Устройство</th>
                  <th>Услуга</th>
                  <th>Мастер</th>
                  <th>Запись</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>#{appointment.id}</td>
                    <td>
                      {appointment.client?.name}
                      <br />
                      <span className="card__meta">{appointment.client?.phone}</span>
                    </td>
                    <td>
                      {appointment.device_model}
                      <br />
                      <span className="card__meta">{appointment.problem_label}</span>
                    </td>
                    <td>{appointment.service?.title}</td>
                    <td>{appointment.technician?.full_name}</td>
                    <td>{formatDateTime(appointment.scheduled_at)}</td>
                    <td>
                      <StatusBadge status={appointment.status} labels={APPOINTMENT_STATUSES} />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openChat(appointment)}>
                          Переписка
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(appointment)}>
                          Изменить
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(appointment)}>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={data} onPage={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={`Заявка №${editing.id}`}
          subtitle={`${editing.client?.name} · ${editing.device_model}`}
          onClose={() => setEditing(null)}
          wide
        >
          <form className="stack" onSubmit={save}>
            <div className="alert alert--info">
              <strong>Описание проблемы:</strong> {editing.problem_description || 'клиент не описал подробности'}
            </div>

            <div className="form-grid">
              <Field label="Статус">
                <select value={form.status} onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}>
                  {Object.entries(APPOINTMENT_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Мастер">
                <select
                  value={form.technician_id}
                  onChange={(event) => setForm((c) => ({ ...c, technician_id: event.target.value }))}
                >
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.full_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Предварительная цена, ₽">
                <input
                  type="number"
                  min="0"
                  value={form.estimated_price}
                  onChange={(event) => setForm((c) => ({ ...c, estimated_price: event.target.value }))}
                />
              </Field>

              <Field label="Итоговая цена, ₽">
                <input
                  type="number"
                  min="0"
                  value={form.final_price}
                  onChange={(event) => setForm((c) => ({ ...c, final_price: event.target.value }))}
                />
              </Field>

              <Field label="Комментарий мастера" full>
                <textarea
                  value={form.admin_comment}
                  onChange={(event) => setForm((c) => ({ ...c, admin_comment: event.target.value }))}
                  placeholder="Что сделали, какие детали установили, гарантия"
                />
              </Field>
            </div>

            <div className="row">
              <button type="submit" className="btn btn--primary">
                Сохранить
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}
      {chatFor && (
        <Modal
          title={`Переписка по заявке №${chatFor.id}`}
          subtitle={`${chatFor.client?.name || 'Клиент'} · ${chatFor.device_model || ''}`}
          onClose={() => setChatFor(null)}
          wide
        >
          {chatLoading && <Loading label="Загружаем сообщения…" />}

          {!chatLoading && (
            <div className="stack" style={{ gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              {messages.length === 0 && (
                <p className="muted" style={{ margin: 0 }}>
                  Переписки пока нет. Напишите клиенту первым.
                </p>
              )}

              {messages.map((message) => (
                <div key={message.id} style={{ display: 'flex', justifyContent: message.is_from_admin ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '10px 13px',
                      borderRadius: 12,
                      border: '1px solid var(--pf-line)',
                      background: message.is_from_admin ? 'var(--pf-accent-soft)' : 'var(--pf-surface-2)',
                    }}
                  >
                    <div className="card__meta" style={{ marginBottom: 4 }}>
                      {message.is_from_admin ? 'Администратор' : message.author_name || 'Клиент'} ·{' '}
                      {formatDateTime(message.created_at)}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{message.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="stack" style={{ marginTop: 16 }} onSubmit={sendMessage}>
            <Field label="Сообщение клиенту">
              <textarea
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="Например: диагностика закончена, замена дисплея — 4 500 ₽, будет готово к 18:00"
                style={{ minHeight: 90 }}
              />
            </Field>

            <div className="row">
              <button type="submit" className="btn btn--primary" disabled={sending || !chatText.trim()}>
                {sending ? 'Отправляем…' : 'Отправить'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setChatFor(null)}>
                Закрыть
              </button>
            </div>
          </form>
        </Modal>
      )}

    </>
  )
}