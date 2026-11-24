import type { CriStack } from '@infra/cri/stack'

import { Fn } from 'aws-cdk-lib'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

export type CriApiS3ReadRoleConfig = {
  bucket: string
  key: string
  tags?: Record<string, string>
}

export const criApiS3ReadRole = (
  stack: CriStack,
  id: string,
  config: CriApiS3ReadRoleConfig
): CfnRole =>
  new CfnRole(stack, id, {
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
                Fn.sub('arn:aws:s3:::${Bucket}/${Key}', { Bucket: config.bucket, Key: config.key })
              ]
            }
          ],
          Version: '2012-10-17'
        },
        policyName: 'ReadObject'
      }
    ],
    ...(config.tags && {
      tags: Object.entries(config.tags).map(([key, value]) => ({ key, value }))
    })
  })
