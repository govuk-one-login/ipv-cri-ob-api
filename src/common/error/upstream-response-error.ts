import { CriError } from '@govuk-one-login/cri-error-response'

export class UpstreamResponseError extends CriError {
  constructor(message: string, httpCode: number, profile: string) {
    super(500, `${message} [HTTP code: ${httpCode}] [endpoint profile: ${profile}]`)
  }
}
