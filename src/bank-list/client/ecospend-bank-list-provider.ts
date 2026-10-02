import type { BaseHttpClient } from '@common/client/base-http-client'
import type { BankListProvider } from '@src/bank-list/model/bank-list-provider'

import { describeZodIssues } from '@common/util/zod'
import { toEcospendBankListRequest } from '@src/bank-list/model/ecospend/ecospend-bank-list-request'
import { ecospendBankListResponseSchema } from '@src/bank-list/model/ecospend/ecospend-bank-list-response'

interface EcospendBankListProviderCollaborators {
  httpClient: BaseHttpClient
}

export const createEcospendBankListProvider = (
  collaborators: EcospendBankListProviderCollaborators
): BankListProvider => ({
  getBanks: async (params) => {
    const url = new URL(params.endpointUrl)
    for (const [name, value] of Object.entries(toEcospendBankListRequest(params))) {
      url.searchParams.set(name, value)
    }

    const responseBody = await collaborators.httpClient.get({
      accessToken: params.accessToken,
      profile: params.profile,
      url: url.href
    })

    const parsedResponse = ecospendBankListResponseSchema.safeParse(responseBody)
    if (!parsedResponse.success) {
      throw new Error(
        `Unexpected ecospend bank list response body: ${describeZodIssues(parsedResponse.error)} [endpoint profile: ${params.profile}]`
      )
    }

    const { data, meta } = parsedResponse.data

    if (meta.total_count !== data.length) {
      throw new Error(
        `Banks response for ${params.profile} reported ${meta.total_count} banks but returned ${data.length}`
      )
    }

    return data
  }
})
