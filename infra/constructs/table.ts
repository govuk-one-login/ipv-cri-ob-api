import type { OpenBankingStack } from '@infra/stack'

import { ifCondition } from '@infra/constructs/conditions'
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb'

export type OpenBankingTableProps = {
  partitionKey: string
  ttlAttribute?: string
}

export const openBankingTable = (
  stack: OpenBankingStack,
  id: string,
  props: OpenBankingTableProps
): CfnTable =>
  new CfnTable(stack, id, {
    attributeDefinitions: [{ attributeName: props.partitionKey, attributeType: 'S' }],
    billingMode: 'PAY_PER_REQUEST',
    keySchema: [{ attributeName: props.partitionKey, keyType: 'HASH' }],
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: ifCondition(stack.conditions.isProduction, true, false)
    },
    sseSpecification: { sseEnabled: true },
    ...(props.ttlAttribute && {
      timeToLiveSpecification: { attributeName: props.ttlAttribute, enabled: true }
    })
  })
