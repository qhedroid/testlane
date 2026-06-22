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

  // Read activeProjectId via ref so the effect can check it without depending on it.
  // If state.activeProjectId were a dep, the effect would re-run when the switcher calls
  // setActiveProject(P2) — while usePathname() still says /P1 — and immediately revert
  // the project back to P1, causing a flicker and aborting the in-flight navigation.
  const activeProjectIdRef = useRef(state.activeProjectId)
  activeProjectIdRef.current = state.activeProjectId

  useEffect(() => {
    if (pathname.startsWith('/runs/api')) return

    const parsed = parseProjectPath(pathname)
    if (!parsed) return

    const project = getProjectByKey(state, parsed.projectKey)
    if (project) {
      redirecting.current = false
      if (project.id !== activeProjectIdRef.current) {
        setActiveProject(project.id)
      }
      return
    }

    if (redirecting.current) return
    redirecting.current = true
    const fallbackKey = activeProject?.key ?? DEFAULT_PROJECT_KEY
    router.replace(projectPath(fallbackKey, parsed.module))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: state.activeProjectId removed — effect must only react to URL/project-list
  // changes; activeProjectId is read via ref above to avoid the reversion race condition.
  }, [pathname, state.projectsById, setActiveProject, activeProject?.key, router])

  return null
}
