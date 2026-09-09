import { z } from 'zod'

export const banksRequestConfigSchema = z
  .object({
    'custom-list': z.string().optional(),
    'endpoint-url': z.string().min(1)
  })
  .transform((o) => ({
    endpointUrl: o['endpoint-url'],
    ...(o['custom-list'] ? { customList: o['custom-list'] } : {})
  }))

export type BanksRequestConfig = z.infer<typeof banksRequestConfigSchema>
