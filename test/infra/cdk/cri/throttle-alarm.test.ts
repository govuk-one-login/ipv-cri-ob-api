import { testStack } from '../fixtures/test-stack'
import { criFunction } from '@infra/cri/function'
import { criThrottleAlarm } from '@infra/cri/throttle-alarm'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

describe('criThrottleAlarm', () => {
  it('warns as soon as the function is throttled', () => {
    const stack = testStack()
    const fn = criFunction(stack, 'ExampleFunction', {
      entry: 'src/example/handler/example-handler.ts',
      subnets: 'private'
    })
    criThrottleAlarm(stack, fn)

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: [{ 'Fn::ImportValue': 'build-notifications-WarningAlertsTopicArn' }],
      ComparisonOperator: 'GreaterThanThreshold',
      Dimensions: [
        { Name: 'FunctionName', Value: { 'Fn::Sub': '${AWS::StackName}-example-handler' } }
      ],
      MetricName: 'Throttles',
      Threshold: 1
    })
  })
})
