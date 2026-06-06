import type { CollectionConfig } from 'payload'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  access: {
    read: () => true,
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
  ],
}
