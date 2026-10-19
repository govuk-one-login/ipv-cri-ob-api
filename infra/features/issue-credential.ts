import type { OAuth } from '@infra/features/oauth'
import type { OpenBankingStack } from '@infra/stack'

import { esbuildMetadata } from '@infra/config/esbuild'
import { criFunction } from '@infra/constructs/cri-function'
import { Fn } from 'aws-cdk-lib'

export const issueCredential = (
  stack: OpenBankingStack,
  { oauthCommon }: { oauthCommon: OAuth }
) => {
  criFunction(stack, 'IssueCredentialFunction', {
    audit: true,
    canaryDeployment: { api: 'public', method: 'POST', path: '/credential/issue' },
    codeUri: '../',
    environment: {
      IDENTITY_SCORE_DB_TABLE_NAME: 'blah', // TODO create the identity score database
      JWT_TTL_SECONDS: '7200',
      KMS_SIGNING_KEY_ID: Fn.importValue('core-infrastructure-CriVcSigningKey1Id'),
      PERSON_IDENTITY_DB_TABLE_NAME: oauthCommon.personIdentityTableName,
      SESSION_DB_TABLE_NAME: oauthCommon.sessionTableName,
      VC_DOMAIN: stack.environmentValue('vcDomain')
    },
    handler: 'issue-credential.handler',
    invokedByApiGateway: true,
    metadata: esbuildMetadata('src/issue-credential/handler/issue-credential.ts'),
    name: 'issue-credential',
    policies: [
      { dynamoDbReadPolicy: { tableName: oauthCommon.sessionTableName } },
      { dynamoDbReadPolicy: { tableName: oauthCommon.personIdentityTableName } },
      { kmsDecryptPolicy: { keyId: oauthCommon.customerManagedKeyId } },
      {
        statement: [
          {
            Action: ['kms:Sign'],
            Effect: 'Allow',
            Resource: Fn.importValue('core-infrastructure-CriVcSigningKey1Arn')
          }
        ]
      }
    ],
    provisionedConcurrency: true,
    runtime: 'nodejs24.x',
    subnets: 'private'
  })
}
