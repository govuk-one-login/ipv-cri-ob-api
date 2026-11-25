import { criApp } from '@infra/cri/app'
import { OpenBankingStack } from '@infra/open-banking/stack'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'

const template = Template.fromStack(new OpenBankingStack(criApp(), 'OpenBanking'))

const bankListSize = (service: string) =>
  Match.objectLike({
    MetricStat: Match.objectLike({
      Metric: Match.objectLike({
        Dimensions: Match.arrayWith([
          { Name: 'service', Value: { 'Fn::Sub': `\${CriIdentifier}-${service}` } }
        ]),
        MetricName: 'bank_list_size'
      })
    })
  })

describe('OpenBankingStack', () => {
  it('keeps every log group for 365 days in production and 30 elsewhere', () => {
    expect(template.findMappings('EnvironmentConfiguration')).toMatchObject({
      EnvironmentConfiguration: {
        dev: { logGroupRetentionInDays: 30 },
        production: { logGroupRetentionInDays: 365 }
      }
    })
    template.allResourcesProperties('AWS::Logs::LogGroup', {
      RetentionInDays: {
        'Fn::FindInMap': [
          'EnvironmentConfiguration',
          { Ref: 'Environment' },
          'logGroupRetentionInDays'
        ]
      }
    })
  })

  it.each(['Stub', 'Uat', 'Live'])(
    'alarms on the %s bank list where that profile is enabled',
    (profile) => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm', {
        Condition: `Create${profile}EndpointProfileResources`
      })

      expect(Object.keys(alarms).sort()).toEqual(
        ['BankListEmptyAlarm', 'BankListNotUpdatedAlarm', 'BankListSizeDropAlarm'].map(
          (alarm) => `${profile}${alarm}`
        )
      )
    }
  )

  it('alarms when the bank list stored by the updater or served by the retriever is empty', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Metrics: [
        Match.objectLike({ Expression: 'MIN([stored, served])', ReturnData: true }),
        bankListSize('bank-list-updater'),
        bankListSize('bank-list-retriever')
      ],
      Threshold: 1
    })
  })

  it('has the stack-wide and feature alarms in pipeline deployments', () => {
    const alarms = template.findResources('AWS::CloudWatch::Alarm', {
      Condition: 'IsDeployedFromPipeline'
    })

    expect(Object.keys(alarms)).toEqual(
      expect.arrayContaining([
        'APIGW5XXErrors',
        'EcospendTokenRotatorErrorAlarm',
        'EcospendTokenRotatorNotRunningAlarm',
        'LambdaErrors',
        'WebhookDeadLetterQueueAlarm'
      ])
    )
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Metrics: Match.arrayWith(
        ['Private', 'Public'].map((api) =>
          Match.objectLike({
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({
                Dimensions: [
                  {
                    Name: 'ApiName',
                    Value: { 'Fn::Sub': `\${AWS::StackName}-${api}OpenBankingAPI` }
                  }
                ]
              })
            })
          })
        )
      )
    })
  })

  it('checks every scheduled function when it is deployed', () => {
    const scheduled = Object.keys(
      template.findResources('AWS::Serverless::Function', {
        Properties: { Events: { Schedule: Match.objectLike({ Type: 'Schedule' }) } }
      })
    )

    expect(scheduled.length).toBeGreaterThan(0)
    for (const fn of scheduled) {
      template.hasResourceProperties('Custom::AsyncDeploymentCheck', {
        ServiceToken: { Ref: `${fn}.Alias` }
      })
    }
  })

  it('gives the webhook function its deduplication table and queue', () => {
    template.hasResourceProperties('AWS::Serverless::Function', {
      Environment: {
        Variables: Match.objectLike({
          WEBHOOK_DEDUPLICATION_DB_TABLE_NAME: { Ref: 'WebhookDeduplicationTable' },
          WEBHOOK_QUEUE_URL: { 'Fn::GetAtt': ['WebhookQueue', 'QueueUrl'] }
        })
      }
    })
  })

  it('publishes expected outputs', () => {
    expect(Object.keys(template.findOutputs('*')).sort()).toEqual([
      'IpvCoreBackApiKeyId',
      'PrivateApiBaseUrl',
      'PrivateApiGatewayId',
      'PublicApiBaseUrl',
      'PublicApiGatewayId',
      'StackName'
    ])
  })
})
