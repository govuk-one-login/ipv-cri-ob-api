import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { BankListEntity, StoredBank } from '@src/bank-list/model/bank-list'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { createBankListRepository } from '@src/bank-list/client/bank-list-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TABLE_NAME = 'bank-list-table'

const banks: StoredBank[] = [
  {
    bankId: 'example-bank',
    friendlyName: 'Example Bank',
    serviceStatus: true
  },
  {
    bankId: 'offline-bank',
    friendlyName: 'Offline Bank',
    serviceStatus: false
  }
]

const buildBankListEntity = (overrides: Partial<BankListEntity> = {}): BankListEntity => ({
  banks,
  profile: EndpointProfile.STUB,
  refreshedAtSeconds: 1_800_000_000,
  ...overrides
})

const mockSendCommand = vi.fn()
const client = { send: mockSendCommand } as unknown as DynamoDBDocumentClient
const repository = createBankListRepository({ tableName: TABLE_NAME }, client)

beforeEach(() => {
  vi.clearAllMocks()
  mockSendCommand.mockResolvedValue({})
})

describe('bank-list-repository', () => {
  describe('getList', () => {
    it('reads the cache for the requested profile', async () => {
      await repository.getList(EndpointProfile.STUB)

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ConsistentRead: true,
            Key: { profile: EndpointProfile.STUB },
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('returns the stored bank list entity', async () => {
      const entity = buildBankListEntity()

      mockSendCommand.mockResolvedValueOnce({ Item: entity })

      await expect(repository.getList(EndpointProfile.STUB)).resolves.toEqual(entity)
    })

    it('returns undefined when no snapshot exists', async () => {
      mockSendCommand.mockResolvedValueOnce({})

      await expect(repository.getList(EndpointProfile.STUB)).resolves.toBeUndefined()
    })

    it('propagates DynamoDB read failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.getList(EndpointProfile.STUB)).rejects.toThrow('DynamoDB unavailable')
    })
  })

  describe('replaceList', () => {
    it('writes the complete bank-list cache', async () => {
      const entity = buildBankListEntity()

      await repository.replaceList(entity)

      expect(mockSendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Item: entity,
            TableName: TABLE_NAME
          }
        })
      )
    })

    it('propagates DynamoDB write failures', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('DynamoDB unavailable'))

      await expect(repository.replaceList(buildBankListEntity())).rejects.toThrow(
        'DynamoDB unavailable'
      )
    })
  })
})
