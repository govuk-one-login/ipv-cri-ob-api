import { defaultBanksParams } from '../data/banks.js'
import { BanksPage } from '../pages/banks-page.js'
import { expectBanksReturned, getBanks } from '../steps/banks-steps.js'
import { disposeApiContext, getApiContext } from '../utils/api-client.js'
import { afterAll, beforeAll, describe, it } from 'vitest'

describe('Banks endpoint', () => {
  let banksPage: BanksPage

  beforeAll(async () => {
    const api = await getApiContext()
    banksPage = new BanksPage(api)
  })

  afterAll(async () => {
    await disposeApiContext()
  })

  it('should return banks with no params', async () => {
    const response = await getBanks(banksPage)
    await expectBanksReturned(response)
  })

  it('should return banks with default params', async () => {
    const response = await getBanks(banksPage, defaultBanksParams)
    await expectBanksReturned(response)
  })

  it('should return banks filtered by group', async () => {
    const response = await getBanks(banksPage, {
      group: 'HSBC'
    })
    await expectBanksReturned(response)
  })

  it('should return sandbox banks only', async () => {
    const response = await getBanks(banksPage, {
      is_sandbox: true
    })
    await expectBanksReturned(response)
  })

  it('should return banks for a specific page', async () => {
    const response = await getBanks(banksPage, {
      fetchAllBanks: false,
      page: 2
    })
    await expectBanksReturned(response)
  })
})
