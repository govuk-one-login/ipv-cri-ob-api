import type { CriConditions } from '@infra/cri/conditions'
import type { CriEnvironmentConfig, Environment } from '@infra/cri/environment'
import type { CriStackParameters } from '@infra/cri/stack-parameters'
import type { App, IStackSynthesizer } from 'aws-cdk-lib'

import { criConditions } from '@infra/cri/conditions'
import { byEnvironment, environmentConfigurationRow } from '@infra/cri/environment'
import { criStackParameters } from '@infra/cri/stack-parameters'
import { Aws, BootstraplessSynthesizer, CfnMapping, Fn, Stack, Token } from 'aws-cdk-lib'

export type CriStackConfig = {
  criName: string
  description: string
  environmentConfig: Record<Environment, CriEnvironmentConfig>
  supportManualUrl: string
}

export class CriStack extends Stack {
  readonly conditions: CriConditions
  readonly criName: string
  readonly parameterPrefix: string
  readonly parameters: CriStackParameters
  readonly permissionsBoundary: string
  readonly supportManualUrl: string
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
    this.supportManualUrl = config.supportManualUrl
    this.parameters = criStackParameters(this)

    this.environmentConfiguration = new CfnMapping(this, 'EnvironmentConfiguration', {
      mapping: byEnvironment((environment) =>
        environmentConfigurationRow(config.environmentConfig[environment])
      )
    })

    this.conditions = criConditions(this, this.parameters)
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
  }

  environmentValue(key: keyof CriEnvironmentConfig): string {
    return this.environmentConfiguration.findInMap(this.parameters.environment.valueAsString, key)
  }
}
