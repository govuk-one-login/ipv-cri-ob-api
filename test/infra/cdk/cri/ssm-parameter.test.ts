import { testStack } from '../fixtures/test-stack'
import { criSsmParameter, parameterReadPolicy } from '@infra/cri/ssm-parameter'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'

const parameterPrefix = {
  'Fn::If': ['UseParameterPrefix', { Ref: 'ParameterPrefix' }, { Ref: 'AWS::StackName' }]
}

describe('criSsmParameter', () => {
  it.each([
    [
      { path: 'example/path' },
      { 'Fn::Sub': ['/${Prefix}/example/path', { Prefix: parameterPrefix }] }
    ],
    [{ sharedName: '/common-cri/example/name' }, '/common-cri/example/name']
  ])('names the parameter from %o', (naming, name) => {
    const stack = testStack()
    criSsmParameter(stack, 'ExampleParameter', {
      ...naming,
      description: 'Example parameter',
      value: 'example'
    })

    Template.fromStack(stack).hasResourceProperties('AWS::SSM::Parameter', {
      Name: name,
      Type: 'String',
      Value: 'example'
    })
  })
})

describe('parameterReadPolicy', () => {
  it('reads the path under the prefix, without the leading slash SAM adds', () => {
    const stack = testStack()

    expect(stack.resolve(parameterReadPolicy(stack, 'example/*'))).toEqual({
      ssmParameterReadPolicy: {
        parameterName: { 'Fn::Sub': ['${Prefix}/example/*', { Prefix: parameterPrefix }] }
      }
    })
  })
})
