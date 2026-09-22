import type { EndpointProfile } from '@common/model/endpoint-profile'

import { UpstreamResponseError } from '@common/error/upstream-response-error'
import { instrumentedFetch } from '@common/util/instrumented-fetch'

export interface BaseHttpClient {
  postJson: (request: PostJsonRequest) => Promise<unknown>
}

interface BaseHttpClientConfig {
  endpointName: string
}

interface PostJsonRequest {
  accessToken: string
  body: unknown
  profile: EndpointProfile
  url: string
}

export const createBaseHttpClient = (config: BaseHttpClientConfig): BaseHttpClient => ({
  postJson: async (request) => {
    const response = await instrumentedFetch(
      request.url,
      {
        body: JSON.stringify(request.body),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${request.accessToken}`,
          'content-type': 'application/json'
        },
        method: 'POST'
      },
      { endpoint: config.endpointName, profile: request.profile }
    )

    if (!response.ok) {
      throw new UpstreamResponseError(
        `${config.endpointName} response was not OK`,
        response.status,
        request.profile
      )
    }

    return await response.json()
  }
})
