import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/client.js'
import { formatDateTime } from '../../api/constants.js'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, Field, Loading, Modal, StatusBadge } from '../../components/ui.jsx'

const EMPTY = {
  title: '',
  category: 'Советы',
  excerpt: '',
  body: '',
  is_published: true,
}

export default function AdminContent() {
  const toast = useToast()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .articles()
      .then((data) => setArticles(data.data || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (article) => {
    setForm({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt || '',
      body: article.body,
      is_published: article.is_published,
    })
    setEditingId(article.id)
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)

    try {
      const response = editingId ? await adminApi.updateArticle(editingId, form) : await adminApi.createArticle(form)
      toast.success(response.message)
      setOpen(false)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (article) => {
    if (!window.confirm(`Удалить статью «${article.title}»?`)) return

    try {
      const response = await adminApi.deleteArticle(article.id)
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
          <h1>Статьи и блог</h1>
          <p>Полезные материалы для клиентов: советы мастеров, разборы поломок, новости сервиса.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          + Новая статья
        </button>
      </div>

      {loading && <Loading />}

      {!loading && articles.length === 0 && <EmptyState title="Статей нет" text="Добавьте первую статью — она появится в разделе «Блог»." />}

      {!loading && articles.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Заголовок</th>
                <th>Категория</th>
                <th>Опубликовано</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    {article.title}
                    <br />
                    <span className="card__meta">/blog/{article.slug}</span>
                  </td>
                  <td>{article.category}</td>
                  <td>{formatDateTime(article.published_at)}</td>
                  <td>
                    <StatusBadge
                      status={article.is_published ? 'published' : 'rejected'}
                      labels={{ published: 'Опубликована', rejected: 'Черновик' }}
                    />
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(article)}>
                        Изменить
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(article)}>
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
          title={editingId ? 'Редактирование статьи' : 'Новая статья'}
          subtitle="Текст статьи разбивается на абзацы по строкам."
          onClose={() => setOpen(false)}
          wide
        >
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Заголовок *" full>
                <input value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} required />
              </Field>

              <Field label="Категория *">
                <input value={form.category} onChange={(event) => setForm((c) => ({ ...c, category: event.target.value }))} required />
              </Field>

              <Field label="Краткое описание">
                <input value={form.excerpt} onChange={(event) => setForm((c) => ({ ...c, excerpt: event.target.value }))} />
              </Field>

              <Field label="Текст статьи *" full>
                <textarea
                  value={form.body}
                  onChange={(event) => setForm((c) => ({ ...c, body: event.target.value }))}
                  style={{ minHeight: 260 }}
                  required
                />
              </Field>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setForm((c) => ({ ...c, is_published: event.target.checked }))}
              />
              Опубликовать на сайте
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