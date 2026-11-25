import type { CriFunction } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { CfnResource } from 'aws-cdk-lib'

export type CriDeploymentCheckConfig = {
  dependsOn?: CfnResource[] // checks that must pass first
}

// used to test async functions during deployment lifecycle when canaries are not appropriate
export const criDeploymentCheck = (
  stack: CriStack,
  fn: CriFunction,
  config: CriDeploymentCheckConfig = {}
): CfnResource => {
  const check = new CfnResource(stack, `${fn.resource.node.id}DeploymentCheck`, {
    properties: {
      ServiceTimeout: 300,
      ServiceToken: fn.alias,
      Version: fn.version
    },
    type: 'Custom::AsyncDeploymentCheck'
  })
  for (const dependency of config.dependsOn ?? []) {
    check.addResourceDependency(dependency)
  }
  return check
}
