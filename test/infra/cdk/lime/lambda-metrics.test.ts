import { testStack } from '../fixtures/test-stack'
import { criFunction } from '@infra/cri/function'
import { lambdaResultMetric } from '@infra/lime/lambda-metrics'
import { describe, expect, it } from 'vitest'

describe('lambdaResultMetric', () => {
  it("is the function's lambda_result metric for the given result", () => {
    const stack = testStack()
    const fn = criFunction(stack, 'ExampleFunction', {
      entry: 'src/example/handler/example-handler.ts',
      subnets: 'private'
    })

    expect(stack.resolve(lambdaResultMetric(fn, 'error'))).toEqual({
      dimensions: [
        { name: 'service', value: { 'Fn::Sub': '${CriIdentifier}-example-handler' } },
        { name: 'lambda', value: { 'Fn::Sub': '${AWS::StackName}-example-handler' } },
        { name: 'result', value: 'error' }
      ],
      metricName: 'lambda_result',
      namespace: { Ref: 'CriIdentifier' }
    })
  })
})
