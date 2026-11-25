import type { CriFunctionPolicy } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'
import type { LimeEndpointProfiles } from '@infra/lime/endpoint-profiles'

import { criAlarm } from '@infra/cri/alarm'
import { criDeploymentCheck } from '@infra/cri/deployment-check'
import { criDynamoTable, tableAccess } from '@infra/cri/dynamo-table'
import { criFunction } from '@infra/cri/function'
import { parameterName, parameterReadPolicy } from '@infra/cri/ssm-parameter'
import { lambdaResultMetric } from '@infra/lime/lambda-metrics'
import { Fn } from 'aws-cdk-lib'

export type TokenReader = ReturnType<typeof tokenRotator>['tokenReader']

type TokenRotatorCollaborators = {
  endpointProfiles: LimeEndpointProfiles
}

const credentialsPath = 'ecospend-token-rotator'

export const tokenRotator = (stack: CriStack, collaborators: TokenRotatorCollaborators) => {
  const table = criDynamoTable(stack, 'TokenRotatorTable', {
    partitionKey: 'id',
    ttlAttribute: 'ttl'
  })

  const rotatorFunction = criFunction(stack, 'EcospendTokenRotatorFunction', {
    entry: 'src/ecospend-token/handler/ecospend-token-rotator.ts',
    environment: {
      ENDPOINT_PROFILES: collaborators.endpointProfiles.enabled,
      TOKEN_ROTATOR_CREDENTIALS_PATH: parameterName(stack, credentialsPath),
      TOKEN_ROTATOR_DB_TABLE_NAME: table.ref,
      TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS: '900'
    },
    policies: [
      tableAccess(table, ['GetItem', 'PutItem']),
      parameterReadPolicy(stack, `${credentialsPath}/*`)
    ],
    schedule: 'rate(1 minute)',
    subnets: 'protected'
  })
  const deploymentCheck = criDeploymentCheck(stack, rotatorFunction)

  criAlarm(stack, 'EcospendTokenRotatorErrorAlarm', {
    ...lambdaResultMetric(rotatorFunction, 'error'),
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 3,
    description: Fn.sub(
      'Ecospend token rotator has failed 3 consecutive times in ${Environment}. If unresolved the Ecospend access token will expire.'
    ),
    evaluationPeriods: 3,
    name: 'ecospend-token-rotator-error',
    period: 60,
    severity: 'warning',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'notBreaching'
  })

  criAlarm(stack, 'EcospendTokenRotatorNotRunningAlarm', {
    ...lambdaResultMetric(rotatorFunction, 'success'),
    comparisonOperator: 'LessThanThreshold',
    condition: stack.conditions.isDeployedFromPipeline,
    datapointsToAlarm: 3,
    description: Fn.sub(
      'Ecospend token rotator has not run successfully for 3 minutes in ${Environment}. If unresolved the Ecospend access token will expire.'
    ),
    evaluationPeriods: 3,
    name: 'ecospend-token-rotator-not-running',
    period: 60,
    severity: 'warning',
    statistic: 'Sum',
    threshold: 1,
    treatMissingData: 'breaching'
  })

  return {
    deploymentCheck,
    tokenReader: {
      environment: { TOKEN_ROTATOR_DB_TABLE_NAME: table.ref },
      policies: [tableAccess(table, ['GetItem'])] satisfies CriFunctionPolicy[]
    }
  }
}
