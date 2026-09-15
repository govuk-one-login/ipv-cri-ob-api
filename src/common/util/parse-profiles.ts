import { EndpointProfile } from '@common/model/endpoint-profile'

const knownProfiles = Object.values(EndpointProfile) as EndpointProfile[]

export const parseProfiles = (rawProfiles: string): EndpointProfile[] => {
  const profiles = rawProfiles
    .split('|')
    .map((profile) => profile.trim())
    .filter(Boolean)

  if (profiles.length === 0) {
    throw new Error('Profile list must contain at least one profile')
  }

  const invalidProfiles = profiles.filter(
    (profile) => !knownProfiles.includes(profile as EndpointProfile)
  )

  if (invalidProfiles.length > 0) {
    throw new Error(`Unknown profile(s): ${invalidProfiles.join(', ')}`)
  }

  if (new Set(profiles).size !== profiles.length) {
    throw new Error('Profile list must not contain duplicate profiles')
  }

  return profiles as EndpointProfile[]
}
