import type { ApiRoute, CriApi } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'
import type { LimeEndpointProfiles } from '@infra/lime/endpoint-profiles'
import type { OAuthCommon } from '@infra/open-banking/features/oauth-common'
import type { TokenReader } from '@infra/open-banking/features/token-rotator'

import { criApiInvokePermission } from '@infra/cri/api/api'
import { criApiErrorRateAlarms } from '@infra/cri/api/error-rate-alarms'
import { criCanaryDeployment } from '@infra/cri/canary-deployment'
import { criDynamoTable, tableAccess } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { criSsmParameter, parameterReadPolicy } from '@infra/cri/ssm-parameter'
import { criThrottleAlarm } from '@infra/cri/throttle-alarm'
import { Fn } from 'aws-cdk-lib'

type ConsentsCollaborators = {
  endpointProfiles: LimeEndpointProfiles
  oauthCommon: OAuthCommon
  privateApi: CriApi
  tokenReader: TokenReader
}

export const consents = (stack: CriStack, collaborators: ConsentsCollaborators) => {
  const session = collaborators.oauthCommon.sessionReader
  const token = collaborators.tokenReader
  const consentsTable = criDynamoTable(stack, 'ConsentsTable', {
    partitionKey: 'sessionId',
    ttlAttribute: 'ttl'
  })

  const consentsFunction = criFunction(stack, 'ConsentsFunction', {
    entry: 'src/consents/handler/consents.ts',
    environment: {
      ...session.environment,
      ...token.environment,
      CONSENTS_DB_TABLE_NAME: consentsTable.ref
    },
    policies: [
      ...session.policies,
      ...token.policies,
      tableAccess(consentsTable, ['GetItem', 'PutItem']),
      parameterReadPolicy(stack, 'consents/*')
    ],
    provisionedConcurrency: true,
    subnets: 'protected'
  })
  const consentsRoute: ApiRoute = {
    api: collaborators.privateApi,
    method: 'POST',
    path: '/consents'
  }
  criApiInvokePermission(stack, consentsFunction, collaborators.privateApi)
  criCanaryDeployment(stack, consentsFunction, consentsRoute)
  criApiErrorRateAlarms(stack, 'Consents', consentsRoute)
  criThrottleAlarm(stack, consentsFunction)

  collaborators.endpointProfiles.forEachProfile(({ condition, idPrefix, profile }) => {
    criSsmParameter(stack, `${idPrefix}ConsentsEndpointParameter`, {
      condition,
      description: `Consents endpoint for ${profile}`,
      path: `consents/${profile}/endpoint-url`,
      value: Fn.sub('${BaseUrl}/api/v3.0/consents', {
        BaseUrl: collaborators.endpointProfiles.url(profile)
      })
    })
  })
}
