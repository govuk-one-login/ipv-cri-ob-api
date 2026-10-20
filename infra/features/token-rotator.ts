import type { OpenBankingStack } from '@infra/stack'

import { openBankingFunction } from '@infra/constructs/function'
import { openBankingTable } from '@infra/constructs/table'
import { Fn } from 'aws-cdk-lib'

export type TokenRotator = ReturnType<typeof tokenRotator>

export const tokenRotator = (stack: OpenBankingStack) => {
  const table = openBankingTable(stack, 'TokenRotatorTable', {
    partitionKey: 'id',
    ttlAttribute: 'ttl'
  })

  openBankingFunction(stack, 'EcospendTokenRotatorFunction', {
    entry: 'src/ecospend-token/handler/ecospend-token-rotator.ts',
    environment: {
      ENDPOINT_PROFILES: stack.mappings.config('endpointProfiles'),
      TOKEN_ROTATOR_CREDENTIALS_PATH: Fn.sub('/${Prefix}/ecospend-token-rotator', {
        Prefix: stack.parameterPrefix
      }),
      TOKEN_ROTATOR_DB_TABLE_NAME: table.ref,
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '900'
    },
    events: {
      ScheduledRotation: { properties: { schedule: 'rate(1 minute)' }, type: 'Schedule' }
    },
    maximumRetryAttempts: 0,
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
      {
        ssmParameterReadPolicy: {
          parameterName: Fn.sub('${Prefix}/ecospend-token-rotator/*', {
            Prefix: stack.parameterPrefix
          })
        }
      }
    ],
    subnets: 'protected'
  })

  return { table }
}
