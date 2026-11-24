import type { OpenBankingStack } from '@infra/open-banking/stack'

import { criDynamoTable } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'

export type TokenRotator = ReturnType<typeof tokenRotator>

export const tokenRotator = (stack: OpenBankingStack) => {
  const table = criDynamoTable(stack, 'TokenRotatorTable', {
    partitionKey: 'id',
    ttlAttribute: 'ttl'
  })

  criFunction(stack, 'EcospendTokenRotatorFunction', {
    entry: 'src/ecospend-token/handler/ecospend-token-rotator.ts',
    environment: {
      ENDPOINT_PROFILES: stack.endpointProfiles.enabled,
      TOKEN_ROTATOR_CREDENTIALS_PATH: stack.parameterName('ecospend-token-rotator'),
      TOKEN_ROTATOR_DB_TABLE_NAME: table.ref,
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '900'
    },
    events: {
      ScheduledRotation: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    maximumRetryAttempts: 0,
    name: 'ecospend-token-rotator',
    policies: [
      {
        statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: table.attrArn
          }
        ]
      },
      stack.parameterReadPolicy('ecospend-token-rotator/*')
    ],
    subnets: 'protected'
  })

  return { table }
}
