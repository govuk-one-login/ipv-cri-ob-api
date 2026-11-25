import type { HttpMethod } from '@infra/cri/api/api'
import type { CriStack } from '@infra/cri/stack'

import { Fn } from 'aws-cdk-lib'

export type ApiThrottling = {
  burstLimit: number
  rateLimit: number
}

export type ThrottledRoute = {
  method: HttpMethod
  path: string
  throttle: ApiThrottling
}

export const defaultThrottling: ApiThrottling = { burstLimit: 400, rateLimit: 200 }

const methodSetting = (
  stack: CriStack,
  { burstLimit, rateLimit }: ApiThrottling,
  route?: Pick<ThrottledRoute, 'method' | 'path'>
) => ({
  DataTraceEnabled: Fn.conditionIf(stack.conditions.isProduction.logicalId, false, true),
  HttpMethod: route?.method ?? '*',
  LoggingLevel: 'INFO',
  MetricsEnabled: true,
  ResourcePath: route ? `/${route.path.replaceAll('/', '~1')}` : '/*',
  ThrottlingBurstLimit: burstLimit,
  ThrottlingRateLimit: rateLimit
})

export const methodSettings = (stack: CriStack, throttledRoutes: ThrottledRoute[]) => [
  methodSetting(stack, defaultThrottling),
  ...throttledRoutes.map(({ throttle, ...route }) => methodSetting(stack, throttle, route))
]
