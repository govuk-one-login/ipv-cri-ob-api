@QualityGateNewFeatureTest
Feature: Issue Credential Endpoint - Happy Path Scenarios

  Scenario: Issue a credential with a valid token returns a signed JWT
    Given I have created a consent
    When I post identity verification for the created consent
    And I issue a credential
    Then the response status should be 200
    And the response body should be a valid JWT
    And the JWT issuer should be present
    And the JWT subject should be present
    And the JWT id should be a urn:uuid
    And the JWT time window should be valid
    And the JWT vc type should be VerifiableCredential and IdentityCheckCredential
    And the JWT vc credentialSubject should contain a valid birthDate
    And the JWT vc credentialSubject should contain a GivenName and FamilyName
    And the JWT vc evidence should contain a valid IdentityCheck
