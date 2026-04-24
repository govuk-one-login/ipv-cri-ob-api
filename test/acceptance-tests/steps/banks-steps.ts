import type { OBWorld } from '../world.js'

import { defaultBanksParams } from '../data/banks.js'
import { When } from '@cucumber/cucumber'

When('I request the list of banks', async function (this: OBWorld) {
  this.lastResponse = await this.banks.getBanks()
})

When('I request the list of banks with default params', async function (this: OBWorld) {
  this.lastResponse = await this.banks.getBanks(defaultBanksParams)
})

When(
  'I request the list of banks filtered by group {string}',
  async function (this: OBWorld, group: string) {
    this.lastResponse = await this.banks.getBanks({ group })
  }
)

When('I request the list of sandbox banks', async function (this: OBWorld) {
  this.lastResponse = await this.banks.getBanks({ is_sandbox: true })
})

When('I request page {int} of the list of banks', async function (this: OBWorld, page: number) {
  this.lastResponse = await this.banks.getBanks({ fetchAllBanks: false, page })
})

When(
  'I request the list of banks with invalid param {string} set to {string}',
  async function (this: OBWorld, param: string, value: string) {
    this.lastResponse = await this.banks.getBanks({ [param]: value })
  }
)
