import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'
import type { BankListRepository } from '@src/bank-list/client/bank-list-repository'
import type { BankListProvider } from '@src/bank-list/model/bank-list-provider'

import { nowSeconds } from '@common/util/time'
import { describeZodIssues } from '@common/util/zod'
import { type BankListConfig, bankListConfigSchema } from '@src/bank-list/model/bank-list-config'

export interface BankListUpdateResponse {
  updated: boolean
}

export type BankListUpdateService = (profile: EndpointProfile) => Promise<BankListUpdateResponse>

interface BankListUpdateCollaborators {
  bankListProvider: BankListProvider
  bankListRepository: BankListRepository
  externalConfigProvider: SSMConfigProvider
  tokenRetrievalService: TokenRetrievalService<EndpointProfile>
}

interface BankListUpdateConfig {
  bankListConfigPathPrefix: string
  refreshAfterSeconds: number
}

export const createBankListUpdateService = (
  config: BankListUpdateConfig,
  collaborators: BankListUpdateCollaborators
): BankListUpdateService => {
  return async (profile) => {
    const existingList = await collaborators.bankListRepository.getList(profile)
    const now = nowSeconds()

    if (existingList) {
      const ageSeconds = now - existingList.refreshedAtSeconds
      if (ageSeconds < config.refreshAfterSeconds) {
        return { updated: false }
      }
    }

    const rawConfig = await collaborators.externalConfigProvider.get(
      `${config.bankListConfigPathPrefix}/${profile}`
    )
    const parsedConfig = bankListConfigSchema.safeParse(rawConfig)
    if (!parsedConfig.success) {
      throw new Error(`Invalid bank list config: ${describeZodIssues(parsedConfig.error)}`)
    }
    const bankListConfig: BankListConfig = parsedConfig.data

    const accessToken = await collaborators.tokenRetrievalService.retrieveToken(profile)
    if (!accessToken) throw new Error(`No token is available`)

    const banks = await collaborators.bankListProvider.getBanks({
      accessToken,
      profile,
      ...bankListConfig
    })

    // Note: open question on if an empty list is a valid response to be saved or if we should reject this
    await collaborators.bankListRepository.replaceList({
      profile,
      banks,
      refreshedAtSeconds: now
    })

    return { updated: true }
  }
}
