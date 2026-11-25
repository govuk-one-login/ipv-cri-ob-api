import type { CriStack } from '@infra/cri/stack'

import { findOrCreate } from '@infra/cri/find-or-create'
import { functionAlias, functionVersionNumber } from '@infra/cri/sam'
import { Aws, CfnCondition, Fn, Token } from 'aws-cdk-lib'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnFunction } from 'aws-cdk-lib/aws-sam'
import { parse } from 'node:path'

export type CriFunction = {
  alias: string
  metricsNamespace: string
  name: string
  resource: CfnFunction
  serviceName: string
  version: string
}

export type CriFunctionConfig = {
  entry: string
  environment?: Record<string, string>
  policies?: CriFunctionPolicy[]
  provisionedConcurrency?: boolean
  schedule?: string
  subnets: 'private' | 'protected'
}

export type CriFunctionPolicy =
  | CfnFunction.IAMPolicyDocumentProperty
  | CfnFunction.SAMPolicyTemplateProperty

const codeUri = '../' // relative to the generated template

const esbuildMetadata = (entry: string) => ({
  BuildMethod: 'esbuild',
  BuildProperties: {
    Banner: [
      "js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    ],
    EntryPoints: [entry],
    External: ['@aws-sdk/*'],
    Format: 'esm',
    Minify: false,
    OutExtension: ['.js=.mjs'],
    Sourcemap: true,
    Target: 'node24'
  }
})

const subnetIds = (tier: CriFunctionConfig['subnets']) => {
  const prefix = tier === 'private' ? 'PrivateSubnetId' : 'ProtectedSubnetId'
  return ['A', 'B', 'C'].map((az) => Fn.importValue(Fn.sub(`\${VpcStackName}-${prefix}${az}`)))
}

const dynatraceSecret = (stack: CriStack, key: string) =>
  Fn.sub(`{{resolve:secretsmanager:\${SecretArn}:SecretString:${key}}}`, {
    SecretArn: stack.environmentValue('dynatraceSecretArn')
  })

const useCodeSigning = (stack: CriStack) =>
  findOrCreate(
    stack,
    'UseCodeSigning',
    (id) =>
      new CfnCondition(stack, id, {
        expression: Fn.conditionNot(
          Fn.conditionEquals(stack.parameters.codeSigningConfigArn, 'none')
        )
      })
  )

const addProvisionedConcurrency = (stack: CriStack) =>
  findOrCreate(
    stack,
    'AddProvisionedConcurrency',
    (id) =>
      new CfnCondition(stack, id, {
        expression: Fn.conditionNot(
          Fn.conditionEquals(stack.environmentValue('provisionedConcurrentExecutions'), 0)
        )
      })
  )

export const criFunction = (
  stack: CriStack,
  id: string,
  config: CriFunctionConfig
): CriFunction => {
  const { parameters } = stack
  const { entry } = config
  const { name } = parse(entry)
  const functionName = Fn.sub(`\${AWS::StackName}-${name}`)
  const metricsNamespace = parameters.criIdentifier.valueAsString
  const serviceName = Fn.sub(`\${CriIdentifier}-${name}`)

  const logGroup = new CfnLogGroup(stack, `${id}LogGroup`, {
    logGroupName: Fn.sub(`/aws/lambda/\${AWS::StackName}-${name}`),
    retentionInDays: Token.asNumber(stack.environmentValue('logGroupRetentionInDays'))
  })

  const fn = new CfnFunction(stack, id, {
    architectures: ['arm64'],
    autoPublishAlias: 'live',
    codeSigningConfigArn: Token.asString(
      Fn.conditionIf(
        useCodeSigning(stack).logicalId,
        parameters.codeSigningConfigArn.valueAsString,
        Aws.NO_VALUE
      )
    ),
    codeUri,
    environment: {
      variables: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/dynatrace',
        AWS_STACK_NAME: Aws.STACK_NAME,
        DT_CLUSTER: dynatraceSecret(stack, 'DT_CLUSTER_ID'),
        DT_CONNECTION_AUTH_TOKEN: dynatraceSecret(stack, 'DT_CONNECTION_AUTH_TOKEN'),
        DT_CONNECTION_BASE_URL: dynatraceSecret(stack, 'DT_CONNECTION_BASE_URL'),
        DT_LOG_COLLECTION_AUTH_TOKEN: dynatraceSecret(stack, 'DT_LOG_COLLECTION_AUTH_TOKEN'),
        DT_TENANT: dynatraceSecret(stack, 'DT_TENANT'),
        ENVIRONMENT: parameters.environment.valueAsString,
        LOG_FULL_ERRORS: stack.environmentValue('logFullErrors'),
        PARAMETER_PREFIX: stack.parameterPrefix,
        POWERTOOLS_LOG_LEVEL: 'INFO',
        POWERTOOLS_METRICS_NAMESPACE: metricsNamespace,
        POWERTOOLS_SERVICE_NAME: serviceName,
        ...config.environment
      }
    },
    ...(config.schedule && {
      eventInvokeConfig: { maximumRetryAttempts: 0 },
      events: { Schedule: { properties: { schedule: config.schedule }, type: 'Schedule' } }
    }),
    functionName,
    handler: `${name}.handler`,
    layers: [stack.environmentValue('dynatraceLayer')],
    memorySize: Token.asNumber(stack.environmentValue('memorySize')),
    permissionsBoundary: stack.permissionsBoundary,
    policies: ['AWSLambdaBasicExecutionRole', 'AWSXrayWriteOnlyAccess', ...(config.policies ?? [])],
    ...(config.provisionedConcurrency && {
      provisionedConcurrencyConfig: Fn.conditionIf(
        addProvisionedConcurrency(stack).logicalId,
        {
          ProvisionedConcurrentExecutions: stack.environmentValue('provisionedConcurrentExecutions')
        },
        Aws.NO_VALUE
      )
    }),
    runtime: 'nodejs24.x', // match with esbuildMetadata.Target
    timeout: 40,
    tracing: 'Active',
    vpcConfig: {
      securityGroupIds: [
        Fn.importValue(Fn.sub('${VpcStackName}-AWSServicesEndpointSecurityGroupId'))
      ],
      subnetIds: subnetIds(config.subnets)
    }
  })

  fn.addPropertyOverride('AutoPublishAliasAllProperties', true)
  fn.addPropertyOverride('LoggingConfig', { LogGroup: logGroup.ref })
  fn.cfnOptions.metadata = esbuildMetadata(entry)

  return {
    alias: functionAlias(fn),
    metricsNamespace,
    name: functionName,
    resource: fn,
    serviceName,
    version: functionVersionNumber(fn)
  }
}
