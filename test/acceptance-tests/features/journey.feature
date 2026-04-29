@QualityGateIntegrationTest @ob-api
Feature: E2E Journey - Session to Identity Verification

  Scenario: Complete the full open banking verification journey
    When I create a session
    Then the response status should be 200

    When I create a token
    Then the response status should be 200

    When I request banks with default params
    Then the response status should be 200
    And the response should contain a data array

    When I create a consent
    Then the response status should be 200
    And the response should contain consent fields
    And I store the consent id

    When I post identity verification for the stored consent
    Then the response status should be 200
    And the response should contain identity verification fields
