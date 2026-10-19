import type { Conditions } from '@infra/constructs/conditions'
import type { Mappings } from '@infra/constructs/mappings'
import type { StackParameters } from '@infra/constructs/stack-parameters'
import type { App, IStackSynthesizer } from 'aws-cdk-lib'

import { createConditions, ifCondition } from '@infra/constructs/conditions'
import { createMappings } from '@infra/constructs/mappings'
import { createStackParameters } from '@infra/constructs/stack-parameters'
import { api } from '@infra/features/api'
import { bankList } from '@infra/features/bank-list'
import { consents } from '@infra/features/consents'
import { issueCredential } from '@infra/features/issue-credential'
import { oauth } from '@infra/features/oauth'
import { tokenRotator } from '@infra/features/token-rotator'
import { Aws, BootstraplessSynthesizer, CfnOutput, Stack, Token } from 'aws-cdk-lib'

export class OpenBankingStack extends Stack {
  readonly conditions: Conditions
  readonly mappings: Mappings
  readonly parameterPrefix: string
  readonly parameters: StackParameters
  readonly permissionsBoundary: string

  constructor(scope: App, id: string) {
    super(scope, id, {
      analyticsReporting: false,
      description: 'Digital Identity IPV CRI Open Banking API',
      synthesizer: new BootstraplessSynthesizer() as IStackSynthesizer
    })
    this.templateOptions.templateFormatVersion = '2010-09-09'
    this.addTransform('AWS::Serverless-2016-10-31')

    this.parameters = createStackParameters(this)
    this.mappings = createMappings(this, this.parameters.environment)
    this.conditions = createConditions(this, this.parameters, this.mappings)
    this.parameterPrefix = Token.asString(
      ifCondition(
        this.conditions.useParameterPrefix,
        this.parameters.parameterPrefix.valueAsString,
        Aws.STACK_NAME
      )
    )
    this.permissionsBoundary = Token.asString(
      ifCondition(
        this.conditions.usePermissionsBoundary,
        this.parameters.permissionsBoundary.valueAsString
      )
    )

    const oauthCommon = oauth(this)
    const ecospendTokens = tokenRotator(this)
    bankList(this, { oauth: oauthCommon, tokenRotator: ecospendTokens })
    consents(this, { oauth: oauthCommon, tokenRotator: ecospendTokens })
    issueCredential(this, { oauth: oauthCommon })
    api(this)

    new CfnOutput(this, 'StackName', {
      description: 'CloudFormation stack name',
      value: Aws.STACK_NAME
    })
  }
}
