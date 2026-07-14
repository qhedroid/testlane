'use client'

import Link from 'next/link'
import { FreshTopbar } from '../components/FreshTopbar'
import { useProjectHref } from '../hooks/useProjectHref'

interface PlaceholderScreenProps {
  title: string
  description: string
  futureApis?: string[]
}

export function PlaceholderScreen({
  title,
  description,
  futureApis = [],
}: PlaceholderScreenProps) {
  const projectHref = useProjectHref()

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: projectHref('dashboard') },
          { label: title },
        ]}
        showSearch={false}
      />

      <div className="placeholder-wrap">
        <div className="placeholder-card">
          <i className="ti ti-road" aria-hidden />
          <h2>{title}</h2>
          <p>{description}</p>
          {futureApis.length > 0 ? (
            <div className="placeholder-apis">
              <div className="placeholder-apis-label">Planned API surface</div>
              <ul>
                {futureApis.map((api) => (
                  <li key={api}>
                    <code>{api}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link href={projectHref('dashboard')} className="btn">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
