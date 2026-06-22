export interface ConfigProvider {
  getConfig: (parameterPath: string) => Promise<Record<string, string>>
}
