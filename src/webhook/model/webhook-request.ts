import { z } from 'zod'

const jsonBodySchema = z.string().transform((body, ctx) => {
    try {
        return JSON.parse(body) as unknown
    } catch {
        ctx.addIssue({ code: 'custom', message: 'Request body is not valid JSON' })
        return z.NEVER
    }
})

export const webhookRequestSchema = jsonBodySchema
    .pipe(
        z.object({
            //put important fields in here
        })
    )

