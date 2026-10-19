import type { Stack } from 'aws-cdk-lib'

import { environments } from '@infra/config/environments'
import { CfnParameter } from 'aws-cdk-lib'

export type StackParameters = ReturnType<typeof createStackParameters>

export const createStackParameters = (stack: Stack) => ({
  auditEventNamePrefix: new CfnParameter(stack, 'AuditEventNamePrefix', {
    default: '/common-cri-parameters/AuditEventNamePrefix',
    description: 'The audit event name prefix',
    type: 'AWS::SSM::Parameter::Value<String>'
  }),
  codeSigningConfigArn: new CfnParameter(stack, 'CodeSigningConfigArn', {
    default: 'none',
    description: 'The ARN of the Code Signing Config to use, provided by the deployment pipeline',
    type: 'String'
  }),
  criIdentifier: new CfnParameter(stack, 'CriIdentifier', {
    default: '/common-cri-parameters/CriIdentifier',
    description: 'The unique credential issuer identifier',
    type: 'AWS::SSM::Parameter::Value<String>'
  }),
  deploymentType: new CfnParameter(stack, 'DeploymentType', {
    default: 'pipeline',
    description:
      'Private Api gateway resources are not be reachable in stacks deployed via pipelines, this override enables less restrictive settings for manual/pre-merge-test deployments.',
    type: 'String'
  }),
  environment: new CfnParameter(stack, 'Environment', {
    allowedValues: [...environments],
    constraintDescription: `must be one of ${environments.join(', ')}`,
    description: 'The environment type',
    type: 'String'
  }),
  lambdaDeploymentPreference: new CfnParameter(stack, 'LambdaDeploymentPreference', {
    default: 'AllAtOnce',
    description: 'Specifies the configuration to enable gradual Lambda deployments',
    type: 'String'
  }),
  logGroupRetentionInDays: new CfnParameter(stack, 'LogGroupRetentionInDays', {
    default: 30,
    description: 'Retention for all log groups',
    type: 'Number'
  }),
  parameterPrefix: new CfnParameter(stack, 'ParameterPrefix', {
    default: 'none',
    description:
      'If set this value will be used as the ParameterStore prefix instead of AWS::StackName',
    type: 'String'
  }),
  permissionsBoundary: new CfnParameter(stack, 'PermissionsBoundary', {
    default: 'none',
    description: 'The ARN of the permissions boundary to apply when creating IAM roles',
    type: 'String'
  }),
  vpcStackName: new CfnParameter(stack, 'VpcStackName', {
    default: 'cri-vpc',
    description: 'The name of the stack that defines the VPC in which this container will run.',
    type: 'String'
  })
})
