import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authorSeesReviewerNames, reviewerLabel, reviewerSeesAuthors } from './blinding'

describe('blinding', () => {
  it('hides both sides under double blind', () => {
    assert.equal(reviewerSeesAuthors('double_blind'), false)
    assert.equal(authorSeesReviewerNames('double_blind'), false)
  })

  it('shows authors to the reviewer only under single blind', () => {
    assert.equal(reviewerSeesAuthors('single_blind'), true)
    assert.equal(authorSeesReviewerNames('single_blind'), false)
  })

  it('discloses both sides when review is open', () => {
    assert.equal(reviewerSeesAuthors('open'), true)
    assert.equal(authorSeesReviewerNames('transparent'), true)
  })

  it('numbers reviewers from one', () => {
    assert.equal(reviewerLabel(0), 'Reviewer 1')
    assert.equal(reviewerLabel(2), 'Reviewer 3')
  })
})
