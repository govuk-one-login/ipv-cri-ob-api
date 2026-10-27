import { cfnOutputSchema, cfnParameterSchema, loadTemplate } from './helpers'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const template = loadTemplate('template.yaml')

const resources = template['Resources'] as Record<string, Record<string, unknown>>
const parameters = template['Parameters'] as Record<string, unknown>
const outputs = template['Outputs'] as Record<string, unknown>
const conditions = template['Conditions'] as Record<string, unknown>
const mappings = template['Mappings'] as Record<string, unknown>

describe('template.yaml structure', () => {
  it('has required top-level keys', () => {
    expect(template).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09')
    expect(template).toHaveProperty('Transform')
    expect(template).toHaveProperty('Resources')
    expect(template).toHaveProperty('Parameters')
    expect(template).toHaveProperty('Outputs')
    expect(template).toHaveProperty('Conditions')
    expect(template).toHaveProperty('Mappings')
    expect(template).toHaveProperty('Globals')
  })
})

describe('template.yaml parameters', () => {
  const requiredParams = [
    'Environment',
    'VpcStackName',
    'PermissionsBoundary',
    'CodeSigningConfigArn',
    'ParameterPrefix',
    'DeploymentType',
    'LogGroupRetentionInDays',
    'LambdaDeploymentPreference'
  ]

  it.each(requiredParams)('has parameter: %s', (param) => {
    const result = cfnParameterSchema.safeParse(parameters[param])
    expect(
      result.success,
      `Parameter ${param} failed validation: ${JSON.stringify(result.error?.issues)}`
    ).toBe(true)
  })

  it('Environment allows only valid values', () => {
    const env = parameters['Environment'] as { AllowedValues: string[] }
    expect(env.AllowedValues).toEqual(['dev', 'build', 'staging', 'integration', 'production'])
  })
})

describe('template.yaml conditions', () => {
  const expectedConditions = [
    'IsDeployedFromPipeline',
    'IsNotDeployedFromPipeline',
    'AlarmsEnabled',
    'IsProduction',
    'IsNotProduction',
    'UsePermissionsBoundary',
    'UseCodeSigning',
    'UseCanaryDeploymentAlarms',
    'AddProvisionedConcurrency',
    'UseParameterPrefix',
    'CreateTestResourcesParam'
  ]

  it.each(expectedConditions)('has condition: %s', (condition) => {
    expect(conditions).toHaveProperty(condition)
  })
})

describe('template.yaml mappings', () => {
  const environments = ['dev', 'build', 'staging', 'integration', 'production']

  it.each(environments)('EnvironmentConfiguration has entry for %s', (env) => {
    const envConfig = mappings?.['EnvironmentConfiguration'] as Record<string, unknown>
    expect(envConfig).toHaveProperty(env)
  })

  it.each(environments)(
    'EnvironmentConfiguration has provisionedConcurrentExecutions for %s',
    (env) => {
      const envConfig = mappings?.['EnvironmentConfiguration'] as Record<
        string,
        Record<string, unknown>
      >
      expect(envConfig?.[env]).toHaveProperty('provisionedConcurrentExecutions')
    }
  )

  it.each(environments)('EnvironmentConfiguration has memorySize for %s', (env) => {
    const envConfig = mappings?.['EnvironmentConfiguration'] as Record<
      string,
      Record<string, unknown>
    >
    expect(envConfig?.[env]).toHaveProperty('memorySize')
  })
})

