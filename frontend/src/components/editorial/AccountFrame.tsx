import type { ReactNode } from 'react'

export interface AccountFrameProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

/**
 * Editorial frame for the primary account entry points. The left column
 * carries the archive voice; the right column holds the form so it stays
 * readable and focused.
 */
export function AccountFrame({
  eyebrow,
  title,
  description,
  children,
}: AccountFrameProps) {
  return (
    <div className="grid gap-12 py-2 lg:grid-cols-12 lg:gap-16 lg:py-6">
      <div className="lg:col-span-5">
        <p className="eyebrow text-archive-accent">{eyebrow}</p>
        <h1 className="mt-5 font-serif text-[clamp(2.75rem,5vw,4.75rem)] font-normal leading-[0.94] tracking-[-0.04em] text-archive-ink">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-archive-muted">
          {description}
        </p>
        <dl className="mt-10 max-w-sm space-y-4 border-t border-archive-line pt-6">
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-archive-accent">
              Review
            </dt>
            <dd className="text-sm leading-relaxed text-archive-muted">
              Every contribution is moderated before it joins the public
              archive.
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-[10px] uppercase tracking-[0.18em] text-archive-accent">
              Credit
            </dt>
            <dd className="text-sm leading-relaxed text-archive-muted">
              Photographer credits are recorded explicitly, never inferred from
              the uploader.
            </dd>
          </div>
        </dl>
      </div>
      <div className="lg:col-span-7">{children}</div>
    </div>
  )
}
