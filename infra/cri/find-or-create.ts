import type { Stack } from 'aws-cdk-lib'
import type { IConstruct } from 'constructs'

export const findOrCreate = <T extends IConstruct>(
  stack: Stack,
  id: string,
  create: (id: string) => T
): T => (stack.node.tryFindChild(id) as T | undefined) ?? create(id)
