import type { AuditableSessionItem } from '@common/model/session'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { AuditEvents } from '@common/model/audit-events'
import { requireEnv } from '@common/util/env'
import { buildAndSendAuditEvent } from '@govuk-one-login/cri-audit'

export interface AuditEventPublisher {
  publishJourneyEnd: (event: JourneyEndEvent) => Promise<void>
  publishVCIssued: (event: CredentialIssuedEvent) => Promise<void>
}

export interface AuditEventPublisherConfig {
  componentId: string
  queueUrl: string
}

export interface CredentialIssuedEvent {
  session: AuditableSessionItem
}

export interface JourneyEndEvent {
  session: AuditableSessionItem
}

export const createAuditEventPublisher = (
  config: AuditEventPublisherConfig
): AuditEventPublisher => ({
  publishJourneyEnd: (event) =>
    buildAndSendAuditEvent(
      config.queueUrl,
      AuditEvents.END,
      config.componentId,
      event.session as SessionItem
    ),
  publishVCIssued: (event) =>
    buildAndSendAuditEvent(
      config.queueUrl,
      AuditEvents.VC_ISSUED,
      config.componentId,
      event.session as SessionItem
    )
})

export const auditEventPublisher: AuditEventPublisher = createAuditEventPublisher({
  componentId: requireEnv('AUDIT_COMPONENT_ID'),
  queueUrl: requireEnv('AUDIT_QUEUE_URL')
})
