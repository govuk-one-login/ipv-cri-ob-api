export const validIdentityVerificationRequest = {
  verification_information: {
    address: {
      building_name: '<building-name>',
      building_number: '<building-number>',
      county: '<county>',
      locality: '<locality>',
      po_box_number: '<po-box>',
      post_town: '<post-town>',
      postal: '<postal-code>',
      street: '<street>',
      sub_building: '<sub-building>'
    },
    date_of_birth: '1990-01-15',
    first_name: '<first-name>',
    middle_names: '<middle-names>',
    surname: '<surname>',
    title: 'Mr'
  }
}

export const missingFieldsIdentityVerificationRequest = {
  verification_information: {}
}
