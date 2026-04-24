@QualityGateIntegrationTest
Feature: Consents

  Scenario Outline: Create a consent successfully
    When I create a consent with valid details
    Then the response status should be 200
    And the response body should have field "<field>"
    And the response body field "status" should be "AwaitingAuthorization"

    Examples:
      | field               |
      | id                  |
      | bank_reference_id   |
      | bank_consent_url    |
      | bank_id             |
      | redirect_url        |
      | consent_end_date    |
      | consent_expiry_date |
      | permissions         |
      | user_info           |

  Scenario Outline: Retrieve a consent by id
    Given I have created a consent
    When I retrieve the consent by its id
    Then the response status should be 200
    And the response body should have field "<field>"

    Examples:
      | field               |
      | id                  |
      | bank_reference_id   |
      | bank_consent_url    |
      | bank_id             |
      | redirect_url        |
      | consent_end_date    |
      | consent_expiry_date |
      | permissions         |
      | user_info           |

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
