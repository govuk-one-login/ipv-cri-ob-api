export interface IdentityScore {
  checkDetails: string[]
  contraIndicators: string[]
  failedCheckDetails: string[]
  sessionId: string
  strengthScore: number
  transactionId: string
  ttl: number
  validityScore: number
  verificationScore: number
}

/*
https://app.diagrams.net/#G1VLWZsuS0ls2tRelEeMCCrduR1A03gcSX#%7B%22pageId%22%3A%22q4uBfRjliLbojvnuu4x8%22%7D
{
  "sessionId": {
    "S": "8aec4af1-f3ef-467c-b97f-40167cbeb224"
  },
  "checkDetails": {
    "L": [
      {
        "S": "data"
      },
      {
        "S": "auth"
      }
    ]
  },
  "contraIndicators": {
    "L": [
      {
        "S": "P02"
      }
    ]
  },
  "failedCheckDetails": {
    "L": []
  },
  "strengthScore": {
    "N": "2"
  },
  "validityScore": {
    "N": "2"
  },
  "verificationScore": {
    "N": "2"
  },
  "transactionId": {
    "S": "RB000084397223"
  },
  "ttl": {
    "N": "1776684322"
  }
}
 */
