@QualityGateIntegrationTest
Feature: Banks Happy Path Tests

  Scenario: Banks - Happy Path - Retrieve a list of banks with valid params
    Given I have the default bank query params
    When I request the list of banks
    Then the response status should be 200
    And the response should contain a valid banks list

  Scenario: Banks - Retrieve an empty list of banks
    Given I have the default bank query params
    When I override the bank param "custom_list" with "empty_banks"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain an empty banks list

  Scenario: Banks - Retrieve a list with a single bank
    Given I have the default bank query params
    When I override the bank param "custom_list" with "one_bank"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain a single bank

  Scenario: Banks - Retrieve a list of 24 banks
    Given I have the default bank query params
    When I override the bank param "custom_list" with "many_banks"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain 24 banks

  Scenario: Banks - Retrieve a list where some banks are offline
    Given I have the default bank query params
    When I override the bank param "custom_list" with "some_banks_offline"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain some banks that are offline

  Scenario: Banks - Retrieve a list where all banks are offline
    Given I have the default bank query params
    When I override the bank param "custom_list" with "all_banks_offline"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain all banks offline

  Scenario: Retrieve banks with no params
    When I request the list of banks
    Then the response status should be 200
    And the response body should have field "data"
    And the response body should have field "meta"
