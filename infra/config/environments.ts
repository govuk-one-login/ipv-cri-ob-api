export const environments = ['dev', 'build', 'staging', 'integration', 'production'] as const
export type Environment = (typeof environments)[number]

export const profiles = ['STUB', 'UAT', 'LIVE'] as const
export type EnvironmentConfig = {
  dynatraceLayer: string
  dynatraceSecretArn: string
  enabledProfiles: Partial<Record<Profile, string>>
  logFullErrors: boolean
  memorySize: number
  provisionedConcurrentExecutions: number
  vcDomain: string
}

export type Profile = (typeof profiles)[number]

// SEE https://github.com/govuk-one-login/observability-infrastructure/tree/main/lambdalayer
const dynatraceLayer =
  'arn:aws:lambda:eu-west-2:216552277552:layer:Dynatrace_OneAgent_1_329_73_20260123-140641_with_collector_nodejs_arm:1'
const dynatraceNonProductionSecretArn =
  'arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceNonProductionVariables'
const dynatraceProductionSecretArn =
  'arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceProductionVariables'

const ecospendSandboxUrl = 'https://aisapi.sb.ecospend.com'
const ecospendLiveUrl = 'https://aisapi.ecospend.com'

export const environmentConfig: Record<Environment, EnvironmentConfig> = {
  dev: {
    dynatraceLayer,
    dynatraceSecretArn: dynatraceNonProductionSecretArn,
    enabledProfiles: {
      STUB: 'https://8nqpgft8mc.execute-api.eu-west-2.amazonaws.com/dev',
      UAT: ecospendSandboxUrl
    },
    logFullErrors: true,
    memorySize: 1024,
    provisionedConcurrentExecutions: 0,
    vcDomain: 'review-ob.dev.account.gov.uk'
  },
  build: {
    dynatraceLayer,
    dynatraceSecretArn: dynatraceNonProductionSecretArn,
    enabledProfiles: {
      STUB: 'https://babtt0cp72.execute-api.eu-west-2.amazonaws.com/build',
      UAT: ecospendSandboxUrl
    },
    logFullErrors: true,
    memorySize: 1024,
    provisionedConcurrentExecutions: 1,
    vcDomain: 'review-ob.build.account.gov.uk'
  },
  staging: {
    dynatraceLayer,
    dynatraceSecretArn: dynatraceNonProductionSecretArn,
    enabledProfiles: {
      STUB: 'https://52wrvaocmk.execute-api.eu-west-2.amazonaws.com/staging',
      UAT: ecospendSandboxUrl
    },
    logFullErrors: true,
    memorySize: 1024,
    provisionedConcurrentExecutions: 1,
    vcDomain: 'review-ob.staging.account.gov.uk'
  },
  integration: {
    dynatraceLayer,
    dynatraceSecretArn: dynatraceNonProductionSecretArn,
    enabledProfiles: {
      UAT: ecospendSandboxUrl
    },
    logFullErrors: false,
    memorySize: 1024,
    provisionedConcurrentExecutions: 1,
    vcDomain: 'review-ob.integration.account.gov.uk'
  },
  production: {
    dynatraceLayer,
    dynatraceSecretArn: dynatraceProductionSecretArn,
    enabledProfiles: {
      LIVE: ecospendLiveUrl
    },
    logFullErrors: false,
    memorySize: 1024,
    provisionedConcurrentExecutions: 1,
    vcDomain: 'review-ob.account.gov.uk'
  }
}

export const enabledProfiles = (environment: Environment): Profile[] =>
  profiles.filter((profile) => profile in environmentConfig[environment].enabledProfiles)

export const environmentsWithProfile = (profile: Profile): Environment[] =>
  environments.filter((environment) => enabledProfiles(environment).includes(profile))
