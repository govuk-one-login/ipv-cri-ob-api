@QualityGateIntegrationTest @api-test
Feature: Banks Endpoint - Happy Path Scenarios

Background:
    Given a session has been created via the core stub

  Scenario: Banks - Happy Path - Retrieve a list of banks
    Given I request the list of banks
    Then the response status should be 200
    And the response body should have field "banks"
    And the response body should have field "profile"
    And the response should contain a valid banks list
