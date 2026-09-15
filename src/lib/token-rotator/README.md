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

`credentials` is passed into the `rotate` function when the library calls it during a rotation event. The library loads credentials via a consumer credential provider implementing the [CredentialsProvider](./model/credentials-provider.ts) interface. This is generic over the consumer's profile type, e.g. `CredentialsProvider<Profile>`.

Consumers then build the token rotator function handler. The library is generic over a consumer-defined profile type. For example:

```ts
type Profile = 'STUB' | 'UAT' | 'LIVE'

const myProvider: CredentialsProvider<Profile> = {...}

const tokenRotatorHandler = createTokenRotator<Profile>(
  {
    profiles: ['STUB', 'UAT'],
    refreshWindowSeconds: 600
  },
  {
    credentialsProvider: myProvider,                     // consumer provided
    tokenRepository: createDynamoTokenRepository({...}), // library provided
    tokenRotationStrategy: myTokenStrategy               // consumer provided
  }
)
```

Consumers can use the library-provided Dynamo adapter or roll their own.

This handler can then be deployed as a Lambda (alongside a suitable database table) on a ScheduledRotation as a fully asynchronous access token life cycle manager

### Configuration

The library does not read from environment variables directly — consumers are expected to build a `TokenRotationServiceConfig` in their own composition root and hand it to `createTokenRotator`. This keeps env-var names and validation rules with the consuming Lambda rather than the library.

`TokenRotationServiceConfig<TProfile>` fields:

| Field                   | Description                                                                                                                                                                                                                        |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `profiles`              | List of consumer-defined profiles the token rotator will store tokens against. At least one must be provided.                                                                                                                       |
| `refreshWindowSeconds`  | The number of seconds **before** a token expires that the rotator will begin attempting to rotate the token. This value should be **greater** than your Lambda invocation interval + the 30 second read pad, ideally significantly larger. |

The library exports a helper for parsing the refresh window from a raw string:

```ts
import { parseRefreshWindowSeconds } from '@lib/token-rotator/util/parse-refresh-window'
const refreshWindowSeconds = parseRefreshWindowSeconds(process.env.MY_REFRESH_WINDOW!)
```

This helper enforces that the value is a positive number greater than the library's 30s read-expiry pad. Use it in your composition root so that a misconfiguration fails at cold start.

### Retrieving a token

Consumers create a `tokenRetrievalService`, passing in the required `TokenRepository`:

```ts
const tokenRetrievalService = createTokenRetrievalService<Profile>({
  tokenRepository: createDynamoTokenRepository({...}) // if using library provided Dynamo adapter
})

const accessToken = await tokenRetrievalService.retrieveToken(profile) // profile tells the retrieval service which token to return
```

`accessToken` in this example will be the token value or `undefined` if there is no token available for the requested profile (missing or expired)

## Test data strategy

The token rotator is intended to store tokens under separate profiles named by the consumer. Consider the following example:

As a consumer I want to create a token rotator that cycles tokens for the `STUB` and `UAT` profiles

I create a `tokenRotator` with the following configuration:
- `profiles`: `['STUB', 'UAT']`
- `refreshWindowSeconds`: `600`

The rotation service will now call the `rotate` function from the provided strategy twice (once per configured profile), passing in the credentials the `CredentialsProvider` returned for that profile.

The rotation service stores each returned token in the provided `dynamoTokenRepository`. Each token entity includes the profile as `id`, `tokenValue` and `ttl` (token expiry)

On each scheduled invocation of the `tokenRotator` Lambda, the rotation service checks the `ttl` of a stored token for each configured profile.

If the token is still fresh no action is taken.

If the token is inside the refresh window (10 minutes or sooner before expiry in this example) then the rotation service will attempt to rotate the token.

If a token rotation fails for a profile, it does not prevent other profiles from rotating. Each failed profile is reported via an `AggregateRotationError`.

Failed profiles will be reattempted on the next Lambda invocation.

Configuring multiple profiles for your rotator function allows you to store tokens from more than one place.
