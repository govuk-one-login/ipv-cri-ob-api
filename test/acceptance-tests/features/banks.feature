@QualityGateIntegrationTest @ob-api
Feature: Banks

  Scenario: Retrieve banks with no params
    When I request banks with no params
    Then the response status should be 200
    And the response should contain a data array
    And the response should contain meta

  Scenario: Retrieve banks with default params
    When I request banks with default params
    Then the response status should be 200
    And the response should contain a data array
    And the response should contain meta

  Scenario: Retrieve banks filtered by group
    When I request banks with group "HSBC"
    Then the response status should be 200
    And the response should contain a data array

  Scenario: Retrieve sandbox banks only
    When I request banks with is_sandbox true
    Then the response status should be 200
    And the response should contain a data array

  Scenario: Retrieve banks for a specific page
    When I request banks for page 2
    Then the response status should be 200
    And the response should contain a data array

  Scenario: Retrieve banks for an invalid page number
    When I request banks for page -1
    Then the response status should be 400
