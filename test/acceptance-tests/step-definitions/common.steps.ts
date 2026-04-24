import { expect, parseBody, test } from '../fixtures'
import { createBdd } from 'playwright-bdd'

const { Then } = createBdd(test)

Then('the response status should be {int}', async ({ response }, status: number) => {
  expect(response.value.status()).toBe(status)
})

Then('the response body should be defined', async ({ response, responseBody }) => {
  responseBody.value = await parseBody(response.value)
  expect(responseBody.value).toBeTruthy()
})
