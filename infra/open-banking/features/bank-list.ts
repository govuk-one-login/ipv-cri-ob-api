import type { ApiRoute, CriApi } from '@infra/cri/api/api'
import type { CriFunction } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'
import type { LimeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import type { OAuthCommon } from '@infra/open-banking/features/oauth-common'
import type { TokenReader } from '@infra/open-banking/features/token-rotator'
import type { CfnResource } from 'aws-cdk-lib'

import { criAlarm } from '@infra/cri/alarm'
import { criApiInvokePermission } from '@infra/cri/api/api'
import { criApiErrorRateAlarms } from '@infra/cri/api/error-rate-alarms'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criDeploymentCheck } from '@infra/cri/deployment-check'
import { criDynamoTable, tableAccess } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { criSsmParameter, parameterReadPolicy } from '@infra/cri/ssm-parameter'
import { criThrottleAlarm } from '@infra/cri/throttle-alarm'
import { endpointProfileDimension } from '@infra/lime/endpoint-profiles'
import { Fn } from 'aws-cdk-lib'

type BankListCollaborators = {
  endpointProfiles: LimeEndpointProfiles
  oauthCommon: OAuthCommon
  privateApi: CriApi
  tokenReader: TokenReader
  tokenRotatorDeploymentCheck: CfnResource // the updater needs a token, so its check runs after
}

export const bankList = (stack: CriStack, collaborators: BankListCollaborators) => {
  const session = collaborators.oauthCommon.sessionReader
  const token = collaborators.tokenReader
  const bankListTable = criDynamoTable(stack, 'BankListTable', { partitionKey: 'profile' })

  const updaterFunction = criFunction(stack, 'BankListUpdaterFunction', {
    entry: 'src/bank-list/handler/bank-list-updater.ts',
    environment: {
      ...token.environment,
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      ENDPOINT_PROFILES: collaborators.endpointProfiles.enabled
    },
    policies: [
      ...token.policies,
      tableAccess(bankListTable, ['GetItem', 'PutItem']),
      parameterReadPolicy(stack, 'bank-list/*')
    ],
    schedule: 'rate(1 minute)',
    subnets: 'protected'
  })
  criDeploymentCheck(stack, updaterFunction, {
    dependsOn: [collaborators.tokenRotatorDeploymentCheck]
  })

  const retrieverFunction = criFunction(stack, 'BankListRetrieverFunction', {
    entry: 'src/bank-list/handler/bank-list-retriever.ts',
    environment: {
      ...session.environment,
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref
    },
    policies: [...session.policies, tableAccess(bankListTable, ['GetItem'])],
    subnets: 'private'
  })

  const retrieverRoute: ApiRoute = { api: collaborators.privateApi, method: 'GET', path: '/banks' }
  criApiInvokePermission(stack, retrieverFunction, collaborators.privateApi)
  criCanaryDeployment(stack, retrieverFunction, retrieverRoute)
  criApiErrorRateAlarms(stack, 'BankListRetriever', retrieverRoute)
  criThrottleAlarm(stack, retrieverFunction)

  collaborators.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    criSsmParameter(stack, `${idPrefix}BankListEndpointParameter`, {
      condition,
      description: `Bank list endpoint for ${profile}`,
      path: `bank-list/${profile}/endpoint-url`,
      value: Fn.sub('${BaseUrl}/api/v2.0/banks', {
        BaseUrl: collaborators.endpointProfiles.url(profile)
      })
    })

    const metric = (fn: CriFunction, metricName: string) => ({
      dimensions: [{ name: 'service', value: fn.serviceName }, endpointProfileDimension(profile)],
      metricName,
      namespace: fn.metricsNamespace
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
          metricStat: {
            metric: metric(updaterFunction, 'bank_list_size'),
            period: 60,
            stat: 'Minimum'
          },
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
      comparisonOperator: 'LessThanThreshold',
      condition,
      datapointsToAlarm: 1,
      description: `${profile} bank list stored by the updater or served by the retriever is empty.`,
      evaluationPeriods: 1,
      metrics: [
        {
          expression: 'MIN([stored, served])',
          id: 'emptiest',
          label: 'Smallest bank list size stored or served',
          returnData: true
        },
        {
          id: 'stored',
          metricStat: {
            metric: metric(updaterFunction, 'bank_list_size'),
            period: 60,
            stat: 'Maximum'
          },
          returnData: false
        },
        {
          id: 'served',
          metricStat: {
            metric: metric(retrieverFunction, 'bank_list_size'),
            period: 60,
            stat: 'Maximum'
          },
          returnData: false
        }
      ],
      name: `bank-list-empty-${profile.toLowerCase()}`,
      severity: 'critical',
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
          metricStat: {
            metric: metric(updaterFunction, 'bank_list_updated'),
            period: 900,
            stat: 'Sum'
          },
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
