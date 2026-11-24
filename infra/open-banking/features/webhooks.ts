import type { OpenBankingStack } from '@infra/open-banking/stack'

import { criAlarm } from '@infra/cri/alarm'
import { criApiInvokePermission } from '@infra/cri/api/api'
import { criDynamoTable } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { Fn } from 'aws-cdk-lib'
import { CfnQueue } from 'aws-cdk-lib/aws-sqs'

export const webhooks = (stack: OpenBankingStack) => {
  const deduplicationTable = criDynamoTable(stack, 'WebhookDeduplicationTable', {
    partitionKey: 'eventId',
    ttlAttribute: 'ttl'
  })

  criDynamoTable(stack, 'WebhookStatusTable', { partitionKey: 'consentId', ttlAttribute: 'ttl' })

  const deadLetterQueue = new CfnQueue(stack, 'WebhookDeadLetterQueue', {
    messageRetentionPeriod: 604800,
    sqsManagedSseEnabled: true
  })

  const queue = new CfnQueue(stack, 'WebhookQueue', {
    messageRetentionPeriod: 3600,
    redrivePolicy: { deadLetterTargetArn: deadLetterQueue.attrArn, maxReceiveCount: 5 },
    sqsManagedSseEnabled: true,
    visibilityTimeout: 240
  })

  const ingestFunction = criFunction(stack, 'WebhookIngestFunction', {
    entry: 'src/webhooks/handler/webhook-ingest.ts',
    environment: {
      WEBHOOK_DEDUPLICATION_DB_TABLE_NAME: deduplicationTable.ref,
      WEBHOOK_QUEUE_URL: queue.attrQueueUrl
    },
    name: 'webhook-ingest',
    policies: [
      { sqsSendMessagePolicy: { queueName: queue.attrQueueName } },
      {
        statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: deduplicationTable.attrArn
          }
        ]
      },
      stack.parameterReadPolicy('webhook-ingest/*')
    ],
    provisionedConcurrency: true,
    subnets: 'protected'
  })
  criApiInvokePermission(stack, ingestFunction)

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
