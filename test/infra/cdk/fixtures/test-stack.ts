import { criApp } from '@infra/cri/app'
import { byEnvironment } from '@infra/cri/environment'
import { CriStack } from '@infra/cri/stack'

// an empty CriStack for synthesising a construct on its own
export const testStack = () =>
  new CriStack(criApp(), 'Test', {
    criName: 'Test',
    description: 'Test stack',
    environmentConfig: byEnvironment((environment) => ({
      dynatraceLayer: 'arn:aws:lambda:eu-west-2:000000000000:layer:Dynatrace:1',
      dynatraceSecretArn: 'arn:aws:secretsmanager:eu-west-2:000000000000:secret:Dynatrace', // pragma: allowlist secret
      logFullErrors: environment !== 'production',
      logGroupRetentionInDays: environment === 'production' ? 365 : 30,
      memorySize: 1024,
      provisionedConcurrentExecutions: environment === 'dev' ? 0 : 1,
      vcDomain: `review-test.${environment}.account.gov.uk`
    })),
    supportManualUrl: 'https://manual.example.test/'
  })
