# Construct rules

This doc spells out the general principles adhered to when writing infrastructure constructs and features in this repo.

The goal is for anyone who knows CloudFormation to be able to read, use and write one without learning a framework.

## 1. A construct is a function

```ts
export const criDynamoTable = (stack: CriStack, id: string, config: CriDynamoTableConfig): CfnTable => …
```

- Signature is `(stack, id, config) => handle`.
- `id` is the logical ID. Keep it readable, it's what shows in the console and stack events.
- Config type is named `<Construct>Config` and the parameter is `config`.
- Anything that adds resources to the template is named for its layer: `criDynamoTable`,
  `criCanaryDeployment`, `limeEndpointProfiles`, with types to match (`CriDynamoTableConfig`).
  Helpers that only compute values aren't prefixed (`functionAlias`, `tableAccess`,
  `parameterReadPolicy`), nor are types for values rather than resources (`ApiRoute`,
  `AlarmSeverity`). Features are named after what they are (`bankList`).

## 2. It creates one thing

A construct creates the resource it's named after (and any parts that have no meaning on
their own e.g. a function's log group).

If a resource could reasonably exist without the other, it's a separate construct. You should be
able to tell everything a construct adds to the template by reading the callsite.

The exception is a supporting resource that every use shares, such as the CodeDeploy role, the
access log KMS key, or a condition only one construct needs. The construct that needs it creates it
on first use with `findOrCreate`, so it exists only when something uses it.

## 3. It encapsulates common patterns

The point of a construct is the decisions callers no longer make: encryption, billing mode,
point-in-time recovery in production, which topic an alarm severity notifies, naming. These are decided in one place,
inside the construct.

Don't expose a setting just because CloudFormation has one. Add a config field only when it is needed.

## 4. Config uses known concepts

- Our (Identity) vocab for things we've made decisions about: `partitionKey`, `ttlAttribute`, `severity`.
- Plain passthrough for everything else:

  ```ts
  export type CriAlarmConfig = {
    condition: CfnCondition
    description: string
    name: string
    severity: AlarmSeverity
  } & Pick<CfnAlarmProps, 'comparisonOperator' | 'evaluationPeriods' | 'threshold' | …>
  ```

- camelCase throughout, never raw PascalCase CloudFormation objects. IAM policy documents are the
  exception: they keep IAM's own PascalCase (`Action`, `Effect`, `Resource`) everywhere.
- Derive what can be derived rather than asking for it twice.

## 5. Optional behaviour is a separate function, not a flag

No booleans that switch on resources from another area (`audit: true`, `invokedByApiGateway: true`).
Optional behaviour comes in two kinds:

- **Attachments** add separate resources and take the handle:
  `criCanaryDeployment(stack, fn, route)`, `criApiInvokePermission(stack, fn, api)`,
  `criThrottleAlarm(stack, fn)`, `criDeploymentCheck(stack, fn, config)`.
  An attachment may also set the handle's properties directly (`fn.resource.deploymentPreference = …`)
- **Bundles** change a resource's own config. They return config fragments that are spread into
  the matching fields, so nothing is overwritten:

  ```ts
  const audit = auditProducer(stack)
  criFunction(stack, 'IssueCredentialFunction', {
    environment: { ...audit.environment, JWT_TTL_SECONDS: '7200' },
    policies: [...audit.policies, …],
    …
  })
  ```

A feature then reads as a list of what each resource is.

SAM event sources are part of the function's own definition, so they're config rather than
attachments: `schedule: 'rate(1 minute)'` adds the function's `Schedule` event.

## 6. It returns a handle

Return the L1 the caller would have written by hand. When a construct creates inseparable parts
that callers need (log group, alias, version), return a small typed object (bag) holding them,
with the L1 as `resource`: `CriFunction` is
`{ alias, metricsNamespace, name, resource, serviceName, version }`.

Attachments read what they need from the bag rather than deriving it from the L1. A value a
construct decided, such as a function's name, is then always there, and nothing falls back to a
`Ref` that could make a dependency cycle.

## 7. No logical-ID strings outside one module

Never reference a resource by building its logical ID as a string (`` `${id}.Alias` ``,
`` `${api.node.id}Stage` ``). SAM's generated resources are reached through one module that owns
those conventions, and everything else passes handles.

The **only** exception is the OpenAPI files, which refer to resources by logical ID as SAM expects.

Stack parameters are referred to by name in `Fn.sub` (`${Environment}`, `${CriIdentifier}`), as
CloudFormation readers expect. They're declared once in `cri/stack-parameters.ts`.

## 8. Narrow dependencies

Take `stack` as the CDK scope and read only what you need from it. If a construct needs something
specific, prefer passing it in config over reaching into the stack.

Don't add to `CriStack`. A resource is created where it's used, not eagerly on the stack. The stack
holds only what every construct reads: the CRI's name, its support manual URL (which every alarm
links), parameters, stack-wide conditions, the environment mapping, the parameter prefix and the
permissions boundary.

Features take `CriStack` and receive what they share with other features (endpoint profiles,
tables, APIs, oauth-common) as `collaborators`, so `stack.ts` shows every dependency.

## 9. External contracts live at stack level

Outputs, exports and SSM parameter paths that other systems read are contracts. Declare them in
one place at stack level, never inside a construct, so changing one is a visible decision.

## 10. Layers

| Layer           | Contains                                                                  | May import      |
|-----------------|---------------------------------------------------------------------------|-----------------|
| `cri/`          | programme-wide constructs: stack, parameters, table, alarm, function, API | libraries only  |
| `lime/`         | team conventions: e.g. endpoint profiles                                  | `cri/`          |
| `open-banking/` | this CRI's features and environment config                                | `cri/`, `lime/` |

Every layer may also import libraries (`aws-cdk-lib`, `constructs`, `yaml`, `node:*`).

`cri/` is intended to be what other teams adopt, so nothing Lime-specific goes in it.

## 11. Tested on its own

Each construct has a test that synthesises it independently and checks its policy with CDK
`Template` assertions. Features are covered by the synthesised stack.
