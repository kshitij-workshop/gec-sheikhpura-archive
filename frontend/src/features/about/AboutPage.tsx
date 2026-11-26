import { Link } from 'react-router'

import { buttonStyles } from '../../components/ui'
import { EditorialHeader } from '../../components/editorial/EditorialHeader'
import { SectionHeading } from '../../components/editorial/SectionHeading'
import { PhotoImage } from '../archive/components/PhotoImage'
import { usePhotoIndex } from '../archive/queries'

const principles = [
  {
    title: 'One trusted record',
    description:
      'College photographs kept in one reviewed archive instead of scattered across phones and feeds.',
  },
  {
    title: 'Community contributions',
    description:
      'Members upload photographs, suggest events, and follow their submissions through review.',
  },
  {
    title: 'Credit before publication',
    description:
      'Uploading and photographing are different roles. Every published image carries a named credit.',
  },
] as const

const policies = [
  {
    title: 'Review',
    description:
      'Every submission is checked before it appears. Rejected and removed photos stay private.',
  },
  {
    title: 'Privacy',
    description:
      'No facial recognition and no automatic identification. Public pages never show account details.',
  },
  {
    title: 'Corrections and removal',
    description:
      'Anyone can report a photo. Uploaders can request removal, and administrators review each case.',
  },
] as const

export default function AboutPage() {
  const photos = usePhotoIndex(6)
  const strip = photos.photos.slice(0, 3)

  return (
    <div className="space-y-16 pb-4 sm:space-y-20">
      <EditorialHeader
        eyebrow="About"
        title="Preserving college memory, carefully"
        description="A community photo archive of Government Engineering College, Sheikhpura."
        actions={
          <Link to="/archive" className={buttonStyles({ variant: 'primary' })}>
            Browse photos
          </Link>
        }
      />

      {strip.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {strip.map((photo, index) => (
            <li
              key={photo.id}
              className="overflow-hidden border border-archive-line bg-archive-surface"
            >
              <PhotoImage
                photo={photo}
                width={600}
                height={750}
                crop="fill"
                eager={index === 0}
                className="aspect-[3/4] w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <section aria-labelledby="mission-heading" className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id="mission-heading" index="01" title="Why this archive exists" />
        </div>
        <div className="space-y-5 lg:col-span-8">
          <p className="font-serif text-2xl font-normal leading-[1.35] tracking-[-0.015em] text-archive-ink sm:text-3xl">
            College life passes quickly. This archive gives it a durable,
            searchable, and respectful home.
          </p>
          <p className="max-w-3xl text-base leading-relaxed text-archive-muted">
            Photos from college life are often shared once and lost. Here they
            stay safe, easy to find, and properly credited.
          </p>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="space-y-8">
        <SectionHeading id="principles-heading" index="02" title="Principles" />
        <ul className="grid gap-px overflow-hidden border border-archive-line bg-archive-line sm:grid-cols-3">
          {principles.map((principle, index) => (
            <li key={principle.title} className="bg-archive-paper p-6 sm:p-8">
              <p
                aria-hidden="true"
                className="font-serif text-xs tracking-[0.18em] text-archive-accent"
              >
                0{index + 1}
              </p>
              <h3 className="mt-6 font-serif text-xl leading-snug tracking-tight text-archive-ink">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-archive-muted">
                {principle.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="policies-heading" className="space-y-8">
        <SectionHeading
          id="policies-heading"
          index="03"
          title="Publication and privacy"
        />
        <dl className="divide-y divide-archive-line border-y border-archive-line">
          {policies.map((policy, index) => (
            <div
              key={policy.title}
              className="grid gap-3 py-6 sm:grid-cols-12 sm:gap-6"
            >
              <dt className="flex items-baseline gap-3 sm:col-span-4">
                <span
                  aria-hidden="true"
                  className="font-serif text-xs tracking-[0.18em] text-archive-accent"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-serif text-xl tracking-tight text-archive-ink">
                  {policy.title}
                </span>
              </dt>
              <dd className="max-w-3xl text-sm leading-relaxed text-archive-muted sm:col-span-8">
                {policy.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="contribute-heading"
        className="border border-archive-line px-6 py-12 sm:px-10 sm:py-14"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow text-archive-accent">Take part</p>
            <h2
              id="contribute-heading"
              className="mt-5 max-w-3xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] text-archive-ink sm:text-5xl"
            >
              Contribute to the archive
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-archive-muted sm:text-base">
              Have photos from a college event? Add them with the
              photographer's name. Every photo is reviewed before it appears.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <Link to="/contribute" className={buttonStyles({ variant: 'primary' })}>
              Add photos
            </Link>
            <Link
              to="/contributors"
              className={buttonStyles({ variant: 'secondary' })}
            >
              Meet the contributors
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
