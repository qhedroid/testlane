'use client'

import { CreateCaseModal } from './CreateCaseModal'
import { CreateRunModal } from './CreateRunModal'
import { SearchModal } from './SearchModal'
import { ShortcutsModal } from './ShortcutsModal'
import { useFreshUI } from '../hooks/useFreshUI'

export function GlobalModals() {
  const { createRunOpen, closeCreateRun } = useFreshUI()

  return (
    <>
      <SearchModal />
      <CreateCaseModal />
      <CreateRunModal open={createRunOpen} onClose={closeCreateRun} />
      <ShortcutsModal />
    </>
  )
}
