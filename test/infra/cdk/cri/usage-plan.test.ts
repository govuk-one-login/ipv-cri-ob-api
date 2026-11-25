import { testStack } from '../fixtures/test-stack'
import { criApi } from '@infra/cri/api/api'
import { criUsagePlan, criUsagePlanKey } from '@infra/cri/api/usage-plan'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

const definition = resolve(import.meta.dirname, '../fixtures/openapi.yaml')

describe('criUsagePlan', () => {
  it("limits the API's stage, with its keys, in pipeline deployments only", () => {
    const stack = testStack()
    const api = criApi(stack, 'ExampleApi', {
      definition,
      description: 'Example API',
      visibility: 'public'
    })
    const usagePlan = criUsagePlan(stack, 'ExampleUsagePlan', { api })
    criUsagePlanKey(stack, 'ExampleUsagePlanKey', { apiKeyId: 'example-key-id', usagePlan }) // pragma: allowlist secret
    const template = Template.fromStack(stack)

    template.hasResource('AWS::ApiGateway::UsagePlan', {
      Condition: 'IsDeployedFromPipeline',
      DependsOn: ['ExampleApiStage'],
      Properties: Match.objectLike({
        ApiStages: [{ ApiId: { Ref: 'ExampleApi' }, Stage: { Ref: 'Environment' } }],
        Quota: { Limit: 500000, Period: 'DAY' }
      })
    })
    template.hasResource('AWS::ApiGateway::UsagePlanKey', {
      Condition: 'IsDeployedFromPipeline',
      Properties: Match.objectLike({ KeyId: 'example-key-id' })
    })
  })
})
