@QualityGateIntegrationTest @QualityGateSmokeTest @needs-session
Feature: Open Banking Verification Journey

  Scenario: Complete the full open banking verification journey
    When I request the list of banks
    Then the response status should be 200
    And the response body should have field "banks"
    And the response body should have field "profile"

    Given I have created a consent
    Then the response status should be 201
    And the response body should have field "id"
    And the response body should have field "url"

    When I post identity verification for the created consent
    Then the response status should be 200
    And the response body should have field "status"
    And the response body field "status" should be "Match"

    When I request an authorization code
    And I exchange the authorisation code for a token

    When I issue a credential
    Then the response status should be 200
    And the response body should be a valid JWT
