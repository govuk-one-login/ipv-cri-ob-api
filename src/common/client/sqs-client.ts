import type { SQSClient } from '@aws-sdk/client-sqs'
import { SendMessageCommand } from '@aws-sdk/client-sqs'

export interface Config {
  queueUrl: string
}

export interface SQSProvider {
  send: (eventId: string) => Promise<void>
}

export const createSqsProvider = ({
  client,
  config
}: {
  client: SQSClient
  config: Config
}): SQSProvider => {
  return {
    send: async (eventId: string) => {
      await client.send(
        new SendMessageCommand({
          QueueUrl: config.queueUrl,
          MessageBody: eventId
        })
      )
    }
  }
}
