import type { CfnApi, CfnFunction } from 'aws-cdk-lib/aws-sam'

import { Fn, Token } from 'aws-cdk-lib'

// SAM generates these resources from the function or API they belong to. Their logical IDs are SAM
// conventions, so this is the only place that builds them

export const functionAlias = (fn: CfnFunction) => Fn.ref(`${fn.node.id}.Alias`)

export const functionVersionNumber = (fn: CfnFunction) =>
  Token.asString(Fn.getAtt(`${fn.node.id}.Version`, 'Version'))

export const apiStageLogicalId = (api: CfnApi) => `${api.node.id}Stage`
