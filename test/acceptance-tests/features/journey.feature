@QualityGateIntegrationTest @QualityGateSmokeTest
Feature: Open Banking Verification Journey

  Scenario: Complete the full open banking verification journey
    When I create a session with valid details
    Then the response status should be 200

    When I create a token with valid details
    Then the response status should be 200

    When I request the list of banks with default params
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

    When I create a consent with valid details
    Then the response status should be 200
    And the response body should have field "id"
    And the response body should have field "status"

    When I post identity verification for the created consent
    Then the response status should be 200
    And the response body should have field "status"
    And the response body field "status" should be "Match"
