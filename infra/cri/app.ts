import { App } from 'aws-cdk-lib'

export type CriAppConfig = {
  outdir?: string // where the cloud assembly is written to
}

export const criApp = (config: CriAppConfig = {}) =>
  new App({
    analyticsReporting: false,
    builtinCloudFormationValidation: false,
    context: { 'aws:cdk:enable-path-metadata': false },
    ...(config.outdir && { outdir: config.outdir })
  })
