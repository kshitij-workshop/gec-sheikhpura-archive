import { Link, NavLink, Outlet } from 'react-router'

import { appConfig } from '../lib/config'

const navigation = [{ to: '/', label: 'Home', end: true }]

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-archive-ink focus:px-4 focus:py-2 focus:text-archive-paper"
      >
        Skip to content
      </a>

      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="group flex flex-col">
            <span className="font-serif text-xl font-semibold tracking-tight text-archive-ink group-hover:text-archive-accent">
              {appConfig.name}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Government Engineering College, Sheikhpura
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <nav aria-label="Primary">
              <ul className="flex items-center gap-1">
                {navigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          'rounded px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-stone-900 text-white'
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              {appConfig.phase}
            </span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{appConfig.name} — a community-preserved institutional archive.</p>
          <p>Phase 00 foundation · No public archive data yet.</p>
        </div>
      </footer>
    </div>
  )
}
