import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'

import { getParameters } from '@aws-lambda-powertools/parameters/ssm'

const CACHE_MAX_AGE_SECONDS = 300

export interface CredentialsProvider {
  getCredentials: (parameterPath: string) => Promise<ProviderCredentials>
}

export const ssmCredentialsProvider: CredentialsProvider = {
  getCredentials: async (parameterPath) => {
    const params = await getParameters(parameterPath, {
      decrypt: true,
      maxAge: CACHE_MAX_AGE_SECONDS,
      recursive: true
    })
    if (!params || Object.keys(params).length === 0) {
      throw new Error(`No parameters found at path: ${parameterPath}`)
    }
    return params
  }
}
