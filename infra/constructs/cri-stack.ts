import type { CriConditions } from '@infra/constructs/cri-conditions'
import type { Environment } from '@infra/constructs/cri-environment'
import type { CriFunctionPolicy } from '@infra/constructs/cri-function'
import type { CriStackParameters } from '@infra/constructs/cri-stack-parameters'
import type { App, IStackSynthesizer } from 'aws-cdk-lib'
import type { CfnRole } from 'aws-cdk-lib/aws-iam'

import { createCriConditions } from '@infra/constructs/cri-conditions'
import { codeDeployServiceRole } from '@infra/constructs/cri-deployment'
import { byEnvironment } from '@infra/constructs/cri-environment'
import { createCriStackParameters } from '@infra/constructs/cri-stack-parameters'
import { Aws, BootstraplessSynthesizer, CfnMapping, Fn, Stack, Token } from 'aws-cdk-lib'

export type CriEnvironmentConfig = {
  dynatraceLayer: string
  dynatraceSecretArn: string
  logFullErrors: boolean
  memorySize: number
  provisionedConcurrentExecutions: number
  vcDomain: string
}

export type CriEnvironmentConfigKey = keyof CriEnvironmentConfig

export type CriStackConfig = {
  criName: string // PascalCase, e.g. OpenBanking -> ${AWS::StackName}-PublicOpenBankingAPI
  description: string
  environmentConfig: Record<Environment, CriEnvironmentConfig>
}

// only the CRI keys; a CRI's own per-environment config goes in its own mappings
const environmentConfigurationRow = (config: CriEnvironmentConfig) => ({
  dynatraceLayer: config.dynatraceLayer,
  dynatraceSecretArn: config.dynatraceSecretArn,
  logFullErrors: String(config.logFullErrors),
  memorySize: config.memorySize,
  provisionedConcurrentExecutions: config.provisionedConcurrentExecutions,
  vcDomain: config.vcDomain
})

export class CriStack extends Stack {
  readonly codeDeployServiceRole: CfnRole
  readonly conditions: CriConditions
  readonly criName: string
  readonly parameterPrefix: string
  readonly parameters: CriStackParameters
  readonly permissionsBoundary: string
  private readonly environmentConfiguration: CfnMapping

  constructor(scope: App, id: string, config: CriStackConfig) {
    super(scope, id, {
      analyticsReporting: false,
      description: config.description,
      synthesizer: new BootstraplessSynthesizer() as IStackSynthesizer
    })
    this.templateOptions.templateFormatVersion = '2010-09-09'
    this.addTransform('AWS::Serverless-2016-10-31')

    this.criName = config.criName
    this.parameters = createCriStackParameters(this)

    this.environmentConfiguration = new CfnMapping(this, 'EnvironmentConfiguration', {
      mapping: byEnvironment((environment) =>
        environmentConfigurationRow(config.environmentConfig[environment])
      )
    })

    this.conditions = createCriConditions(this, this.parameters, (key) =>
      this.environmentValue(key)
    )
    this.parameterPrefix = Token.asString(
      Fn.conditionIf(
        this.conditions.useParameterPrefix.logicalId,
        this.parameters.parameterPrefix.valueAsString,
        Aws.STACK_NAME
      )
    )
    this.permissionsBoundary = Token.asString(
      Fn.conditionIf(
        this.conditions.usePermissionsBoundary.logicalId,
        this.parameters.permissionsBoundary.valueAsString,
        Aws.NO_VALUE
      )
    )
    this.codeDeployServiceRole = codeDeployServiceRole(this)
  }

  // the value for the environment being deployed to
  environmentValue(key: CriEnvironmentConfigKey): string {
    return this.environmentConfiguration.findInMap(this.parameters.environment.valueAsString, key)
  }

  // e.g. parameterName('bank-list/STUB/endpoint-url') is /<prefix>/bank-list/STUB/endpoint-url
  parameterName(path: string): string {
    return Fn.sub(`/\${Prefix}/${path}`, { Prefix: this.parameterPrefix })
  }

  parameterReadPolicy(path: string): CriFunctionPolicy {
    return {
      ssmParameterReadPolicy: {
        parameterName: Fn.sub(`\${Prefix}/${path}`, { Prefix: this.parameterPrefix })
      }
    }
  }
}
