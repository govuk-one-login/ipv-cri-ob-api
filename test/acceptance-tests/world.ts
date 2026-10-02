import type { IdentityVerificationClient } from './clients/identity-verification-client'
import type { IssueCredentialClient } from './clients/issue-credential-client'
import type { IWorldOptions } from '@cucumber/cucumber'

import { BanksClient } from './clients/banks-client'
import { ConsentsClient } from './clients/consents-client'
import { SessionClient } from './clients/session-client'
import { TokenClient } from './clients/token-client'
import { type ApiResponse, getPrivateBaseUrl, getPublicBaseUrl } from './utils/api-client'
import { setWorldConstructor, World } from '@cucumber/cucumber'

// apigw will reject any request without a 'present' session-id so we set a placeholder value
// @needs-session overwrites this with a real session id
const NO_SESSION_ID = 'no-session'

export class OBWorld extends World {
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
  get bankId(): string {
    if (!this._bankId) throw new Error('bankId not set — did a Given step run first?')
    return this._bankId
  }
  set bankId(value: string) {
    this._bankId = value
  }

  get banks(): BanksClient {
    return this._banks
  }

  get consentId(): string {
    if (!this._consentId) throw new Error('consentId not set — did a Given step run first?')
    return this._consentId
  }
  set consentId(value: string) {
    this._consentId = value
  }

  get consents(): ConsentsClient {
    return this._consents
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
    const privateBaseUrl = getPrivateBaseUrl()
    this._banks = new BanksClient(privateBaseUrl, value)
    this._consents = new ConsentsClient(privateBaseUrl, value)
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
  private _bankId: string | undefined
  private _banks: BanksClient
  private _consentId: string | undefined
  private _consents: ConsentsClient
  private _identityVerification: IdentityVerificationClient | undefined
  private _issueCredential: IssueCredentialClient | undefined
  private _lastResponse: ApiResponse | undefined
  private _sessionId: string | undefined
  private _sessionRedirectUri: string | undefined
  private _sessionState: string | undefined

  constructor(options: IWorldOptions) {
    super(options)
    const publicBaseUrl = getPublicBaseUrl()
    const privateBaseUrl = getPrivateBaseUrl()
    this.session = new SessionClient(privateBaseUrl)
    this.token = new TokenClient(publicBaseUrl)
    this._banks = new BanksClient(privateBaseUrl, NO_SESSION_ID)
    this._consents = new ConsentsClient(privateBaseUrl, NO_SESSION_ID)
  }
}

setWorldConstructor(OBWorld)
