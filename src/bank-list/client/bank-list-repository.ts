import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { BankListEntity } from '@src/bank-list/model/bank-list'

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export interface BankListRepository {
  getList: (profile: EndpointProfile) => Promise<BankListEntity | undefined>
  replaceList: (entity: BankListEntity) => Promise<void>
}

export interface BankListRepositoryConfig {
  tableName: string
}

export const createBankListRepository = (
  config: BankListRepositoryConfig,
  client: DynamoDBDocumentClient
): BankListRepository => ({
  getList: async (profile) => {
    const { Item } = await client.send(
      new GetCommand({
        ConsistentRead: true,
        Key: { profile },
        TableName: config.tableName
      })
    )
    return Item as BankListEntity | undefined
  },
  replaceList: async (entity) => {
    await client.send(
      new PutCommand({
        Item: entity,
        TableName: config.tableName
      })
    )
  }
})
