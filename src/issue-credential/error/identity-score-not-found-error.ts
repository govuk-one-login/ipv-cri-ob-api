import { CriError } from '@govuk-one-login/cri-error-response'

export class IdentityScoreNotFoundError extends CriError {
  constructor() {
    super(500, 'Identity score not found for session')
  }
}
