import { testStack } from '../fixtures/test-stack'
import { criQueue } from '@infra/cri/queue'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

describe('criQueue', () => {
  it('is encrypted and redrives to its dead letter queue', () => {
    const stack = testStack()
    const deadLetterQueue = criQueue(stack, 'ExampleDeadLetterQueue', {})
    criQueue(stack, 'ExampleQueue', {
      deadLetterQueue: { maxReceiveCount: 5, queue: deadLetterQueue }
    })

    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: {
        deadLetterTargetArn: { 'Fn::GetAtt': ['ExampleDeadLetterQueue', 'Arn'] },
        maxReceiveCount: 5
      },
      SqsManagedSseEnabled: true
    })
  })
})
