import { UnauthorisedError } from '@common/error/unauthorised-error'

const BEARER_PREFIX = 'Bearer '

export const requireSessionId = (header: string | undefined): string => {
  const sessionId = header?.trim()
  if (!sessionId) {
    throw new UnauthorisedError('session-id is empty')
  }
  return sessionId
}

export const requireBearerToken = (header: string | undefined): string => {
  if (!header) {
    throw new UnauthorisedError('You must provide a valid access token')
  }
  if (!header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorisedError('Authorization header must be a Bearer token')
  }
  const token = header.slice(BEARER_PREFIX.length).trim()
  if (!token) {
    throw new UnauthorisedError('Bearer token is empty')
  }
  return token
}
