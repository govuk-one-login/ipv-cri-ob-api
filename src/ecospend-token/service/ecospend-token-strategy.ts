import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRotationStrategy } from '@govuk-one-login/cri-token-rotator'

import { instrumentedFetch } from '@common/util/instrumented-fetch'
import { describeZodIssues } from '@common/util/zod'
import { EcospendIamError } from '@src/ecospend-token/error/ecospend-iam-error'
import { ecospendTokenCredentialsSchema } from '@src/ecospend-token/model/ecospend-token-credentials'
import { ecospendTokenResponseSchema } from '@src/ecospend-token/model/ecospend-token-response'

export const ecospendTokenStrategy: TokenRotationStrategy<EndpointProfile> = {
  rotate: async (profile, credentials) => {
    const parsedCredentials = ecospendTokenCredentialsSchema.safeParse(credentials)

    if (!parsedCredentials.success) {
      throw new Error(
        `Invalid Ecospend IAM credentials: ${describeZodIssues(parsedCredentials.error)}`
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
      const message = error instanceof Error ? error.message : 'Unknown instrumentedFetch error'
      throw new EcospendIamError(message, profile)
    })

    if (!response.ok) {
      throw new EcospendIamError(`response was not OK [status: ${response.status}]`, profile)
    }

    const responseBody = await response.json().catch(() => {
      throw new EcospendIamError(`response was not valid JSON`, profile)
    })

    const parsedResponse = ecospendTokenResponseSchema.safeParse(responseBody)

    if (!parsedResponse.success) {
      throw new EcospendIamError(describeZodIssues(parsedResponse.error), profile)
    }

    const { expiresInSeconds, tokenValue } = parsedResponse.data

    return {
      expiresAtSeconds: Math.floor(Date.now() / 1000) + expiresInSeconds,
      tokenValue
    }
  }
}
