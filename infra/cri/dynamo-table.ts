import type { CriFunctionPolicy } from '@infra/cri/function'
import type { CriStack } from '@infra/cri/stack'

import { Fn } from 'aws-cdk-lib'
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb'

export type CriDynamoTableConfig = {
  globalSecondaryIndexes?: CriDynamoTableIndex[]
  partitionKey: string
  sortKey?: string
  ttlAttribute?: string
}

export type CriDynamoTableIndex = {
  indexName: string
  partitionKey: string
  projection: CfnTable.ProjectionProperty
  sortKey?: string
}

export type DynamoDbAction = 'GetItem' | 'PutItem'

const keySchema = (partitionKey: string, sortKey?: string): CfnTable.KeySchemaProperty[] => [
  { attributeName: partitionKey, keyType: 'HASH' },
  ...(sortKey ? [{ attributeName: sortKey, keyType: 'RANGE' }] : [])
]

export const criDynamoTable = (
  stack: CriStack,
  id: string,
  config: CriDynamoTableConfig
): CfnTable => {
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
    ...(config.ttlAttribute && {
      timeToLiveSpecification: { attributeName: config.ttlAttribute, enabled: true }
    })
  })
}

export const tableAccess = (table: CfnTable, actions: DynamoDbAction[]): CriFunctionPolicy => ({
  statement: [
    {
      Action: actions.map((action) => `dynamodb:${action}`),
      Effect: 'Allow',
      Resource: table.attrArn
    }
  ]
})
