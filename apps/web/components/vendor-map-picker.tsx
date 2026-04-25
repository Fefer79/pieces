'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet'

interface VendorMapPickerProps {
  lat: number | null
  lng: number | null
  onChange: (coords: { lat: number; lng: number }) => void
  height?: number
}

const ABIDJAN_CENTER: [number, number] = [5.345, -4.024]

export function VendorMapPicker({
  lat,
  lng,
  onChange,
  height = 320,
}: VendorMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Init map once
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const L = (await import('leaflet')).default
        // Inject the leaflet stylesheet once (avoid bundling CSS through Tailwind v4)
        if (
          typeof document !== 'undefined' &&
          !document.getElementById('leaflet-css')
        ) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.integrity =
            'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
          link.crossOrigin = ''
          document.head.appendChild(link)
        }

        if (cancelled || !containerRef.current) return

        const initialPos: [number, number] =
          lat != null && lng != null ? [lat, lng] : ABIDJAN_CENTER
        const initialZoom = lat != null && lng != null ? 15 : 12

        const map = L.map(containerRef.current, {
          center: initialPos,
          zoom: initialZoom,
          zoomControl: true,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        // Default marker icon paths from CDN (Leaflet's default points to relative paths
        // that don't resolve under Next bundling).
        const icon = L.icon({
          iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })

        const marker = L.marker(initialPos, { draggable: true, icon }).addTo(map)

        marker.on('dragend', () => {
          const p = marker.getLatLng()
          onChangeRef.current({ lat: p.lat, lng: p.lng })
        })

        map.on('click', (e: LeafletMouseEvent) => {
          marker.setLatLng(e.latlng)
          onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
        })

        mapRef.current = map
        markerRef.current = marker
        setReady(true)
      } catch {
        if (!cancelled) setError('Impossible de charger la carte.')
      }
    }

    init()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external lat/lng changes
  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return
    if (lat == null || lng == null) return
    markerRef.current.setLatLng([lat, lng])
    mapRef.current.panTo([lat, lng])
  }, [lat, lng, ready])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => onChangeRef.current({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError('Géolocalisation refusée ou indisponible.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md border border-border bg-surface"
        style={{ height }}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {lat != null && lng != null
            ? `GPS · ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : 'Cliquez sur la carte ou déplacez le marqueur'}
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          className="rounded-full bg-card px-3 py-1.5 font-medium text-ink ring-1 ring-border hover:bg-surface"
        >
          Ma position
        </button>
      </div>
    </div>
  )
}
