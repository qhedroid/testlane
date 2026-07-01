'use client'

import { CreateCaseModal } from './CreateCaseModal'
import { SearchModal } from './SearchModal'
import { ShortcutsModal } from './ShortcutsModal'

export function GlobalModals() {
  return (
    <>
      <SearchModal />
      <CreateCaseModal />
      <ShortcutsModal />
    </>
  )
}
