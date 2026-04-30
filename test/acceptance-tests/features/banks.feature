@QualityGateIntegrationTest
Feature: Banks

  Scenario: Retrieve banks with no params
    When I request the list of banks
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

  Scenario: Retrieve banks with default params
    When I request the list of banks with default params
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

  Scenario: Retrieve banks filtered by group
    When I request the list of banks filtered by group "HSBC"
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

  Scenario: Retrieve sandbox banks only
    When I request the list of sandbox banks
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

  Scenario: Retrieve banks for a specific page
    When I request page 2 of the list of banks
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"

  Scenario Outline: Reject invalid bank query parameters
    When I request the list of banks with invalid param "<param>" set to "<value>"
    Then the response status should be 400

    Examples:
      | param    | value            |
      | page     | -1               |
      | standard | INVALID_STANDARD |
