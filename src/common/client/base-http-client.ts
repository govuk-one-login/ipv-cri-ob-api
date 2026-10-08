import type { EndpointProfile } from '@common/model/endpoint-profile'

import { UpstreamResponseError } from '@common/error/upstream-response-error'
import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { logger } from '@govuk-one-login/cri-logger'

export interface BaseHttpClient {
  get: (request: GetRequest) => Promise<unknown>
  postJson: (request: PostJsonRequest) => Promise<unknown>
}

interface BaseHttpClientConfig {
  endpointName: string
}

interface GetRequest {
  accessToken: string
  profile: EndpointProfile
  url: string
}

interface PostJsonRequest {
  accessToken: string
  body: unknown
  profile: EndpointProfile
  url: string
}

export const createBaseHttpClient = (config: BaseHttpClientConfig): BaseHttpClient => ({
  postJson: async (request) => {
    const method = 'POST'
    const response = await instrumentedFetch(
      request.url,
      {
        body: JSON.stringify(request.body),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${request.accessToken}`,
          'content-type': 'application/json'
        },
        method
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

    logResponseCode(method, request.url, response.status)
    return await response.json()
  },

  get: async (request) => {
    const method = 'GET'
    const response = await instrumentedFetch(
      request.url,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${request.accessToken}`
        },
        method
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

    logResponseCode(method, request.url, response.status)
    return await response.json()
  }
})

const logResponseCode = (method: string, url: string, status: number) => {
  const { origin } = new URL(url)
  logger.info(`${method} to ${origin} response status ${status}`)
}
