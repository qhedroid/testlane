import Link from 'next/link'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { FreshTopbar } from '../components/FreshTopbar'

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
  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: title },
        ]}
        showSearch={false}
      />
      <PrototypeBanner kind="placeholder" />

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
          <Link href="/dashboard" className="btn">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
