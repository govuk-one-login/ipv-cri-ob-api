@QualityGateIntegrationTest @QualityGateSmokeTest
Feature: Session

  Scenario: Create a session successfully
    Given a session has been created via the core stub
    Then the session should be valid
