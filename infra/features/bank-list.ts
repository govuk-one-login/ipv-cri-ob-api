import type { OAuth } from '@infra/features/oauth'
import type { TokenRotator } from '@infra/features/token-rotator'
import type { OpenBankingStack } from '@infra/stack'

import { esbuildMetadata } from '@infra/config/esbuild'
import { endpointProfileDimension } from '@infra/config/lime-endpoint-profiles'
import { criAlarm } from '@infra/constructs/cri-alarm'
import { criFunction } from '@infra/constructs/cri-function'
import { criTable } from '@infra/constructs/cri-table'
import { Fn } from 'aws-cdk-lib'

import * as ssm from 'aws-cdk-lib/aws-ssm'

export const bankList = (
  stack: OpenBankingStack,
  { ecospendTokens, oauthCommon }: { ecospendTokens: TokenRotator; oauthCommon: OAuth }
) => {
  const bankListTable = criTable(stack, 'BankListTable', { partitionKey: 'profile' })

  criFunction(stack, 'BankListUpdaterFunction', {
    codeUri: '../',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      ENDPOINT_PROFILES: stack.endpointProfiles.enabled,
      TOKEN_ROTATOR_DB_TABLE_NAME: ecospendTokens.table.ref
    },
    events: {
      ScheduledUpdate: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    handler: 'bank-list-updater.handler',
    maximumRetryAttempts: 0,
    metadata: esbuildMetadata('src/bank-list/handler/bank-list-updater.ts'),
    name: 'bank-list-updater',
    policies: [
      {
        statement: [
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: ecospendTokens.table.attrArn },
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: bankListTable.attrArn
          }
        ]
      },
      stack.parameterReadPolicy('bank-list/*')
    ],
    runtime: 'nodejs24.x',
    subnets: 'protected'
  })

  criFunction(stack, 'BankListRetrieverFunction', {
    canaryDeployment: { api: 'private', method: 'GET', path: '/banks' },
    codeUri: '../',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      SESSION_DB_TABLE_NAME: oauthCommon.sessionTableName
    },
    handler: 'bank-list-retriever.handler',
    invokedByApiGateway: true,
    metadata: esbuildMetadata('src/bank-list/handler/bank-list-retriever.ts'),
    name: 'bank-list-retriever',
    policies: [
      { dynamoDbReadPolicy: { tableName: oauthCommon.sessionTableName } },
      { kmsDecryptPolicy: { keyId: oauthCommon.customerManagedKeyId } },
      {
        statement: [
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: bankListTable.attrArn }
        ]
      }
    ],
    runtime: 'nodejs24.x',
    subnets: 'private'
  })

  stack.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    new ssm.CfnParameter(stack, `${idPrefix}BankListEndpointParameter`, {
      description: `Bank list endpoint for ${profile}`,
      name: stack.parameterName(`bank-list/${profile}/endpoint-url`),
      type: 'String',
      value: Fn.sub('${BaseUrl}/api/v2.0/banks', { BaseUrl: stack.endpointProfiles.url(profile) })
    }).cfnOptions.condition = condition
  })

  stack.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    const metric = (metricName: string) => ({
      dimensions: [
        { name: 'service', value: Fn.sub('${CriIdentifier}-bank-list-updater') },
        endpointProfileDimension(profile)
      ],
      metricName,
      namespace: stack.parameters.criIdentifier.valueAsString
    })

    criAlarm(stack, `${idPrefix}BankListSizeDropAlarm`, {
      comparisonOperator: 'LessThanThreshold',
      condition,
      datapointsToAlarm: 1,
      description: `${profile} bank list size dropped by more than 10% between updater runs.`,
      evaluationPeriods: 60,
      metrics: [
        {
          expression: '100 * DIFF(size) / (size - DIFF(size))',
          id: 'change',
          label: 'Percentage change in bank list size',
          returnData: true
        },
        {
          id: 'size',
          metricStat: { metric: metric('bank_list_size'), period: 60, stat: 'Minimum' },
          returnData: false
        }
      ],
      name: `bank-list-size-drop-${profile.toLowerCase()}`,
      notifyOnOk: false,
      severity: 'warning',
      threshold: -10,
      treatMissingData: 'notBreaching'
    })

    criAlarm(stack, `${idPrefix}BankListEmptyAlarm`, {
      ...metric('bank_list_size'),
      comparisonOperator: 'LessThanThreshold',
      condition,
      datapointsToAlarm: 1,
      description: `${profile} bank list is empty.`,
      evaluationPeriods: 1,
      name: `bank-list-empty-${profile.toLowerCase()}`,
      period: 60,
      severity: 'critical',
      statistic: 'Maximum',
      threshold: 1,
      treatMissingData: 'notBreaching'
    })

    criAlarm(stack, `${idPrefix}BankListNotUpdatedAlarm`, {
      comparisonOperator: 'LessThanThreshold',
      condition,
      datapointsToAlarm: 8,
      description: `${profile} bank list has not been updated for 2 hours.`,
      evaluationPeriods: 8,
      metrics: [
        {
          expression: 'FILL(updates, 0)',
          id: 'updatesOrZero',
          label: 'Bank list updates with missing data filled as 0',
          returnData: true
        },
        {
          id: 'updates',
          metricStat: { metric: metric('bank_list_updated'), period: 900, stat: 'Sum' },
          returnData: false
        }
      ],
      name: `bank-list-not-updated-${profile.toLowerCase()}`,
      severity: 'warning',
      threshold: 1,
      treatMissingData: 'breaching'
    })
  })
}
