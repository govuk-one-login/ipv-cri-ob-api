import { parseUrl } from '@common/util/url'
import { describe, expect, it } from 'vitest'

describe('parseUrl', () => {
  it('prepends https:// to a bare domain', () => {
    expect(parseUrl('my.domain.com').href).toBe('https://my.domain.com/')
  })

  it('preserves an existing https:// protocol', () => {
    expect(parseUrl('https://my.domain.com').href).toBe('https://my.domain.com/')
  })

  it('preserves an existing http:// protocol', () => {
    expect(parseUrl('http://my.domain.com').href).toBe('http://my.domain.com/')
  })

  it('preserves a path on the input', () => {
    expect(parseUrl('my.domain.com/path/here').href).toBe('https://my.domain.com/path/here')
  })

  it('throws on an invalid input', () => {
    expect(() => parseUrl('not a domain')).toThrow()
  })
})
