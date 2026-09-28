import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashToken, newReviewerToken, safeEqual } from './tokens'

describe('reviewer tokens', () => {
  it('stores a hash that is not the token', () => {
    const { token, hash } = newReviewerToken()
    assert.equal(hash, hashToken(token))
    assert.notEqual(hash, token)
    assert.equal(hash.length, 64)
  })

  it('compares secrets without matching a different length', () => {
    assert.equal(safeEqual('abc', 'abc'), true)
    assert.equal(safeEqual('abc', 'abd'), false)
    assert.equal(safeEqual('abc', 'abcd'), false)
  })
})
