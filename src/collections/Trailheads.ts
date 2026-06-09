import type { CollectionConfig } from 'payload'

import { descriptionField } from '@/fields/description'
import { elevationField, elevationBeforeChangeHook } from '@/fields/elevation'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'

export const Trailheads: CollectionConfig = {
  slug: 'trailheads',
  admin: {
    useAsTitle: 'trailhead',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [elevationBeforeChangeHook],
  },
  fields: [
    {
      name: 'trailhead',
      label: 'Trailhead',
      type: 'text',
      required: true,
    },
    latitudeField(),
    longitudeField(),
    elevationField(),
    descriptionField,
    {
      name: '_wp_id',
      type: 'number',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: '_wp_slug',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
