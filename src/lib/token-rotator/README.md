## Token Rotator

This library's purpose is to enable a consumer to easily do the following:

- request access tokens from a third party API
- store tokens in a database
- automatically rotate tokens when they are nearing expiry
- retrieve tokens for use in other systems
- assign tokens to profiles to enable test data strategy

### How does it work?

Consumers provide a strategy that implements the [TokenRotationStrategy](./model/token-rotation-strategy.ts) interface.

The rotate function returns `tokenValue` and `expiresAtSeconds`.

```ts
export const myTokenStrategy: TokenRotationStrategy = {
  rotate: async (credentials) => {
    // ...
    // use `credentials` to call a third party API for a reusable access token
    // return the token and its expiry back to the library for storage
    // ...
  }
}
```

`credentials` is passed into the `rotate` function when the library calls it during a rotation event. The library looks up credentials via the chosen `credentialsProvider`

Consumers then build the token rotator function handler:

```ts
const tokenRotatorHandler = createTokenRotator(
  loadTokenRotatorConfigFromEnv(),               // library provided
  {
    credentialsProvider: ssmCredentialsProvider, // library provided
    tokenRepository: dynamoTokenRepository,      // library provided
    tokenRotationStrategy: myTokenStrategy       // consumer provided
  }
)
```

This handler can then be deployed as a Lambda (alongside a DynamoDB table) with a suitable ScheduledRotation as a fully asynchronous access token life cycle manager

### Environment Variables

The following environment values must be present in the Lambda runtime for the handler to load via `loadTokenRotatorConfigFromEnv()`

| Environment variable                   | Description                                                                                                                                                     | Required |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `TOKEN_ROTATOR_DB_TABLE_NAME`          | The name of the database table the token rotator will use to store tokens                                                                                       | Yes      |
| `TOKEN_ROTATOR_PROFILES`               | A pipe delimited list of profiles the token rotator will store tokens against, at least one profile must be provided. Available profiles: `STUB`, `UAT`, `LIVE` | Yes      |
| `TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS` | The number of seconds **before** a token expires that the rotator will begin attempting to rotate the token                                                     | Yes      |
| `TOKEN_ROTATOR_CREDENTIALS_PATH`       | Path prefix used by the selected credentials provider to look up parameters.                                                                                    | Yes      |

### Retrieving a token

Consumers create a `tokenRetrievalService`, passing in the required `TokenRepository`:

```ts
const tokenRetrievalService = createTokenRetrievalService({
  tokenRepository: dynamoTokenRepository
})

const accessToken = await tokenRetrievalService.retrieveToken(profile) // profile (STUB,UAT,LIVE) tells the retrieval service which token to return
```

`accessToken` in this example will be the token value or `undefined` if there is no token available for the requested profile (missing or expired)

## Test data strategy

The token rotator is intended to store tokens under separate profiles. The available profiles are:

- STUB
- UAT
- LIVE

Consider the following example:

As a consumer I want to create a token rotator that cycles tokens for the `TEST` and `UAT` profiles

I create a `tokenRotator` with the following env configuration:

- `TOKEN_ROTATOR_PROFILES`: `STUB|UAT`
- `TOKEN_ROTATOR_CREDENTIALS_PATH`: `/my-stack-name/my-awesome-token-rotator`
- `TOKEN_ROTATOR_REFRESH_WINDOW_SECONDS`: `600`

If the `ssmCredentialsProvider` is chosen when creating the `tokenRotator`, the rotation service will look up credentials from SSM in the following locations:

- `/my-stack-name/my-awesome-token-rotator/STUB/*`
- `/my-stack-name/my-awesome-token-rotator/UAT/*`

The rotation service will now call the `rotate` function from the provided strategy twice, passing in the credentials loaded from SSM using the configured profiles.

The rotation service stores each returned token in the provided `tokenRepository`. Each token entity includes the `profile`, `tokenValue` and `ttl` (token expiry)

On each scheduled invocation of the `tokenRotator` Lambda, the rotation service checks the `ttl` of a stored token for each configured profile.

If the token is still fresh no action is taken.

If the token is inside the refresh window (10 minutes or sooner before expiry in this example) then the rotation service will attempt to rotate the token.

If a token rotation fails for a profile, it does not prevent other profiles from rotating. Each failed profile is reported via an `AggregateRotationError`.

Failed profiles will be reattempted on the next Lambda invocation.

Configuring multiple profiles for your rotator function allows you to store tokens from more than one place.
