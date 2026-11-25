import { testStack } from '../fixtures/test-stack'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'

describe('CriStack', () => {
  it('is a SAM template without CDK additions', () => {
    const template = Template.fromStack(testStack()).toJSON()

    expect(template).toMatchObject({ Transform: 'AWS::Serverless-2016-10-31' })
    expect(template['Parameters']).not.toHaveProperty('BootstrapVersion')
    expect(template).not.toHaveProperty('Rules')
  })

  it('deploys to the five environments, with conditions on the environment and deployment', () => {
    const template = Template.fromStack(testStack())

    template.hasParameter('Environment', {
      AllowedValues: ['dev', 'build', 'staging', 'integration', 'production']
    })
    template.hasCondition('IsProduction', {
      'Fn::Equals': [{ Ref: 'Environment' }, 'production']
    })
    template.hasCondition('IsDeployedFromPipeline', {
      'Fn::Equals': [{ Ref: 'DeploymentType' }, 'pipeline']
    })
    template.hasCondition('UseParameterPrefix', {
      'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'ParameterPrefix' }, 'none'] }]
    })
    template.hasCondition('UsePermissionsBoundary', {
      'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'PermissionsBoundary' }, 'none'] }]
    })
  })

  it('maps each environment to its config, as strings and numbers', () => {
    expect(Template.fromStack(testStack()).findMappings('EnvironmentConfiguration')).toMatchObject({
      EnvironmentConfiguration: {
        dev: { logFullErrors: 'true', logGroupRetentionInDays: 30 },
        production: { logFullErrors: 'false', logGroupRetentionInDays: 365 }
      }
    })
  })
})
