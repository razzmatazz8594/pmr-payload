import type { TextField } from 'payload'

type SingleTextField = Extract<TextField, { hasMany?: false }>

export const urlField = (overrides: Partial<SingleTextField> = {}): SingleTextField => ({
  name: 'url',
  type: 'text',
  label: 'URL',
  validate: (value: unknown) => {
    if (!value) return true
    try {
      new URL(value as string)
      return true
    } catch {
      return 'Please enter a valid URL'
    }
  },
  admin: {
    placeholder: 'https://example.com',
  },
  ...overrides,
})
