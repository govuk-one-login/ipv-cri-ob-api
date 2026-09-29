@QualityGateIntegrationTest @api-test
Feature: Consents Endpoint - Happy Path Scenarios

  # TODO (LIME-2078)
  # the mock banks UAT response only has one bank atm. a consent request using a different
  # bank to the cached one should return 201 with a new id rather than reusing it

  @needs-session
  Scenario: Creating a consent returns a bank consent url
    When I create a consent for an online bank
    Then the response status should be 201
    And the response body should have field "id"
    And the response body should have field "url"
    And the response body should have field "urlExpiresAtSeconds"
    And the response body should not have field "cached"
    And the consent url should be an https url
    And the consent url should expire in about 4 minutes

  @needs-session
  Scenario: Requesting again for the same bank returns the cached consent
    Given I have created a consent
    When I create a consent for the same bank
    Then the response status should be 200
    And the response body field "cached" should be "true"
    And the consent should be the one created earlier
    And the consent url should be an https url
