import type { BanksRequestParams } from '../../src/types/banks.js'
import type { ConsentsClient } from './clients/consents-client.js'
import type { IdentityVerificationClient } from './clients/identity-verification-client.js'
import type { IssueCredentialClient } from './clients/issue-credential-client.js'
import type { IWorldOptions } from '@cucumber/cucumber'

import { BanksClient } from './clients/banks-client.js'
import { SessionClient } from './clients/session-client.js'
import { TokenClient } from './clients/token-client.js'
import { type ApiResponse, getBaseUrl, getOAuthBaseUrl } from './utils/api-client.js'
import { setWorldConstructor, World } from '@cucumber/cucumber'

export class OBWorld extends World {
  readonly banks: BanksClient
  readonly session: SessionClient
  readonly token: TokenClient

  get accessToken(): string {
    if (!this._accessToken) throw new Error('accessToken not set — did the Before hook run?')
    return this._accessToken
  }
  set accessToken(value: string) {
    this._accessToken = value
  }

  get authCode(): string {
    if (!this._authCode) throw new Error('authCode not set — did the authorization step run?')
    return this._authCode
  }
  set authCode(value: string) {
    this._authCode = value
  }

  get bankParams(): BanksRequestParams {
    if (!this._bankParams) throw new Error('bankParams not set — did a Given step run first?')
    return this._bankParams
  }
  set bankParams(value: BanksRequestParams) {
    this._bankParams = value
  }

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

  get sessionId(): string {
    if (!this._sessionId) throw new Error('sessionId not set — did the Before hook run?')
    return this._sessionId
  }
  set sessionId(value: string) {
    this._sessionId = value
  }

  get sessionRedirectUri(): string {
    if (!this._sessionRedirectUri)
      throw new Error('sessionRedirectUri not set — did the Before hook run?')
    return this._sessionRedirectUri
  }
  set sessionRedirectUri(value: string) {
    this._sessionRedirectUri = value
  }

  get sessionState(): string {
    if (!this._sessionState) throw new Error('sessionState not set — did the Before hook run?')
    return this._sessionState
  }
  set sessionState(value: string) {
    this._sessionState = value
  }

  private _accessToken: string | undefined
  private _authCode: string | undefined
  private _bankParams: BanksRequestParams | undefined
  private _consentId: string | undefined
  private _consents: ConsentsClient | undefined
  private _identityVerification: IdentityVerificationClient | undefined
  private _issueCredential: IssueCredentialClient | undefined
  private _lastResponse: ApiResponse | undefined
  private _sessionId: string | undefined
  private _sessionRedirectUri: string | undefined
  private _sessionState: string | undefined

  constructor(options: IWorldOptions) {
    super(options)
    const baseUrl = getBaseUrl()
    const oauthBaseUrl = getOAuthBaseUrl()
    this.banks = new BanksClient(baseUrl)
    this.session = new SessionClient(oauthBaseUrl)
    this.token = new TokenClient(oauthBaseUrl)
  }
}

setWorldConstructor(OBWorld)
