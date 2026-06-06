import type { CollectionConfig } from 'payload'

import { descriptionField } from '@/fields/description'
import { elevationField, elevationBeforeChangeHook } from '@/fields/elevation'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'

export const Campgrounds: CollectionConfig = {
  slug: 'campgrounds',
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [elevationBeforeChangeHook],
  },
  fields: [
    {
      name: 'campground',
      label: 'Campground',
      type: 'text',
      required: true,
    },
    latitudeField(),
    longitudeField(),
    elevationField(),
    descriptionField,
  ],
}
