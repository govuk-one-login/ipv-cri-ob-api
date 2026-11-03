import type { OAuth } from '@infra/features/oauth'
import type { TokenRotator } from '@infra/features/token-rotator'
import type { OpenBankingStack } from '@infra/stack'

import { esbuildMetadata } from '@infra/config/esbuild'
import { criFunction } from '@infra/constructs/cri-function'
import { criTable } from '@infra/constructs/cri-table'
import { Fn } from 'aws-cdk-lib'

import * as ssm from 'aws-cdk-lib/aws-ssm'

export const consents = (
  stack: OpenBankingStack,
  { ecospendTokens, oauthCommon }: { ecospendTokens: TokenRotator; oauthCommon: OAuth }
) => {
  const consentsTable = criTable(stack, 'ConsentsTable', {
    partitionKey: 'sessionId',
    ttlAttribute: 'ttl'
  })

  criFunction(stack, 'ConsentsFunction', {
    canaryDeployment: { api: 'private', method: 'POST', path: '/consents' },
    codeUri: '../',
    environment: {
      CONSENTS_DB_TABLE_NAME: consentsTable.ref,
      TOKEN_ROTATOR_DB_TABLE_NAME: ecospendTokens.table.ref,
      SESSION_DB_TABLE_NAME: oauthCommon.sessionTableName
    },
    handler: 'consents.handler',
    invokedByApiGateway: true,
    metadata: esbuildMetadata('src/consents/handler/consents.ts'),
    name: 'consents',
    policies: [
      { dynamoDbReadPolicy: { tableName: oauthCommon.sessionTableName } },
      { kmsDecryptPolicy: { keyId: oauthCommon.customerManagedKeyId } },
      {
        statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: consentsTable.attrArn
          },
          { Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: ecospendTokens.table.attrArn }
        ]
      },
      stack.parameterReadPolicy('consents/*')
    ],
    provisionedConcurrency: true,
    runtime: 'nodejs24.x',
    subnets: 'protected'
  })

  stack.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    new ssm.CfnParameter(stack, `${idPrefix}ConsentsEndpointParameter`, {
      description: `Consents endpoint for ${profile}`,
      name: stack.parameterName(`consents/${profile}/endpoint-url`),
      type: 'String',
      value: Fn.sub('${BaseUrl}/api/v3.0/consents', {
        BaseUrl: stack.endpointProfiles.url(profile)
      })
    }).cfnOptions.condition = condition
  })
}
