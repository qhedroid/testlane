'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { getProjectByKey } from '../data/project-selectors'
import { DEFAULT_PROJECT_KEY, parseProjectPath, projectPath } from '../lib/project-routes'

/** Keeps activeProjectId in sync with /:projectKey/... URL segments */
export function ProjectRouteSync() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setActiveProject, activeProject } = useFresh()
  const redirecting = useRef(false)

  useEffect(() => {
    if (pathname.startsWith('/runs/api')) return

    const parsed = parseProjectPath(pathname)
    if (!parsed) return

    const project = getProjectByKey(state, parsed.projectKey)
    if (project) {
      redirecting.current = false
      if (project.id !== state.activeProjectId) {
        setActiveProject(project.id)
      }
      return
    }

    if (redirecting.current) return
    redirecting.current = true
    const fallbackKey = activeProject?.key ?? DEFAULT_PROJECT_KEY
    router.replace(projectPath(fallbackKey, parsed.module))
  }, [pathname, state.projectsById, state.activeProjectId, setActiveProject, activeProject?.key, router])

  return null
}
