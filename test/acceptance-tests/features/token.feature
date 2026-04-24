@QualityGateIntegrationTest
Feature: Token

  Scenario: Create a token successfully
    When I create a token with valid details
    Then the response status should be 200
