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
  const { state, setActiveProject, activeProject, realProjectsLoaded } = useFresh()
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

    // Don't redirect away from an as-yet-unrecognized project key until the
    // real-project fetch has resolved at least once. Without this, visiting
    // e.g. /DEMO/dashboard would redirect to /DP/dashboard (real projects
    // not registered yet) and then immediately redirect back to /DEMO once
    // they load — a visible double-redirect flicker (found testing
    // mvp-backend's "wire everything" session). Once real projects have
    // loaded, an unrecognized key really is invalid and should still redirect.
    if (!realProjectsLoaded) return

    if (redirecting.current) return
    redirecting.current = true
    const fallbackKey = activeProject?.key ?? DEFAULT_PROJECT_KEY
    router.replace(projectPath(fallbackKey, parsed.module))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: state.activeProjectId removed — effect must only react to URL/project-list
  // changes; activeProjectId is read via ref above to avoid the reversion race condition.
  }, [pathname, state.projectsById, setActiveProject, activeProject?.key, router, realProjectsLoaded])

  return null
}
