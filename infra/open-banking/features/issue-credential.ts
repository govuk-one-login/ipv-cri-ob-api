import type { CriApi } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'
import type { OAuthCommon } from '@infra/open-banking/features/oauth-common'

import { criApiInvokePermission } from '@infra/cri/api/api'
import { auditEventsProducer } from '@infra/cri/audit-events'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criFunction } from '@infra/cri/function'
import { Fn } from 'aws-cdk-lib'

type IssueCredentialCollaborators = {
  oauthCommon: OAuthCommon
  publicApi: CriApi
}

export const issueCredential = (stack: CriStack, collaborators: IssueCredentialCollaborators) => {
  const audit = auditEventsProducer(stack)
  const session = collaborators.oauthCommon.sessionReader
  const { personIdentityTableName } = collaborators.oauthCommon

  const issueCredentialFunction = criFunction(stack, 'IssueCredentialFunction', {
    entry: 'src/issue-credential/handler/issue-credential.ts',
    environment: {
      ...audit.environment,
      ...session.environment,
      IDENTITY_SCORE_DB_TABLE_NAME: 'blah', // TODO create the identity score database
      JWT_TTL_SECONDS: '7200',
      KMS_SIGNING_KEY_ID: Fn.importValue('core-infrastructure-CriVcSigningKey1Id'),
      PERSON_IDENTITY_DB_TABLE_NAME: personIdentityTableName,
      VC_DOMAIN: stack.environmentValue('vcDomain')
    },
    policies: [
      ...audit.policies,
      ...session.policies,
      { dynamoDbReadPolicy: { tableName: personIdentityTableName } },
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
  criApiInvokePermission(stack, issueCredentialFunction, collaborators.publicApi)
  criCanaryDeployment(stack, issueCredentialFunction, {
    api: collaborators.publicApi,
    method: 'POST',
    path: '/credential/issue'
  })
}
