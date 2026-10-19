import type { CriStack } from '@infra/constructs/cri-stack'

import { Fn } from 'aws-cdk-lib'
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb'

export type CriTableConfig = {
  globalSecondaryIndexes?: CriTableIndex[]
  partitionKey: string
  sortKey?: string
  tableName?: string
  ttlAttribute?: string
}

export type CriTableIndex = {
  indexName: string
  partitionKey: string
  projection: CfnTable.ProjectionProperty
  sortKey?: string
}

const keySchema = (partitionKey: string, sortKey?: string): CfnTable.KeySchemaProperty[] => [
  { attributeName: partitionKey, keyType: 'HASH' },
  ...(sortKey ? [{ attributeName: sortKey, keyType: 'RANGE' }] : [])
]

export const criTable = (stack: CriStack, id: string, config: CriTableConfig): CfnTable => {
  const indexes = config.globalSecondaryIndexes ?? []
  const keyAttributes = new Set(
    [
      config.partitionKey,
      config.sortKey,
      ...indexes.flatMap((index) => [index.partitionKey, index.sortKey])
    ].filter((attribute) => attribute !== undefined)
  )

  return new CfnTable(stack, id, {
    attributeDefinitions: [...keyAttributes].map((attributeName) => ({
      attributeName,
      attributeType: 'S'
    })),
    billingMode: 'PAY_PER_REQUEST',
    ...(indexes.length > 0 && {
      globalSecondaryIndexes: indexes.map((index) => ({
        indexName: index.indexName,
        keySchema: keySchema(index.partitionKey, index.sortKey),
        projection: index.projection
      }))
    }),
    keySchema: keySchema(config.partitionKey, config.sortKey),
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: Fn.conditionIf(
        stack.conditions.isProduction.logicalId,
        true,
        false
      )
    },
    sseSpecification: { sseEnabled: true },
    ...(config.tableName && { tableName: config.tableName }),
    ...(config.ttlAttribute && {
      timeToLiveSpecification: { attributeName: config.ttlAttribute, enabled: true }
    })
  })
}
