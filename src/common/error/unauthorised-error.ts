import { CriError } from '@govuk-one-login/cri-error-response'

export class UnauthorisedError extends CriError {
  constructor(message: string) {
    super(401, message)
  }
}
