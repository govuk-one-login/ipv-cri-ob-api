import type { CriApi } from '@infra/cri/api/api'
import type { OpenBankingStack } from '@infra/open-banking/stack'

import { criSsmParameter } from '@infra/cri/ssm-parameter'
import { CfnCondition, Fn } from 'aws-cdk-lib'
import { CfnApplication } from 'aws-cdk-lib/aws-sam'

export type OAuth = ReturnType<typeof oauth>

type OAuthCollaborators = {
  privateApi: CriApi
  publicApi: CriApi
}

export const oauth = (stack: OpenBankingStack, { privateApi, publicApi }: OAuthCollaborators) => {
  const { conditions, parameters } = stack
  const criUrl = Fn.sub('https://${domain}', { domain: stack.environmentValue('vcDomain') })

  const app = new CfnApplication(stack, 'OAuth', {
    location: {
      applicationId:
        'arn:aws:serverlessrepo:eu-west-2:667736788427:applications/di-ipv-cri-oauth-common',
      semanticVersion: '1.2.4'
    },
    parameters: {
      AuditEventNamePrefix: parameters.auditEventNamePrefix.valueAsString,
      CriAudience: criUrl,
      CriIdentifier: parameters.criIdentifier.valueAsString,
      CriPrivateApiGwName: privateApi.name,
      CriPublicApiGwName: publicApi.name,
      CriVcIssuer: criUrl,
      Environment: parameters.environment.valueAsString,
      IPVCoreRedirectURI: 'https://cri.core.build.stubs.account.gov.uk/callback',
      IPVCoreStubJwksEndpoint: 'https://cri.core.stubs.account.gov.uk/.well-known/jwks.json',
      LambdaCodeSigningConfigArn: parameters.codeSigningConfigArn.valueAsString,
      LambdaDeploymentPreference: parameters.lambdaDeploymentPreference.valueAsString,
      LambdaProvisionedConcurrentExecutions: stack.environmentValue(
        'provisionedConcurrentExecutions'
      ),
      LambdaVpcConfiguration: 'di-devplatform-deploy',
      PermissionsBoundaryArn: stack.permissionsBoundary
    }
  })
  const output = (name: string) => app.getAtt(`Outputs.${name}`).toString()
  const stackName = output('StackName')

  criSsmParameter(stack, 'OAuthCommonStackNameParam', {
    condition: new CfnCondition(stack, 'CreateTestResourcesParam', {
      expression: Fn.conditionAnd(
        conditions.isDeployedFromPipeline,
        Fn.conditionNot(conditions.isProduction)
      )
    }),
    description:
      'The stack currently used for OAuth (oauth-common). Only required for test-resources.',
    sharedName: '/common-cri/oauth-common/stack-name',
    value: stackName
  })

  return {
    customerManagedKeyId: output('DbCustomerManagedKeyID'),
    personIdentityTableName: output('DbPersonIdentityTableName'),
    sessionTableName: output('DbSessionTableName'),
    stackName
  }
}
