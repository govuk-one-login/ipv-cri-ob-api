import type { BankListEntity } from '@src/bank-list/model/database/bank-list-entity'

export interface BankListResponse {
  bankList: BankListEntity | undefined
}
