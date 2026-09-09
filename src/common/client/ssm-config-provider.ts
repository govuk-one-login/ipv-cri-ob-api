import { getParameters } from '@aws-lambda-powertools/parameters/ssm'

const CACHE_MAX_AGE_SECONDS = 300

export interface SSMConfigProvider {
  get: (parameterPath: string) => Promise<Record<string, string>>
}

export const ssmConfigProvider: SSMConfigProvider = {
  get: async (parameterPath) => {
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
