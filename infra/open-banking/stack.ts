import type { LimeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import type { App } from 'aws-cdk-lib'

import { byEnvironment } from '@infra/cri/environment'
import { CriStack } from '@infra/cri/stack'
import { limeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import { environmentConfig } from '@infra/open-banking/environments'
import { apiGateways } from '@infra/open-banking/features/api-gateways'
import { bankList } from '@infra/open-banking/features/bank-list'
import { consents } from '@infra/open-banking/features/consents'
import { genericAlarms } from '@infra/open-banking/features/generic-alarms'
import { issueCredential } from '@infra/open-banking/features/issue-credential'
import { jwks } from '@infra/open-banking/features/jwks'
import { oauth } from '@infra/open-banking/features/oauth'
import { tokenRotator } from '@infra/open-banking/features/token-rotator'
import { webhooks } from '@infra/open-banking/features/webhooks'
import { Aws, CfnOutput, Fn } from 'aws-cdk-lib'

export class OpenBankingStack extends CriStack {
  readonly endpointProfiles: LimeEndpointProfiles

  constructor(scope: App, id: string) {
    super(scope, id, {
      criName: 'OpenBanking',
      description: 'Digital Identity IPV CRI Open Banking API',
      environmentConfig
    })

    this.endpointProfiles = limeEndpointProfiles(
      this,
      byEnvironment((environment) => environmentConfig[environment].endpointProfiles)
    )

    const { ipvCoreApiKeys, privateApi, publicApi } = apiGateways(this)
    const oauthCommon = oauth(this, { privateApi, publicApi })
    const { table: tokenTable } = tokenRotator(this)
    bankList(this, { tokenTable, oauthCommon, privateApi })
    consents(this, { tokenTable, oauthCommon, privateApi })
    issueCredential(this, { oauthCommon, publicApi })
    jwks(this)
    webhooks(this)
    genericAlarms(this, { apis: { private: privateApi, public: publicApi } })

    new CfnOutput(this, 'StackName', {
      description: 'CloudFormation stack name',
      value: Aws.STACK_NAME
    })
    new CfnOutput(this, 'PublicApiGatewayId', {
      description: 'CRI Open Banking Public API Gateway ID',
      exportName: Fn.sub('${AWS::StackName}-PublicAPIGatewayID'),
      value: publicApi.resource.ref
    })
    new CfnOutput(this, 'PublicApiBaseUrl', {
      description: 'Base url of the Public Open Banking API Gateway',
      exportName: Fn.sub('${AWS::StackName}-PublicApiBaseUrl'),
      value: publicApi.url
    })
    new CfnOutput(this, 'PrivateApiGatewayId', {
      description: 'CRI Open Banking Private API Gateway ID',
      exportName: Fn.sub('${AWS::StackName}-PrivateAPIGatewayID'),
      value: privateApi.resource.ref
    })
    new CfnOutput(this, 'PrivateApiBaseUrl', {
      description: 'Base url of the Private Open Banking API Gateway',
      exportName: Fn.sub('${AWS::StackName}-PrivateAPIBaseUrl'),
      value: privateApi.url
    })
    new CfnOutput(this, 'IpvCoreBackApiKeyId', {
      condition: this.conditions.isDeployedFromPipeline,
      description: 'The ID of the API key used by IPV Core to access the public API gateway',
      value: ipvCoreApiKeys[0].ref
    })
  }
}
