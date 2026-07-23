@QualityGateIntegrationTest
Feature: Issue Credential Endpoint - Unhappy Path Scenarios

  Scenario: Issue a credential without a token returns 401
    When I issue a credential without a token
    Then the response status should be 401

  Scenario: Issue a credential with an invalid token returns 401
    When I issue a credential with an invalid token
    Then the response status should be 401

  Scenario: Issue a credential with an expired token returns 401
    When I issue a credential with an expired token
    Then the response status should be 401
