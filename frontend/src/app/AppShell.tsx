import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { buttonStyles } from '../components/ui/buttonStyles'
import { UserMenu } from '../features/auth/UserMenu'
import { ArchiveStats } from '../features/home/ArchiveStats'
import { useRecordVisit } from '../features/home/publicStats'
import { appConfig } from '../lib/config'
import { RouteFallback } from './RouteFallback'

const primaryNavigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/archive', label: 'Archive' },
  { to: '/contributors', label: 'Contributors' },
  { to: '/about', label: 'About' },
] as const

const footerLinks = [
  {
    heading: 'Explore',
    links: [
      { to: '/archive', label: 'The archive' },
      { to: '/contributors', label: 'Contributors' },
      { to: '/about', label: 'About' },
    ],
  },
  {
    heading: 'Take part',
    links: [
      { to: '/contribute', label: 'Share photographs' },
      { to: '/dashboard/suggestions', label: 'Suggest an event' },
      { to: '/sign-in', label: 'Sign in' },
    ],
  },
] as const

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    'group relative block py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors',
    isActive
      ? 'text-archive-ink'
      : 'text-archive-muted hover:text-archive-ink',
  ].join(' ')
}

function NavLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="relative">
      {label}
      <span
        aria-hidden="true"
        className={[
          'absolute -bottom-1.5 left-0 h-px w-full origin-left bg-archive-accent transition-transform duration-300',
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        ].join(' ')}
      />
    </span>
  )
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  useRecordVisit()

  const closeMobileNavigation = () => {
    setMobileOpen(false)
  }

  return (
    <div className="editorial flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-archive-ink focus:px-4 focus:py-2 focus:text-archive-paper"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-archive-line/80 bg-archive-paper/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-3 px-5 py-4 sm:gap-6 sm:px-8 lg:px-12">
          <Link
            to="/"
            aria-label={appConfig.name}
            onClick={closeMobileNavigation}
            className="group flex items-center gap-2.5 sm:gap-3"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center border border-archive-accent/50 font-serif text-[11px] tracking-[0.08em] text-archive-accent transition-colors group-hover:border-archive-accent"
            >
              GEC
            </span>
            <span className="flex flex-col">
              <span className="whitespace-nowrap font-serif text-base leading-none tracking-tight text-archive-ink sm:text-lg">
                Sheikhpura Archive
              </span>
              <span className="mt-1.5 hidden text-[9px] uppercase tracking-[0.26em] text-archive-muted sm:block">
                Government Engineering College
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-7">
                {primaryNavigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={'end' in item ? item.end : undefined}
                      onClick={closeMobileNavigation}
                      className={navLinkClasses}
                    >
                      {({ isActive }) => (
                        <NavLabel label={item.label} active={isActive} />
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <Link
                  to="/contribute"
                  className={buttonStyles({ variant: 'primary', size: 'sm' })}
                >
                  Add photos
                </Link>
              </div>
              <UserMenu />
              <button
                type="button"
                className={`${buttonStyles({ variant: 'ghost', size: 'sm' })} px-2 lg:hidden`}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => {
                  setMobileOpen((current) => !current)
                }}
              >
                <span className="sr-only">
                  {mobileOpen ? 'Close navigation' : 'Open navigation'}
                </span>
                <span
                  aria-hidden="true"
                  className="flex w-5 flex-col gap-1.5"
                >
                  <span
                    className={[
                      'h-px w-full bg-current transition-transform duration-300',
                      mobileOpen ? 'translate-y-[3.5px] rotate-45' : '',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'h-px w-full bg-current transition-transform duration-300',
                      mobileOpen ? '-translate-y-[3.5px] -rotate-45' : '',
                    ].join(' ')}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-archive-line bg-archive-paper lg:hidden"
          >
            <ul className="mx-auto flex w-full max-w-[92rem] flex-col divide-y divide-archive-line/70 px-5 py-2 sm:px-8">
              <li className="py-2">
                <Link
                  to="/contribute"
                  onClick={closeMobileNavigation}
                  className="flex items-center justify-between border border-archive-accent/50 px-4 py-3 text-sm font-medium text-archive-accent"
                >
                  Add photos
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
              {primaryNavigation.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={'end' in item ? item.end : undefined}
                    onClick={closeMobileNavigation}
                    className={({ isActive }) =>
                      [
                        'flex items-baseline justify-between py-4 font-serif text-2xl tracking-tight transition-colors',
                        isActive
                          ? 'text-archive-accent'
                          : 'text-archive-ink hover:text-archive-accent',
                      ].join(' ')
                    }
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="text-[10px] uppercase tracking-[0.2em] text-archive-muted"
                    >
                      {item.to === '/' ? 'Index' : 'Open'}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-[92rem] flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-14"
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mt-16 border-t border-archive-line">
        <div className="mx-auto w-full max-w-[92rem] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-6">
              <p className="eyebrow text-archive-accent">The archive</p>
              <p className="max-w-xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-5xl">
                Every moment.
                <br />
                Kept forever.
              </p>
              <p className="max-w-md text-sm leading-relaxed text-archive-muted">
                A community-kept photographic record of Government Engineering
                College, Sheikhpura.
              </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:col-span-6 lg:justify-items-end">
              {footerLinks.map((column) => (
                <div key={column.heading} className="space-y-4">
                  <h2 className="eyebrow text-archive-muted">
                    {column.heading}
                  </h2>
                  <ul className="space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.to}>
                        <Link
                          to={link.to}
                          className="text-sm text-archive-ink transition-colors hover:text-archive-accent"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-archive-line pt-6 text-xs text-archive-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {appConfig.name}
            </p>
            <div className="space-y-1.5 sm:text-right">
              <ArchiveStats />
              <p>Preserved with care by the college community.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
