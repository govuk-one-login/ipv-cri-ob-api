@QualityGateIntegrationTest
Feature: Consents Endpoint - Unhappy Path Scenarios

  Scenario: Reject request with no token
    When I create a consent without a token
    Then the response status should be 401

  Scenario: Reject request with invalid token
    When I create a consent with an invalid token
    Then the response status should be 401

  Scenario: Reject request with expired token
    When I create a consent with an expired token
    Then the response status should be 401

  Scenario: Reject request with invalid scope token
    When I create a consent with an invalid scope token
    Then the response status should be 401

  Scenario: Reject request with empty body
    When I create a consent with an empty body
    Then the response status should be 400
    And the response body field "error" should be "InvalidRequest"
    And the response body field "description" should be "One or more required fields are missing."
    And the response body field "details" should have key "bank_id"
    And the response body field "details" should have key "redirect_url"
    And the response body field "details" should have key "permissions"

  Scenario Outline: Reject request with missing mandatory field
    When I create a consent without the "<field>" field
    Then the response status should be 400
    And the response body field "error" should be "InvalidRequest"
    And the response body field "description" should be "One or more required fields are missing."
    And the response body field "details" should have key "<field>"

    Examples:
      | field        |
      | bank_id      |
      | redirect_url |
      | permissions  |

  Scenario Outline: Return error for specific surname triggers
    When I create a consent with surname "<surname>"
    Then the response status should be <status>
    And the response body field "error" should be "<error>"
    And the response body field "description" should be "<description>"

    Examples:
      | surname                            | status | error               | description                                                                          |
      | CONSENT_ERROR_INTERNAL             | 500    | InternalServerError | An unexpected error occurred while processing the consent request.                   |
      | CONSENT_ERROR_EXTERNAL             | 502    | ExternalServerError | An error was received from an upstream service while processing the consent request. |
      | CONSENT_ERROR_BANK_NOT_FOUND       | 404    | BankNotFoundError   | The specified bank could not be found or is not supported.                           |
      | CONSENT_ERROR_INVALID_BANK_REQUEST | 502    | InvalidBankRequest  | The request sent to the bank was rejected as invalid.                                |
      | CONSENT_ERROR_BANK_UNAVAILABLE     | 502    | BankServiceError    | Bank is temporarily unavailable.                                                     |
      | CONSENT_ERROR_BANK_TIMED_OUT       | 503    | TimedOutBankError   | The bank did not respond within the expected time limit.                             |

  Scenario: Return 404 for a non-existent consent
    When I retrieve a consent with id "non-existent-consent-id"
    Then the response status should be 404

  Scenario Outline: Reject invalid consent requests
    When I create a consent with "<fixture>"
    Then the response status should be 400

    Examples:
      | fixture        |
      | missing fields |
      | invalid body   |
