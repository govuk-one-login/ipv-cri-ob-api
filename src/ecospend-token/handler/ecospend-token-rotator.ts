import { ecospendTokenRotation } from '@src/ecospend-token/service/ecospend-token-rotation'
import { createTokenRotator } from '@src/token-rotator/handler/token-rotator'

export const handler = createTokenRotator({ tokenRotationStrategy: ecospendTokenRotation })
