import type { BaseHttpClient } from '@common/client/base-http-client'
import type { GetBanksParams } from '@src/bank-list/model/bank-list-provider'
import type { StoredBank } from '@src/bank-list/model/database/bank-list-entity'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { createEcospendBankListProvider } from '@src/bank-list/client/ecospend-bank-list-provider'
import { describe, expect, it, vi } from 'vitest'

const ACCESS_TOKEN = 'test-access-token'
const CUSTOM_LIST = 'stub-banks'
const ENDPOINT_URL = 'https://provider.test/banks'

const SANDBOX_QUERY_STRING =
  'country_iso_code=GB&division=Personal&fetchAllBanks=true&standard=OBIE&is_sandbox=true'

const getBanksParams: GetBanksParams = {
  accessToken: ACCESS_TOKEN,
  customList: CUSTOM_LIST,
  endpointUrl: ENDPOINT_URL,
  profile: EndpointProfile.STUB
}

const ecospendResponse = {
  data: [
    {
      bank_id: 'example-bank',
      friendly_name: 'Example Bank',
      is_sandbox: true,
      service_status: true
    }
  ],
  meta: {
    current_page: 1,
    total_count: 1,
    total_pages: 1
  }
}

const storedBanks: StoredBank[] = [
  {
    bankId: 'example-bank',
    friendlyName: 'Example Bank',
    serviceStatus: true
  }
]

const createTestContext = () => {
  const get = vi.fn().mockResolvedValue(ecospendResponse)
  const httpClient: BaseHttpClient = { get, postJson: vi.fn() }
  const bankListProvider = createEcospendBankListProvider({ httpClient })

  return { bankListProvider, get }
}

describe('createEcospendBankListProvider', () => {
  it('requests the bank list for the configured endpoint', async () => {
    const { bankListProvider, get } = createTestContext()

    await bankListProvider.getBanks(getBanksParams)

    expect(get).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      profile: EndpointProfile.STUB,
      url: `${ENDPOINT_URL}?${SANDBOX_QUERY_STRING}&custom_list=${CUSTOM_LIST}`
    })
  })

  it('maps a valid response', async () => {
    const { bankListProvider } = createTestContext()

    await expect(bankListProvider.getBanks(getBanksParams)).resolves.toEqual(storedBanks)
  })

  it.each([
    [EndpointProfile.STUB, 'true'],
    [EndpointProfile.UAT, 'true'],
    [EndpointProfile.LIVE, 'false']
  ])('requests is_sandbox=%s banks for profile %s', async (profile, expectedSandbox) => {
    const { bankListProvider, get } = createTestContext()

    await bankListProvider.getBanks({ ...getBanksParams, profile })

    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        profile,
        url: expect.stringContaining(`is_sandbox=${expectedSandbox}`)
      })
    )
  })

  it('omits custom_list when one is not configured', async () => {
    const { bankListProvider, get } = createTestContext()
    const { customList: _omitted, ...withoutCustomList } = getBanksParams

    await bankListProvider.getBanks(withoutCustomList)

    expect(get).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      profile: EndpointProfile.STUB,
      url: `${ENDPOINT_URL}?${SANDBOX_QUERY_STRING}`
    })
  })

  it('preserves query params already on the configured endpoint', async () => {
    const { bankListProvider, get } = createTestContext()

    await bankListProvider.getBanks({
      ...getBanksParams,
      endpointUrl: `${ENDPOINT_URL}?tenant=gds`
    })

    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${ENDPOINT_URL}?tenant=gds&${SANDBOX_QUERY_STRING}&custom_list=${CUSTOM_LIST}`
      })
    )
  })

  it('ignores unknown fields in the response', async () => {
    const { bankListProvider, get } = createTestContext()
    get.mockResolvedValue({
      ...ecospendResponse,
      data: [
        {
          bank_id: 'example-bank',
          friendly_name: 'Example Bank',
          is_sandbox: true,
          service_status: true,
          unknown_key: 'value'
        }
      ],
      unknown_key: 'value'
    })

    await expect(bankListProvider.getBanks(getBanksParams)).resolves.toEqual(storedBanks)
  })

  it('rejects a response that is missing a required field', async () => {
    const { bankListProvider, get } = createTestContext()
    get.mockResolvedValue({
      ...ecospendResponse,
      data: [{ bank_id: 'example-bank', is_sandbox: true, service_status: true }]
    })

    await expect(bankListProvider.getBanks(getBanksParams)).rejects.toThrow(
      'Unexpected ecospend bank list response body: data.0.friendly_name: Invalid input: expected string, received undefined [endpoint profile: STUB]'
    )
  })

  it('rejects a response that is not paginated as expected', async () => {
    const { bankListProvider, get } = createTestContext()
    get.mockResolvedValue({
      ...ecospendResponse,
      meta: { ...ecospendResponse.meta, total_pages: 2 }
    })

    await expect(bankListProvider.getBanks(getBanksParams)).rejects.toThrow(
      'Unexpected ecospend bank list response body: meta.total_pages: Invalid input: expected 1 [endpoint profile: STUB]'
    )
  })

  it('rejects a response where total_count does not match the returned banks', async () => {
    const { bankListProvider, get } = createTestContext()
    get.mockResolvedValue({
      ...ecospendResponse,
      meta: { ...ecospendResponse.meta, total_count: 2 }
    })

    await expect(bankListProvider.getBanks(getBanksParams)).rejects.toThrow(
      'Banks response for STUB reported 2 banks but returned 1'
    )
  })

  it('resolves an empty list when Ecospend returns no banks', async () => {
    const { bankListProvider, get } = createTestContext()
    get.mockResolvedValue({ data: [], meta: { current_page: 1, total_count: 0, total_pages: 1 } })

    await expect(bankListProvider.getBanks(getBanksParams)).resolves.toEqual([])
  })

  it('propagates http client failures', async () => {
    const { bankListProvider, get } = createTestContext()
    const transportError = new Error('ecospend-bank-list response was not OK')
    get.mockRejectedValue(transportError)

    await expect(bankListProvider.getBanks(getBanksParams)).rejects.toBe(transportError)
  })
})