describe('template.yaml resources', () => {
  const expectedResources = [
    'PublicAPI',
    'PublicAPILogGroup',
    'PrivateAPI',
    'PrivateAPILogGroup',
    'BankListUpdaterFunction',
    'BankListUpdaterFunctionLogGroup',
    'PublicAPIUsagePlan',
    'PrivateAPIUsagePlan',
    'LoggingKmsKey',
    'CodeDeployServiceRole',
    'JWKSBucketRole'
  ]

  it.each(expectedResources)('has resource: %s', (resource) => {
    expect(resources).toHaveProperty(resource)
  })

  it('all resources have a Type', () => {
    for (const [name, resource] of Object.entries(resources)) {
      expect(resource, `Resource ${name} missing Type`).toHaveProperty('Type')
    }
  })

  it('BankListUpdaterFunction uses arm64 architecture via Globals', () => {
    const globals = template['Globals'] as Record<string, Record<string, unknown>>
    const architectures = globals['Function']?.['Architectures'] as string[]
    expect(architectures).toContain('arm64')
  })

  it('BankListUpdaterFunction is invoked every minute on a schedule', () => {
    const props = resources['BankListUpdaterFunction']?.['Properties'] as Record<string, unknown>
    const events = props['Events'] as Record<string, Record<string, unknown>>
    expect(events['ScheduledUpdate']).toEqual({
      Type: 'Schedule',
      Properties: { Schedule: 'rate(1 minute)' }
    })
  })

  it('BankListUpdaterFunction has timeout of 40 seconds', () => {
    const globals = template['Globals'] as Record<string, Record<string, unknown>>
    expect(globals['Function']?.['Timeout']).toBe(40)
  })

  it('log groups reference LogGroupRetentionInDays', () => {
    for (const [name, resource] of Object.entries(resources)) {
      if ((resource['Type'] as string) === 'AWS::Logs::LogGroup') {
        const props = resource['Properties'] as Record<string, unknown>
        expect(props, `${name} missing RetentionInDays`).toHaveProperty('RetentionInDays')
      }
    }
  })
})

describe('template.yaml outputs', () => {
  const expectedOutputs = [
    'StackName',
    'PublicApiGatewayId',
    'PublicApiBaseUrl',
    'PrivateApiGatewayId',
    'PrivateApiBaseUrl',
    'IpvCoreBackApiKeyId'
  ]

  it.each(expectedOutputs)('has output: %s', (output) => {
    const result = cfnOutputSchema.safeParse(outputs[output])
    expect(
      result.success,
      `Output ${output} failed validation: ${JSON.stringify(result.error?.issues)}`
    ).toBe(true)
  })
})

describe('template.yaml kms', () => {
  it('LoggingKmsKey has key rotation enabled', () => {
    const props = resources['LoggingKmsKey']?.['Properties'] as Record<string, unknown>
    expect(props['EnableKeyRotation']).toBe(true)
  })
})

describe('template.yaml api gateway throttling', () => {
  it.each(['PublicAPI', 'PrivateAPI'])(
    '%s has throttling configured on method settings',
    (apiName) => {
      const props = resources[apiName]?.['Properties'] as Record<string, unknown>
      const methodSettings = props['MethodSettings'] as Record<string, unknown>[]
      const setting = methodSettings[0]!
      expect(setting['ThrottlingRateLimit']).toBe(200)
      expect(setting['ThrottlingBurstLimit']).toBe(400)
    }
  )
})

describe('template.yaml production data trace', () => {
  it.each(['PublicAPI', 'PrivateAPI'])('%s disables DataTraceEnabled in production', (apiName) => {
    const props = resources[apiName]?.['Properties'] as Record<string, unknown>
    const methodSettings = props['MethodSettings'] as Record<string, unknown>[]
    const dataTrace = methodSettings[0]!['DataTraceEnabled'] as unknown[]
    // !If [IsProduction, false, true] — first branch (production) must be false
    expect(dataTrace).toEqual(expect.arrayContaining([false]))
  })
})

describe('template.yaml JWKSBucketRole IAM policy', () => {
  const props = resources['JWKSBucketRole']?.['Properties'] as Record<string, unknown>
  const policy = (props['Policies'] as Record<string, unknown>[])[0]!
  const statements = (policy['PolicyDocument'] as Record<string, unknown>)['Statement'] as Record<
    string,
    unknown
  >[]
  const statement = statements[0]!

  it('allows only s3:Get* actions', () => {
    expect(statement['Action']).toEqual(['s3:Get*'])
    expect(statement['Effect']).toBe('Allow')
  })

  it('restricts resource to the JWKS bucket object', () => {
    const resource = statement['Resource'] as string[]
    expect(resource[0]).toContain('govuk-one-login-ob-published-keys-')
    expect(resource[0]).toContain('/jwks.json')
  })

  it('is assumed only by apigateway', () => {
    const assume = (props['AssumeRolePolicyDocument'] as Record<string, unknown>)[
      'Statement'
    ] as Record<string, unknown>[]
    const principal = assume[0]!['Principal'] as Record<string, string>
    expect(principal['Service']).toBe('apigateway.amazonaws.com')
  })
})

