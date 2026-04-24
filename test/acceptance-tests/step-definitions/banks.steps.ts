import { defaultBanksParams } from '../data/banks'
import { expect, parseBody, test } from '../fixtures'
import { BanksPage } from '../pages/banks-page'
import { createBdd } from 'playwright-bdd'

const { Then, When } = createBdd(test)

When('I request banks with no params', async ({ request, response, responseBody }) => {
  response.value = await new BanksPage(request).getBanks()
  responseBody.value = await parseBody(response.value)
})

When('I request banks with default params', async ({ request, response, responseBody }) => {
  response.value = await new BanksPage(request).getBanks(defaultBanksParams)
  responseBody.value = await parseBody(response.value)
})

When(
  'I request banks with group {string}',
  async ({ request, response, responseBody }, group: string) => {
    response.value = await new BanksPage(request).getBanks({ group })
    responseBody.value = await parseBody(response.value)
  }
)

When('I request banks with is_sandbox true', async ({ request, response, responseBody }) => {
  response.value = await new BanksPage(request).getBanks({ is_sandbox: true })
  responseBody.value = await parseBody(response.value)
})

When(
  'I request banks for page {int}',
  async ({ request, response, responseBody }, page: number) => {
    response.value = await new BanksPage(request).getBanks({
      fetchAllBanks: false,
      page
    })
    responseBody.value = await parseBody(response.value)
  }
)

Then('the response should contain a data array', async ({ responseBody }) => {
  expect(responseBody.value).toHaveProperty('data')
  expect(responseBody.value['data']).toBeInstanceOf(Array)
})

Then('the response should contain meta', async ({ responseBody }) => {
  expect(responseBody.value).toHaveProperty('meta')
})
