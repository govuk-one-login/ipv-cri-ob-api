export class EcospendTokenError extends Error {
  override readonly name = 'EcospendTokenError'

  constructor(message: string, profile: string) {
    super(`Ecospend token error: ${message} [endpoint profile: ${profile}]`)
  }
}
