import type { EndpointProfiles } from '@infra/config/lime-endpoint-profiles'
import type { App } from 'aws-cdk-lib'

import { environmentConfig } from '@infra/config/environments'
import { createEndpointProfiles } from '@infra/config/lime-endpoint-profiles'
import { byEnvironment } from '@infra/constructs/cri-environment'
import { CriStack } from '@infra/constructs/cri-stack'
import { apiGateways } from '@infra/features/api-gateways'
import { bankList } from '@infra/features/bank-list'
import { consents } from '@infra/features/consents'
import { genericAlarms } from '@infra/features/generic-alarms'
import { issueCredential } from '@infra/features/issue-credential'
import { oauth } from '@infra/features/oauth'
import { tokenRotator } from '@infra/features/token-rotator'
import { Aws, CfnOutput } from 'aws-cdk-lib'

export class OpenBankingStack extends CriStack {
  readonly endpointProfiles: EndpointProfiles

  constructor(scope: App, id: string) {
    super(scope, id, {
      criName: 'OpenBanking',
      description: 'Digital Identity IPV CRI Open Banking API',
      environmentConfig
    })

    this.endpointProfiles = createEndpointProfiles(
      this,
      byEnvironment((environment) => environmentConfig[environment].endpointProfiles)
    )

    const oauthCommon = oauth(this)
    const ecospendTokens = tokenRotator(this)
    bankList(this, { ecospendTokens, oauthCommon })
    consents(this, { ecospendTokens, oauthCommon })
    issueCredential(this, { oauthCommon })
    apiGateways(this)
    genericAlarms(this)

    new CfnOutput(this, 'StackName', {
      description: 'CloudFormation stack name',
      value: Aws.STACK_NAME
    })
  }
}
