import { CriError } from '@govuk-one-login/cri-error-response'

export class PersonDetailsNotFoundError extends CriError {
  constructor() {
    super(500, 'Person details not found for session')
  }
}
