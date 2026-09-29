import type { ZodError } from 'zod'

const describeZodIssues = (error: ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')

export { describeZodIssues }
