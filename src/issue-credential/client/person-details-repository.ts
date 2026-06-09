import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { PersonIdentityItem } from '@govuk-one-login/cri-types'

import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'

export interface PersonDetailsRepository {
  findBySessionId: (sessionId: string) => Promise<PersonIdentityItem | undefined>
}

export const createPersonDetailsRepository = (
  _client: DynamoDBDocumentClient
): PersonDetailsRepository => ({
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

export const personDetailsRepository = createPersonDetailsRepository(dynamoDBDocumentClient)
