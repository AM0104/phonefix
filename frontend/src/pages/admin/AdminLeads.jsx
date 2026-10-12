import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { LEAD_STATUSES, formatDateTime } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, Loading, Pagination, StatusBadge } from '../../components/ui.jsx'

export default function AdminLeads() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .leads({ status: status || undefined, page })
      .then(setData)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [status, page, toast])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (lead, newStatus) => {
    try {
      const response = await adminApi.updateLead(lead.id, { status: newStatus })
      toast.success(response.message)
      load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async (lead) => {
    if (!window.confirm(`Удалить обращение от ${lead.name}?`)) return

    try {
      const response = await adminApi.deleteLead(lead.id)
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
          <h1>Заявки на звонок</h1>
          <p>Лиды из модального окна «Заказать звонок». Отмечайте этап обработки, чтобы ничего не потерялось.</p>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 20 }}>
        <button type="button" className={`chip${status === '' ? ' chip--active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>
          Все
        </button>
        {Object.entries(LEAD_STATUSES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip${status === value ? ' chip--active' : ''}`}
            onClick={() => { setStatus(value); setPage(1) }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && data?.data?.length === 0 && <EmptyState title="Обращений нет" text="Новые заявки появятся здесь автоматически." />}

      {!loading && data?.data?.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Комментарий</th>
                  <th>Источник</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>
                      <a className="accent-text" href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`}>
                        {lead.phone}
                      </a>
                    </td>
                    <td style={{ maxWidth: 320 }}>{lead.comment || '—'}</td>
                    <td>
                      <span className="card__meta">{lead.source}</span>
                    </td>
                    <td>{formatDateTime(lead.created_at)}</td>
                    <td>
                      <StatusBadge status={lead.status} labels={LEAD_STATUSES} />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {lead.status !== 'in_work' && (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => changeStatus(lead, 'in_work')}>
                            В работу
                          </button>
                        )}
                        {lead.status !== 'closed' && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => changeStatus(lead, 'closed')}>
                            Закрыть
                          </button>
                        )}
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(lead)}>
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
    </>
  )
}