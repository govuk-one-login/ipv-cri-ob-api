import type { SessionItem } from '@govuk-one-login/cri-types'

// projection of `SessionTable` when queried with access token
export type AccessTokenSessionItem = Pick<
  SessionItem,
  | 'clientId'
  | 'clientIpAddress'
  | 'clientSessionId'
  | 'persistentSessionId'
  | 'sessionId'
  | 'subject'
>

/**
 * it's not always guaranteed that we have the whole SessionItem available depending on how it was
 * looked up. `buildAuditUser` (called as part of `buildAndSendAuditEvent`) only needs this subset
 * of SessionItem
 * */
export type AuditableSessionItem = Pick<
  SessionItem,
  'clientIpAddress' | 'clientSessionId' | 'persistentSessionId' | 'sessionId' | 'subject'
>
