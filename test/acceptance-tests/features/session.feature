@QualityGateIntegrationTest
Feature: Session

  Scenario: Create a session successfully
    When I create a session request with valid details
    Then the response status should be 200
    And the response should contain a valid session
