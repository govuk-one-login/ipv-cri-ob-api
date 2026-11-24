import type { CriStack } from '@infra/cri/stack'
import type { CfnCondition } from 'aws-cdk-lib'

import { CfnParameter } from 'aws-cdk-lib/aws-ssm'

export type CriSsmParameterConfig = {
  condition?: CfnCondition
  description: string
  value: string
} & (
  | { path: string } // under the stack's parameter prefix, e.g. bank-list/STUB/endpoint-url
  | { sharedName: string } // a fixed name read outside this stack, e.g. /common-cri/oauth-common/stack-name
)

export const criSsmParameter = (
  stack: CriStack,
  id: string,
  config: CriSsmParameterConfig
): CfnParameter => {
  const parameter = new CfnParameter(stack, id, {
    description: config.description,
    name: 'path' in config ? stack.parameterName(config.path) : config.sharedName,
    type: 'String',
    value: config.value
  })
  if (config.condition) {
    parameter.cfnOptions.condition = config.condition
  }
  return parameter
}
