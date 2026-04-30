import type { IWorldOptions } from '@cucumber/cucumber'

import { BanksPage } from './pages/banks-page.js'
import { ConsentsPage } from './pages/consents-page.js'
import { IdentityVerificationPage } from './pages/identity-verification-page.js'
import { SessionPage } from './pages/session-page.js'
import { TokenPage } from './pages/token-page.js'
import { type ApiResponse, getBaseUrl } from './utils/api-client.js'
import { setWorldConstructor, World } from '@cucumber/cucumber'

export class OBWorld extends World {
  readonly banks: BanksPage
  readonly consents: ConsentsPage
  readonly identityVerification: IdentityVerificationPage
  readonly session: SessionPage
  readonly token: TokenPage

  get consentId(): string {
    if (!this._consentId) throw new Error('consentId not set — did a Given step run first?')
    return this._consentId
  }
  set consentId(value: string) {
    this._consentId = value
  }

  get lastResponse(): ApiResponse {
    if (!this._lastResponse) throw new Error('lastResponse not set — did a When step run first?')
    return this._lastResponse
  }

  set lastResponse(value: ApiResponse) {
    this._lastResponse = value
  }

  private _consentId: string | undefined

  private _lastResponse: ApiResponse | undefined

  constructor(options: IWorldOptions) {
    super(options)
    const baseUrl = getBaseUrl()
    this.banks = new BanksPage(baseUrl)
    this.consents = new ConsentsPage(baseUrl)
    this.identityVerification = new IdentityVerificationPage(baseUrl)
    this.session = new SessionPage(baseUrl)
    this.token = new TokenPage(baseUrl)
  }
}

setWorldConstructor(OBWorld)
