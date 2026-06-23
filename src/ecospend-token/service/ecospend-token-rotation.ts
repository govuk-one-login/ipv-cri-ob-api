import type { EcospendTokenRequest } from '@src/ecospend-token/model/ecospend-token-request'
import type { TokenRotationStrategy } from '@src/third-party-token/model/token-rotation-strategy'

import { ecospendTokenRequestSchema } from '@src/ecospend-token/model/ecospend-token-request'
import { ecospendTokenResponseSchema } from '@src/ecospend-token/model/ecospend-token-response'
import { TokenRotationError } from '@src/third-party-token/error/token-rotation-errors'

const FETCH_TIMEOUT_MS = 10_000

export const ecospendTokenRotation: TokenRotationStrategy<EcospendTokenRequest> = {
  requestSchema: ecospendTokenRequestSchema,
  rotate: async ({ request }) => {
    const body = new URLSearchParams(request.formParams).toString()

    const response = await fetch(request.endpointUrl, {
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
      throw new TokenRotationError(`Invalid Ecospend response: ${parsedResponse.error.message}`)
    }
    const { expiresInSeconds, tokenValue } = parsedResponse.data

    return {
      expiresAtSeconds: Math.floor(Date.now() / 1000) + expiresInSeconds,
      tokenValue
    }
  }
}
