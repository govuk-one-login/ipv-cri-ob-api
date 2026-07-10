@QualityGateIntegrationTest
Feature: Identity Verification Endpoint - Unhappy Path Scenarios

  Scenario: Post identity verification with bad request surname returns 400 with validation errors
    Given I have created a consent
    When I post identity verification for the created consent with surname "IDENTITY_VERIFICATION_BAD_REQUEST"
    Then the response status should be 400
    And the response body field "error" should be "UnprocessableEntityError"
    And the response body field "description" should be "One or more validation errors occurred"
    And the response body field "details" should have key "first_name" with value "first_name is required"
    And the response body field "details" should have key "surname" with value "surname is required"
    And the response body field "details" should have key "date_of_birth" with value "date_of_birth is required"

  Scenario: Post identity verification with an invalid token returns 401
    Given I have created a consent
    When I post identity verification using an invalid token
    Then the response status should be 401

  Scenario: Post identity verification without a token returns 401
    Given I have created a consent
    When I post identity verification without a token
    Then the response status should be 401

  Scenario: Post identity verification with an invalid scope token returns 403
    Given I have created a consent
    When I post identity verification using an invalid scope token
    Then the response status should be 403

  Scenario: Post identity verification with an expired token returns 401
    Given I have created a consent
    When I post identity verification using an expired token
    Then the response status should be 401

  Scenario: Post identity verification with server error surname returns 503 with error body
    Given I have created a consent
    When I post identity verification for the created consent with surname "IDENTITY_VERIFICATION_SERVER_ERROR"
    Then the response status should be 503
    And the response body field "error" should be "ExternalServerError"
    And the response body field "description" should be "Unexpected error. Please contact your administrator with request interaction id."

  Scenario: Post identity verification with resource not found surname returns 404 with error body
    Given I have created a consent
    When I post identity verification for the created consent with surname "IDENTITY_VERIFICATION_NOT_FOUND_ERROR"
    Then the response status should be 404
    And the response body field "error" should be "NotFoundError"
    And the response body field "description" should be "Resource not found."
