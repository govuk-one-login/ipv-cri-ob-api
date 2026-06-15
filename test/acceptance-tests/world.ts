import type { BanksRequestParams } from '../../src/types/banks.js'
import type { ConsentsClient } from './clients/consents-client.js'
import type { IdentityVerificationClient } from './clients/identity-verification-client.js'
import type { IssueCredentialClient } from './clients/issue-credential-client.js'
import type { IWorldOptions } from '@cucumber/cucumber'

import { BanksClient } from './clients/banks-client.js'
import { SessionClient } from './clients/session-client.js'
import { TokenClient } from './clients/token-client.js'
import { type ApiResponse, getBaseUrl } from './utils/api-client.js'
import { setWorldConstructor, World } from '@cucumber/cucumber'

export class OBWorld extends World {
  bankParams: BanksRequestParams | undefined
  readonly banks: BanksClient
  readonly session: SessionClient
  readonly token: TokenClient

  get consentId(): string {
    if (!this._consentId) throw new Error('consentId not set — did a Given step run first?')
    return this._consentId
  }
  set consentId(value: string) {
    this._consentId = value
  }

  get consents(): ConsentsClient {
    if (!this._consents) throw new Error('consents not initialised — did the Before hook run?')
    return this._consents
  }
  set consents(value: ConsentsClient) {
    this._consents = value
  }

  get identityVerification(): IdentityVerificationClient {
    if (!this._identityVerification)
      throw new Error('identityVerification not initialised — did the Before hook run?')
    return this._identityVerification
  }
  set identityVerification(value: IdentityVerificationClient) {
    this._identityVerification = value
  }

  get issueCredential(): IssueCredentialClient {
    if (!this._issueCredential)
      throw new Error('issueCredential not initialised — did the Before hook run?')
    return this._issueCredential
  }
  set issueCredential(value: IssueCredentialClient) {
    this._issueCredential = value
  }

  get lastResponse(): ApiResponse {
    if (!this._lastResponse) throw new Error('lastResponse not set — did a When step run first?')
    return this._lastResponse
  }
  set lastResponse(value: ApiResponse) {
    this._lastResponse = value
  }

  private _consentId: string | undefined
  private _consents: ConsentsClient | undefined
  private _identityVerification: IdentityVerificationClient | undefined
  private _issueCredential: IssueCredentialClient | undefined
  private _lastResponse: ApiResponse | undefined

  constructor(options: IWorldOptions) {
    super(options)
    const baseUrl = getBaseUrl()
    this.banks = new BanksClient(baseUrl)
    this.session = new SessionClient(baseUrl)
    this.token = new TokenClient(baseUrl)
  }
}

setWorldConstructor(OBWorld)
