import type { OpenBankingStack } from '@infra/stack'

import { ifCondition } from '@infra/constructs/conditions'
import { CfnOutput, Fn, Token } from 'aws-cdk-lib'
import { CfnUsagePlan, CfnUsagePlanKey } from 'aws-cdk-lib/aws-apigateway'
import { CfnRole } from 'aws-cdk-lib/aws-iam'
import { CfnKey } from 'aws-cdk-lib/aws-kms'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnApi } from 'aws-cdk-lib/aws-sam'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

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

const methodSettings = (stack: OpenBankingStack) => [
  {
    DataTraceEnabled: ifCondition(stack.conditions.isProduction, false, true),
    HttpMethod: '*',
    LoggingLevel: 'INFO',
    MetricsEnabled: true,
    ResourcePath: '/*',
    ThrottlingBurstLimit: 400,
    ThrottlingRateLimit: 200
  }
]

const openApiDefinition = (file: string): unknown =>
  parse(readFileSync(resolve(import.meta.dirname, '../api', file), 'utf8'))

const tags = { CustomPolicy: 'true', FMSRegionalPolicy: 'false' }

const usagePlanProps = {
  quota: { limit: 500000, period: 'DAY' },
  throttle: { burstLimit: 400, rateLimit: 200 }
}

export const api = (stack: OpenBankingStack) => {
  const { conditions, parameters } = stack
  const environment = parameters.environment.valueAsString

  const loggingKey = new CfnKey(stack, 'LoggingKmsKey', {
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

  const publicLogGroup = new CfnLogGroup(stack, 'PublicAPILogGroup', {
    kmsKeyId: loggingKey.attrArn,
    logGroupName: Fn.sub('/aws/apigateway/${AWS::StackName}-${PublicAPI}-public-AccessLogs'),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const publicApi = new CfnApi(stack, 'PublicAPI', {
    accessLogSetting: { destinationArn: publicLogGroup.attrArn, format: accessLogFormat },
    definitionBody: openApiDefinition('./public-api.yaml'),
    description: 'Public Open Banking CRI API',
    endpointConfiguration: { type: 'REGIONAL' },
    methodSettings: methodSettings(stack),
    name: Fn.sub('${AWS::StackName}-PublicOpenBankingAPI'),
    openApiVersion: '3.0.1',
    stageName: environment,
    tags,
    tracingEnabled: true
  })

  const privateLogGroup = new CfnLogGroup(stack, 'PrivateAPILogGroup', {
    kmsKeyId: loggingKey.attrArn,
    logGroupName: Fn.sub('/aws/apigateway/${AWS::StackName}-${PrivateAPI}-private-AccessLogs'),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const privateApi = new CfnApi(stack, 'PrivateAPI', {
    accessLogSetting: { destinationArn: privateLogGroup.attrArn, format: accessLogFormat },
    definitionBody: openApiDefinition('./private-api.yaml'),
    description: 'Private Open Banking CRI API',
    endpointConfiguration: {
      type: Token.asString(ifCondition(conditions.isDeployedFromPipeline, 'PRIVATE', 'REGIONAL'))
    },
    methodSettings: methodSettings(stack),
    name: Fn.sub('${AWS::StackName}-PrivateOpenBankingAPI'),
    openApiVersion: '3.0.1',
    stageName: environment,
    tags,
    tracingEnabled: true
  })

  privateApi.addPropertyOverride('Auth', {
    ResourcePolicy: {
      CustomStatements: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Principal: '*',
          Resource: ['execute-api:/*']
        },
        ifCondition(conditions.isDeployedFromPipeline, {
          Action: 'execute-api:Invoke',
          Condition: {
            StringNotEquals: {
              'aws:SourceVpce': [
                Fn.importValue(Fn.sub('${VpcStackName}-ExecuteApiGatewayEndpointId'))
              ]
            }
          },
          Effect: 'Deny',
          Principal: '*',
          Resource: ['execute-api:/*']
        })
      ]
    }
  })

  const publicUsagePlan = new CfnUsagePlan(stack, 'PublicAPIUsagePlan', {
    apiStages: [{ apiId: publicApi.ref, stage: environment }],
    ...usagePlanProps
  })
  publicUsagePlan.cfnOptions.condition = conditions.isDeployedFromPipeline
  publicUsagePlan.addOverride('DependsOn', ['PublicAPIStage'])

  const privateUsagePlan = new CfnUsagePlan(stack, 'PrivateAPIUsagePlan', {
    apiStages: [{ apiId: privateApi.ref, stage: environment }],
    ...usagePlanProps
  })
  privateUsagePlan.cfnOptions.condition = conditions.isDeployedFromPipeline
  privateUsagePlan.addOverride('DependsOn', ['PrivateAPIStage'])

  const ipvCoreApiKey = new CfnUsagePlanKey(stack, 'LinkUsagePlanApiKey1', {
    keyId: Fn.importValue('core-infrastructure-ApiKey1'),
    keyType: 'API_KEY',
    usagePlanId: publicUsagePlan.ref
  })
  ipvCoreApiKey.cfnOptions.condition = conditions.isDeployedFromPipeline

  new CfnUsagePlanKey(stack, 'LinkUsagePlanApiKey2', {
    keyId: Fn.importValue('core-infrastructure-ApiKey2'),
    keyType: 'API_KEY',
    usagePlanId: publicUsagePlan.ref
  }).cfnOptions.condition = conditions.isDeployedFromPipeline

  new CfnOutput(stack, 'PublicApiGatewayId', {
    description: 'CRI Open Banking Public API Gateway ID',
    exportName: Fn.sub('${AWS::StackName}-PublicAPIGatewayID'),
    value: publicApi.ref
  })
  new CfnOutput(stack, 'PublicApiBaseUrl', {
    description: 'Base url of the Public Open Banking API Gateway',
    exportName: Fn.sub('${AWS::StackName}-PublicApiBaseUrl'),
    value: Fn.sub('https://${PublicAPI}.execute-api.${AWS::Region}.amazonaws.com/${Environment}')
  })
  new CfnOutput(stack, 'PrivateApiGatewayId', {
    description: 'CRI Open Banking Private API Gateway ID',
    exportName: Fn.sub('${AWS::StackName}-PrivateAPIGatewayID'),
    value: privateApi.ref
  })
  new CfnOutput(stack, 'PrivateApiBaseUrl', {
    description: 'Base url of the Private Open Banking API Gateway',
    exportName: Fn.sub('${AWS::StackName}-PrivateAPIBaseUrl'),
    value: Fn.sub('https://${PrivateAPI}.execute-api.${AWS::Region}.amazonaws.com/${Environment}')
  })
  new CfnOutput(stack, 'IpvCoreBackApiKeyId', {
    condition: conditions.isDeployedFromPipeline,
    description:
      'The ID of the API key used by IPV Core to access the Open Banking external API gateway',
    value: ipvCoreApiKey.ref
  })
}
