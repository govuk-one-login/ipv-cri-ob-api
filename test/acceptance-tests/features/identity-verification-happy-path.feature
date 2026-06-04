@QualityGateIntegrationTest
Feature: Identity Verification Endpoint - Happy Path Scenarios

  Scenario: Post identity verification for a consent
    Given I have created a consent
    When I post identity verification for the created consent
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "consent_id"
    And the response body should have field "status"
    And the response body field "personal_details_score" should be 9
    And the response body field "status" should be "Match"

  Scenario Outline: Post identity verification with specific surnames returns expected status and score
    Given I have created a consent
    When I post identity verification for the created consent with surname "<surname>"
    Then the response status should be 200
    And the response body field "consent_id" should be "<consent_id>"
    And the response body field "status" should be "<status>"
    And the response body field "personal_details_score" should be <personal_details_score>

    Examples:
      | surname                               | consent_id      | status          | personal_details_score |
      | IDENTITY_VERIFICATION_PARTIAL_MATCH   | test-consent-id | Partial Match   | 6                      |
      | IDENTITY_VERIFICATION_PROBABLE_MATCH  | test-consent-id | Probable Match  | 6                      |
      | IDENTITY_VERIFICATION_NO_MATCH        | test-consent-id | No Match        | 0                      |
      | IDENTITY_VERIFICATION_DECEASED        | test-consent-id | Deceased        | 1                      |
      | IDENTITY_VERIFICATION_CLOSED          | test-consent-id | Closed          | 1                      |
      | IDENTITY_VERIFICATION_UNABLE_TO_CHECK | test-consent-id | Unable to Check | 1                      |
      | IDENTITY_VERIFICATION_FAILED          | test-consent-id | Failed          | 0                      |

  Scenario: Post identity verification with invalid response surname returns 200 with Invalid status
    Given I have created a consent
    When I post identity verification for the created consent with surname "IDENTITY_VERIFICATION_INVALID_RESPONSE"
    Then the response status should be 200
    And the response body field "status" should be "Invalid"
