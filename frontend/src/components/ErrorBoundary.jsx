import React from 'react'

/**
 * Ловит любые ошибки рендера и показывает понятный экран вместо белой страницы.
 * Раньше любое падение в компоненте (например, из-за неожиданного ответа API)
 * размонтировало всё приложение — пользователь видел пустой экран.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Подробности остаются в консоли браузера (F12 → Console).
    console.error('PhoneFix: ошибка интерфейса', error, info)
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    const details = error && error.message ? error.message : String(error)

    return (
      <div className="container section">
        <div className="card card--accent stack" style={{ padding: 28 }}>
          <h2 style={{ margin: 0 }}>Интерфейс PhoneFix не смог отрисоваться</h2>
          <p className="muted" style={{ margin: 0 }}>
            Это не белый экран: страница работает, но один из блоков упал. Обычно помогает перезагрузка
            страницы, а если ошибка повторяется — проверьте, запущена ли база данных MySQL
            (в OSPanel модуль <strong>MySQL-8.0</strong>) и сервер API.
          </p>

          <pre
            style={{
              margin: 0,
              padding: 14,
              overflowX: 'auto',
              borderRadius: 'var(--pf-radius-sm, 9px)',
              border: '1px solid var(--pf-line, #2f2f3d)',
              background: 'var(--pf-black, #0d0d0f)',
              color: 'var(--pf-text-muted, #a5a5b4)',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {details}
          </pre>

          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Перезагрузить страницу
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => this.setState({ error: null })}
            >
              Попробовать снова
            </button>
            <a className="btn btn--ghost" href="/api/public/site" target="_blank" rel="noreferrer">
              Проверить API
            </a>
          </div>
        </div>
      </div>
    )
  }
}
