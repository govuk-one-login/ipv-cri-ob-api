import type { OpenBankingStack } from '@infra/stack'

import { ifCondition } from '@infra/constructs/conditions'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnFunction } from 'aws-cdk-lib/aws-sam'
import { basename } from 'node:path'

export type OpenBankingFunctionProps = {
  audit?: boolean // function publishes audit events to TxMA
  entry: string
  environment?: Record<string, string>
  events?: Record<string, CfnFunction.EventSourceProperty>
  invokedByApiGw?: boolean
  maximumRetryAttempts?: number
  policies?: Policy[]
  provisionedConcurrency?: boolean
  subnets: 'private' | 'protected'
}

export type Policy = CfnFunction.IAMPolicyDocumentProperty | CfnFunction.SAMPolicyTemplateProperty

const subnetIds = (tier: OpenBankingFunctionProps['subnets']) => {
  const prefix = tier === 'private' ? 'PrivateSubnetId' : 'ProtectedSubnetId'
  return ['A', 'B', 'C'].map((az) => Fn.importValue(Fn.sub(`\${VpcStackName}-${prefix}${az}`)))
}

const dynatraceSecret = (stack: OpenBankingStack, key: string) =>
  Fn.sub(`{{resolve:secretsmanager:\${SecretArn}:SecretString:${key}}}`, {
    SecretArn: stack.mappings.config('dynatraceSecretArn')
  })

const auditEnvironment = (stack: OpenBankingStack) => ({
  AUDIT_COMPONENT_ID: stack.mappings.config('vcDomain'),
  AUDIT_EVENT_NAME_PREFIX: stack.parameters.auditEventNamePrefix.valueAsString,
  AUDIT_QUEUE_URL: Fn.importValue('txma-infrastructure-AuditEventQueueUrl')
})

const auditPolicies: Policy[] = [
  {
    sqsSendMessagePolicy: { queueName: Fn.importValue('txma-infrastructure-AuditEventQueueName') }
  },
  {
    statement: [
      {
        Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
        Effect: 'Allow',
        Resource: Fn.importValue('txma-infrastructure-AuditEventQueueEncryptionKeyArn')
      }
    ]
  }
]

export const openBankingFunction = (
  stack: OpenBankingStack,
  id: string,
  props: OpenBankingFunctionProps
): CfnFunction => {
  const { conditions, mappings, parameters } = stack
  const name = basename(props.entry, '.ts')

  const logGroup = new CfnLogGroup(stack, `${id}LogGroup`, {
    logGroupName: Fn.sub(`/aws/lambda/\${AWS::StackName}-${name}`),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const fn = new CfnFunction(stack, id, {
    architectures: ['arm64'],
    autoPublishAlias: 'live',
    codeSigningConfigArn: Token.asString(
      ifCondition(conditions.useCodeSigning, parameters.codeSigningConfigArn.valueAsString)
    ),
    codeUri: '../',
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
        LOG_FULL_ERRORS: mappings.config('logFullErrors'),
        PARAMETER_PREFIX: stack.parameterPrefix,
        POWERTOOLS_LOG_LEVEL: 'INFO',
        POWERTOOLS_METRICS_NAMESPACE: parameters.criIdentifier.valueAsString,
        POWERTOOLS_SERVICE_NAME: Fn.sub(`\${CriIdentifier}-${name}`),
        ...(props.audit && auditEnvironment(stack)),
        ...props.environment
      }
    },
    ...(props.events && { events: props.events }),
    functionName: Fn.sub(`\${AWS::StackName}-${name}`),
    ...(props.maximumRetryAttempts !== undefined && {
      eventInvokeConfig: { maximumRetryAttempts: props.maximumRetryAttempts }
    }),
    handler: `${name}.handler`,
    layers: [mappings.config('dynatraceLayer')],
    memorySize: Token.asNumber(mappings.config('memorySize')),
    permissionsBoundary: stack.permissionsBoundary,
    policies: [
      'AWSLambdaBasicExecutionRole',
      'AWSXrayWriteOnlyAccess',
      ...(props.audit ? auditPolicies : []),
      ...(props.policies ?? [])
    ],
    ...(props.provisionedConcurrency && {
      provisionedConcurrencyConfig: ifCondition(conditions.addProvisionedConcurrency, {
        ProvisionedConcurrentExecutions: Token.asNumber(
          mappings.config('provisionedConcurrentExecutions')
        )
      })
    }),
    runtime: 'nodejs24.x',
    timeout: 40,
    tracing: 'Active',
    vpcConfig: {
      securityGroupIds: [
        Fn.importValue(Fn.sub('${VpcStackName}-AWSServicesEndpointSecurityGroupId'))
      ],
      subnetIds: subnetIds(props.subnets)
    }
  })

  fn.addPropertyOverride('AutoPublishAliasAllProperties', true)
  fn.addPropertyOverride('LoggingConfig', { LogGroup: logGroup.ref })

  fn.cfnOptions.metadata = {
    BuildMethod: 'esbuild',
    BuildProperties: {
      Banner: [
        "js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
      ],
      EntryPoints: [props.entry],
      External: ['@aws-sdk/*'],
      Format: 'esm',
      Minify: false,
      OutExtension: ['.js=.mjs'],
      Sourcemap: true,
      Target: 'node24'
    }
  }

  if (props.invokedByApiGw) {
    new CfnPermission(stack, `${id}AliasPermission`, {
      action: 'lambda:InvokeFunction',
      functionName: Fn.ref(`${id}.Alias`),
      principal: 'apigateway.amazonaws.com'
    })
  }

  return fn
}
