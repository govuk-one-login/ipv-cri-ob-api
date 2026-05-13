import type { BanksRequestParams } from '../../src/types/banks.js'
import type { IWorldOptions } from '@cucumber/cucumber'

import { BanksClient } from './clients/banks-client.js'
import { ConsentsClient } from './clients/consents-client.js'
import { IdentityVerificationClient } from './clients/identity-verification-client.js'
import { SessionClient } from './clients/session-client.js'
import { TokenClient } from './clients/token-client.js'
import { type ApiResponse, getBaseUrl } from './utils/api-client.js'
import { setWorldConstructor, World } from '@cucumber/cucumber'

export class OBWorld extends World {
  bankParams: BanksRequestParams | undefined
  readonly banks: BanksClient
  readonly consents: ConsentsClient
  readonly identityVerification: IdentityVerificationClient
  readonly session: SessionClient
  readonly token: TokenClient

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
    this.banks = new BanksClient(baseUrl)
    this.consents = new ConsentsClient(baseUrl)
    this.identityVerification = new IdentityVerificationClient(baseUrl)
    this.session = new SessionClient(baseUrl)
    this.token = new TokenClient(baseUrl)
  }
}

setWorldConstructor(OBWorld)
