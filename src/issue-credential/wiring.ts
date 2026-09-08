import { dynamoDBDocumentClient } from '@common/client/dynamodb-client'
import { createIdentityScoreRepository } from '@common/client/identity-score-repository'
import { createPersonIdentityRepository } from '@common/client/person-identity-repository'
import { createSessionRepository } from '@common/client/session-repository'
import { requireEnv } from '@common/util/env'

export const sessionRepository = createSessionRepository(
  { tableName: requireEnv('SESSION_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

export const personIdentityRepository = createPersonIdentityRepository(
  { tableName: requireEnv('PERSON_IDENTITY_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)

export const identityScoreRepository = createIdentityScoreRepository(
  { tableName: requireEnv('IDENTITY_SCORE_DB_TABLE_NAME') },
  dynamoDBDocumentClient
)
