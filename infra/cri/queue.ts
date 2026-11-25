import type { CriStack } from '@infra/cri/stack'
import type { CfnQueueProps } from 'aws-cdk-lib/aws-sqs'

import { CfnQueue } from 'aws-cdk-lib/aws-sqs'

export type CriDeadLetterQueue = {
  maxReceiveCount: number
  queue: CfnQueue
}

export type CriQueueConfig = {
  deadLetterQueue?: CriDeadLetterQueue
} & Pick<CfnQueueProps, 'messageRetentionPeriod' | 'visibilityTimeout'>

export const criQueue = (stack: CriStack, id: string, config: CriQueueConfig): CfnQueue => {
  const { deadLetterQueue, ...queue } = config

  return new CfnQueue(stack, id, {
    ...queue,
    ...(deadLetterQueue && {
      redrivePolicy: {
        deadLetterTargetArn: deadLetterQueue.queue.attrArn,
        maxReceiveCount: deadLetterQueue.maxReceiveCount
      }
    }),
    sqsManagedSseEnabled: true
  })
}
