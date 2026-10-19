import type { OpenBankingStack } from '@infra/stack'

import { esbuildMetadata } from '@infra/config/esbuild'
import { criFunction } from '@infra/constructs/cri-function'
import { criTable } from '@infra/constructs/cri-table'

export type TokenRotator = ReturnType<typeof tokenRotator>

export const tokenRotator = (stack: OpenBankingStack) => {
  const table = criTable(stack, 'TokenRotatorTable', {
    partitionKey: 'id',
    ttlAttribute: 'ttl'
  })

  criFunction(stack, 'EcospendTokenRotatorFunction', {
    codeUri: '../',
    environment: {
      ENDPOINT_PROFILES: stack.endpointProfiles.enabled,
      TOKEN_ROTATOR_CREDENTIALS_PATH: stack.parameterName('ecospend-token-rotator'),
      TOKEN_ROTATOR_DB_TABLE_NAME: table.ref,
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '900'
    },
    events: {
      ScheduledRotation: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    handler: 'ecospend-token-rotator.handler',
    maximumRetryAttempts: 0,
    metadata: esbuildMetadata('src/ecospend-token/handler/ecospend-token-rotator.ts'),
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
    runtime: 'nodejs24.x',
    subnets: 'protected'
  })

  return { table }
}