describe('template.yaml LoggingKmsKey policy', () => {
  const props = resources['LoggingKmsKey']?.['Properties'] as Record<string, unknown>
  const keyPolicy = props['KeyPolicy'] as Record<string, unknown>
  const statements = keyPolicy['Statement'] as Record<string, unknown>[]

  it('grants CloudWatch Logs service principal encrypt/decrypt permissions', () => {
    const logsStatement = statements.find((s) =>
      (s['Principal'] as Record<string, string>)['Service']?.includes('logs.')
    )
    expect(logsStatement).toBeDefined()
    const actions = logsStatement!['Action'] as string[]
    expect(actions).toEqual(
      expect.arrayContaining(['kms:Encrypt*', 'kms:Decrypt*', 'kms:GenerateDataKey*'])
    )
  })

  it('CloudWatch Logs grant is scoped to account log ARNs via condition', () => {
    const logsStatement = statements.find((s) =>
      (s['Principal'] as Record<string, string>)['Service']?.includes('logs.')
    )
    const condition = logsStatement!['Condition'] as Record<string, unknown>
    expect(condition).toHaveProperty('ArnLike')
    const arnLike = condition['ArnLike'] as Record<string, unknown>
    expect(arnLike['kms:EncryptionContext:aws:logs:arn']).toBeDefined()
  })
})

describe('template.yaml BankListUpdaterFunction VPC config', () => {
  it('BankListUpdaterFunction has VpcConfig with SecurityGroupIds and SubnetIds', () => {
    const props = resources['BankListUpdaterFunction']?.['Properties'] as Record<string, unknown>
    const vpcConfig = props['VpcConfig'] as Record<string, unknown>
    expect(vpcConfig).toHaveProperty('SecurityGroupIds')
    expect(vpcConfig).toHaveProperty('SubnetIds')
  })
})

