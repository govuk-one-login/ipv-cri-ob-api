@QualityGateIntegrationTest
Feature: Identity Verification

  Scenario: Retrieve identity verification for a consent
    Given I have created a consent
    When I retrieve identity verification for the created consent
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "consent_id"
    And the response body should have field "status"
    And the response body should have field "personal_details_score"
    And the response body should have field "address_score"

  Scenario: Post identity verification for a consent
    Given I have created a consent
    When I post identity verification for the created consent
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "consent_id"
    And the response body should have field "status"
    And the response body should have field "personal_details_score"
    And the response body should have field "address_score"
    And the response body field "status" should be "Match"

  Scenario Outline: Return 404 for a non-existent consent
    When I send a "<method>" identity verification request for consent "non-existent-consent-id"
    Then the response status should be 404

    Examples:
      | method |
      | GET    |
      | POST   |

  Scenario: Return 400 for missing verification information
    Given I have created a consent
    When I post identity verification with missing fields for the created consent
    Then the response status should be 400
