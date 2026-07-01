'use client'

import { useFreshUI } from '../hooks/useFreshUI'

export function ShortcutsModal() {
  const { shortcutsOpen, closeShortcuts } = useFreshUI()
  if (!shortcutsOpen) return null

  return (
    <div className="modal-backdrop" onClick={closeShortcuts}>
      <div className="shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <span className="shortcuts-title">Keyboard shortcuts</span>
          <button type="button" className="btn" style={{ padding: '2px 6px', fontSize: 12 }} onClick={closeShortcuts}>
            <i className="ti ti-x" style={{ fontSize: 12 }} />
          </button>
        </div>
        <div className="shortcuts-body">
          <div className="shortcuts-col">
            <div className="shortcuts-section">
              <div className="shortcuts-section-title">Execution (Test Runs view)</div>
              {[
                ['Mark pass', 'P'],
                ['Mark fail', 'F'],
                ['Mark blocked', 'B'],
                ['Mark skip', 'S'],
                ['Link defect', 'D'],
                ['Next case', 'J'],
                ['Previous case', 'K'],
              ].map(([label, key]) => (
                <div key={label} className="shortcut-row">
                  <span>{label}</span>
                  <div className="kbd-group"><span className="kbd">{key}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div className="shortcuts-col">
            <div className="shortcuts-section">
              <div className="shortcuts-section-title">Global</div>
              <div className="shortcut-row"><span>Global search</span><div className="kbd-group"><span className="kbd">⌘</span><span className="kbd">K</span></div></div>
              <div className="shortcut-row"><span>Show shortcuts</span><div className="kbd-group"><span className="kbd">?</span></div></div>
              <div className="shortcut-row"><span>Close / dismiss</span><div className="kbd-group"><span className="kbd">Esc</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
