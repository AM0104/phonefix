import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSite } from '../context/SiteContext.jsx'
import { useModal } from '../context/ModalContext.jsx'

const NAV = [
  { to: '/', label: 'Главная', end: true },
  { to: '/services', label: 'Услуги' },
  { to: '/technicians', label: 'Мастера' },
  { to: '/booking', label: 'Онлайн-запись' },
  { to: '/reviews', label: 'Отзывы' },
  { to: '/blog', label: 'Блог' },
  { to: '/contacts', label: 'Контакты' },
]

function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { setting } = useSite()
  const { openCallback } = useModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const userRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
    setUserOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="logo">
          <span className="logo__mark">PF</span>
          <span className="logo__text">
            {setting('site_name', 'PhoneFix')}
            <small>сервисный центр</small>
          </span>
        </Link>

        <nav className={`main-nav${menuOpen ? ' main-nav--open' : ''}`}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="header-phone">
            <strong>{setting('site_phone')}</strong>
            <span>{setting('work_time_weekdays')}</span>
          </div>

          <button type="button" className="btn btn--outline btn--sm" onClick={() => openCallback('header')}>
            Заказать звонок
          </button>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={userRef}>
              <button
                type="button"
                className="user-chip"
                title={user.name}
                onClick={() => setUserOpen((open) => !open)}
              >
                <span className="user-chip__avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-chip__name">{user.name.split(' ')[0]}</span>
              </button>

              {userOpen && (
                <div className="dropdown">
                  <Link to="/account">Личный кабинет</Link>
                  <Link to="/account/appointments">Мои заявки</Link>
                  {isAdmin && <Link to="/admin">Админ-панель</Link>}
                  <div className="dropdown__divider" />
                  <button type="button" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="btn btn--primary btn--sm" to="/login">
              Войти
            </Link>
          )}

          <button type="button" className="burger" onClick={() => setMenuOpen((open) => !open)} aria-label="Меню">
            ☰
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const { setting } = useSite()
  const { openCallback } = useModal()

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="logo" style={{ marginBottom: 14 }}>
              <span className="logo__mark">PF</span>
              <span className="logo__text">
                {setting('site_name', 'PhoneFix')}
                <small>сервисный центр</small>
              </span>
            </Link>
            <p>{setting('footer_text')}</p>
          </div>

          <div className="footer-col">
            <h4>Услуги</h4>
            <Link to="/services?category=diagnostics">Диагностика</Link>
            <Link to="/services?category=screen">Замена экранов</Link>
            <Link to="/services?category=parts">Комплектующие</Link>
            <Link to="/services?category=software">Обновление ПО</Link>
          </div>

          <div className="footer-col">
            <h4>Клиентам</h4>
            <Link to="/booking">Онлайн-запись</Link>
            <Link to="/reviews">Отзывы</Link>
            <Link to="/blog">Блог</Link>
            <Link to="/contacts">Контакты</Link>
            <Link to="/privacy">Политика конфиденциальности</Link>
            <Link to="/account">Личный кабинет</Link>
          </div>

          <div className="footer-col">
            <h4>Контакты</h4>
            <p>
              <a href={`tel:${setting('site_phone').replace(/[^+\d]/g, '')}`}>{setting('site_phone')}</a>
            </p>
            <p>
              <a href={`mailto:${setting('site_email')}`}>{setting('site_email')}</a>
            </p>
            <p>{setting('site_address')}</p>
            <p>{setting('work_time_weekdays')}</p>
            <p>{setting('work_time_weekend')}</p>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => openCallback('footer')}>
              Заказать звонок
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {setting('site_name', 'PhoneFix')}. Все права защищены.
          </span>
          <span>Диагностика и ремонт телефонов · замена экранов и комплектующих · обновление ПО</span>
        </div>
      </div>
    </footer>
  )
}

export default function SiteLayout() {
  return (
    <div className="page-shell">
      <Header />
      <main className="page-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}