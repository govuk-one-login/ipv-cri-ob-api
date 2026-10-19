import type { CriStack } from '@infra/constructs/cri-stack'

import { Fn } from 'aws-cdk-lib'
import { CfnKey } from 'aws-cdk-lib/aws-kms'

export const accessLogFormat = JSON.stringify({
  requestId: '$context.requestId',
  ip: '$context.identity.sourceIp',
  requestTime: '$context.requestTime',
  httpMethod: '$context.httpMethod',
  path: '$context.path',
  routeKey: '$context.routeKey',
  status: '$context.status',
  protocol: '$context.protocol',
  responseLatency: '$context.responseLatency',
  responseLength: '$context.responseLength'
})

export const apiLoggingKey = (stack: CriStack) =>
  new CfnKey(stack, 'LoggingKmsKey', {
    enableKeyRotation: true,
    keyPolicy: {
      Statement: [
        {
          Action: ['kms:*'],
          Effect: 'Allow',
          Principal: { AWS: Fn.sub('arn:aws:iam::${AWS::AccountId}:root') },
          Resource: '*'
        },
        {
          Action: [
            'kms:Encrypt*',
            'kms:Decrypt*',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:Describe*'
          ],
          Condition: {
            ArnLike: {
              'kms:EncryptionContext:aws:logs:arn': Fn.sub(
                'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*'
              )
            }
          },
          Effect: 'Allow',
          Principal: { Service: Fn.sub('logs.${AWS::Region}.amazonaws.com') },
          Resource: '*'
        }
      ],
      Version: '2012-10-17'
    }
  })
