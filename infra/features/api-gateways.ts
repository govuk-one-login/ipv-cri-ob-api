import type { OpenBankingStack } from '@infra/stack'

import { criApi } from '@infra/constructs/cri-api'
import { apiLoggingKey } from '@infra/constructs/cri-api-logging'
import { criUsagePlan, ipvCoreApiKeys } from '@infra/constructs/cri-api-usage-plan'
import { Fn } from 'aws-cdk-lib'
import { CfnRole } from 'aws-cdk-lib/aws-iam'
import { resolve } from 'node:path'

const openApiDefinition = (file: string) => resolve(import.meta.dirname, '../api', file)

export const apiGateways = (stack: OpenBankingStack) => {
  const loggingKey = apiLoggingKey(stack)

  new CfnRole(stack, 'JWKSBucketRole', {
    assumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'apigateway.amazonaws.com' }
        }
      ],
      Version: '2012-10-17'
    },
    permissionsBoundary: stack.permissionsBoundary,
    policies: [
      {
        policyDocument: {
          Statement: [
            {
              Action: ['s3:Get*'],
              Effect: 'Allow',
              Resource: [
                Fn.sub('arn:aws:s3:::govuk-one-login-ob-published-keys-${Environment}/jwks.json')
              ]
            }
          ],
          Version: '2012-10-17'
        },
        policyName: 'AccessJWKSJson'
      }
    ],
    tags: [{ key: 'key_consumer_type', value: 'use' }]
  })

  const publicApi = criApi(stack, 'PublicAPI', {
    boundary: 'public',
    definition: openApiDefinition('public-api.yaml'),
    description: 'Public Open Banking CRI API',
    loggingKey
  })
  const publicUsagePlan = criUsagePlan(stack, 'PublicAPIUsagePlan', { api: publicApi })
  ipvCoreApiKeys(stack, publicUsagePlan)

  const privateApi = criApi(stack, 'PrivateAPI', {
    boundary: 'private',
    definition: openApiDefinition('private-api.yaml'),
    description: 'Private Open Banking CRI API',
    loggingKey
  })
  criUsagePlan(stack, 'PrivateAPIUsagePlan', { api: privateApi })
}
