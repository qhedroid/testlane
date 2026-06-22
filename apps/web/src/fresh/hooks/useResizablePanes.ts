'use client'

import { useEffect } from 'react'

export function useResizablePanes() {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const handle = (e.target as HTMLElement).closest('.resizer-v') as HTMLElement | null
      if (!handle) return
      e.preventDefault()

      const type = handle.dataset.resize
      const min = Number(handle.dataset.min || 180)
      const maxAttr = handle.dataset.max
      const maxHalf = handle.dataset.maxHalf === 'true'
      const startX = e.clientX
      let start = 0

      if (type === 'suite-tree') {
        start = document.querySelector('.suite-tree')?.getBoundingClientRect().width ?? 0
      } else if (type === 'case-detail') {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--case-detail-width').trim()
        start = raw ? parseFloat(raw) : (document.querySelector('.dp.open')?.getBoundingClientRect().width ?? 360)
        document.querySelector('.dp.open')?.classList.add('no-transition')
      } else if (type === 'plan-list') {
        start = document.querySelector('.tp-list-pane')?.getBoundingClientRect().width ?? 0
      } else if (type === 'run-list') {
        start = document.querySelector('.ec-pane')?.getBoundingClientRect().width ?? 0
      }

      function paneMax(): number {
        if (maxHalf && type === 'run-list') {
          const lay = document.querySelector('.runs-v12 .tr-lay') ?? document.querySelector('.tr-lay')
          const w = lay?.getBoundingClientRect().width ?? window.innerWidth
          return Math.max(min, Math.floor(w * 0.5))
        }
        return Number(maxAttr || 600)
      }

      function onMove(ev: MouseEvent) {
        const dx = ev.clientX - startX
        const root = document.documentElement
        const max = paneMax()
        if (type === 'case-detail') {
          const val = Math.max(min, Math.min(max, start - dx))
          root.style.setProperty('--case-detail-width', `${val}px`)
        } else {
          const val = Math.max(min, Math.min(max, start + dx))
          if (type === 'suite-tree') root.style.setProperty('--suite-tree-width', `${val}px`)
          if (type === 'plan-list') root.style.setProperty('--plan-list-width', `${val}px`)
          if (type === 'run-list') root.style.setProperty('--run-list-width', `${val}px`)
        }
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        if (type === 'case-detail') {
          document.querySelector('.dp.open')?.classList.remove('no-transition')
        }
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])
}
