export interface RotationFailure {
  profile: string
  reason: string
}

export class AggregateRotationError extends Error {
  readonly failures: RotationFailure[]
  override readonly name = 'AggregateRotationError'

  constructor(failures: RotationFailure[]) {
    super(`Token rotation failed for profiles: ${failures.map((f) => f.profile).join(', ')}`)
    this.failures = failures
  }
}

export class TokenRotationError extends Error {
  override readonly name = 'TokenRotationError'
}
