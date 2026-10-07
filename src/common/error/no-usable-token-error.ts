import { CriError } from '@govuk-one-login/cri-error-response'

export class NoUsableTokenError extends CriError {
  constructor(profile: string) {
    super(500, `No token is available [endpoint profile: ${profile}]`)
  }
}
