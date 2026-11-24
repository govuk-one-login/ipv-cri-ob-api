import type { CriApi } from '@infra/cri/api/api'
import type { OAuth } from '@infra/open-banking/features/oauth'
import type { OpenBankingStack } from '@infra/open-banking/stack'

import { criApiInvokePermission } from '@infra/cri/api/api'
import { auditProducer } from '@infra/cri/audit'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criFunction } from '@infra/cri/function'
import { Fn } from 'aws-cdk-lib'

type IssueCredentialCollaborators = {
  oauthCommon: OAuth
  publicApi: CriApi
}

export const issueCredential = (
  stack: OpenBankingStack,
  { oauthCommon, publicApi }: IssueCredentialCollaborators
) => {
  const audit = auditProducer(stack)

  const issueCredentialFunction = criFunction(stack, 'IssueCredentialFunction', {
    entry: 'src/issue-credential/handler/issue-credential.ts',
    environment: {
      ...audit.environment,
      IDENTITY_SCORE_DB_TABLE_NAME: 'blah', // TODO create the identity score database
      JWT_TTL_SECONDS: '7200',
      KMS_SIGNING_KEY_ID: Fn.importValue('core-infrastructure-CriVcSigningKey1Id'),
      PERSON_IDENTITY_DB_TABLE_NAME: oauthCommon.personIdentityTableName,
      SESSION_DB_TABLE_NAME: oauthCommon.sessionTableName,
      VC_DOMAIN: stack.environmentValue('vcDomain')
    },
    name: 'issue-credential',
    policies: [
      ...audit.policies,
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
    subnets: 'private'
  })
  criApiInvokePermission(stack, issueCredentialFunction)
  criCanaryDeployment(stack, issueCredentialFunction, {
    api: publicApi,
    method: 'POST',
    path: '/credential/issue'
  })
}
