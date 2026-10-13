import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { ROLES, formatDateTime } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { Field, Loading, Modal, Pagination, StatusBadge } from '../../components/ui.jsx'

const EMPTY = { name: '', email: '', password: '', role: 'client', phone: '', is_active: true }

export default function AdminUsers() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .users({ page, role: role || undefined, search: search || undefined })
      .then(setData)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [page, role, search, toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '', is_active: user.is_active })
    setEditingId(user.id)
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = { ...form }

    if (editingId && !payload.password) {
      delete payload.password
    }

    try {
      const response = editingId ? await adminApi.updateUser(editingId, payload) : await adminApi.createUser(payload)
      toast.success(response.message)
      setOpen(false)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (user) => {
    if (!window.confirm(`Удалить пользователя ${user.name}?`)) return

    try {
      const response = await adminApi.deleteUser(user.id)
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
          <h1>Пользователи и роли</h1>
          <p>Три роли: клиент, мастер и администратор. Роль определяет доступ к админ-панели.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          + Добавить пользователя
        </button>
      </div>

      <div className="toolbar">
        <Field label="Роль">
          <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value) }}>
            <option value="">Все роли</option>
            {Object.entries(ROLES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Поиск">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, e-mail, телефон" />
        </Field>
      </div>

      {loading && <Loading />}

      {!loading && data?.data?.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Телефон</th>
                  <th>Заявок</th>
                  <th>Регистрация</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      <br />
                      <span className="card__meta">{user.email}</span>
                    </td>
                    <td>
                      <span className="badge badge--accent">{ROLES[user.role]}</span>
                    </td>
                    <td>{user.phone || '—'}</td>
                    <td>{user.appointments_count}</td>
                    <td>{formatDateTime(user.created_at)}</td>
                    <td>
                      <StatusBadge
                        status={user.is_active ? 'published' : 'rejected'}
                        labels={{ published: 'Активен', rejected: 'Заблокирован' }}
                      />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(user)}>
                          Изменить
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(user)}>
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

      {open && (
        <Modal
          title={editingId ? 'Редактирование пользователя' : 'Новый пользователь'}
          subtitle={editingId ? 'Пустой пароль — пароль не меняется.' : undefined}
          onClose={() => setOpen(false)}
        >
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Имя *">
                <input value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} required />
              </Field>

              <Field label="E-mail *">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
                  required
                />
              </Field>

              <Field label={editingId ? 'Новый пароль' : 'Пароль *'}>
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))}
                  required={!editingId}
                  minLength={editingId ? 0 : 8}
                />
              </Field>

              <Field label="Роль *">
                <select value={form.role} onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))}>
                  {Object.entries(ROLES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Телефон">
                <input value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
              </Field>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((c) => ({ ...c, is_active: event.target.checked }))}
              />
              Доступ разрешён
            </label>

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