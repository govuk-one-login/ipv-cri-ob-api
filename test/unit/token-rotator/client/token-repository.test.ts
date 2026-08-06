import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { TokenEntity } from '@src/token-rotator/model/token-entity'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'token-rotator-table'
vi.stubEnv('TOKEN_ROTATOR_DYNAMO_TABLE_NAME', TABLE_NAME)

const { createTokenRepository } = await import('@src/token-rotator/client/token-repository')
const { TokenProfile } = await import('@src/token-rotator/model/token-profile')

const sendMock = vi.fn()
const mockDynamoDBDocumentClient = { send: sendMock } as unknown as DynamoDBDocumentClient
const repository = createTokenRepository({ tableName: TABLE_NAME }, mockDynamoDBDocumentClient)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('token-repository', () => {
  describe('getToken', () => {
    it('queries DynamoDB with the table partition key', async () => {
      sendMock.mockResolvedValueOnce({ Item: undefined })

      await repository.getToken(TokenProfile.STUB)

      expect(sendMock).toHaveBeenCalledWith(
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
      sendMock.mockResolvedValueOnce({ Item: entity })

      const result = await repository.getToken(TokenProfile.STUB)

      expect(result).toEqual(entity)
    })

    it('returns undefined when not present', async () => {
      sendMock.mockResolvedValueOnce({})

      const result = await repository.getToken(TokenProfile.STUB)

      expect(result).toBeUndefined()
    })
  })

  describe('putToken', () => {
    it('writes a TokenEntity', async () => {
      const entity: TokenEntity = {
        id: TokenProfile.STUB,
        tokenValue: 'new-token',
        ttl: 2_000
      }
      sendMock.mockResolvedValueOnce({})

      await repository.putToken(entity)

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { Item: entity, TableName: TABLE_NAME }
        })
      )
    })
  })
})
