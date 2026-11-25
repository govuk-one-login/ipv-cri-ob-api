import { testStack } from '../fixtures/test-stack'
import { limeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'

const stubUrl = 'https://stub.example.test'
const liveUrl = 'https://live.example.test'

const synthEndpointProfiles = () => {
  const stack = testStack()
  const endpointProfiles = limeEndpointProfiles(stack, {
    dev: { STUB: stubUrl },
    build: { STUB: stubUrl },
    staging: { UAT: 'https://sandbox.example.test' },
    integration: {},
    production: { LIVE: liveUrl }
  })
  return { endpointProfiles, stack, template: Template.fromStack(stack) }
}

describe('limeEndpointProfiles', () => {
  it('maps each environment to its profiles, and creates their resources only there', () => {
    const { template } = synthEndpointProfiles()

    template.hasMapping('EndpointProfiles', {
      dev: { enabled: 'STUB', STUB: stubUrl },
      integration: { enabled: '' },
      production: { enabled: 'LIVE', LIVE: liveUrl }
    })
    template.hasCondition('CreateStubEndpointProfileResources', {
      'Fn::And': [
        { Condition: 'IsDeployedFromPipeline' },
        {
          'Fn::Or': [
            { 'Fn::Equals': [{ Ref: 'Environment' }, 'dev'] },
            { 'Fn::Equals': [{ Ref: 'Environment' }, 'build'] }
          ]
        }
      ]
    })
  })

  it('calls back for every profile with its condition and logical ID prefix', () => {
    const { endpointProfiles, stack } = synthEndpointProfiles()
    const contexts: { condition: string; idPrefix: string; profile: string }[] = []

    endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
      contexts.push({ condition: stack.resolve(condition.logicalId), idPrefix, profile })
    })

    expect(contexts).toEqual([
      { condition: 'CreateStubEndpointProfileResources', idPrefix: 'Stub', profile: 'STUB' },
      { condition: 'CreateUatEndpointProfileResources', idPrefix: 'Uat', profile: 'UAT' },
      { condition: 'CreateLiveEndpointProfileResources', idPrefix: 'Live', profile: 'LIVE' }
    ])
  })
})
