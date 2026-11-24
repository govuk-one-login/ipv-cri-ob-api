import type { CriStack } from '@infra/cri/stack'

import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnFunction } from 'aws-cdk-lib/aws-sam'
import { parse } from 'node:path'

export type CriFunctionConfig = {
  entry: string
  environment?: Record<string, string>
  events?: Record<string, CfnFunction.EventSourceProperty>
  maximumRetryAttempts?: number
  name: string
  policies?: CriFunctionPolicy[]
  provisionedConcurrency?: boolean
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

export const criFunction = (
  stack: CriStack,
  id: string,
  config: CriFunctionConfig
): CfnFunction => {
  const { conditions, parameters } = stack
  const { entry, name } = config

  const logGroup = new CfnLogGroup(stack, `${id}LogGroup`, {
    logGroupName: Fn.sub(`/aws/lambda/\${AWS::StackName}-${name}`),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const fn = new CfnFunction(stack, id, {
    architectures: ['arm64'],
    autoPublishAlias: 'live',
    codeSigningConfigArn: Token.asString(
      Fn.conditionIf(
        conditions.useCodeSigning.logicalId,
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
        POWERTOOLS_METRICS_NAMESPACE: parameters.criIdentifier.valueAsString,
        POWERTOOLS_SERVICE_NAME: Fn.sub(`\${CriIdentifier}-${name}`),
        ...config.environment
      }
    },
    ...(config.events && { events: config.events }),
    functionName: Fn.sub(`\${AWS::StackName}-${name}`),
    ...(config.maximumRetryAttempts !== undefined && {
      eventInvokeConfig: { maximumRetryAttempts: config.maximumRetryAttempts }
    }),
    handler: `${parse(entry).name}.handler`,
    layers: [stack.environmentValue('dynatraceLayer')],
    memorySize: Token.asNumber(stack.environmentValue('memorySize')),
    permissionsBoundary: stack.permissionsBoundary,
    policies: ['AWSLambdaBasicExecutionRole', 'AWSXrayWriteOnlyAccess', ...(config.policies ?? [])],
    ...(config.provisionedConcurrency && {
      provisionedConcurrencyConfig: Fn.conditionIf(
        conditions.addProvisionedConcurrency.logicalId,
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

  return fn
}
