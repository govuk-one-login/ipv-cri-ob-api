export const EndpointProfile = {
  LIVE: 'LIVE',
  STUB: 'STUB',
  UAT: 'UAT'
} as const

export type EndpointProfile = (typeof EndpointProfile)[keyof typeof EndpointProfile]
