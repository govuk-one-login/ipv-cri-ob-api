@QualityGateIntegrationTest @ob-api
Feature: Identity Verification

  Scenario: Retrieve identity verification for a consent
    When I retrieve identity verification for consent "test-consent-id"
    Then the response status should be 200
    And the response should contain identity verification fields
    And the identity verification consent_id should be "test-consent-id"

  Scenario: Post identity verification for a consent
    When I post identity verification for consent "test-consent-id"
    Then the response status should be 200
    And the response should contain identity verification fields
    And the identity verification consent_id should be "test-consent-id"
    And the identity verification status should be "Match"

  Scenario: Retrieve identity verification for a non-existent consent
    When I retrieve identity verification for consent "non-existent-id-000"
    Then the response status should be 404

  Scenario: Post identity verification with an empty body
    When I post identity verification for consent "test-consent-id" with an empty body
    Then the response status should be 400

  Scenario: Post identity verification with a malformed body
    When I post identity verification for consent "test-consent-id" with a malformed body
    Then the response status should be 400

  Scenario: Post identity verification for a non-existent consent
    When I post identity verification for consent "non-existent-id-000" with a valid body
    Then the response status should be 404
