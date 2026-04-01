'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MOCK_CATEGORIES = ['Filtration', 'Freinage', 'Moteur', 'Suspension', 'Électrique']

const MOCK_PARTS = [
  { id: '1', name: 'Filtre à huile', category: 'Filtration', price: 4500, oemReference: '90915-YZZD4', imageThumbUrl: null, vendor: { id: 'v1', shopName: 'AutoParts Adjamé' } },
  { id: '2', name: 'Plaquettes de frein avant', category: 'Freinage', price: 12000, oemReference: '04465-0K090', imageThumbUrl: null, vendor: { id: 'v2', shopName: 'Pièces Express Marcory' } },
  { id: '3', name: 'Filtre à air', category: 'Filtration', price: 6500, oemReference: '17801-0C010', imageThumbUrl: null, vendor: { id: 'v1', shopName: 'AutoParts Adjamé' } },
  { id: '4', name: 'Amortisseur arrière gauche', category: 'Suspension', price: 25000, oemReference: null, imageThumbUrl: null, vendor: { id: 'v3', shopName: 'Garage Central Plateau' } },
  { id: '5', name: 'Alternateur 12V', category: 'Électrique', price: 45000, oemReference: '27060-0L040', imageThumbUrl: null, vendor: { id: 'v2', shopName: 'Pièces Express Marcory' } },
  { id: '6', name: 'Courroie de distribution', category: 'Moteur', price: 18000, oemReference: '13568-09131', imageThumbUrl: null, vendor: { id: 'v3', shopName: 'Garage Central Plateau' } },
  { id: '7', name: 'Disque de frein avant', category: 'Freinage', price: 15000, oemReference: '43512-0K060', imageThumbUrl: null, vendor: { id: 'v1', shopName: 'AutoParts Adjamé' } },
  { id: '8', name: 'Bougie d\'allumage (x4)', category: 'Moteur', price: 8000, oemReference: '90919-01253', imageThumbUrl: null, vendor: { id: 'v2', shopName: 'Pièces Express Marcory' } },
]

export default function TestPartsPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = selectedCategory
    ? MOCK_PARTS.filter((p) => p.category === selectedCategory)
    : MOCK_PARTS

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#002366] hover:underline">&larr; Retour</button>
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">Toyota Hilux 2012</h1>
      <p className="mb-4 text-sm text-gray-500">{filtered.length} pièce{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!selectedCategory ? 'bg-[#002366] text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Toutes
        </button>
        {MOCK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${selectedCategory === cat ? 'bg-[#002366] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((part) => (
          <div key={part.id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1A1A1A]">{part.name}</p>
              <p className="text-xs text-gray-500">{part.category}</p>
              <p className="text-xs text-gray-400">{part.vendor.shopName}</p>
            </div>
            <p className="text-sm font-bold text-[#1A1A1A]">{part.price.toLocaleString('fr-FR')} F</p>
          </div>
        ))}
      </div>
    </div>
  )
}
