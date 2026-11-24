import type { CriApi } from '@infra/cri/api/api'
import type { OAuth } from '@infra/open-banking/features/oauth'
import type { OpenBankingStack } from '@infra/open-banking/stack'
import type { CfnTable } from 'aws-cdk-lib/aws-dynamodb'

import { criApiInvokePermission } from '@infra/cri/api/api'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criDynamoTable } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { criSsmParameter } from '@infra/cri/ssm-parameter'
import { Fn } from 'aws-cdk-lib'

type ConsentsCollaborators = {
  oauthCommon: OAuth
  privateApi: CriApi
  tokenTable: CfnTable
}

export const consents = (stack: OpenBankingStack, collaborators: ConsentsCollaborators) => {
  const consentsTable = criDynamoTable(stack, 'ConsentsTable', {
    partitionKey: 'sessionId',
    ttlAttribute: 'ttl'
  })

  const consentsFunction = criFunction(stack, 'ConsentsFunction', {
    entry: 'src/consents/handler/consents.ts',
    environment: {
      CONSENTS_DB_TABLE_NAME: consentsTable.ref,
      TOKEN_ROTATOR_DB_TABLE_NAME: collaborators.tokenTable.ref,
      SESSION_DB_TABLE_NAME: collaborators.oauthCommon.sessionTableName
    },
    name: 'consents',
    policies: [
      { dynamoDbReadPolicy: { tableName: collaborators.oauthCommon.sessionTableName } },
      { kmsDecryptPolicy: { keyId: collaborators.oauthCommon.customerManagedKeyId } },
      {
        statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: consentsTable.attrArn
          },
          {
            Action: 'dynamodb:GetItem',
            Effect: 'Allow',
            Resource: collaborators.tokenTable.attrArn
          }
        ]
      },
      stack.parameterReadPolicy('consents/*')
    ],
    provisionedConcurrency: true,
    subnets: 'protected'
  })
  criApiInvokePermission(stack, consentsFunction)
  criCanaryDeployment(stack, consentsFunction, {
    api: collaborators.privateApi,
    method: 'POST',
    path: '/consents'
  })

  stack.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    criSsmParameter(stack, `${idPrefix}ConsentsEndpointParameter`, {
      condition,
      description: `Consents endpoint for ${profile}`,
      path: `consents/${profile}/endpoint-url`,
      value: Fn.sub('${BaseUrl}/api/v3.0/consents', {
        BaseUrl: stack.endpointProfiles.url(profile)
      })
    })
  })
}
