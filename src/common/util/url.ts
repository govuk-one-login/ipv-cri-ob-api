const PROTOCOL_PATTERN = /^https?:\/\//i

export const parseUrl = (domainOrUrl: string): URL => {
  const candidate = PROTOCOL_PATTERN.test(domainOrUrl) ? domainOrUrl : `https://${domainOrUrl}`
  return new URL(candidate)
}
