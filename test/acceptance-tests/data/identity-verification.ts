export const validIdentityVerificationRequest = {
  date_of_birth: '1965-07-08',
  first_name: 'Kenneth',
  surname: 'Decerqueira'
}

export const identityVerificationRequestWithSurname = (surname: string) => ({
  date_of_birth: '1965-07-08',
  first_name: 'Kenneth',
  surname
})
