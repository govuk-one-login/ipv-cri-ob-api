import type {
  PersonIdentityItem,
  PersonIdentityName,
  PersonIdentityNamePart
} from '@govuk-one-login/cri-types'
import type {
  CheckDetailsClass,
  IdentityCheckClass,
  IdentityCheckCredentialJWTClass,
  NameClass,
  NamePartClass
} from '@govuk-one-login/data-vocab/credentials'
import type { IdentityScore } from '@src/issue-credential/model/identity-score'
import type { JwtEnvelopeClaims } from '@src/issue-credential/service/jwt-envelope-generator'

export interface VerifiableCredentialBuilder {
  build: (inputs: VerifiableCredentialInputs) => IdentityCheckCredentialJWTClass
}

interface VerifiableCredentialInputs {
  envelope: JwtEnvelopeClaims
  identityScore: IdentityScore
  personDetails: PersonIdentityItem
}

// TODO: confirm mapping. example VC payloads ("data" carries identityCheckPolicy: "none", "auth" does not)
const toCheckDetails = (method: string): CheckDetailsClass => {
  if (method === 'data') return { checkMethod: 'data', identityCheckPolicy: 'none' }
  if (method === 'auth') return { checkMethod: 'auth' }
  throw new Error(`Unexpected check method: "${method}"`)
}

const isNamePartType = (value: string): value is NamePartClass['type'] =>
  value === 'GivenName' || value === 'FamilyName'

const toNamePart = (part: PersonIdentityNamePart): NamePartClass => {
  if (!isNamePartType(part.type)) {
    throw new Error(`Unexpected name part type: "${part.type}"`)
  }
  return { type: part.type, value: part.value }
}

const toNameClass = (name: PersonIdentityName): NameClass => ({
  nameParts: name.nameParts.map(toNamePart)
})

const toEvidence = (score: IdentityScore): IdentityCheckClass => ({
  checkDetails: score.checkDetails.map(toCheckDetails),
  ci: score.contraIndicators,
  failedCheckDetails: score.failedCheckDetails.map(toCheckDetails),
  strengthScore: score.strengthScore,
  txn: score.transactionId, // TODO confirm this
  type: 'IdentityCheck',
  validityScore: score.validityScore,
  verificationScore: score.verificationScore
})

export const verifiableCredentialBuilder: VerifiableCredentialBuilder = {
  build: ({ envelope, identityScore, personDetails }) => ({
    ...envelope,
    vc: {
      credentialSubject: {
        ...(personDetails.birthDates && { birthDate: personDetails.birthDates }),
        ...(personDetails.names && { name: personDetails.names.map(toNameClass) })
      },
      evidence: [toEvidence(identityScore)],
      type: ['VerifiableCredential', 'IdentityCheckCredential']
    }
  })
}
