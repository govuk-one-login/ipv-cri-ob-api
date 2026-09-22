import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { ConsentEntity } from '@src/consents/model/database/consent-entity'

import { createConsentsRepository } from '@src/consents/client/consents-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SESSION_ID = 'session-123'
const TABLE_NAME = 'consents-table'

const buildConsentEntity = (overrides: Partial<ConsentEntity> = {}): ConsentEntity => ({
  bankConsentUrl: 'https://iron.bank.test/consent/abc',
  bankConsentUrlExpirySeconds: 690_811_200,
  bankId: 'iron-bank',
  consentId: 'consent-abc',
  sessionId: SESSION_ID,
  ttl: 690_818_400,
  ...overrides
})

const mockSendCommand = vi.fn()
const client = { send: mockSendCommand } as unknown as DynamoDBDocumentClient
const repository = createConsentsRepository({ tableName: TABLE_NAME }, client)

beforeEach(() => {
  vi.clearAllMocks()
  mockSendCommand.mockResolvedValue({})
})

describe('consents-repository', () => {
  describe('getConsent', () => {
    it('gets a consent for the session', async () => {
      await repository.getConsent(SESSION_ID)

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ConsistentRead: true,
            Key: { sessionId: SESSION_ID },
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('returns a consent entity', async () => {
      const entity = buildConsentEntity()

      mockSendCommand.mockResolvedValueOnce({ Item: entity })

      await expect(repository.getConsent(SESSION_ID)).resolves.toEqual(entity)
    })

    it('returns undefined when no consent is found', async () => {
      mockSendCommand.mockResolvedValueOnce({})

      await expect(repository.getConsent(SESSION_ID)).resolves.toBeUndefined()
    })

    it('propagates read failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.getConsent(SESSION_ID)).rejects.toThrow('DynamoDB unavailable')
    })
  })

  describe('putConsent', () => {
    it('writes a consent entity', async () => {
      const entity = buildConsentEntity()

      await repository.putConsent(entity)

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Item: entity,
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('propagates write failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.putConsent(buildConsentEntity())).rejects.toThrow(
        'DynamoDB unavailable'
      )
    })
  })
})
