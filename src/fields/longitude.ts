import type { NumberField } from 'payload'
import { validateLongitude } from '@/validators/longitude'

type SingleNumberField = Extract<NumberField, { hasMany?: false }>

export const longitudeField = (overrides: Partial<SingleNumberField> = {}): SingleNumberField => ({
  type: 'number',
  name: 'longitude',
  label: 'Longitude',
  required: true,
  min: -180,
  max: 180,
  validate: validateLongitude,
  ...overrides,
})
