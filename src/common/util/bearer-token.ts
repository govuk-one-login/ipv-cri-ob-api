import { UnauthorisedError } from '@common/error/unauthorised-error'

const BEARER_PREFIX = 'Bearer '

export const parseBearerToken = (header: string): string => {
  if (!header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorisedError('Authorization header must be a Bearer token')
  }
  const token = header.slice(BEARER_PREFIX.length).trim()
  if (!token) {
    throw new UnauthorisedError('Bearer token is empty')
  }
  return token
}
