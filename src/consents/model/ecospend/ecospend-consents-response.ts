import type { CreatedConsent } from '@src/consents/model/consents-provider'

import { z } from 'zod'

export const ecospendConsentsResponseSchema = z
  .object({
    bank_consent_url: z.url({ protocol: /^https?$/ }),
    bank_id: z.string().min(1),
    id: z.string().min(1)
  })
  .transform(
    (response): CreatedConsent => ({
      bankConsentUrl: response.bank_consent_url,
      bankId: response.bank_id,
      consentId: response.id
    })
  )
