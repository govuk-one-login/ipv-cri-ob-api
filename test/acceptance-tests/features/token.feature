@QualityGateIntegrationTest @ob-api
Feature: Token

  Scenario: Create a token successfully
    When I create a token
    Then the response status should be 200
    And the response body should be defined

  Scenario: Create a token with an empty body
    When I create a token with an empty body
    Then the response status should be 400

  Scenario: Create a token with a malformed body
    When I create a token with a malformed body
    Then the response status should be 400
