import type { CollectionConfig } from 'payload'
import { descriptionField } from '@/fields/description'

export const Itineraries: CollectionConfig = {
  slug: 'itineraries',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    descriptionField,
    {
      name: 'days',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'pointsOfInterest',
          label: 'Points of Interest (in order)',
          type: 'relationship',
          relationTo: ['trailheads', 'objectives'],
          hasMany: true,
          required: true,
          minRows: 1,
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.days || data.days.length === 0) return data

        const days = data.days

        // Helper to extract collection and id from a polymorphic value
        const getRef = (poi: any) => ({
          collection: poi?.relationTo,
          id: (poi?.value ?? poi)?.toString(),
        })

        // Day 1 first POI must be a trailhead
        const firstPOI = days[0]?.pointsOfInterest?.[0]
        if (!firstPOI) {
          throw new Error('Day 1 must have at least one point of interest.')
        }
        if (getRef(firstPOI).collection !== 'trailheads') {
          throw new Error("Day 1's first point of interest must be a trailhead.")
        }

        // Last day's last POI must be a trailhead
        const lastDay = days[days.length - 1]
        const lastPOIs = lastDay?.pointsOfInterest ?? []
        const lastPOI = lastPOIs[lastPOIs.length - 1]
        if (!lastPOI) {
          throw new Error(`Day ${days.length} must have at least one point of interest.`)
        }
        if (getRef(lastPOI).collection !== 'trailheads') {
          throw new Error(`Day ${days.length}'s last point of interest must be a trailhead.`)
        }

        // Each day's first POI must match the previous day's last POI
        for (let i = 1; i < days.length; i++) {
          const prevPOIs = days[i - 1]?.pointsOfInterest ?? []
          const prevLast = getRef(prevPOIs[prevPOIs.length - 1])

          const thisPOIs = days[i]?.pointsOfInterest ?? []
          const thisFirst = getRef(thisPOIs[0])

          if (prevLast.id !== thisFirst.id || prevLast.collection !== thisFirst.collection) {
            throw new Error(
              `Day ${i + 1}'s first point of interest must match Day ${i}'s last point of interest.`,
            )
          }
        }

        return data
      },
    ],
  },
}
