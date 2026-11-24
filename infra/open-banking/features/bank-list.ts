import type { CriApi } from '@infra/cri/api/api'
import type { OAuth } from '@infra/open-banking/features/oauth'
import type { OpenBankingStack } from '@infra/open-banking/stack'
import type { CfnTable } from 'aws-cdk-lib/aws-dynamodb'

import { criAlarm } from '@infra/cri/alarm'
import { criApiInvokePermission } from '@infra/cri/api/api'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criDynamoTable } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { criSsmParameter } from '@infra/cri/ssm-parameter'
import { endpointProfileDimension } from '@infra/lime/endpoint-profiles'
import { Fn } from 'aws-cdk-lib'

type BankListCollaborators = {
  oauthCommon: OAuth
  privateApi: CriApi
  tokenTable: CfnTable
}

export const bankList = (stack: OpenBankingStack, collaborators: BankListCollaborators) => {
  const bankListTable = criDynamoTable(stack, 'BankListTable', { partitionKey: 'profile' })

  criFunction(stack, 'BankListUpdaterFunction', {
    entry: 'src/bank-list/handler/bank-list-updater.ts',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      ENDPOINT_PROFILES: stack.endpointProfiles.enabled,
      TOKEN_ROTATOR_DB_TABLE_NAME: collaborators.tokenTable.ref
    },
    events: {
      ScheduledUpdate: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    maximumRetryAttempts: 0,
    name: 'bank-list-updater',
    policies: [
      {
        statement: [
          {
            Action: 'dynamodb:GetItem',
            Effect: 'Allow',
            Resource: collaborators.tokenTable.attrArn
          },
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: bankListTable.attrArn
          }
        ]
      },
      stack.parameterReadPolicy('bank-list/*')
    ],
    subnets: 'protected'
  })

  const retrieverFunction = criFunction(stack, 'BankListRetrieverFunction', {
    entry: 'src/bank-list/handler/bank-list-retriever.ts',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      SESSION_DB_TABLE_NAME: collaborators.oauthCommon.sessionTableName
    },
    name: 'bank-list-retriever',
    policies: [
      { dynamoDbReadPolicy: { tableName: collaborators.oauthCommon.sessionTableName } },
      { kmsDecryptPolicy: { keyId: collaborators.oauthCommon.customerManagedKeyId } },
      {
        statement: [
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: bankListTable.attrArn }
        ]
      }
    ],
    subnets: 'private'
  })
  criApiInvokePermission(stack, retrieverFunction)
  criCanaryDeployment(stack, retrieverFunction, {
    api: collaborators.privateApi,
    method: 'GET',
    path: '/banks'
  })

  stack.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    criSsmParameter(stack, `${idPrefix}BankListEndpointParameter`, {
      condition,
      description: `Bank list endpoint for ${profile}`,
      path: `bank-list/${profile}/endpoint-url`,
      value: Fn.sub('${BaseUrl}/api/v2.0/banks', { BaseUrl: stack.endpointProfiles.url(profile) })
    })

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
