import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { TokenEntity } from '@lib/token-rotator/model/token-entity'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'token-rotator-table'
vi.stubEnv('TOKEN_ROTATOR_DB_TABLE_NAME', TABLE_NAME)

const { createDynamoTokenRepository } =
  await import('@lib/token-rotator/client/dynamo-token-repository')
const { TokenProfile } = await import('@lib/token-rotator/model/token-profile')

const sendCommandMock = vi.fn()
const mockDynamoDBDocumentClient = { send: sendCommandMock } as unknown as DynamoDBDocumentClient
const repository = createDynamoTokenRepository(
  { tableName: TABLE_NAME },
  mockDynamoDBDocumentClient
)

beforeEach(() => {
  vi.clearAllMocks()
  sendCommandMock.mockResolvedValue({})
})

describe('token-repository', () => {
  describe('getToken', () => {
    it('queries DynamoDB with the token profile', async () => {
      await repository.getToken(TokenProfile.STUB)

      expect(sendCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { Key: { id: TokenProfile.STUB }, TableName: TABLE_NAME }
        })
      )
    })

    it('returns a TokenEntity when present', async () => {
      const entity: TokenEntity = {
        id: TokenProfile.STUB,
        tokenValue: 'cached-token',
        ttl: 1_000
      }
      sendCommandMock.mockResolvedValueOnce({ Item: entity })

      expect(await repository.getToken(TokenProfile.STUB)).toEqual(entity)
    })

    it('returns undefined when no Item is returned', async () => {
      expect(await repository.getToken(TokenProfile.STUB)).toBeUndefined()
    })
  })

  describe('putToken', () => {
    it('writes a TokenEntity', async () => {
      const entity: TokenEntity = {
        id: TokenProfile.STUB,
        tokenValue: 'new-token',
        ttl: 2_000
      }

      await repository.putToken(entity)

      expect(sendCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { Item: entity, TableName: TABLE_NAME }
        })
      )
    })
  })
})
