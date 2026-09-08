import { defineConfig } from 'vitest/config'

import path from 'node:path'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/types/**'],
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: 'coverage'
    },
    projects: [
      {
        resolve: {
          alias: {
            '@common': path.resolve(import.meta.dirname, 'src/common'),
            '@lib': path.resolve(import.meta.dirname, 'src/lib'),
            '@src': path.resolve(import.meta.dirname, 'src')
          }
        },
        test: {
          env: {
            AUDIT_COMPONENT_ID: 'ob-cri-audit',
            AUDIT_EVENT_NAME_PREFIX: 'OB_CRI_TEST',
            AUDIT_QUEUE_URL: 'https://sqs.example.test/audit',
            BANK_LIST_DB_TABLE_NAME: 'test-bank-list-table',
            IDENTITY_SCORE_DB_TABLE_NAME: 'test-identity-score-table',
            JWT_TTL_SECONDS: '7200',
            KMS_SIGNING_KEY_ID: 'test-kms-key-id',
            PERSON_IDENTITY_DB_TABLE_NAME: 'test-person-identity-table',
            POWERTOOLS_METRICS_NAMESPACE: 'ob-api',
            POWERTOOLS_SERVICE_NAME: 'ob-api',
            SESSION_DB_TABLE_NAME: 'test-session-table',
            TOKEN_ROTATOR_DB_TABLE_NAME: 'test-token-rotator-table',
            VC_DOMAIN: 'review-ob.unit-test.account.gov.uk'
          },
          include: ['test/unit/**/*.test.ts'],
          name: 'unit'
        }
      },
      {
        test: {
          include: ['test/infra/**/*.test.ts'],
          name: 'infra'
        }
      }
    ],
    silent: 'passed-only'
  }
})
