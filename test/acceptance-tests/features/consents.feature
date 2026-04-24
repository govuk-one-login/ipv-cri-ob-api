@QualityGateIntegrationTest @ob-api
Feature: Consents

  Scenario: Create a consent successfully
    When I create a consent
    Then the response status should be 200
    And the response should contain consent fields
    And the consent bank_id should be "obie-barclays-production"
    And the consent status should be "AwaitingAuthorization"

  Scenario: Retrieve a consent by id
    Given a consent has been created
    When I retrieve the consent by id
    Then the response status should be 200
    And the response should contain consent fields

  Scenario: Create a consent with an empty body
    When I create a consent with an empty body
    Then the response status should be 400

  Scenario: Create a consent with a malformed body
    When I create a consent with a malformed body
    Then the response status should be 400

  Scenario: Retrieve a consent with a non-existent id
    When I retrieve the consent with id "non-existent-id-000"
    Then the response status should be 404
