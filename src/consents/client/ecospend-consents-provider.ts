import type { BaseHttpClient } from '@common/client/base-http-client'
import type { ConsentsProvider } from '@src/consents/model/consents-provider'

import { describeZodIssues } from '@common/util/zod'
import { toEcospendConsentsRequest } from '@src/consents/model/ecospend/ecospend-consents-request'
import { ecospendConsentsResponseSchema } from '@src/consents/model/ecospend/ecospend-consents-response'

interface EcospendConsentsProviderCollaborators {
  httpClient: BaseHttpClient
}

export const createEcospendConsentsProvider = (
  collaborators: EcospendConsentsProviderCollaborators
): ConsentsProvider => ({
  createConsent: async (params) => {
    const responseBody = await collaborators.httpClient.postJson({
      accessToken: params.accessToken,
      body: toEcospendConsentsRequest(params),
      profile: params.profile,
      url: params.endpointUrl
    })

    const parsedResponse = ecospendConsentsResponseSchema.safeParse(responseBody)
    if (!parsedResponse.success) {
      throw new Error(
        `Unexpected ecospend consents response body: ${describeZodIssues(parsedResponse.error)} [endpoint profile: ${params.profile}]`
      )
    }

    return parsedResponse.data
  }
})
