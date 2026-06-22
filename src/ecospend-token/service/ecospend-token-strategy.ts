import type { TokenRotationStrategy } from '@src/token-rotator/model/token-rotation-strategy'

import { ecospendTokenCredentialsSchema } from '@src/ecospend-token/model/ecospend-token-credentials'
import { ecospendTokenResponseSchema } from '@src/ecospend-token/model/ecospend-token-response'
import { TokenRotationError } from '@src/token-rotator/error/token-rotation-errors'

const FETCH_TIMEOUT_MS = 10_000

export const ecospendTokenStrategy: TokenRotationStrategy = {
  rotate: async (credentials) => {
    const parsedCredentials = ecospendTokenCredentialsSchema.safeParse(credentials)

    if (!parsedCredentials.success) {
      throw new TokenRotationError(
        `Invalid Ecospend credentials: ${parsedCredentials.error.message}`
      )
    }

    const { endpointUrl, formParams } = parsedCredentials.data
    const body = new URLSearchParams(formParams).toString()
    const response = await fetch(endpointUrl, {
      body,
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new TokenRotationError(`Ecospend token request failed: ${message}`)
    })

    if (response.status !== 200) {
      throw new TokenRotationError(`Ecospend returned ${response.status}`)
    }

    const responseBody = await response.json().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new TokenRotationError(`Ecospend response was not valid JSON: ${message}`)
    })

    const parsedResponse = ecospendTokenResponseSchema.safeParse(responseBody)

    if (!parsedResponse.success) {
      throw new TokenRotationError(`Unexpected Ecospend response: ${parsedResponse.error.message}`)
    }

    const { expiresInSeconds, tokenValue } = parsedResponse.data

    return {
      expiresAtSeconds: Math.floor(Date.now() / 1000) + expiresInSeconds,
      tokenValue
    }
  }
}
