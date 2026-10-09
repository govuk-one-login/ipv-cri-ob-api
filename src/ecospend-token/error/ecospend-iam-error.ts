export class EcospendIamError extends Error {
  override readonly name = 'EcospendIamError'

  constructor(message: string, profile: string) {
    super(`Ecospend IAM error: ${message} [endpoint profile: ${profile}]`)
  }
}
