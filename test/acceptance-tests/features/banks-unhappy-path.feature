@QualityGateIntegrationTest @api-test
Feature: Banks Endpoint - Unhappy Path Scenarios

  Scenario: Reject a banks request for a session that does not exist
    When I request the list of banks with session-id header "not-a-real-session"
    Then the response status should be 401
    And the response body should be '{"message":"Session not found"}'

  Scenario: Reject a banks request with a blank session-id header
    When I request the list of banks with session-id header ""
    Then the response status should be 400
    And the response body field "message" should be "Missing required request parameters: [session-id]"
