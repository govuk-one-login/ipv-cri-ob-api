import type { SQSClient } from '@aws-sdk/client-sqs'

import { SendMessageCommand } from '@aws-sdk/client-sqs'

export interface WebhookQueue {
  publish: (event: string) => Promise<void>
}

export interface WebhookQueueConfig {
  queueUrl: string
}

export const createWebhookQueue = ({
  client,
  config
}: {
  client: SQSClient
  config: WebhookQueueConfig
}): WebhookQueue => {
  return {
    publish: async (event) => {
      await client.send(
        new SendMessageCommand({
          QueueUrl: config.queueUrl,
          MessageBody: event
        })
      )
    }
  }
}
