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
    </>
  )
}