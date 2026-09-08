import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { PersonIdentityItem } from '@govuk-one-login/cri-types'

export interface PersonIdentityRepository {
  findBySessionId: (sessionId: string) => Promise<PersonIdentityItem | undefined>
}

export interface PersonIdentityRepositoryConfig {
  tableName: string
}

export const createPersonIdentityRepository = (
  _config: PersonIdentityRepositoryConfig,
  _client: DynamoDBDocumentClient
): PersonIdentityRepository => ({
  findBySessionId: (_sessionId) =>
    // TODO: delete me and get the actual person details
    Promise.resolve({
      birthDates: [{ value: '1970-01-01' }],
      expiryDate: 0,
      names: [
        {
          nameParts: [
            { type: 'GivenName', value: 'Alice' },
            { type: 'FamilyName', value: 'Doe' }
          ]
        }
      ],
      sessionId: 'session-123'
    } as PersonIdentityItem)
})
