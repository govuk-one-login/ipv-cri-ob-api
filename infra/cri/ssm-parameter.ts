import type { CriFunctionPolicy } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'
import type { CfnCondition } from 'aws-cdk-lib'

import { Fn } from 'aws-cdk-lib'
import { CfnParameter } from 'aws-cdk-lib/aws-ssm'

export type CriSsmParameterConfig = {
  condition?: CfnCondition
  description: string
  value: string
} & (
  | { path: string } // under the stack's parameter prefix, e.g. bank-list/STUB/endpoint-url
  | { sharedName: string } // a fixed name read outside this stack, e.g. /common-cri/oauth-common/stack-name
)

// e.g. parameterName(stack, 'bank-list/STUB/endpoint-url') is /<prefix>/bank-list/STUB/endpoint-url
export const parameterName = (stack: CriStack, path: string) =>
  Fn.sub(`/\${Prefix}/${path}`, { Prefix: stack.parameterPrefix })

export const parameterReadPolicy = (stack: CriStack, path: string): CriFunctionPolicy => ({
  ssmParameterReadPolicy: {
    parameterName: Fn.sub(`\${Prefix}/${path}`, { Prefix: stack.parameterPrefix })
  }
})

export const criSsmParameter = (
  stack: CriStack,
  id: string,
  config: CriSsmParameterConfig
): CfnParameter => {
  const parameter = new CfnParameter(stack, id, {
    description: config.description,
    name: 'path' in config ? parameterName(stack, config.path) : config.sharedName,
    type: 'String',
    value: config.value
  })
  if (config.condition) {
    parameter.cfnOptions.condition = config.condition
  }
  return parameter
}
