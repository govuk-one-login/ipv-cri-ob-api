import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { AccessTokenSessionItem } from '@common/model/session'
import type { SessionItem } from '@govuk-one-login/cri-types'

import { createSessionRepository } from '@common/client/session-repository'
import { AmbiguousAccessTokenError } from '@common/error/ambiguous-access-token-error'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'session-table'
const ACCESS_TOKEN_INDEX = 'access-token-index-with-event-data'

const buildSession = (overrides: Partial<SessionItem> = {}): SessionItem =>
  ({
    attemptCount: 1,
    clientId: 'test-client',
    clientSessionId: 'client-session-1',
    createdDate: 690_768_000,
    expiryDate: 690_854_399,
    redirectUri: 'https://example.test/callback',
    sessionId: 'session-123',
    state: 'test-state',
    subject: 'subject-xyz',
    ...overrides
  }) as SessionItem

const buildProjectedSession = (
  overrides: Partial<AccessTokenSessionItem> = {}
): AccessTokenSessionItem => ({
  clientId: 'test-client',
  clientIpAddress: '0.0.0.0',
  clientSessionId: 'client-session-1',
  persistentSessionId: 'persistent-session-1',
  sessionId: 'session-123',
  subject: 'subject-xyz',
  ...overrides
})

const mockSendCommand = vi.fn()
const client = { send: mockSendCommand } as unknown as DynamoDBDocumentClient
const repository = createSessionRepository({ tableName: TABLE_NAME }, client)

beforeEach(() => {
  vi.clearAllMocks()
  mockSendCommand.mockResolvedValue({})
})

describe('session-repository', () => {
  describe('findBySessionId', () => {
    it('reads the session by primary key', async () => {
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

    it('returns a session', async () => {
      const session = buildSession()

      mockSendCommand.mockResolvedValueOnce({ Item: session })

      await expect(repository.findBySessionId('session-123')).resolves.toEqual(session)
    })

    it('returns undefined when no session exists', async () => {
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

  describe('findByAccessToken', () => {
    it('queries the access token index carrying the audit event data', async () => {
      await repository.findByAccessToken('access-token-foo')

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ExpressionAttributeValues: { ':accessToken': 'access-token-foo' },
            IndexName: ACCESS_TOKEN_INDEX,
            KeyConditionExpression: 'accessToken = :accessToken',
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('returns projected session', async () => {
      const session = buildProjectedSession()

      mockSendCommand.mockResolvedValueOnce({ Items: [session] })

      await expect(repository.findByAccessToken('access-token-foo')).resolves.toEqual(session)
      expect(mockSendCommand).toHaveBeenCalledTimes(1)
    })

    it('returns undefined when the index has no match', async () => {
      mockSendCommand.mockResolvedValueOnce({ Items: [] })

      await expect(repository.findByAccessToken('access-token-foo')).resolves.toBeUndefined()
    })

    it('returns undefined when the query returns no Items', async () => {
      mockSendCommand.mockResolvedValueOnce({})

      await expect(repository.findByAccessToken('access-token-foo')).resolves.toBeUndefined()
    })

    it('throws when access token matches more than one session', async () => {
      mockSendCommand.mockResolvedValueOnce({
        Items: [
          buildProjectedSession(),
          buildProjectedSession({ sessionId: 'session-456', subject: 'subject-abc' })
        ]
      })

      await expect(repository.findByAccessToken('access-token-foo')).rejects.toThrow(
        AmbiguousAccessTokenError
      )
    })

    it('propagates query failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.findByAccessToken('access-token-foo')).rejects.toThrow(
        'DynamoDB unavailable'
      )
    })
  })
})
