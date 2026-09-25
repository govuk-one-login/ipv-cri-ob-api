import { describeZodIssues } from '@common/util/zod'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const schema = z.object({
  an_id: z.string().min(1),
  a_return_url: z.url()
})

const errorFor = (input: unknown): z.ZodError => {
  const result = schema.safeParse(input)
  if (result.success) throw new Error('Expected the schema to reject the input')
  return result.error
}

describe('describeZodIssues', () => {
  it('describes a single issue as field and message', () => {
    const error = errorFor({ an_id: 'iron-bank', a_return_url: 'not-a-url' })

    expect(describeZodIssues(error)).toBe('a_return_url: Invalid URL')
  })

  it('joins multiple issues with a semicolon', () => {
    const error = errorFor({})

    expect(describeZodIssues(error)).toBe(
      'an_id: Invalid input: expected string, received undefined; a_return_url: Invalid input: expected string, received undefined'
    )
  })

  it('no raw JSON in issues', () => {
    const error = errorFor({})

    expect(describeZodIssues(error)).not.toContain('{')
  })
})
