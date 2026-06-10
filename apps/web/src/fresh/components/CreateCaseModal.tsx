'use client'

import { useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import { MODULES } from '../data/seed'
import type { DemoCase, Priority } from '../data/types'
import { useFreshUI } from '../hooks/useFreshUI'

export function CreateCaseModal() {
  const { createCaseOpen, closeCreateCase } = useFreshUI()
  const { addCase } = useFresh()
  const [title, setTitle] = useState('')
  const [suite, setSuite] = useState('CTMS')
  const [pri, setPri] = useState<Priority>('medium')
  const [precond, setPrecond] = useState('')
  const [step, setStep] = useState('')
  const [expected, setExpected] = useState('')

  if (!createCaseOpen) return null

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    const data: Omit<DemoCase, 'id'> = {
      suite,
      title: trimmed,
      pri,
      type: 'Functional',
      last: 'not_run',
      by: 'You',
      steps: step ? 1 : 0,
      upd: 'just now',
      precond: precond || '—',
      stepList: step
        ? [{ a: step, e: expected || 'Expected result documented' }]
        : [{ a: 'Execute test steps', e: 'Expected result documented' }],
      tags: [suite.toLowerCase()],
    }
    addCase(data)
    setTitle('')
    setPrecond('')
    setStep('')
    setExpected('')
    closeCreateCase()
  }

  return (
    <div className="modal-backdrop" onClick={closeCreateCase}>
      <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Create test case</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={closeCreateCase}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body">
          <div className="form-field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the behavior to validate" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-field">
              <label>Suite</label>
              <select value={suite} onChange={(e) => setSuite(e.target.value)}>
                {MODULES.filter((m) => m !== 'TI-Core Platform').map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select value={pri} onChange={(e) => setPri(e.target.value as Priority)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Preconditions</label>
            <textarea rows={3} value={precond} onChange={(e) => setPrecond(e.target.value)} placeholder="Data, role, tenant, or module setup required" />
          </div>
          <div className="form-field">
            <label>First step</label>
            <textarea rows={2} value={step} onChange={(e) => setStep(e.target.value)} placeholder="Action to perform" />
          </div>
          <div className="form-field">
            <label>Expected result</label>
            <textarea rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Observable result" />
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={closeCreateCase}>Cancel</button>
          <button type="button" className="btn btn-p" onClick={submit}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create case
          </button>
        </div>
      </div>
    </div>
  )
}
