import type { CollectionConfig } from 'payload'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'
import { elevationField, elevationBeforeChangeHook } from '@/fields/elevation'

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [elevationBeforeChangeHook],
  },
  fields: [
    {
      name: 'objective',
      label: 'Objective',
      type: 'text',
      required: true,
    },
    latitudeField(),
    longitudeField(),
    elevationField(),
    {
      name: 'prominence',
      label: 'Prominence (ft)',
      type: 'number',
      min: 0,
      max: 29029,
    },
    {
      name: 'isolation',
      label: 'Isolation (mi)',
      type: 'number',
      min: 0,
      max: 24901,
    },
  ],
}
