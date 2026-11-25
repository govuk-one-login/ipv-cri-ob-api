import { testStack } from '../fixtures/test-stack'
import { criDeploymentCheck } from '@infra/cri/deployment-check'
import { criFunction } from '@infra/cri/function'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

describe('criDeploymentCheck', () => {
  it('invokes the new version of the function, after the checks it depends on', () => {
    const stack = testStack()
    const first = criFunction(stack, 'FirstFunction', {
      entry: 'src/example/handler/first-handler.ts',
      subnets: 'private'
    })
    const second = criFunction(stack, 'SecondFunction', {
      entry: 'src/example/handler/second-handler.ts',
      subnets: 'private'
    })
    const firstCheck = criDeploymentCheck(stack, first)
    criDeploymentCheck(stack, second, { dependsOn: [firstCheck] })

    Template.fromStack(stack).hasResource('Custom::AsyncDeploymentCheck', {
      DependsOn: ['FirstFunctionDeploymentCheck'],
      Properties: {
        ServiceTimeout: 300,
        ServiceToken: { Ref: 'SecondFunction.Alias' },
        Version: { 'Fn::GetAtt': ['SecondFunction.Version', 'Version'] }
      }
    })
  })
})
