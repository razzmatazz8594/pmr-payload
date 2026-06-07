import { CollectionConfig } from 'payload'
import { descriptionField } from '@/fields/description'

export const Achievements: CollectionConfig = {
  slug: 'achievements',
  admin: {
    useAsTitle: 'achievement',
  },
  fields: [
    {
      name: 'achievement',
      label: 'Achievement',
      type: 'text',
      required: true,
    },
    descriptionField,
    {
      name: 'groups',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        descriptionField,
        {
          name: 'objectives',
          type: 'relationship',
          relationTo: 'objectives',
          hasMany: true,
          required: true,
        },
      ],
    },
  ],
}
