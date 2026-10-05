import type { BaseHttpClient } from '@common/client/base-http-client'
import type { ConsentsProvider } from '@src/consents/model/consents-provider'

import {
  THIRD_PARTY_RESPONSE_BODY_METRIC_NAME,
  ThirdPartyMetricDimensions,
  ThirdPartyResponseBodyState
} from '@common/model/metrics/third-party-metrics'
import { describeZodIssues } from '@common/util/zod'
import { captureMetricWithDimensions, MetricUnit } from '@govuk-one-login/cri-metrics'
import { toEcospendConsentsRequest } from '@src/consents/model/ecospend/ecospend-consents-request'
import { ecospendConsentsResponseSchema } from '@src/consents/model/ecospend/ecospend-consents-response'

const ENDPOINT_NAME = 'ecospend-consents'

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
      captureMetricWithDimensions(
        THIRD_PARTY_RESPONSE_BODY_METRIC_NAME,
        {
          [ThirdPartyMetricDimensions.ENDPOINT]: ENDPOINT_NAME,
          [ThirdPartyMetricDimensions.PROFILE]: params.profile,
          [ThirdPartyMetricDimensions.RESPONSE_BODY_STATE]:
            ThirdPartyResponseBodyState.RESPONSE_BODY_INVALID
        },
        1,
        MetricUnit.Count
      )
      throw new Error(
        `Unexpected ecospend consents response body: ${describeZodIssues(parsedResponse.error)} [endpoint profile: ${params.profile}]`
      )
    }

    return parsedResponse.data
  }
})
