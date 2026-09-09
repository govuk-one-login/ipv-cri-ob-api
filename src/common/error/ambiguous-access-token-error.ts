import { CriError } from '@govuk-one-login/cri-error-response'

export class AmbiguousAccessTokenError extends CriError {
  constructor() {
    super(500, 'Access token matched more than one session')
  }
}
