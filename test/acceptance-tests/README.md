# Acceptance Tests

End-to-end API acceptance tests for the Open Banking Credential Issuer API. Tests run against a deployed environment and verify the full behaviour of each endpoint.

## Tooling

| Tool                                                                              | Purpose                                                       |
|-----------------------------------------------------------------------------------|---------------------------------------------------------------|
| [Cucumber.js](https://github.com/cucumber/cucumber-js)                            | BDD test runner — feature files drive test execution          |
| [TypeScript](https://www.typescriptlang.org/)                                     | All step definitions and clients are written in TypeScript    |
| [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)             | Signs requests to the headless core stub via SigV4            |
| [Node.js `fetch`](https://nodejs.org/en/blog/announcements/v21-release-announce)  | HTTP client used by all API clients                           |
| Docker                                                                            | `test.Dockerfile` packages the tests for pipeline execution   |


## Configuration

Tests are configured via environment variables. There are three ways to provide them:

### 1. Local `.env` file (recommended for local runs)

Create a `.env` file in the `acceptance-tests/` directory:

```bash
PUBLIC_API_BASE_URL=https://<public-api-id>.execute-api.eu-west-2.amazonaws.com/<env>/
PRIVATE_API_BASE_URL=https://<private-api-id>.execute-api.eu-west-2.amazonaws.com/<env>/
CORE_STUB_URL=https://test-resources.review-ob.<env>.account.gov.uk
AWS_REGION=eu-west-2
```

`run-tests.sh` will automatically source this file if it exists.

### 2. CloudFormation stack outputs (for pipeline runs / deployed environments)

When no `.env` file is present and `STACK_NAME` is not `local`, `run-tests.sh` fetches configuration from the deployed stack:

| Variable                            | Source                                                     |
|-------------------------------------|------------------------------------------------------------|
| `PUBLIC_API_BASE_URL`               | `PublicApiBaseUrl` output of the api stack                 |
| `PRIVATE_API_BASE_URL`              | `PrivateApiBaseUrl` output of the api stack                |
| `CORE_STUB_URL`                     | `TestHarnessExecuteUrl` output of the test-resources stack |

`STACK_NAME` is taken from `SAM_STACK_NAME`, falling back to `local`.

### 3. Local sandbox (no config)

If no `.env` file exists and `STACK_NAME` is `local`, tests run against `http://localhost:3000` with no authentication required.

### Environment Variable Reference

| Variable                  | Required        | Default                 | Description                                                                                    |
|---------------------------|-----------------|-------------------------|------------------------------------------------------------------------------------------------|
| `PUBLIC_API_BASE_URL`     | No              | `http://localhost:3000` | Public base URL for the Open Banking API (`/token`,`/consents`, `/credential/issue`, `/banks`) |
| `PRIVATE_API_BASE_URL`    | Yes (non-local) | —                       | Base URL for OAuth endpoints (`/session`, `/authorization`)                                    |
| `CORE_STUB_URL`           | Yes (non-local) | —                       | URL of the headless core stub used to create sessions                                          |
| `AWS_REGION`              | No              | `eu-west-2`             | AWS region used for SigV4 signing of core stub requests                                        |

## Running Tests

### Locally

```bash
# From the repo root
npm run test:api
```

Or directly via the run script from the `acceptance-tests/` directory:

```bash
./run-tests.sh
```

### In the pipeline

Tests are packaged using `test.Dockerfile` and executed automatically as part of the deployment pipeline. The Docker image installs dependencies and runs `run-tests.sh` as its entrypoint.

## Quality Gate Tags

All scenarios must be tagged appropriately. Tags control which tests run in each pipeline stage.

| Tag                           | When to use                                                   |
|-------------------------------|---------------------------------------------------------------|
| `@QualityGateIntegrationTest` | All API tests                                                 |
| `@QualityGateSmokeTest`       | Essential functionality verified in build and staging         |
| `@QualityGateRegressionTest`  | Live features running in the pipeline                         |
| `@QualityGateNewFeatureTest`  | In-development features not yet live                          |

When a feature goes live, `@QualityGateNewFeatureTest` must be updated to `@QualityGateRegressionTest`. To make this easy, place in-development tests in their own feature file so the tag can be updated at the `Feature` level. Add a TODO comment referencing the clean-up ticket.

## Shared Steps

Common assertion steps are defined in `steps/common-steps.ts` and can be reused across all feature files:

| Step                                                                            | Description                                   |
|---------------------------------------------------------------------------------|-----------------------------------------------|
| `the response status should be {int}`                                           | Assert HTTP status code                       |
| `the response body should have field {string}`                                  | Assert a top-level field exists               |
| `the response body should have all consent fields`                              | Assert all consent response fields            |
| `the response body field {string} should be {string}`                           | Assert a field equals a string value          |
| `the response body field {string} should be {int}`                              | Assert a field equals a numeric value         |
| `the response body field {string} should have key {string}`                     | Assert a nested key exists                    |
| `the response body field {string} should have key {string} with value {string}` | Assert a nested key contains a value          |
| `the response body should be empty`                                             | Assert empty response body                    |
| `the response body should be a valid JWT`                                       | Assert response is a 3-part JWT               |
