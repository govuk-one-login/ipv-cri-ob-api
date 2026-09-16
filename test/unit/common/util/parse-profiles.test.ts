import { EndpointProfile } from '@common/model/endpoint-profile'
import { parseProfiles } from '@common/util/parse-profiles'
import { describe, expect, it } from 'vitest'

describe('parseProfiles', () => {
  it('parses a pipe-delimited list of profiles', () => {
    expect(parseProfiles('STUB | UAT')).toEqual([EndpointProfile.STUB, EndpointProfile.UAT])
  })

  it('accepts a single profile', () => {
    expect(parseProfiles('LIVE')).toEqual([EndpointProfile.LIVE])
  })

  it('rejects an empty profile list', () => {
    expect(() => parseProfiles(' | ')).toThrow('Profile list must contain at least one profile')
  })

  it('rejects unknown profiles', () => {
    expect(() => parseProfiles('STUB|SURPRISE')).toThrow('Unknown profile(s): SURPRISE')
  })

  it('rejects duplicate profiles', () => {
    expect(() => parseProfiles('UAT|UAT')).toThrow(
      'Profile list must not contain duplicate profiles'
    )
  })
})
