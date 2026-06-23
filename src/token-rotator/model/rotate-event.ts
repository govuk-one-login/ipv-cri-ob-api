import type { ProviderCredentials } from '@src/token-rotator/model/provider-credentials'
import type { TokenProfile } from '@src/token-rotator/model/token-profile'
import type { ScheduledEvent } from 'aws-lambda'

export interface OverrideRotateEvent {
  override: {
    credentials: ProviderCredentials
    profile: TokenProfile
  }
}

export type RotateEvent = OverrideRotateEvent | ScheduledEvent
