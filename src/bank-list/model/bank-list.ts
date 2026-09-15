import type { EndpointProfile } from '@common/model/endpoint-profile'

export interface BankListEntity {
  banks: StoredBank[]
  profile: EndpointProfile
  refreshedAtSeconds: number
}

export interface StoredBank {
  bankId: string
  friendlyName: string
  serviceStatus: boolean
}
