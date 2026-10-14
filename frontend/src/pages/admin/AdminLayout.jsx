import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import AdminNotifications from '../../components/AdminNotifications.jsx'

const NAV_GROUPS = [
  {
    title: 'Работа',
    links: [
      { to: '/admin', label: 'Дашборд', end: true },
      { to: '/admin/appointments', label: 'Заявки' },
      { to: '/admin/schedule', label: 'Расписание' },
      { to: '/admin/leads', label: 'Заявки на звонок' },
    ],
  },
  {
    title: 'Контент',
    links: [
      { to: '/admin/services', label: 'Услуги и цены' },
      { to: '/admin/technicians', label: 'Мастера' },
      { to: '/admin/reviews', label: 'Отзывы' },
      { to: '/admin/content', label: 'Статьи и блог' },
      { to: '/admin/settings', label: 'Тексты сайта' },
    ],
  },
  {
    title: 'Доступ',
    links: [{ to: '/admin/users', label: 'Пользователи' }],
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Вы вышли из админ-панели')
    navigate('/')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <NavLink to="/" className="logo">
          <span className="logo__mark">PF</span>
          <span className="logo__text">
            PhoneFix
            <small>админ-панель</small>
          </span>
        </NavLink>

        <nav className="admin-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="admin-nav__group">{group.title}</div>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="card card--flat" style={{ marginTop: 'auto' }}>
          <span className="card__meta">Вы вошли как</span>
          <div className="row row--between" style={{ alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>{user?.name}</div>
            <AdminNotifications />
          </div>
          <span className="card__meta">Администратор</span>
          <div className="stack" style={{ marginTop: 14, gap: 8 }}>
            <NavLink className="btn btn--ghost btn--sm" to="/">
              На сайт
            </NavLink>
            <button type="button" className="btn btn--danger btn--sm" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}