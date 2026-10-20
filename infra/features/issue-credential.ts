import type { OAuth } from '@infra/features/oauth'
import type { OpenBankingStack } from '@infra/stack'

import { openBankingFunction } from '@infra/constructs/function'
import { Fn } from 'aws-cdk-lib'

export const issueCredential = (stack: OpenBankingStack, { oauth }: { oauth: OAuth }) => {
  openBankingFunction(stack, 'IssueCredentialFunction', {
    audit: true,
    entry: 'src/issue-credential/handler/issue-credential.ts',
    environment: {
      IDENTITY_SCORE_DB_TABLE_NAME: 'blah', // TODO create the identity score database
      JWT_TTL_SECONDS: '7200',
      KMS_SIGNING_KEY_ID: Fn.importValue('core-infrastructure-CriVcSigningKey1Id'),
      PERSON_IDENTITY_DB_TABLE_NAME: oauth.personIdentityTableName,
      SESSION_DB_TABLE_NAME: oauth.sessionTableName,
      VC_DOMAIN: stack.mappings.config('vcDomain')
    },
    invokedByApiGw: true,
    policies: [
      { dynamoDbReadPolicy: { tableName: oauth.sessionTableName } },
      { dynamoDbReadPolicy: { tableName: oauth.personIdentityTableName } },
      { kmsDecryptPolicy: { keyId: oauth.customerManagedKeyId } },
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
    subnets: 'private'
  })
}
