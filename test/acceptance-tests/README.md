# Acceptance Tests

End-to-end API acceptance tests for the Open Banking Credential Issuer API. Tests run against a deployed environment and verify the full behaviour of each endpoint.

## Tooling

| Tool                                                                             | Purpose                                                     |
|----------------------------------------------------------------------------------|-------------------------------------------------------------|
| [Cucumber.js](https://github.com/cucumber/cucumber-js)                           | BDD test runner — feature files drive test execution        |
| [TypeScript](https://www.typescriptlang.org/)                                    | All step definitions and clients are written in TypeScript  |
| [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)            | Signs requests to the test harness via SigV4                |
| [Node.js `fetch`](https://nodejs.org/en/blog/announcements/v21-release-announce) | HTTP client used by all API clients                         |
| Docker                                                                           | `test.Dockerfile` packages the tests for pipeline execution |


## Configuration

Tests run against a deployed CloudFormation stack and require some configuration from your environment:

### Environment Variable Reference

| Variable               | Required | Default     | Description                                                                                    |
|------------------------|----------|-------------|------------------------------------------------------------------------------------------------|
| `PUBLIC_API_BASE_URL`  | Yes      | —           | Public base URL for the Open Banking API (`/token`,`/consents`, `/credential/issue`, `/banks`) |
| `PRIVATE_API_BASE_URL` | Yes      | —           | Base URL for OAuth endpoints (`/session`, `/authorization`)                                    |
| `TEST_HARNESS_URL`     | Yes      | —           | URL of the test harness `/start` endpoint used to create session JWTs                          |
| `AWS_REGION`           | No       | `eu-west-2` | AWS region to use                                                                              |
| `ENVIRONMENT`          | Yes      | —           | Value of the 'Environment' parameter for deployed API stack. Builds the consent `return_url`   |

You can provide this configuration in a number of ways:

### Option 1. Local `.env` file

Copy `.env.example` to `.env` in this directory and fill in the blanks with the stack you want to run the tests against

```bash
cp test/acceptance-tests/.env.example test/acceptance-tests/.env
```

### Option 2. CloudFormation stack outputs

The `run-tests.sh` script fetches the configuration directly from a deployed stack (`SAM_STACK_NAME`)

| Variable               | Source                                                     |
|------------------------|------------------------------------------------------------|
| `PUBLIC_API_BASE_URL`  | `PublicApiBaseUrl` output of the api stack                 |
| `PRIVATE_API_BASE_URL` | `PrivateApiBaseUrl` output of the api stack                |
| `TEST_HARNESS_URL`     | `TestHarnessExecuteUrl` output of the test-resources stack |
| `ENVIRONMENT`          | `Environment` parameter of the api stack                   |

## Running Tests

### Locally

With a `.env` in this directory (or the variables exported some other way):

```bash
aws sso login --profile <profile>
AWS_PROFILE=<profile> npm run test:api
```

Or let the `run-tests.sh` script resolve everything from a deployed stack for you:

```bash
aws sso login --profile <profile>
AWS_PROFILE=<profile> SAM_STACK_NAME=<stack-name> ./test/acceptance-tests/run-tests.sh
```

### In CodePipeline

Tests are packaged using `test.Dockerfile` and executed automatically as part of the deployment pipeline.

## Quality Gate Tags

All scenarios must be tagged appropriately. Tags control which tests run in each pipeline stage.

| Tag                           | When to use                                                   |
|-------------------------------|---------------------------------------------------------------|
| `@QualityGateIntegrationTest` | All API tests                                                 |
| `@QualityGateSmokeTest`       | Essential functionality verified in build and staging         |
| `@QualityGateRegressionTest`  | Live features running in the pipeline                         |
| `@QualityGateNewFeatureTest`  | In-development features not yet live                          |

When a feature goes live, `@QualityGateNewFeatureTest` must be updated to `@QualityGateRegressionTest`. To make this easy, place in-development tests in their own feature file so the tag can be updated at the `Feature` level. Add a TODO comment referencing the clean-up ticket.
