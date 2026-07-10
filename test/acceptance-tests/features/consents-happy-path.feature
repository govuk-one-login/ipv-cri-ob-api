@QualityGateIntegrationTest
Feature: Consents Endpoint - Happy Path Scenarios

  Scenario: Create a consent successfully
    When I create a consent with valid details
    Then the response status should be 200
    And the response body should have all consent fields
    And the response body field "status" should be "AwaitingAuthorization"

  Scenario: Retrieve a consent by id
    Given I have created a consent
    When I retrieve the consent by its id
    Then the response status should be 200
    And the response body should have all consent fields
