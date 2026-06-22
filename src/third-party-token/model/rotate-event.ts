import type { ConfigProfileName } from '@src/third-party-token/model/config-profile'
import type { ScheduledEvent } from 'aws-lambda'

export interface ManualRotateEvent {
  override: {
    overrideConfig: Record<string, string>
    profile: ConfigProfileName
  }
}

export type RotateEvent = ManualRotateEvent | ScheduledEvent
