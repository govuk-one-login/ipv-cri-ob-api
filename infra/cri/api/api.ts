import type { ThrottledRoute } from '@infra/cri/api/method-settings'
import type { CriFunction } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { methodSettings } from '@infra/cri/api/method-settings'
import { findOrCreate } from '@infra/cri/find-or-create'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnKey } from 'aws-cdk-lib/aws-kms'
import { CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnApi } from 'aws-cdk-lib/aws-sam'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

export type ApiRoute = {
  api: CriApi
  method: HttpMethod
  path: string
}

export type ApiVisibility = 'private' | 'public'

export type CriApi = {
  name: string
  resource: CfnApi
  url: string // base URL of the deployed stage
}

export type CriApiConfig = {
  definition: string
  description: string
  throttledRoutes?: ThrottledRoute[]
  visibility: ApiVisibility
}

export type HttpMethod = 'GET' | 'POST'

const tags = { CustomPolicy: 'true', FMSRegionalPolicy: 'false' }

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

const accessLogKey = (stack: CriStack) =>
  findOrCreate(
    stack,
    'LoggingKmsKey',
    (id) =>
      new CfnKey(stack, id, {
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
  )

const accessLogs = (stack: CriStack, id: string, api: CfnApi, visibility: ApiVisibility) => {
  const logGroup = new CfnLogGroup(stack, id, {
    kmsKeyId: accessLogKey(stack).attrArn,
    logGroupName: Fn.sub(`/aws/apigateway/\${AWS::StackName}-${visibility}-AccessLogs`),
    retentionInDays: Token.asNumber(stack.environmentValue('logGroupRetentionInDays'))
  })
  api.accessLogSetting = { destinationArn: logGroup.attrArn, format: accessLogFormat }
}

// a private API is only private (i.e. only reachable through the VPC endpoint) when deployed from the pipeline
const endpointType = (stack: CriStack, visibility: ApiVisibility) =>
  visibility === 'private'
    ? Token.asString(
        Fn.conditionIf(stack.conditions.isDeployedFromPipeline.logicalId, 'PRIVATE', 'REGIONAL')
      )
    : 'REGIONAL'

const privateApiResourcePolicy = (stack: CriStack, api: CfnApi) => {
  const { isDeployedFromPipeline } = stack.conditions
  const invoke = { Action: 'execute-api:Invoke', Principal: '*', Resource: ['execute-api:/*'] }

  api.addPropertyOverride('Auth', {
    ResourcePolicy: {
      CustomStatements: [
        { ...invoke, Effect: 'Allow' },
        Fn.conditionIf(
          isDeployedFromPipeline.logicalId,
          {
            ...invoke,
            Condition: {
              StringNotEquals: {
                'aws:SourceVpce': [
                  Fn.importValue(Fn.sub('${VpcStackName}-ExecuteApiGatewayEndpointId'))
                ]
              }
            },
            Effect: 'Deny'
          },
          Aws.NO_VALUE
        )
      ]
    }
  })
}

const pascalCase = (visibility: ApiVisibility) =>
  visibility.charAt(0).toUpperCase() + visibility.slice(1)

export const criApi = (stack: CriStack, id: string, config: CriApiConfig): CriApi => {
  const { visibility } = config
  const name = Fn.sub(`\${AWS::StackName}-${pascalCase(visibility)}${stack.criName}API`)

  const resource = new CfnApi(stack, id, {
    definitionBody: parse(readFileSync(config.definition, 'utf8')),
    description: config.description,
    endpointConfiguration: { type: endpointType(stack, visibility) },
    methodSettings: methodSettings(stack, config.throttledRoutes ?? []),
    name,
    openApiVersion: '3.0.1',
    stageName: stack.parameters.environment.valueAsString,
    tags,
    tracingEnabled: true
  })

  if (visibility === 'private') {
    privateApiResourcePolicy(stack, resource)
  }

  accessLogs(stack, `${id}LogGroup`, resource, visibility)

  return {
    name,
    resource,
    url: Fn.sub('https://${Api}.execute-api.${AWS::Region}.amazonaws.com/${Environment}', {
      Api: resource.ref
    })
  }
}

export const apiRouteDimensions = (stack: CriStack, route: ApiRoute) => [
  { name: 'ApiName', value: route.api.name },
  { name: 'Method', value: route.method },
  { name: 'Resource', value: route.path },
  { name: 'Stage', value: stack.parameters.environment.valueAsString }
]

export const criApiInvokePermission = (stack: CriStack, fn: CriFunction, api: CriApi) =>
  new CfnPermission(stack, `${fn.resource.node.id}AliasPermission`, {
    action: 'lambda:InvokeFunction',
    functionName: fn.alias,
    principal: 'apigateway.amazonaws.com',
    sourceArn: Fn.sub(
      'arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*',
      { Api: api.resource.ref }
    )
  })
