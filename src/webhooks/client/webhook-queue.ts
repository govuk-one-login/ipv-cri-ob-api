import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs'

export interface WebhookQueue {
  sendWebhook: (body: string) => Promise<void>
}

export interface WebhookQueueConfig {
  queueUrl: string
}

export const createWebhookQueue = (
  config: WebhookQueueConfig,
  client: SQSClient
): WebhookQueue => ({
  sendWebhook: async (body) => {
    await client.send(
      new SendMessageCommand({
        MessageBody: body,
        QueueUrl: config.queueUrl
      })
    )
  }
})
