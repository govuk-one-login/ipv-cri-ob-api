import type { CriStack } from '@infra/constructs/cri-stack'
import type { CfnCondition } from 'aws-cdk-lib'
import type { CfnAlarmProps } from 'aws-cdk-lib/aws-cloudwatch'

import { Fn, Token } from 'aws-cdk-lib'
import { CfnAlarm } from 'aws-cdk-lib/aws-cloudwatch'

export type AlarmSeverity = 'critical' | 'page' | 'warning'

export type CriAlarmConfig = {
  condition: CfnCondition
  description: string
  name: string
  notifyOnOk?: boolean
  severity: AlarmSeverity
} & Pick<
  CfnAlarmProps,
  | 'comparisonOperator'
  | 'datapointsToAlarm'
  | 'dimensions'
  | 'evaluationPeriods'
  | 'metricName'
  | 'metrics'
  | 'namespace'
  | 'period'
  | 'statistic'
  | 'threshold'
  | 'treatMissingData'
  | 'unit'
>

const topic = (stack: CriStack, severity: AlarmSeverity) => {
  const criticalAlerts = Fn.importValue('build-notifications-CriticalAlertsTopicArn')
  const warningAlerts = Fn.importValue('build-notifications-WarningAlertsTopicArn')
  const pagerdutyAlerts = Fn.importValue('build-notifications-PagerDutySNSTopicArn')
  switch (severity) {
    case 'critical':
      return criticalAlerts
    case 'page':
      return Token.asString(
        Fn.conditionIf(stack.conditions.isProduction.logicalId, pagerdutyAlerts, criticalAlerts)
      )
    case 'warning':
      return warningAlerts
  }
}

export const criAlarm = (stack: CriStack, id: string, config: CriAlarmConfig): CfnAlarm => {
  const { condition, description, name, notifyOnOk = true, severity, ...metric } = config
  const actions = [topic(stack, severity)]

  const alarm = new CfnAlarm(stack, id, {
    ...metric,
    actionsEnabled: true,
    alarmActions: actions,
    alarmDescription: description,
    alarmName: Fn.sub(`\${AWS::StackName}-\${Environment}-${name}`),
    ...(notifyOnOk && { okActions: actions })
  })
  alarm.cfnOptions.condition = condition
  return alarm
}
