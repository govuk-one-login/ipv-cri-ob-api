@QualityGateIntegrationTest @api-test
Feature: Consents Endpoint - Unhappy Path Scenarios

  Scenario: Reject a consent request for a session that does not exist
    When I create a valid consent request with session-id header "not-a-real-session"
    Then the response status should be 401
    And the response body should be '{"message":"Session not found"}'

  Scenario: Reject a consent request with a blank session-id header
    When I create a valid consent request with session-id header ""
    Then the response status should be 400
    And the response body field "message" should be "Missing required request parameters: [session-id]"

  Scenario: Reject a consent request with no body
    When I create a consent with no body
    Then the response status should be 400
    And the response body field "message" should be "Invalid request body"

  Scenario Outline: Reject a consent request with an invalid body
    When I create a consent with body '<body>'
    Then the response status should be 400
    And the response body field "message" should be "<message>"

    Examples: rejected by the api gateway schema
      | body                                                        | message              |
      | not-json                                                    | Invalid request body |
      | {}                                                          | Invalid request body |
      | {"return_url":"https://return.test/callback"}               | Invalid request body |
      | {"bank_id":"iron-bank"}                                     | Invalid request body |
      | {"bank_id":"","return_url":"https://example.test/callback"} | Invalid request body |

    @needs-session
    Examples: rejected by the lambda schema
      | body                                                               | message                 |
      | {"bank_id":"iron-bank","return_url":"not-a-url"}                   | return_url: Invalid URL |
      | {"bank_id":"iron-bank","return_url":"ftp://example.test/callback"} | return_url: Invalid URL |

  @needs-session
  Scenario: An unknown bank id returns as an internal server error
    When I create a consent for an unknown bank
    Then the response status should be 500
    And the response body should be '{"message":"Internal server error"}'
