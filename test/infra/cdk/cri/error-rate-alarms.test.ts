import { testStack } from '../fixtures/test-stack'
import { criApi } from '@infra/cri/api/api'
import { criApiErrorRateAlarms } from '@infra/cri/api/error-rate-alarms'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

const definition = resolve(import.meta.dirname, '../fixtures/openapi.yaml')

describe('criApiErrorRateAlarms', () => {
  it.each([
    ['warning', 20, 'build-notifications-WarningAlertsTopicArn'],
    ['critical', 80, 'build-notifications-CriticalAlertsTopicArn']
  ])("is %s when over %d%% of the route's requests fail", (_severity, threshold, topic) => {
    const stack = testStack()
    const api = criApi(stack, 'ExampleApi', {
      definition,
      description: 'Example API',
      visibility: 'private'
    })
    criApiErrorRateAlarms(stack, 'Example', { api, method: 'GET', path: '/example' })

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: [{ 'Fn::ImportValue': topic }],
      Metrics: Match.arrayWith([
        Match.objectLike({ Expression: 'IF(requests < 5 || errors < 2, 0, errorPercentage)' })
      ]),
      Threshold: threshold
    })
  })
})
