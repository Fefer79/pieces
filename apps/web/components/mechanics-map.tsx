'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

export interface MechanicMapPoint {
  id: string
  name: string
  commune: string | null
  lat: number
  lng: number
}

interface MechanicsMapProps {
  points: MechanicMapPoint[]
  height?: number
}

// Centre par défaut partagé avec VendorMapPicker — cf. ce composant pour le
// détail du pattern d'init Leaflet (import dynamique, CSS injectée au
// runtime, nettoyage à l'unmount).
const ABIDJAN_CENTER: [number, number] = [5.345, -4.024]

export function MechanicsMap({ points, height = 420 }: MechanicsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default
      if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: ABIDJAN_CENTER,
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      mapRef.current = map
    }

    init()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = []
    }
  }, [])

  // Redessine les marqueurs quand la liste change, sans réinitialiser la carte.
  useEffect(() => {
    let cancelled = false

    async function syncMarkers() {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      for (const point of points) {
        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map)
        marker.bindPopup(
          `<strong>${escapeHtml(point.name)}</strong><br/>${escapeHtml(point.commune ?? '')}<br/><a href="/mecaniciens/atelier/${point.id}">Voir la fiche →</a>`,
        )
        markersRef.current.push(marker)
      }

      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 })
      }
    }

    syncMarkers()

    return () => {
      cancelled = true
    }
  }, [points])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-md border border-border bg-surface"
      style={{ height }}
    />
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