describe('template.yaml bank list updater alarms', () => {
  const updaterProps = resources['BankListUpdaterFunction']?.['Properties'] as Record<
    string,
    Record<string, Record<string, unknown>>
  >
  const updaterServiceName = updaterProps['Environment']?.['Variables']?.['POWERTOOLS_SERVICE_NAME']

  const profiles = [
    { profile: 'STUB', prefix: 'Stub', condition: 'StubAlarmsEnabled' },
    { profile: 'UAT', prefix: 'Uat', condition: 'UatAlarmsEnabled' },
    { profile: 'LIVE', prefix: 'Live', condition: 'LiveAlarmsEnabled' }
  ]

  describe.each(profiles)('$profile', ({ profile, prefix, condition }) => {
    const expectedDimensions = [
      { Name: 'service', Value: updaterServiceName },
      { Name: 'endpoint_profile', Value: profile }
    ]

    describe(`${prefix}BankListNotUpdatedAlarm`, () => {
      const alarm = resources[`${prefix}BankListNotUpdatedAlarm`]!
      const props = alarm['Properties'] as Record<string, unknown>
      const metrics = props['Metrics'] as Record<string, unknown>[]

      it(`has ${condition} condition`, () => {
        expect(alarm['Condition']).toBe(condition)
      })

      it(`monitors bank_list_updated for the ${profile} profile`, () => {
        const updates = metrics.find((m) => m['Id'] === 'updates')!
        expect(updates['ReturnData']).toBe(false)
        expect(updates['MetricStat']).toEqual({
          Metric: {
            Namespace: 'CriIdentifier',
            MetricName: 'bank_list_updated',
            Dimensions: expectedDimensions
          },
          Period: 900,
          Stat: 'Sum'
        })
      })

      it('fills missing data as 0 so gaps are evaluated as breaching periods', () => {
        const updatesOrZero = metrics.find((m) => m['Id'] === 'updatesOrZero')!
        expect(updatesOrZero['ReturnData']).toBe(true)
        expect(updatesOrZero['Expression']).toBe('FILL(updates, 0)')
      })

      it('alarms after 2 hours with no updates', () => {
        expect(props['EvaluationPeriods']).toBe(8)
        expect(props['DatapointsToAlarm']).toBe(8)
        expect(props['Threshold']).toBe(1)
        expect(props['ComparisonOperator']).toBe('LessThanThreshold')
      })

      it('has TreatMissingData set to breaching', () => {
        expect(props['TreatMissingData']).toBe('breaching')
      })

      it('has AlarmActions and OKActions configured', () => {
        expect(props['AlarmActions']).toBeDefined()
        expect(props['OKActions']).toBeDefined()
      })
    })

    describe(`${prefix}BankListSizeDropAlarm`, () => {
      const alarm = resources[`${prefix}BankListSizeDropAlarm`]!
      const props = alarm['Properties'] as Record<string, unknown>
      const metrics = props['Metrics'] as Record<string, unknown>[]

      it(`has ${condition} condition`, () => {
        expect(alarm['Condition']).toBe(condition)
      })

      it(`monitors bank_list_size for the ${profile} profile`, () => {
        const size = metrics.find((m) => m['Id'] === 'size')!
        expect(size['MetricStat']).toEqual(
          expect.objectContaining({
            Metric: {
              Namespace: 'CriIdentifier',
              MetricName: 'bank_list_size',
              Dimensions: expectedDimensions
            }
          })
        )
      })

      it('alarms on a drop of more than 10%', () => {
        const change = metrics.find((m) => m['Id'] === 'change')!
        expect(change['ReturnData']).toBe(true)
        expect(change['Expression']).toBe('100 * DIFF(size) / (size - DIFF(size))')
        expect(props['Threshold']).toBe(-10)
        expect(props['ComparisonOperator']).toBe('LessThanThreshold')
      })

      it('has TreatMissingData set to notBreaching', () => {
        expect(props['TreatMissingData']).toBe('notBreaching')
      })

      it('has AlarmActions configured', () => {
        expect(props['AlarmActions']).toBeDefined()
      })
    })

    describe(`${prefix}BankListEmptyAlarm`, () => {
      const alarm = resources[`${prefix}BankListEmptyAlarm`]!
      const props = alarm['Properties'] as Record<string, unknown>

      it(`has ${condition} condition`, () => {
        expect(alarm['Condition']).toBe(condition)
      })

      it(`monitors bank_list_size for the ${profile} profile`, () => {
        expect(props['Namespace']).toBe('CriIdentifier')
        expect(props['MetricName']).toBe('bank_list_size')
        expect(props['Dimensions']).toEqual(expectedDimensions)
      })

      it('alarms when the bank list size is 0', () => {
        expect(props['Statistic']).toBe('Maximum')
        expect(props['Period']).toBe(60)
        expect(props['EvaluationPeriods']).toBe(1)
        expect(props['DatapointsToAlarm']).toBe(1)
        expect(props['Threshold']).toBe(1)
        expect(props['ComparisonOperator']).toBe('LessThanThreshold')
      })

      it('has TreatMissingData set to notBreaching', () => {
        expect(props['TreatMissingData']).toBe('notBreaching')
      })

      it('has AlarmActions and OKActions configured', () => {
        expect(props['AlarmActions']).toBeDefined()
        expect(props['OKActions']).toBeDefined()
      })
    })
  })
})

describe('template.yaml LambdaErrors alarm', () => {
  const props = resources['LambdaErrors']?.['Properties'] as Record<string, unknown>

  it('has AlarmsEnabled condition', () => {
    expect(resources['LambdaErrors']?.['Condition']).toBe('AlarmsEnabled')
  })

  it('monitors Lambda Errors metric', () => {
    expect(props['Namespace']).toBe('AWS/Lambda')
    expect(props['MetricName']).toBe('Errors')
  })

  it('has TreatMissingData set to notBreaching', () => {
    expect(props['TreatMissingData']).toBe('notBreaching')
    expect(props['ComparisonOperator']).toBe('GreaterThanThreshold')
  })

  it('has AlarmActions and OKActions configured', () => {
    expect(props['AlarmActions']).toBeDefined()
    expect(props['OKActions']).toBeDefined()
  })
})

