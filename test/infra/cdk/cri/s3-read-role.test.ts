import { testStack } from '../fixtures/test-stack'
import { criApiS3ReadRole } from '@infra/cri/api/s3-read-role'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, it } from 'vitest'

describe('criApiS3ReadRole', () => {
  it('lets API Gateway read only the given object', () => {
    const stack = testStack()
    criApiS3ReadRole(stack, 'ExampleRole', { bucket: 'example-bucket', key: 'example.json' })

    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [Match.objectLike({ Principal: { Service: 'apigateway.amazonaws.com' } })]
      }),
      Policies: [
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: [
              Match.objectLike({
                Action: ['s3:Get*'],
                Resource: [
                  {
                    'Fn::Sub': [
                      'arn:aws:s3:::${Bucket}/${Key}',
                      { Bucket: 'example-bucket', Key: 'example.json' }
                    ]
                  }
                ]
              })
            ]
          })
        })
      ]
    })
  })
})
