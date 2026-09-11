@QualityGateIntegrationTest @api-test
Feature: Banks Endpoint - Unhappy Path Scenarios

  Scenario Outline: Banks - Unauthorized - Invalid session-id header
    When I request the list of banks with session-id header "<sessionId>"
    Then the response status should be 401
    And the response body should be '<expectedBody>'

    Examples:
      | sessionId       | expectedBody                    |
      | invalid_session | {"message":"Session not found"} |
      | expired_session | {"message":"Session not found"} |

  Scenario: Banks - Forbidden - Missing session-id header
    When I request the list of banks with session-id header "<sessionId>"
    Then the response status should be 401
    And the response body should be '<expectedBody>'

    Examples:
      | sessionId | expectedBody                      |
      |           | {"message":"session-id is empty"} |
