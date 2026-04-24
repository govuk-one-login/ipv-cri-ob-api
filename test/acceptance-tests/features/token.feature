@QualityGateIntegrationTest
Feature: Token

  Scenario: Create a token successfully
    When I create a token request with valid details
    Then the response status should be 200
    And the response should contain a valid token
