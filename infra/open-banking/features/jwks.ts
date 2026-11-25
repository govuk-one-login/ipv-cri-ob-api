import type { CriStack } from '@infra/cri/stack'

import { criApiS3ReadRole } from '@infra/cri/api/s3-read-role'
import { Fn } from 'aws-cdk-lib'

export const jwks = (stack: CriStack) => {
  criApiS3ReadRole(stack, 'JWKSBucketRole', {
    bucket: Fn.sub('govuk-one-login-ob-published-keys-${Environment}'),
    key: 'jwks.json',
    tags: { key_consumer_type: 'use' }
  })
}
