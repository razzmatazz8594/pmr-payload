'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type Itinerary = {
  id: number
  title: string
}

export default function ObjectiveItineraries() {
  const { id } = useDocumentInfo()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    fetch(
      `/api/itineraries?where[days.pointsOfInterest.value][equals]=${id}&depth=0`
    )
      .then(r => r.json())
      .then(data => {
        setItineraries(data.docs ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return null
  if (!itineraries.length) return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>Itineraries</h4>
      <p style={{ color: 'var(--theme-elevation-400)', fontSize: '0.875rem' }}>
        This objective has not been added to any itineraries yet.
      </p>
    </div>
  )

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>Itineraries</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {itineraries.map(it => (
          <li key={it.id} style={{ marginBottom: '0.25rem' }}>
            <a
              href={`/admin/collections/itineraries/${it.id}`}
              style={{ color: 'var(--theme-text)', textDecoration: 'underline' }}
            >
              {it.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
