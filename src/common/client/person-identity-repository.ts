import type { PersonIdentityItem } from '@govuk-one-login/cri-types'

import { type DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

export interface PersonIdentityRepository {
  findBySessionId: (sessionId: string) => Promise<PersonIdentityItem | undefined>
}

export interface PersonIdentityRepositoryConfig {
  tableName: string
}

export const createPersonIdentityRepository = (
  config: PersonIdentityRepositoryConfig,
  client: DynamoDBDocumentClient
): PersonIdentityRepository => ({
  findBySessionId: async (sessionId) => {
    const { Item } = await client.send(
      new GetCommand({
        ConsistentRead: true,
        Key: { sessionId },
        TableName: config.tableName
      })
    )
    return Item as PersonIdentityItem | undefined
  }
})
