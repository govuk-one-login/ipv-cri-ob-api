import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRotationStrategy } from '@govuk-one-login/cri-token-rotator'

import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { nowSeconds } from '@common/util/time'
import { describeZodIssues } from '@common/util/zod'
import { EcospendTokenError } from '@src/ecospend-token/error/ecospend-token-error'
import { ecospendTokenCredentialsSchema } from '@src/ecospend-token/model/ecospend-token-credentials'
import { ecospendTokenResponseSchema } from '@src/ecospend-token/model/ecospend-token-response'

export const ecospendTokenStrategy: TokenRotationStrategy<EndpointProfile> = {
  rotate: async (profile, credentials) => {
    const parsedCredentials = ecospendTokenCredentialsSchema.safeParse(credentials)

    if (!parsedCredentials.success) {
      throw new EcospendTokenError(
        `problem parsing credentials: ${describeZodIssues(parsedCredentials.error)}`,
        profile
      )
    }

    const { endpointUrl, formParams } = parsedCredentials.data
    const body = new URLSearchParams(formParams).toString()

    const response = await instrumentedFetch(
      endpointUrl,
      {
        body,
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded'
        },
        method: 'POST'
      },
      {
        endpointName: 'ecospend-iam',
        endpointProfile: profile
      }
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'unknown instrumentedFetch error'
      throw new EcospendTokenError(message, profile)
    })

    if (!response.ok) {
      throw new EcospendTokenError(`response was not OK [status: ${response.status}]`, profile)
    }

    const responseBody = await response.json().catch(() => {
      throw new EcospendTokenError(`response was not valid JSON`, profile)
    })

    const parsedResponse = ecospendTokenResponseSchema.safeParse(responseBody)

    if (!parsedResponse.success) {
      throw new EcospendTokenError(
        `problem parsing response: ${describeZodIssues(parsedResponse.error)}`,
        profile
      )
    }

    const { expiresInSeconds, tokenValue } = parsedResponse.data

    return {
      expiresAtSeconds: nowSeconds() + expiresInSeconds,
      tokenValue
    }
  }
}
