import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canTransition, DECISION_STATUS } from './transitions'

describe('manuscript transitions', () => {
  it('lets a draft be submitted and nothing else except withdrawal', () => {
    assert.equal(canTransition('draft', 'submitted'), true)
    assert.equal(canTransition('draft', 'published'), false)
    assert.equal(canTransition('draft', 'accepted'), false)
  })

  it('refuses to walk a published article backwards', () => {
    assert.equal(canTransition('published', 'draft'), false)
    assert.equal(canTransition('published', 'withdrawn'), false)
    assert.equal(canTransition('published', 'retracted'), true)
  })

  it('maps a review rejection away from desk reject', () => {
    assert.equal(DECISION_STATUS.reject, 'rejected')
    assert.equal(DECISION_STATUS.desk_reject, 'desk_rejected')
    assert.equal(DECISION_STATUS.accept, 'accepted')
  })
})
