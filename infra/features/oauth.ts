import type { OpenBankingStack } from '@infra/stack'

import { Fn } from 'aws-cdk-lib'
import { CfnApplication } from 'aws-cdk-lib/aws-sam'

import * as ssm from 'aws-cdk-lib/aws-ssm'

export type OAuth = ReturnType<typeof oauth>

export const oauth = (stack: OpenBankingStack) => {
  const { conditions, mappings, parameters } = stack
  const criUrl = Fn.sub('https://${domain}', { domain: mappings.config('vcDomain') })

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
      CriPrivateApiGwName: Fn.sub('${AWS::StackName}-PrivateOpenBankingAPI'),
      CriPublicApiGwName: Fn.sub('${AWS::StackName}-PublicOpenBankingAPI'),
      CriVcIssuer: criUrl,
      Environment: parameters.environment.valueAsString,
      IPVCoreRedirectURI: 'https://cri.core.build.stubs.account.gov.uk/callback',
      IPVCoreStubJwksEndpoint: 'https://cri.core.stubs.account.gov.uk/.well-known/jwks.json',
      LambdaCodeSigningConfigArn: parameters.codeSigningConfigArn.valueAsString,
      LambdaDeploymentPreference: parameters.lambdaDeploymentPreference.valueAsString,
      LambdaProvisionedConcurrentExecutions: mappings.config('provisionedConcurrentExecutions'),
      LambdaVpcConfiguration: 'di-devplatform-deploy',
      PermissionsBoundaryArn: stack.permissionsBoundary
    }
  })
  const output = (name: string) => app.getAtt(`Outputs.${name}`).toString()
  const stackName = output('StackName')

  new ssm.CfnParameter(stack, 'OAuthCommonStackNameParam', {
    description:
      'The stack currently used for OAuth (oauth-common). Only required for test-resources.',
    name: '/common-cri/oauth-common/stack-name',
    type: 'String',
    value: stackName
  }).cfnOptions.condition = conditions.createTestResourcesParam

  return {
    customerManagedKeyId: output('DbCustomerManagedKeyID'),
    personIdentityTableName: output('DbPersonIdentityTableName'),
    sessionTableName: output('DbSessionTableName'),
    stackName
  }
}
