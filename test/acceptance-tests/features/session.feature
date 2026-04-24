@QualityGateIntegrationTest
Feature: Session

  Scenario: Create a session successfully
    When I create a session with valid details
    Then the response status should be 200
