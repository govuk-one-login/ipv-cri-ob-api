import { testStack } from '../fixtures/test-stack'
import { criDynamoTable, tableAccess } from '@infra/cri/dynamo-table'
import { Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'

describe('criDynamoTable', () => {
  it('is an encrypted, on-demand table, recoverable in production, with the given keys and TTL', () => {
    const stack = testStack()
    criDynamoTable(stack, 'ExampleTable', { partitionKey: 'id', ttlAttribute: 'ttl' })

    Template.fromStack(stack).hasResourceProperties('AWS::DynamoDB::Table', {
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: { 'Fn::If': ['IsProduction', true, false] }
      },
      SSESpecification: { SSEEnabled: true },
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true }
    })
  })

  it('defines each key attribute once, across the table and its indexes', () => {
    const stack = testStack()
    criDynamoTable(stack, 'ExampleTable', {
      globalSecondaryIndexes: [
        {
          indexName: 'bySortKey',
          partitionKey: 'sortKey',
          projection: { projectionType: 'KEYS_ONLY' },
          sortKey: 'other'
        }
      ],
      partitionKey: 'id',
      sortKey: 'sortKey'
    })

    Template.fromStack(stack).hasResourceProperties('AWS::DynamoDB::Table', {
      AttributeDefinitions: ['id', 'sortKey', 'other'].map((name) => ({
        AttributeName: name,
        AttributeType: 'S'
      }))
    })
  })
})

describe('tableAccess', () => {
  it('allows the given actions on the table', () => {
    const stack = testStack()
    const table = criDynamoTable(stack, 'ExampleTable', { partitionKey: 'id' })

    expect(stack.resolve(tableAccess(table, ['GetItem', 'PutItem']))).toEqual({
      statement: [
        {
          Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
          Effect: 'Allow',
          Resource: { 'Fn::GetAtt': ['ExampleTable', 'Arn'] }
        }
      ]
    })
  })
})
