import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { PersonIdentityItem } from '@govuk-one-login/cri-types'

import { createPersonIdentityRepository } from '@common/client/person-identity-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'person-identity-table'

const buildPersonIdentity = (overrides: Partial<PersonIdentityItem> = {}): PersonIdentityItem =>
  ({
    birthDates: [{ value: '1867-01-01' }],
    expiryDate: 690_768_000,
    names: [
      {
        nameParts: [
          { type: 'GivenName', value: 'Scrooge' },
          { type: 'FamilyName', value: 'McDuck' }
        ]
      }
    ],
    sessionId: 'session-123',
    ...overrides
  }) as PersonIdentityItem

const mockSendCommand = vi.fn()
const client = { send: mockSendCommand } as unknown as DynamoDBDocumentClient
const repository = createPersonIdentityRepository({ tableName: TABLE_NAME }, client)

beforeEach(() => {
  vi.clearAllMocks()
  mockSendCommand.mockResolvedValue({})
})

describe('person-identity-repository', () => {
  describe('findBySessionId', () => {
    it('reads the person identity by primary key', async () => {
      await repository.findBySessionId('session-123')

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ConsistentRead: true,
            Key: { sessionId: 'session-123' },
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('returns a person identity', async () => {
      const personIdentity = buildPersonIdentity()

      mockSendCommand.mockResolvedValueOnce({ Item: personIdentity })

      await expect(repository.findBySessionId('session-123')).resolves.toEqual(personIdentity)
    })

    it('returns undefined when no person identity exists', async () => {
      mockSendCommand.mockResolvedValueOnce({})

      await expect(repository.findBySessionId('session-123')).resolves.toBeUndefined()
    })

    it('propagates read failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.findBySessionId('session-123')).rejects.toThrow(
        'DynamoDB unavailable'
      )
    })
  })
})
