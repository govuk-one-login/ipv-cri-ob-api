import { z } from 'zod'

export const consentsConfigSchema = z
  .object({
    'endpoint-url': z.url({ protocol: /^https?$/ })
  })
  .transform((o) => ({
    endpointUrl: o['endpoint-url']
  }))

export type ConsentsConfig = z.infer<typeof consentsConfigSchema>
