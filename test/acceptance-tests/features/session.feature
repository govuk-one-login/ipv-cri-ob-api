@QualityGateIntegrationTest @ob-api
Feature: Session

  Scenario: Create a session successfully
    When I create a session
    Then the response status should be 200
    And the response body should be defined

  Scenario: Create a session with an empty body
    When I create a session with an empty body
    Then the response status should be 400

  Scenario: Create a session with a malformed body
    When I create a session with a malformed body
    Then the response status should be 400
