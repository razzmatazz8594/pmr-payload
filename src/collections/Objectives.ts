import type { CollectionConfig } from 'payload'
import { descriptionField } from '@/fields/description'
import { elevationField, elevationBeforeChangeHook } from '@/fields/elevation'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  admin: {
    useAsTitle: 'objective',
  },
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
      name: 'prominence_ft',
      label: 'Prominence (ft)',
      type: 'number',
      min: 0,
      max: 29029,
    },
    {
      name: 'isolation_mi',
      label: 'Isolation (mi)',
      type: 'number',
      min: 0,
      max: 24901,
    },
    descriptionField,
    {
      name: 'achievements',
      type: 'join',
      collection: 'achievements',
      on: 'groups.objectives',
    },
    {
      name: 'itinerariesList',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/ObjectiveItineraries',
        },
      },
    },
  ],
}
