import type { CriApi } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'

import { criAlarm } from '@infra/cri/alarm'
import { criApiInvokePermission } from '@infra/cri/api/api'
import { criDynamoTable, tableAccess } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { criQueue } from '@infra/cri/queue'
import { parameterReadPolicy } from '@infra/cri/ssm-parameter'
import { Fn } from 'aws-cdk-lib'

type WebhooksCollaborators = {
  publicApi: CriApi
}

export const webhooks = (stack: CriStack, collaborators: WebhooksCollaborators) => {
  const deduplicationTable = criDynamoTable(stack, 'WebhookDeduplicationTable', {
    partitionKey: 'eventId',
    ttlAttribute: 'ttl'
  })

  criDynamoTable(stack, 'WebhookStatusTable', { partitionKey: 'consentId', ttlAttribute: 'ttl' })

  const deadLetterQueue = criQueue(stack, 'WebhookDeadLetterQueue', {
    messageRetentionPeriod: 604800
  })

  const queue = criQueue(stack, 'WebhookQueue', {
    deadLetterQueue: { maxReceiveCount: 5, queue: deadLetterQueue },
    messageRetentionPeriod: 3600,
    visibilityTimeout: 240
  })

  const ingestFunction = criFunction(stack, 'WebhookIngestFunction', {
    entry: 'src/webhooks/handler/webhook-ingest.ts',
    environment: {
      WEBHOOK_DEDUPLICATION_DB_TABLE_NAME: deduplicationTable.ref,
      WEBHOOK_QUEUE_URL: queue.attrQueueUrl
    },
    policies: [
      { sqsSendMessagePolicy: { queueName: queue.attrQueueName } },
      tableAccess(deduplicationTable, ['GetItem', 'PutItem']),
      parameterReadPolicy(stack, 'webhook-ingest/*')
    ],
    provisionedConcurrency: true,
    subnets: 'protected'
  })
  criApiInvokePermission(stack, ingestFunction, collaborators.publicApi)

  criAlarm(stack, 'WebhookDeadLetterQueueAlarm', {
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 1,
    description: Fn.sub(
      'Webhook messages have failed processing and landed on the dead letter queue in ${Environment}.'
    ),
    dimensions: [{ name: 'QueueName', value: deadLetterQueue.attrQueueName }],
    evaluationPeriods: 1,
    metricName: 'ApproximateNumberOfMessagesVisible',
    name: 'webhook-dlq-not-empty',
    namespace: 'AWS/SQS',
    period: 60,
    severity: 'warning',
    statistic: 'Maximum',
    threshold: 1,
    treatMissingData: 'notBreaching'
  })
}
