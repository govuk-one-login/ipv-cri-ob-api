@QualityGateIntegrationTest
Feature: Banks Unhappy Path Tests

  Scenario Outline: Reject invalid bank query params
    Given I have the default bank query params
    When I override the bank param "<param>" with "<value>"
    And I request the list of banks
    Then the response status should be 400

    Examples:
      | param    | value            |
      | standard | INVALID_STANDARD |
      | page     | -1               |

  Scenario: Banks - Invalid response - Body is not an array
    Given I have the default bank query params
    When I override the bank param "custom_list" with "invalid_response"
    And I request the list of banks
    Then the response status should be 200
    And the response data should not be wrapped in an array

  Scenario: Banks - Invalid response - Server Error
    Given I have the default bank query params
    When I override the bank param "custom_list" with "server_error"
    And I request the list of banks
    Then the response status should be 500
    And the response should contain the error
      | error       | InternalServerError                                                              |
      | description | Unexpected error. Please contact your administrator with request interaction id. |

  Scenario: Banks - Invalid response - Random List
    When I only send the query param "custom_list" with "random_list"
    And I request the list of banks
    Then the response status should be 200
    And the response should contain an empty banks list

  Scenario: Banks - Invalid response - Invalid JSON
    Given I have the default bank query params
    When I override the bank param "custom_list" with "invalid_json"
    And I request the list of banks
    Then the response should not be valid JSON

  Scenario Outline: Banks - Unauthorized - Invalid Authorization header
    When I request the list of banks with Authorization header "<token>"
    Then the response status should be 401
    And the response body should be empty

    Examples:
      | token                |
      | Bearer invalid_token |
      | Bearer expired_token |

  Scenario: Banks - Forbidden - Invalid scope Authorization header
    When I request the list of banks with Authorization header "Bearer invalid_scope_token"
    Then the response status should be 403
    And the response body should be empty
