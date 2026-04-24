@QualityGateIntegrationTest
Feature: Consents

  Scenario: Create a consent successfully
    When I create a consent with valid details
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "bank_reference_id"
    And the response body should have field "bank_consent_url"
    And the response body should have field "bank_id"
    And the response body should have field "redirect_url"
    And the response body should have field "consent_end_date"
    And the response body should have field "consent_expiry_date"
    And the response body should have field "permissions"
    And the response body should have field "user_info"
    And the response body field "status" should be "AwaitingAuthorization"

  Scenario: Retrieve a consent by id
    Given I have created a consent
    When I retrieve the consent by its id
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "bank_reference_id"
    And the response body should have field "bank_consent_url"
    And the response body should have field "bank_id"
    And the response body should have field "redirect_url"
    And the response body should have field "consent_end_date"
    And the response body should have field "consent_expiry_date"
    And the response body should have field "permissions"
    And the response body should have field "user_info"

  Scenario Outline: Reject invalid consent requests
    When I create a consent with "<fixture>"
    Then the response status should be 400

    Examples:
      | fixture        |
      | missing fields |
      | invalid body   |

  Scenario: Return 404 for a non-existent consent
    When I retrieve a consent with id "non-existent-consent-id"
    Then the response status should be 404
