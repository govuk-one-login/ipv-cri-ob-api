import type { CriFunctionPolicy } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { Fn } from 'aws-cdk-lib'

// what a function needs to publish audit events to TxMA
export const auditProducer = (stack: CriStack) => ({
  environment: {
    AUDIT_COMPONENT_ID: stack.environmentValue('vcDomain'),
    AUDIT_EVENT_NAME_PREFIX: stack.parameters.auditEventNamePrefix.valueAsString,
    AUDIT_QUEUE_URL: Fn.importValue('txma-infrastructure-AuditEventQueueUrl')
  },
  policies: [
    {
      sqsSendMessagePolicy: { queueName: Fn.importValue('txma-infrastructure-AuditEventQueueName') }
    },
    {
      statement: [
        {
          Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
          Effect: 'Allow',
          Resource: Fn.importValue('txma-infrastructure-AuditEventQueueEncryptionKeyArn')
        }
      ]
    }
  ] satisfies CriFunctionPolicy[]
})
