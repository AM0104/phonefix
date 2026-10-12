export const SERVICE_CATEGORIES = {
  diagnostics: 'Диагностика',
  screen: 'Замена экранов',
  parts: 'Замена комплектующих',
  software: 'Обновление ПО',
  other: 'Прочие услуги',
}

export const APPOINTMENT_STATUSES = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  in_progress: 'В работе',
  done: 'Выполнена',
  canceled: 'Отменена',
}

export const PROBLEM_TYPES = {
  diagnostics: 'Диагностика',
  screen: 'Разбит экран / дисплей',
  parts: 'Неисправность комплектующих',
  software: 'Проблема с ПО',
  other: 'Другое',
}

export const LEAD_STATUSES = {
  new: 'Новая',
  in_work: 'В работе',
  closed: 'Обработана',
}

export const REVIEW_STATUSES = {
  pending: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён',
}

export const ROLES = {
  client: 'Клиент',
  technician: 'Мастер',
  admin: 'Администратор',
}

export const STATUS_TONE = {
  new: 'accent',
  confirmed: 'accent',
  in_progress: 'info',
  done: 'success',
  canceled: 'danger',
  pending: 'info',
  published: 'success',
  rejected: 'danger',
  in_work: 'accent',
  closed: 'success',
}

export function formatPrice(value) {
  const number = Number(value || 0)
  return `${number.toLocaleString('ru-RU')} ₽`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}