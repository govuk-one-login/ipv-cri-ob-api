import type { App } from 'aws-cdk-lib'

import { byEnvironment } from '@infra/cri/environment'
import { criSsmParameter } from '@infra/cri/ssm-parameter'
import { CriStack } from '@infra/cri/stack'
import { limeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import { environmentConfig } from '@infra/open-banking/environments'
import { apiGateways } from '@infra/open-banking/features/api-gateways'
import { bankList } from '@infra/open-banking/features/bank-list'
import { consents } from '@infra/open-banking/features/consents'
import { genericAlarms } from '@infra/open-banking/features/generic-alarms'
import { issueCredential } from '@infra/open-banking/features/issue-credential'
import { jwks } from '@infra/open-banking/features/jwks'
import { oauthCommon as oauthCommonApp } from '@infra/open-banking/features/oauth-common'
import { tokenRotator } from '@infra/open-banking/features/token-rotator'
import { webhooks } from '@infra/open-banking/features/webhooks'
import { Aws, CfnCondition, CfnOutput, Fn } from 'aws-cdk-lib'

export class OpenBankingStack extends CriStack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      criName: 'OpenBanking',
      description: 'Digital Identity IPV CRI Open Banking API',
      environmentConfig
    })

    const endpointProfiles = limeEndpointProfiles(
      this,
      byEnvironment((environment) => environmentConfig[environment].endpointProfiles)
    )

    const { ipvCoreApiKeyHot, privateApi, publicApi } = apiGateways(this)
    const oauthCommon = oauthCommonApp(this, { privateApi, publicApi })
    const { deploymentCheck: tokenRotatorDeploymentCheck, tokenReader } = tokenRotator(this, {
      endpointProfiles
    })
    bankList(this, {
      endpointProfiles,
      oauthCommon,
      privateApi,
      tokenReader,
      tokenRotatorDeploymentCheck
    })
    consents(this, { endpointProfiles, oauthCommon, privateApi, tokenReader })
    issueCredential(this, { oauthCommon, publicApi })
    jwks(this)
    webhooks(this, { publicApi })
    genericAlarms(this, { apis: { private: privateApi, public: publicApi } })

    criSsmParameter(this, 'OAuthCommonStackNameParam', {
      condition: new CfnCondition(this, 'CreateTestResourcesParam', {
        expression: Fn.conditionAnd(
          this.conditions.isDeployedFromPipeline,
          Fn.conditionNot(this.conditions.isProduction)
        )
      }),
      description:
        'The stack currently used for OAuth (oauth-common). Only required for test-resources.',
      sharedName: '/common-cri/oauth-common/stack-name',
      value: oauthCommon.stackName
    })

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
      value: ipvCoreApiKeyHot.ref
    })
  }
}
