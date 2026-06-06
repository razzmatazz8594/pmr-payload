import type { NumberField } from 'payload'
import { validateLatitude } from '@/validators/latitude'

type SingleNumberField = Extract<NumberField, { hasMany?: false }>

export const latitudeField = (overrides: Partial<SingleNumberField> = {}): SingleNumberField => ({
  type: 'number',
  name: 'latitude',
  label: 'Latitude',
  required: true,
  min: -90,
  max: 90,
  validate: validateLatitude,
  ...overrides,
})
