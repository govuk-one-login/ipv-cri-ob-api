import type { OAuth } from '@infra/features/oauth'
import type { TokenRotator } from '@infra/features/token-rotator'
import type { OpenBankingStack } from '@infra/stack'

import { openBankingFunction } from '@infra/constructs/function'
import { openBankingTable } from '@infra/constructs/table'
import { Fn } from 'aws-cdk-lib'

import * as ssm from 'aws-cdk-lib/aws-ssm'

export const consents = (
  stack: OpenBankingStack,
  { oauth, tokenRotator }: { oauth: OAuth; tokenRotator: TokenRotator }
) => {
  const consentsTable = openBankingTable(stack, 'ConsentsTable', {
    partitionKey: 'sessionId',
    ttlAttribute: 'ttl'
  })

  openBankingFunction(stack, 'ConsentsFunction', {
    entry: 'src/consents/handler/consents.ts',
    environment: {
      CONSENTS_DB_TABLE_NAME: consentsTable.ref,
      TOKEN_ROTATOR_DB_TABLE_NAME: tokenRotator.table.ref,
      SESSION_DB_TABLE_NAME: oauth.sessionTableName
    },
    invokedByApiGw: true,
    policies: [
      { dynamoDbReadPolicy: { tableName: oauth.sessionTableName } },
      { kmsDecryptPolicy: { keyId: oauth.customerManagedKeyId } },
      {
        statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: consentsTable.attrArn
          },
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: tokenRotator.table.attrArn }
        ]
      },
      {
        ssmParameterReadPolicy: {
          parameterName: Fn.sub('${Prefix}/consents/*', { Prefix: stack.parameterPrefix })
        }
      }
    ],
    provisionedConcurrency: true,
    subnets: 'protected'
  })

  new ssm.CfnParameter(stack, 'StubConsentsEndpointParameter', {
    description: 'Consents endpoint for STUB',
    name: Fn.sub('/${Prefix}/consents/STUB/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v3.0/consents', { BaseUrl: stack.mappings.endpointUrl('STUB') })
  }).cfnOptions.condition = stack.conditions.createStubParameters

  new ssm.CfnParameter(stack, 'UatConsentsEndpointParameter', {
    description: 'Consents endpoint for UAT',
    name: Fn.sub('/${Prefix}/consents/UAT/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v3.0/consents', { BaseUrl: stack.mappings.endpointUrl('UAT') })
  }).cfnOptions.condition = stack.conditions.createUatParameters

  new ssm.CfnParameter(stack, 'LiveConsentsEndpointParameter', {
    description: 'Consents endpoint for LIVE',
    name: Fn.sub('/${Prefix}/consents/LIVE/endpoint-url', { Prefix: stack.parameterPrefix }),
    type: 'String',
    value: Fn.sub('${BaseUrl}/api/v3.0/consents', { BaseUrl: stack.mappings.endpointUrl('LIVE') })
  }).cfnOptions.condition = stack.conditions.createLiveParameters
}
