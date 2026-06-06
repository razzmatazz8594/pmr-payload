import type { Validate } from 'payload'

export const validateLatitude: Validate = (value) => {
  if (value == null) return true

  const decimals = value.toString().split('.')[1]

  if (decimals && decimals.length > 6) {
    return 'Latitude must have at most 6 decimal places'
  }

  return true
}
