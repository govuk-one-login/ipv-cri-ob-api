import type { AlarmSeverity, CriAlarmConfig } from '@infra/cri/alarm'

import { testStack } from '../fixtures/test-stack'
import { criAlarm } from '@infra/cri/alarm'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

const criticalAlerts = { 'Fn::ImportValue': 'build-notifications-CriticalAlertsTopicArn' }
const pagerdutyAlerts = { 'Fn::ImportValue': 'build-notifications-PagerDutySNSTopicArn' }
const warningAlerts = { 'Fn::ImportValue': 'build-notifications-WarningAlertsTopicArn' }

const synthAlarm = (config: Pick<CriAlarmConfig, 'notifyOnOk' | 'severity'>) => {
  const stack = testStack()
  criAlarm(stack, 'ExampleAlarm', {
    ...config,
    comparisonOperator: 'GreaterThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    description: 'Example alarm',
    evaluationPeriods: 1,
    metricName: 'Errors',
    name: 'example',
    namespace: 'AWS/Lambda',
    period: 60,
    statistic: 'Sum',
    threshold: 1
  })
  return Template.fromStack(stack)
}

describe('criAlarm', () => {
  it.each<[AlarmSeverity, unknown]>([
    ['warning', warningAlerts],
    ['critical', criticalAlerts],
    ['page', { 'Fn::If': ['IsProduction', pagerdutyAlerts, criticalAlerts] }]
  ])('notifies the %s topic, with the support manual, under its condition', (severity, topic) => {
    synthAlarm({ notifyOnOk: true, severity }).hasResource('AWS::CloudWatch::Alarm', {
      Condition: 'IsDeployedFromPipeline',
      Properties: Match.objectLike({
        AlarmActions: [topic],
        AlarmDescription: 'Example alarm [support manual: https://manual.example.test/]',
        AlarmName: { 'Fn::Sub': '${AWS::StackName}-${Environment}-example' },
        OKActions: [topic]
      })
    })
  })

  it('can skip notifying when it returns to OK', () => {
    synthAlarm({ notifyOnOk: false, severity: 'warning' }).hasResourceProperties(
      'AWS::CloudWatch::Alarm',
      { OKActions: Match.absent() }
    )
  })
})
