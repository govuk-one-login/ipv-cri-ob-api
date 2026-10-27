import type { CanaryDeployment } from '@infra/constructs/cri-deployment'
import type { CriStack } from '@infra/constructs/cri-stack'

import { canaryDeploymentPreference } from '@infra/constructs/cri-deployment'
import { Aws, Fn, Token } from 'aws-cdk-lib'
import { CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { CfnLogGroup } from 'aws-cdk-lib/aws-logs'
import { CfnFunction } from 'aws-cdk-lib/aws-sam'

export type CriFunctionConfig = {
  architecture?: 'arm64' | 'x86_64' // defaults to arm64
  audit?: boolean // function publishes audit events to TxMA
  canaryDeployment?: CanaryDeployment // deployed gradually, rolled back on errors or 5XXs from this route
  codeUri: string // relative to the generated template
  environment?: Record<string, string>
  events?: Record<string, CfnFunction.EventSourceProperty>
  handler: string
  invokedByApiGateway?: boolean // lets API Gateway invoke the live alias
  maximumRetryAttempts?: number
  metadata?: Record<string, unknown> // SAM build metadata, e.g. BuildMethod: esbuild
  name: string // function and log group are ${AWS::StackName}-<name>, powertools service ${CriIdentifier}-<name>
  policies?: CriFunctionPolicy[]
  provisionedConcurrency?: boolean
  reservedConcurrency?: number
  runtime: string
  snapStart?: string // SnapStart ApplyOn, can't be combined with provisioned concurrency
  subnets: 'private' | 'protected'
  timeout?: number // seconds, defaults to 40
}

export type CriFunctionPolicy =
  | CfnFunction.IAMPolicyDocumentProperty
  | CfnFunction.SAMPolicyTemplateProperty

const subnetIds = (tier: CriFunctionConfig['subnets']) => {
  const prefix = tier === 'private' ? 'PrivateSubnetId' : 'ProtectedSubnetId'
  return ['A', 'B', 'C'].map((az) => Fn.importValue(Fn.sub(`\${VpcStackName}-${prefix}${az}`)))
}

const dynatraceSecret = (stack: CriStack, key: string) =>
  Fn.sub(`{{resolve:secretsmanager:\${SecretArn}:SecretString:${key}}}`, {
    SecretArn: stack.environmentValue('dynatraceSecretArn')
  })

const auditEnvironment = (stack: CriStack) => ({
  AUDIT_COMPONENT_ID: stack.environmentValue('vcDomain'),
  AUDIT_EVENT_NAME_PREFIX: stack.parameters.auditEventNamePrefix.valueAsString,
  AUDIT_QUEUE_URL: Fn.importValue('txma-infrastructure-AuditEventQueueUrl')
})

const auditPolicies: CriFunctionPolicy[] = [
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

export const criFunction = (
  stack: CriStack,
  id: string,
  config: CriFunctionConfig
): CfnFunction => {
  const { conditions, parameters } = stack
  const { architecture = 'arm64', name, timeout = 40 } = config

  const logGroup = new CfnLogGroup(stack, `${id}LogGroup`, {
    logGroupName: Fn.sub(`/aws/lambda/\${AWS::StackName}-${name}`),
    retentionInDays: parameters.logGroupRetentionInDays.valueAsNumber
  })

  const fn = new CfnFunction(stack, id, {
    architectures: [architecture],
    autoPublishAlias: 'live',
    codeSigningConfigArn: Token.asString(
      Fn.conditionIf(
        conditions.useCodeSigning.logicalId,
        parameters.codeSigningConfigArn.valueAsString,
        Aws.NO_VALUE
      )
    ),
    codeUri: config.codeUri,
    ...(config.canaryDeployment && {
      deploymentPreference: canaryDeploymentPreference(stack, id, config.canaryDeployment)
    }),
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
        ...(config.audit && auditEnvironment(stack)),
        ...config.environment
      }
    },
    ...(config.events && { events: config.events }),
    functionName: Fn.sub(`\${AWS::StackName}-${name}`),
    ...(config.maximumRetryAttempts !== undefined && {
      eventInvokeConfig: { maximumRetryAttempts: config.maximumRetryAttempts }
    }),
    handler: config.handler,
    layers: [stack.environmentValue('dynatraceLayer')],
    memorySize: Token.asNumber(stack.environmentValue('memorySize')),
    permissionsBoundary: stack.permissionsBoundary,
    policies: [
      'AWSLambdaBasicExecutionRole',
      'AWSXrayWriteOnlyAccess',
      ...(config.audit ? auditPolicies : []),
      ...(config.policies ?? [])
    ],
    ...(config.provisionedConcurrency && {
      provisionedConcurrencyConfig: Fn.conditionIf(
        conditions.addProvisionedConcurrency.logicalId,
        {
          ProvisionedConcurrentExecutions: stack.environmentValue('provisionedConcurrentExecutions')
        },
        Aws.NO_VALUE
      )
    }),
    ...(config.reservedConcurrency !== undefined && {
      reservedConcurrentExecutions: config.reservedConcurrency
    }),
    runtime: config.runtime,
    timeout,
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

  if (config.metadata) {
    fn.cfnOptions.metadata = config.metadata
  }

  if (config.snapStart) {
    fn.addPropertyOverride('SnapStart', { ApplyOn: config.snapStart })
  }

  if (config.invokedByApiGateway) {
    new CfnPermission(stack, `${id}AliasPermission`, {
      action: 'lambda:InvokeFunction',
      functionName: Fn.ref(`${id}.Alias`),
      principal: 'apigateway.amazonaws.com'
    })
  }

  return fn
}
