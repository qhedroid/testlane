'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import type { ModuleSlug } from '../lib/project-routes'
import { projectPath } from '../lib/project-routes'

interface LegacyRouteRedirectProps {
  module: ModuleSlug
}

/** Redirects legacy unprefixed routes to /:projectKey/:module */
export function LegacyRouteRedirect({ module }: LegacyRouteRedirectProps) {
  const router = useRouter()
  const { activeProject } = useFresh()

  useEffect(() => {
    if (!activeProject?.key) return
    router.replace(projectPath(activeProject.key, module))
  }, [router, activeProject?.key, module])

  return null
}
