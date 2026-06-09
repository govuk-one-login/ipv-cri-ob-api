import { CriError } from '@govuk-one-login/cri-error-response'

export class SigningError extends CriError {
  constructor() {
    super(500, 'Failed to sign verifiable credential')
  }
}
