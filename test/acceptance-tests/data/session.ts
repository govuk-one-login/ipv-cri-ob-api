export const validSessionRequest = {
  aud: '<audience>',
  client_id: '<client-id>',
  exp: 0,
  govuk_signin_journey_id: '<journey-id>',
  iat: 0,
  iss: '<issuer>',
  nbf: 0,
  persistent_session_id: '<persistent-session-id>',
  redirect_uri: '<redirect-uri>',
  response_type: 'code',
  shared_claims: {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld'
    ],
    address: [
      {
        addressLocality: '<locality>',
        buildingNumber: '<building-number>',
        postalCode: '<postal-code>',
        streetName: '<street-name>',
        validFrom: '<valid-from>'
      }
    ],
    birthDate: [{ value: '<date-of-birth>' }],
    name: [
      {
        nameParts: [
          { type: 'GivenName', value: '<given-name>' },
          { type: 'FamilyName', value: '<family-name>' }
        ]
      }
    ]
  },
  state: '<state>',
  sub: 'urn:fdc:gov.uk:2022:<uuid>'
}