describe('template.yaml APIGW5XXErrors alarm', () => {
  const props = resources['APIGW5XXErrors']?.['Properties'] as Record<string, unknown>

  it('has AlarmsEnabled condition', () => {
    expect(resources['APIGW5XXErrors']?.['Condition']).toBe('AlarmsEnabled')
  })

  it('has TreatMissingData set to notBreaching', () => {
    expect(props['TreatMissingData']).toBe('notBreaching')
    expect(props['ComparisonOperator']).toBe('GreaterThanThreshold')
  })

  it('has AlarmActions and OKActions configured', () => {
    expect(props['AlarmActions']).toBeDefined()
    expect(props['OKActions']).toBeDefined()
  })

  it('aggregates metrics across public and private APIs', () => {
    const metrics = props['Metrics'] as Record<string, unknown>[]
    const metricIds = metrics.map((m) => m['Id'])
    expect(metricIds).toContain('m1')
    expect(metricIds).toContain('m2')
    const apiNames = metrics
      .filter((m) => m['MetricStat'])
      .map(
        (m) =>
          ((m['MetricStat'] as Record<string, unknown>)['Metric'] as Record<string, unknown>)[
            'Dimensions'
          ]
      )
      .flat() as Record<string, string>[]
    const names = apiNames
      .filter((d) => d['Name'] === 'ApiName')
      .map((d) => d['Value'])
      .filter((v): v is string => v !== undefined)
    expect(names.some((n) => n.includes('PublicOpenBankingAPI'))).toBe(true)
    expect(names.some((n) => n.includes('PrivateOpenBankingAPI'))).toBe(true)
  })
})

const canaryAlarms = [
  { name: 'IssueCredentialFunctionCanaryErrors', functionRef: 'IssueCredentialFunction' },
  { name: 'IssueCredentialFunctionCanary5xxErrors', resource: '/credential/issue' },
  { name: 'ConsentsFunctionCanaryErrors', functionRef: 'ConsentsFunction' },
  { name: 'ConsentsFunctionCanary5xxErrors', resource: '/consents' },
  { name: 'BankListRetrieverFunctionCanaryErrors', functionRef: 'BankListRetrieverFunction' },
  { name: 'BankListRetrieverFunctionCanary5xxErrors', resource: '/banks' }
]

describe.each(canaryAlarms)('template.yaml canary alarms', ({ name, functionRef, resource }) => {
  const alarm = resources[name]!
  const props = alarm['Properties'] as Record<string, unknown>
  const dimensions = props['Dimensions'] as Record<string, unknown>[]

  it('has UseCanaryDeploymentAlarms condition', () => {
    expect(alarm['Condition']).toBe('UseCanaryDeploymentAlarms')
  })

  it('alarms after 2 out of 3 periods with threshold of 1', () => {
    expect(props['Period']).toBe(60)
    expect(props['EvaluationPeriods']).toBe(3)
    expect(props['DatapointsToAlarm']).toBe(2)
    expect(props['Threshold']).toBe(1)
    expect(props['ComparisonOperator']).toBe('GreaterThanOrEqualToThreshold')
  })

  it('has TreatMissingData set to notBreaching', () => {
    expect(props['TreatMissingData']).toBe('notBreaching')
  })

  it('has AlarmActions and OKActions configured', () => {
    expect(props['AlarmActions']).toBeDefined()
    expect(props['OKActions']).toBeDefined()
  })

  it('has correct namespace and dimensions', () => {
    if (functionRef) {
      expect(props['Namespace']).toBe('AWS/Lambda')
      expect(dimensions.find((d) => d['Name'] === 'ExecutedVersion')).toBeDefined()
    } else {
      expect(props['Namespace']).toBe('AWS/ApiGateway')
      expect(dimensions.find((d) => d['Name'] === 'Resource')?.['Value']).toBe(resource)
    }
  })
})

describe('template.yaml globals', () => {
  const globals = template['Globals'] as Record<string, Record<string, unknown>>

  it('sets Function runtime to nodejs24.x', () => {
    expect(globals['Function']?.['Runtime']).toBe('nodejs24.x')
  })

  it('enables X-Ray tracing', () => {
    expect(globals['Function']?.['Tracing']).toBe('Active')
  })

  it('sets required environment variables', () => {
    const envVars = (
      globals['Function']?.['Environment'] as Record<string, Record<string, unknown>>
    )?.['Variables']
    const schema = z.object({
      AWS_LAMBDA_EXEC_WRAPPER: z.string(),
      AWS_STACK_NAME: z.unknown(),
      ENVIRONMENT: z.unknown(),
      PARAMETER_PREFIX: z.unknown(),
      POWERTOOLS_LOG_LEVEL: z.string(),
      POWERTOOLS_METRICS_NAMESPACE: z.unknown()
    })
    expect(schema.safeParse(envVars).success).toBe(true)
  })
})
