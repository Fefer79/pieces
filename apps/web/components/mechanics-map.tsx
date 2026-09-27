'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

export interface MechanicMapPoint {
  id: string
  name: string
  commune: string | null
  lat: number
  lng: number
  avgRating?: number | null
}

interface MechanicsMapProps {
  points: MechanicMapPoint[]
  height?: number
  /** Position de l'utilisateur — affichée avec une pastille dédiée (pouls bleu), comme sur monterrain.ci. */
  userLocation?: { lat: number; lng: number } | null
}

// Centre par défaut partagé avec VendorMapPicker — cf. ce composant pour le
// détail du pattern d'init Leaflet (import dynamique, CSS injectée au
// runtime, nettoyage à l'unmount).
const ABIDJAN_CENTER: [number, number] = [5.345, -4.024]

function injectPastilleStyles() {
  if (typeof document === 'undefined' || document.getElementById('mechanics-map-pastille-css')) return
  const style = document.createElement('style')
  style.id = 'mechanics-map-pastille-css'
  style.textContent = `
    .mechanic-pastille {
      display: flex; align-items: center; justify-content: center;
      min-width: 34px; height: 26px; padding: 0 8px;
      border-radius: 999px; background: #fff; color: #00113a;
      border: 2px solid #00113a; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      font: 700 11px/1 'DM Mono', monospace; white-space: nowrap;
    }
    .mechanic-pastille.is-new { background: #FF6B00; color: #fff; border-color: #FF6B00; }
    .user-location-pastille { position: relative; width: 18px; height: 18px; }
    .user-location-pastille .dot {
      position: absolute; inset: 4px; border-radius: 999px;
      background: #2563eb; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(37,99,235,0.4);
    }
    .user-location-pastille .pulse {
      position: absolute; inset: 0; border-radius: 999px;
      background: rgba(37,99,235,0.35); animation: mechanic-map-pulse 1.8s ease-out infinite;
    }
    @keyframes mechanic-map-pulse {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export function MechanicsMap({ points, height = 420, userLocation }: MechanicsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const userMarkerRef = useRef<LeafletMarker | null>(null)

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
      userMarkerRef.current = null
    }
  }, [])

  // Redessine les marqueurs quand la liste change, sans réinitialiser la carte.
  useEffect(() => {
    let cancelled = false

    async function syncMarkers() {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      injectPastilleStyles()

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      for (const point of points) {
        const hasRating = point.avgRating != null
        const icon = L.divIcon({
          className: '',
          html: `<div class="mechanic-pastille${hasRating ? '' : ' is-new'}">${
            hasRating ? `★ ${point.avgRating!.toFixed(1)}` : 'Nouveau'
          }</div>`,
          iconSize: undefined,
          iconAnchor: [17, 13],
          popupAnchor: [0, -13],
        })
        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map)
        marker.bindPopup(
          `<strong>${escapeHtml(point.name)}</strong><br/>${escapeHtml(point.commune ?? '')}<br/><a href="/mecaniciens/atelier/${point.id}">Voir la fiche →</a>`,
        )
        markersRef.current.push(marker)
      }

      const allPoints: [number, number][] = points.map((p) => [p.lat, p.lng])
      if (userLocation) allPoints.push([userLocation.lat, userLocation.lng])
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 })
      }
    }

    syncMarkers()

    return () => {
      cancelled = true
    }
  }, [points, userLocation])

  // Marqueur « où nous sommes » — pastille pouls distincte, mise à jour sans
  // redessiner les marqueurs mécaniciens.
  useEffect(() => {
    let cancelled = false

    async function syncUserMarker() {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      if (cancelled || !map) return

      injectPastilleStyles()

      userMarkerRef.current?.remove()
      userMarkerRef.current = null

      if (!userLocation) return

      const icon = L.divIcon({
        className: '',
        html: `<div class="user-location-pastille"><div class="pulse"></div><div class="dot"></div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map)
      userMarkerRef.current = marker
    }

    syncUserMarker()

    return () => {
      cancelled = true
    }
  }, [userLocation])

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
