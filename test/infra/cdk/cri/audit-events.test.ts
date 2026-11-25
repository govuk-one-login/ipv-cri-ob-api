import { testStack } from '../fixtures/test-stack'
import { auditEventsProducer } from '@infra/cri/audit-events'
import { describe, expect, it } from 'vitest'

describe('auditEventsProducer', () => {
  it('tells a function where to publish audit events and lets it send them', () => {
    const stack = testStack()

    expect(stack.resolve(auditEventsProducer(stack))).toMatchObject({
      environment: {
        AUDIT_EVENT_NAME_PREFIX: { Ref: 'AuditEventNamePrefix' },
        AUDIT_QUEUE_URL: { 'Fn::ImportValue': 'txma-infrastructure-AuditEventQueueUrl' }
      },
      policies: [
        {
          sqsSendMessagePolicy: {
            queueName: { 'Fn::ImportValue': 'txma-infrastructure-AuditEventQueueName' }
          }
        },
        expect.anything()
      ]
    })
  })
})
