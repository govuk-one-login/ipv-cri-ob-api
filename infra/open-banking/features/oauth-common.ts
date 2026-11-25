import type { CriApi } from '@infra/cri/api/api'
import type { CriFunctionPolicy } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { Fn } from 'aws-cdk-lib'
import { CfnApplication } from 'aws-cdk-lib/aws-sam'

export type OAuthCommon = ReturnType<typeof oauthCommon>

type OAuthCommonCollaborators = {
  privateApi: CriApi
  publicApi: CriApi
}

export const oauthCommon = (stack: CriStack, collaborators: OAuthCommonCollaborators) => {
  const { parameters } = stack
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
      CriPrivateApiGwName: collaborators.privateApi.name,
      CriPublicApiGwName: collaborators.publicApi.name,
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
  const sessionTableName = output('DbSessionTableName')

  return {
    personIdentityTableName: output('DbPersonIdentityTableName'),
    // what a function needs to read the oauth-common session
    sessionReader: {
      environment: { SESSION_DB_TABLE_NAME: sessionTableName },
      policies: [
        { dynamoDbReadPolicy: { tableName: sessionTableName } },
        { kmsDecryptPolicy: { keyId: output('DbCustomerManagedKeyID') } }
      ] satisfies CriFunctionPolicy[]
    },
    stackName: output('StackName')
  }
}
