'use client'

import { useCallback } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { ModuleSlug } from '../lib/project-routes'
import { projectPath } from '../lib/project-routes'

export function useProjectHref() {
  const { activeProject } = useFresh()

  return useCallback(
    (module: ModuleSlug) => projectPath(activeProject.key, module),
    [activeProject.key],
  )
}
