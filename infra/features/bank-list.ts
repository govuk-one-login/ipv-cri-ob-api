import type { OAuth } from '@infra/features/oauth'
import type { TokenRotator } from '@infra/features/token-rotator'
import type { OpenBankingStack } from '@infra/stack'

import { openBankingFunction } from '@infra/constructs/function'
import { openBankingTable } from '@infra/constructs/table'
import { Fn } from 'aws-cdk-lib'

import * as ssm from 'aws-cdk-lib/aws-ssm'

export const bankList = (
  stack: OpenBankingStack,
  { oauth, tokenRotator }: { oauth: OAuth; tokenRotator: TokenRotator }
) => {
  const bankListTable = openBankingTable(stack, 'BankListTable', { partitionKey: 'profile' })

  openBankingFunction(stack, 'BankListUpdaterFunction', {
    entry: 'src/bank-list/handler/bank-list-updater.ts',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      ENDPOINT_PROFILES: stack.mappings.config('endpointProfiles'),
      TOKEN_ROTATOR_DB_TABLE_NAME: tokenRotator.table.ref
    },
    events: {
      ScheduledUpdate: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    maximumRetryAttempts: 0,
    policies: [
      {
        statement: [
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: tokenRotator.table.attrArn },
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: bankListTable.attrArn
          }
        ]
      },
      {
        ssmParameterReadPolicy: {
          parameterName: Fn.sub('${Prefix}/bank-list/*', { Prefix: stack.parameterPrefix })
        }
      }
    ],
    subnets: 'protected'
  })

  openBankingFunction(stack, 'BankListRetrieverFunction', {
    entry: 'src/bank-list/handler/bank-list-retriever.ts',
    environment: {
      BANK_LIST_DB_TABLE_NAME: bankListTable.ref,
      SESSION_DB_TABLE_NAME: oauth.sessionTableName
    },
    invokedByApiGw: true,
    policies: [
      { dynamoDbReadPolicy: { tableName: oauth.sessionTableName } },
      { kmsDecryptPolicy: { keyId: oauth.customerManagedKeyId } },
      {
        statement: [
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: bankListTable.attrArn }
        ]
      }
    ],
    subnets: 'private'
  })

  new ssm.CfnParameter(stack, 'StubBankListEndpointParameter', {
    description: 'Bank list endpoint for STUB',
    name: Fn.sub('/${Prefix}/bank-list/STUB/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v2.0/banks', { BaseUrl: stack.mappings.endpointUrl('STUB') })
  }).cfnOptions.condition = stack.conditions.createStubParameters

  new ssm.CfnParameter(stack, 'UatBankListEndpointParameter', {
    description: 'Bank list endpoint for UAT',
    name: Fn.sub('/${Prefix}/bank-list/UAT/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v2.0/banks', { BaseUrl: stack.mappings.endpointUrl('UAT') })
  }).cfnOptions.condition = stack.conditions.createUatParameters

  new ssm.CfnParameter(stack, 'LiveBankListEndpointParameter', {
    description: 'Bank list endpoint for LIVE',
    name: Fn.sub('/${Prefix}/bank-list/LIVE/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v2.0/banks', { BaseUrl: stack.mappings.endpointUrl('LIVE') })
  }).cfnOptions.condition = stack.conditions.createLiveParameters
}
