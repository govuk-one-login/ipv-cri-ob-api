import type { ThrottledRoute } from '@infra/cri/api/method-settings'
import type { CriStack } from '@infra/cri/stack'
import type { CfnFunction } from 'aws-cdk-lib/aws-sam'

import { criAccessLogs } from '@infra/cri/api/access-logs'
import { methodSettings } from '@infra/cri/api/method-settings'
import { functionAlias } from '@infra/cri/sam'
import { Fn } from 'aws-cdk-lib'
import { CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { CfnApi } from 'aws-cdk-lib/aws-sam'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

export type ApiRoute = {
  api: CriApi
  method: HttpMethod
  path: string
}

export type CriApi = {
  name: string
  resource: CfnApi
  url: string // base URL of the deployed stage
}

export type CriApiConfig = {
  definition: string
  description: string
  endpointType: string // REGIONAL or PRIVATE (or a condition choosing between them)
  label: string
  resourcePolicy?: unknown[]
  throttledRoutes?: ThrottledRoute[]
}

export type HttpMethod = 'GET' | 'POST'

const tags = { CustomPolicy: 'true', FMSRegionalPolicy: 'false' }

export const criApi = (stack: CriStack, id: string, config: CriApiConfig): CriApi => {
  const { label } = config
  const name = Fn.sub(`\${AWS::StackName}-${label}${stack.criName}API`)

  const resource = new CfnApi(stack, id, {
    definitionBody: parse(readFileSync(config.definition, 'utf8')),
    description: config.description,
    endpointConfiguration: { type: config.endpointType },
    methodSettings: methodSettings(stack, config.throttledRoutes ?? []),
    name,
    openApiVersion: '3.0.1',
    stageName: stack.parameters.environment.valueAsString,
    tags,
    tracingEnabled: true
  })

  if (config.resourcePolicy) {
    resource.addPropertyOverride('Auth', {
      ResourcePolicy: { CustomStatements: config.resourcePolicy }
    })
  }

  criAccessLogs(stack, `${id}LogGroup`, { api: resource, label })

  return {
    name,
    resource,
    url: Fn.sub('https://${Api}.execute-api.${AWS::Region}.amazonaws.com/${Environment}', {
      Api: resource.ref
    })
  }
}

export const criApiInvokePermission = (stack: CriStack, fn: CfnFunction) =>
  new CfnPermission(stack, `${fn.node.id}AliasPermission`, {
    action: 'lambda:InvokeFunction',
    functionName: functionAlias(fn),
    principal: 'apigateway.amazonaws.com'
  })
