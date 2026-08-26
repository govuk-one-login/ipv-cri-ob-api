import { z } from 'zod'

export const ecospendTokenCredentialsSchema = z
  .object({
    'client-id': z.string().min(1),
    'client-secret': z.string().min(1),
    'endpoint-url': z.string().min(1),
    'grant-type': z.string().min(1),
    scope: z.string().min(1)
  })
  .transform((o) => ({
    endpointUrl: o['endpoint-url'],
    formParams: {
      client_id: o['client-id'],
      client_secret: o['client-secret'],
      grant_type: o['grant-type'],
      scope: o.scope
    }
  }))

export type EcospendTokenCredentials = z.infer<typeof ecospendTokenCredentialsSchema>
