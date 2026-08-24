import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { BankListEntity, BanksEndpointProfile } from '@src/bank-list/model/bank-list'

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export interface BankListRepository {
  getList: (profile: BanksEndpointProfile) => Promise<BankListEntity | undefined>
  replaceList: (entity: BankListEntity) => Promise<void>
}
