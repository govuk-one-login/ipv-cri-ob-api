import { z } from 'zod'

export const bankListConfigSchema = z
  .object({
    'custom-list': z.string().optional(),
    'endpoint-url': z.url({ protocol: /^https?$/ })
  })
  .transform((o) => ({
    endpointUrl: o['endpoint-url'],
    ...(o['custom-list'] ? { customList: o['custom-list'] } : {})
  }))

export type BankListConfig = z.infer<typeof bankListConfigSchema>
