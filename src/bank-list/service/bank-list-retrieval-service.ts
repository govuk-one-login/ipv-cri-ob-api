import type { SessionRepository } from '@common/client/session-repository'
import type { BankListRepository } from '@src/bank-list/client/bank-list-repository'
import type { BankListResponse } from '@src/bank-list/model/bank-list-response'

import { requireSessionContext } from '@common/service/session-context'
import { logger } from '@govuk-one-login/cri-logger'

export type BankListRetrievalService = (request: { sessionId: string }) => Promise<BankListResponse>

interface BankListRetrievalServiceCollaborators {
  bankListRepository: BankListRepository
  sessionRepository: SessionRepository
}

export const createBankListRetrievalService = (
  collaborators: BankListRetrievalServiceCollaborators
): BankListRetrievalService => {
  return async (request) => {
    const { profile } = await requireSessionContext(
      collaborators.sessionRepository,
      request.sessionId
    )

    logger.info('Querying bank list')
    const bankList = await collaborators.bankListRepository.getList(profile)

    if (!bankList) {
      logger.warn('No bank list available')
    } else {
      logger.info('Returning bank list', {
        count: bankList.banks.length
      })
    }
    return {
      bankList
    }
  }
}
