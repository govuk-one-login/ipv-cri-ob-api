import type { CriStack } from '@infra/cri/stack'
import type { CfnApi } from 'aws-cdk-lib/aws-sam'

import { Fn } from 'aws-cdk-lib'
import { CfnKey } from 'aws-cdk-lib/aws-kms'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'

export type CriAccessLogsConfig = {
  api: CfnApi
  label: string // e.g. Public -> …-public-AccessLogs
}

const accessLogFormat = JSON.stringify({
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

const accessLogKeyId = 'LoggingKmsKey'

const accessLogKey = (stack: CriStack) =>
  (stack.node.tryFindChild(accessLogKeyId) as CfnKey | undefined) ??
  new CfnKey(stack, accessLogKeyId, {
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

export const criAccessLogs = (stack: CriStack, id: string, config: CriAccessLogsConfig) => {
  const { api, label } = config

  const logGroup = new CfnLogGroup(stack, id, {
    kmsKeyId: accessLogKey(stack).attrArn,
    logGroupName: Fn.sub(
      `/aws/apigateway/\${AWS::StackName}-\${Api}-${label.toLowerCase()}-AccessLogs`,
      { Api: api.ref }
    ),
    retentionInDays: stack.parameters.logGroupRetentionInDays.valueAsNumber
  })
  api.accessLogSetting = { destinationArn: logGroup.attrArn, format: accessLogFormat }
}
