import type { CriStack } from '@infra/constructs/cri-stack'
import type { CfnKey } from 'aws-cdk-lib/aws-kms'

import { accessLogFormat } from '@infra/constructs/cri-api-logging'
import { Aws, CfnOutput, Fn, Token } from 'aws-cdk-lib'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnApi } from 'aws-cdk-lib/aws-sam'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

export type ApiBoundary = 'private' | 'public'

export type CriApiConfig = {
  boundary: ApiBoundary
  definition: string // absolute path to the OpenAPI file
  description: string
  loggingKey: CfnKey
  methodSettings?: MethodSetting[]
}

export type MethodSetting = ReturnType<typeof defaultMethodSetting>

const labels = { private: 'Private', public: 'Public' } as const

const tags = { CustomPolicy: 'true', FMSRegionalPolicy: 'false' }

export const defaultMethodSetting = (stack: CriStack) => ({
  DataTraceEnabled: Fn.conditionIf(stack.conditions.isProduction.logicalId, false, true),
  HttpMethod: '*',
  LoggingLevel: 'INFO',
  MetricsEnabled: true,
  ResourcePath: '/*',
  ThrottlingBurstLimit: 400,
  ThrottlingRateLimit: 200
})

export const apiName = (stack: CriStack, boundary: ApiBoundary) =>
  Fn.sub(`\${AWS::StackName}-${labels[boundary]}${stack.criName}API`)

const privateApiResourcePolicy = (stack: CriStack) => ({
  ResourcePolicy: {
    CustomStatements: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Principal: '*',
        Resource: ['execute-api:/*']
      },
      // only accessible via VPCe when deployed from pipeline
      Fn.conditionIf(
        stack.conditions.isDeployedFromPipeline.logicalId,
        {
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
        },
        Aws.NO_VALUE
      )
    ]
  }
})

export const criApi = (stack: CriStack, id: string, config: CriApiConfig): CfnApi => {
  const { conditions, parameters } = stack
  const { boundary } = config
  const label = labels[boundary]

  const logGroup = new CfnLogGroup(stack, `${id}LogGroup`, {
    kmsKeyId: config.loggingKey.attrArn,
    logGroupName: Fn.sub(`/aws/apigateway/\${AWS::StackName}-\${${id}}-${boundary}-AccessLogs`),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const api = new CfnApi(stack, id, {
    accessLogSetting: { destinationArn: logGroup.attrArn, format: accessLogFormat },
    definitionBody: parse(readFileSync(config.definition, 'utf8')),
    description: config.description,
    endpointConfiguration: {
      type:
        boundary === 'public'
          ? 'REGIONAL'
          : Token.asString(
              Fn.conditionIf(conditions.isDeployedFromPipeline.logicalId, 'PRIVATE', 'REGIONAL')
            )
    },
    methodSettings: [defaultMethodSetting(stack), ...(config.methodSettings ?? [])],
    name: apiName(stack, boundary),
    openApiVersion: '3.0.1',
    stageName: parameters.environment.valueAsString,
    tags,
    tracingEnabled: true
  })

  if (boundary === 'private') {
    api.addPropertyOverride('Auth', privateApiResourcePolicy(stack))
  }

  new CfnOutput(stack, `${label}ApiGatewayId`, {
    description: `${config.description} gateway ID`,
    exportName: Fn.sub(`\${AWS::StackName}-${label}APIGatewayID`),
    value: api.ref
  })
  // TODO: the public export was ${AWS::StackName}-PublicApiBaseUrl, has something exploded
  new CfnOutput(stack, `${label}ApiBaseUrl`, {
    description: `Base url of the ${config.description} gateway`,
    exportName: Fn.sub(`\${AWS::StackName}-${label}APIBaseUrl`),
    value: Fn.sub(`https://\${${id}}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}`)
  })

  return api
}
