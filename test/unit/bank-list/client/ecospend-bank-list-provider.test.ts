import type { Mock } from 'vitest'

import { createEcospendBankListProvider } from '@src/bank-list/client/ecospend-bank-list-provider'
import { BanksEndpointProfile } from '@src/bank-list/model/bank-list'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ACCESS_TOKEN = 'test-access-token'
const CUSTOM_LIST = 'stub-banks'
const ENDPOINT_URL = 'https://provider.test/banks'

const rawRequestConfigWithCustomList = {
  'custom-list': CUSTOM_LIST,
  'endpoint-url': ENDPOINT_URL
}

const validBank = {
  bank_id: 'example-bank',
  friendly_name: 'Example Bank',
  is_sandbox: true,
  service_status: true
}

const successResponseBody = {
  data: [validBank],
  meta: {
    current_page: 1,
    total_count: 1,
    total_pages: 1
  }
}

const createSuccessResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200
  })

const stubFetch = (fetchMock: Mock = vi.fn()): Mock => {
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const createTestContext = () => {
  const retrieveToken = vi.fn().mockResolvedValue(ACCESS_TOKEN)
  const tokenRetrievalService = { retrieveToken }
  const provider = createEcospendBankListProvider({ tokenRetrievalService })

  return { provider, retrieveToken }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createEcospendBankListProvider', () => {
  it('requests and maps all banks from Ecospend', async () => {
    const fetchMock = stubFetch(
      vi.fn().mockResolvedValue(createSuccessResponse(successResponseBody))
    )
    const { provider, retrieveToken } = createTestContext()

    const result = await provider.getBanks(
      BanksEndpointProfile.STUB,
      rawRequestConfigWithCustomList
    )

    expect(retrieveToken).toHaveBeenCalledWith(BanksEndpointProfile.STUB)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(expect.any(Request))

    const [request] = fetchMock.mock.calls[0] as [Request]
    const url = new URL(request.url)

    expect(url.origin + url.pathname).toBe(ENDPOINT_URL)

    expect(Object.fromEntries(url.searchParams)).toEqual({
      country_iso_code: 'GB',
      custom_list: CUSTOM_LIST,
      division: 'Personal',
      fetchAllBanks: 'true',
      is_sandbox: 'true',
      standard: 'OBIE'
    })

    expect(request.method).toBe('GET')

    expect(Object.fromEntries(request.headers.entries())).toEqual({
      accept: 'application/json',
      authorization: `Bearer ${ACCESS_TOKEN}`,
      'accept-encoding': '',
      'accept-language': ''
    })

    expect(request.signal).toBeInstanceOf(AbortSignal)

    expect(result).toEqual([
      {
        bankId: 'example-bank',
        friendlyName: 'Example Bank',
        serviceStatus: true
      }
    ])
  })

  it.each([
    [BanksEndpointProfile.STUB, 'true'],
    [BanksEndpointProfile.UAT, 'true'],
    [BanksEndpointProfile.LIVE, 'false']
  ])('uses the correct sandbox filter for profile %s', async (profile, expectedSandbox) => {
    const fetchMock = stubFetch(
      vi.fn().mockResolvedValue(
        createSuccessResponse({
          data: [],
          meta: {
            current_page: 1,
            total_count: 0,
            total_pages: 1
          }
        })
      )
    )

    const { provider } = createTestContext()

    await provider.getBanks(profile, rawRequestConfigWithCustomList)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(expect.any(Request))

    const [request] = fetchMock.mock.calls[0] as [Request]
    const url = new URL(request.url)

    expect(url.searchParams.get('is_sandbox')).toBe(expectedSandbox)
  })

  it('omits custom_list when one is not configured', async () => {
    const fetchMock = stubFetch(
      vi.fn().mockResolvedValue(createSuccessResponse(successResponseBody))
    )
    const { provider } = createTestContext()

    await provider.getBanks(BanksEndpointProfile.STUB, { 'endpoint-url': ENDPOINT_URL })

    const [request] = fetchMock.mock.calls[0] as [Request]
    const url = new URL(request.url)

    expect(url.searchParams.has('custom_list')).toBe(false)
  })

  it('throws when the request config is missing endpoint-url', async () => {
    const fetchMock = stubFetch()
    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, { 'custom-list': CUSTOM_LIST })
    ).rejects.toThrow(/Invalid banks request config for STUB/)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not make a request when no token is available', async () => {
    const fetchMock = stubFetch()
    const { provider, retrieveToken } = createTestContext()

    retrieveToken.mockResolvedValue(undefined)

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow('No token is available for STUB')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when Ecospend returns an unsuccessful status', async () => {
    stubFetch(vi.fn().mockResolvedValue({ status: 502 } as unknown as Response))

    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow('Banks request returned 502 for STUB')
  })

  it('wraps fetch failures', async () => {
    stubFetch(vi.fn().mockRejectedValue(new Error('connection failed')))

    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow("Banks request failed for STUB: 'connection failed'")
  })

  it('wraps invalid JSON responses', async () => {
    stubFetch(
      vi.fn().mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Unexpected token <')),
        status: 200
      })
    )

    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow("Banks response for STUB was not valid JSON: 'Unexpected token <'")
  })

  it('throws when the response fails validation', async () => {
    stubFetch(vi.fn().mockResolvedValue(createSuccessResponse({ data: [{ bank_id: 'bank-1' }] })))

    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow(/Unexpected banks response for STUB: /)
  })

  it('rejects a response when total_count does not match the returned banks', async () => {
    stubFetch(
      vi.fn().mockResolvedValue(
        createSuccessResponse({
          data: [validBank],
          meta: {
            current_page: 1,
            total_count: 2,
            total_pages: 1
          }
        })
      )
    )

    const { provider } = createTestContext()

    await expect(
      provider.getBanks(BanksEndpointProfile.STUB, rawRequestConfigWithCustomList)
    ).rejects.toThrow('Banks response for STUB reported 2 banks but returned 1')
  })
})
