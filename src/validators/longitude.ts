import type { Validate } from 'payload'

export const validateLongitude: Validate = (value) => {
  if (value == null) return true

  const decimals = value.toString().split('.')[1]

  if (decimals && decimals.length > 6) {
    return 'Longitude must have at most 6 decimal places'
  }

  return true
}
