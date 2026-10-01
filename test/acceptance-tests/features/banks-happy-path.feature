@QualityGateIntegrationTest @api-test
Feature: Banks Endpoint - Happy Path Scenarios

  @needs-session
  Scenario: Requesting the list of banks returns the available banks
    Given I request the list of banks
    Then the response status should be 200
    And the response body should have field "banks"
    And the response body should have field "profile"
    And the response should contain a valid banks list
