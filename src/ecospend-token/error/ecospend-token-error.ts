export class EcospendTokenError extends Error {
  override readonly name = 'EcospendTokenError'

  constructor(message: string, profile: string) {
    super(`ecospend-token error: ${message} [endpoint profile: ${profile}]`)
  }
}
