import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...\n')

  // ─── USERS ───────────────────────────────────────────────
  const now = new Date()

  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-mechanic-001`,
        phone: '+2250701000001',
        roles: ['MECHANIC'],
        activeContext: 'MECHANIC',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-mechanic-002`,
        phone: '+2250702000002',
        roles: ['MECHANIC'],
        activeContext: 'MECHANIC',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-owner-001`,
        phone: '+2250703000003',
        roles: ['OWNER'],
        activeContext: 'OWNER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-owner-002`,
        phone: '+2250704000004',
        roles: ['OWNER'],
        activeContext: 'OWNER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-seller-001`,
        phone: '+2250705000005',
        roles: ['SELLER'],
        activeContext: 'SELLER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-seller-002`,
        phone: '+2250706000006',
        roles: ['SELLER'],
        activeContext: 'SELLER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-seller-003`,
        phone: '+2250707000007',
        roles: ['SELLER'],
        activeContext: 'SELLER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-rider-001`,
        phone: '+2250708000008',
        roles: ['RIDER'],
        activeContext: 'RIDER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-rider-002`,
        phone: '+2250709000009',
        roles: ['RIDER'],
        activeContext: 'RIDER',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-admin-001`,
        phone: '+2250700000010',
        roles: ['ADMIN'],
        activeContext: 'ADMIN',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-enterprise-001`,
        phone: '+2250700000011',
        roles: ['ENTERPRISE', 'MECHANIC'],
        activeContext: 'ENTERPRISE',
        consentedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        supabaseId: `sb-multi-001`,
        phone: '+2250700000012',
        roles: ['MECHANIC', 'OWNER'],
        activeContext: 'MECHANIC',
        consentedAt: now,
      },
    }),
  ])

  const [
    mechanic1, mechanic2, owner1, owner2,
    seller1, seller2, seller3,
    rider1, rider2, admin1, enterprise1, multiRole1
  ] = users

  console.log(`✓ ${users.length} users created`)

  // ─── VEHICLES ────────────────────────────────────────────
  const vehicles = await Promise.all([
    prisma.userVehicle.create({ data: { userId: owner1.id, brand: 'Toyota', model: 'Corolla', year: 2015, vin: 'JTDKN3DU5F0123456' } }),
    prisma.userVehicle.create({ data: { userId: owner1.id, brand: 'Peugeot', model: '308', year: 2018 } }),
    prisma.userVehicle.create({ data: { userId: owner2.id, brand: 'Nissan', model: 'Almera', year: 2012, vin: 'KNMCSHLMS6P123456' } }),
    prisma.userVehicle.create({ data: { userId: mechanic1.id, brand: 'Toyota', model: 'Hilux', year: 2020, vin: 'AHTBB3CD502123456' } }),
    prisma.userVehicle.create({ data: { userId: mechanic2.id, brand: 'Mercedes-Benz', model: 'Sprinter', year: 2017 } }),
    prisma.userVehicle.create({ data: { userId: multiRole1.id, brand: 'Hyundai', model: 'Tucson', year: 2019, vin: 'KMHJB81BFKU123456' } }),
    prisma.userVehicle.create({ data: { userId: enterprise1.id, brand: 'Toyota', model: 'Land Cruiser', year: 2021, vin: 'JTEBR3FJ1MK123456' } }),
    prisma.userVehicle.create({ data: { userId: enterprise1.id, brand: 'Mitsubishi', model: 'L200', year: 2016 } }),
  ])

  console.log(`✓ ${vehicles.length} vehicles created`)

  // ─── VENDORS ─────────────────────────────────────────────
  const vendor1 = await prisma.vendor.create({
    data: {
      userId: seller1.id,
      shopName: 'Auto Pièces Adjamé',
      contactName: 'Koné Mamadou',
      phone: seller1.phone,
      vendorType: 'FORMAL',
      status: 'ACTIVE',
      deliveryZones: ['Adjamé', 'Plateau', 'Cocody', 'Yopougon'],
    },
  })

  const vendor2 = await prisma.vendor.create({
    data: {
      userId: seller2.id,
      shopName: 'Garage Pièces Yopougon',
      contactName: 'Traoré Issa',
      phone: seller2.phone,
      vendorType: 'INFORMAL',
      status: 'ACTIVE',
      deliveryZones: ['Yopougon', 'Abobo', 'Anyama'],
    },
  })

  const vendor3 = await prisma.vendor.create({
    data: {
      userId: seller3.id,
      shopName: 'CI Pièces Auto',
      contactName: 'Bamba Drissa',
      phone: seller3.phone,
      vendorType: 'FORMAL',
      status: 'PENDING_ACTIVATION',
      deliveryZones: ['Marcory', 'Treichville', 'Koumassi'],
    },
  })

  console.log(`✓ 3 vendors created`)

  // ─── VENDOR KYC ──────────────────────────────────────────
  await Promise.all([
    prisma.vendorKyc.create({ data: { vendorId: vendor1.id, kycType: 'RCCM', documentNumber: 'CI-ABJ-2024-B-12345', isPublic: true } }),
    prisma.vendorKyc.create({ data: { vendorId: vendor2.id, kycType: 'CNI', documentNumber: 'C0012345678', isPublic: false } }),
    prisma.vendorKyc.create({ data: { vendorId: vendor3.id, kycType: 'RCCM', documentNumber: 'CI-ABJ-2025-B-67890', isPublic: true } }),
  ])

  console.log(`✓ 3 vendor KYC records created`)

  // ─── GUARANTEE SIGNATURES ───────────────────────────────
  await Promise.all([
    prisma.vendorGuaranteeSignature.create({ data: { vendorId: vendor1.id, guaranteeType: 'RETURN_48H' } }),
    prisma.vendorGuaranteeSignature.create({ data: { vendorId: vendor1.id, guaranteeType: 'WARRANTY_30D' } }),
    prisma.vendorGuaranteeSignature.create({ data: { vendorId: vendor2.id, guaranteeType: 'RETURN_48H' } }),
  ])

  console.log(`✓ 3 guarantee signatures created`)

  // ─── CATALOG ITEMS ──────────────────────────────────────
  const catalogItems = await Promise.all([
    // Vendor 1 — Auto Pièces Adjamé
    prisma.catalogItem.create({ data: {
      vendorId: vendor1.id, name: 'Filtre à huile Toyota Corolla', category: 'Filtration',
      oemReference: '90915-YZZD4', vehicleCompatibility: 'Toyota Corolla 2010-2020',
      suggestedPrice: 4500, price: 5000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.92, aiGenerated: true, qualityScore: 0.85,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor1.id, name: 'Plaquettes de frein avant Corolla', category: 'Freinage',
      oemReference: '04465-02220', vehicleCompatibility: 'Toyota Corolla 2014-2020',
      suggestedPrice: 12000, price: 15000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.88, aiGenerated: true, qualityScore: 0.90,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor1.id, name: 'Courroie de distribution Peugeot 308', category: 'Distribution',
      oemReference: '0816.K2', vehicleCompatibility: 'Peugeot 308 2014-2021',
      suggestedPrice: 18000, price: 22000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.75, aiGenerated: true, qualityScore: 0.80,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor1.id, name: 'Alternateur Toyota Hilux', category: 'Electricité',
      oemReference: '27060-0L020', vehicleCompatibility: 'Toyota Hilux 2016-2022',
      suggestedPrice: 45000, price: 55000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.82, aiGenerated: true, qualityScore: 0.78,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor1.id, name: 'Radiateur Nissan Almera', category: 'Refroidissement',
      oemReference: '21460-95F0A', vehicleCompatibility: 'Nissan Almera 2010-2018',
      suggestedPrice: 35000, price: 40000, status: 'DRAFT', inStock: true,
      aiConfidence: 0.65, aiGenerated: true, qualityScore: 0.70,
    }}),

    // Vendor 2 — Garage Pièces Yopougon
    prisma.catalogItem.create({ data: {
      vendorId: vendor2.id, name: 'Amortisseur avant Toyota Corolla', category: 'Suspension',
      oemReference: '48510-02390', vehicleCompatibility: 'Toyota Corolla 2012-2019',
      suggestedPrice: 20000, price: 25000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.91, aiGenerated: true, qualityScore: 0.88,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor2.id, name: 'Filtre à air Hyundai Tucson', category: 'Filtration',
      oemReference: '28113-D3100', vehicleCompatibility: 'Hyundai Tucson 2016-2022',
      suggestedPrice: 6000, price: 7500, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.95, aiGenerated: true, qualityScore: 0.92,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor2.id, name: 'Embrayage complet Peugeot 308', category: 'Transmission',
      oemReference: '2050.V5', vehicleCompatibility: 'Peugeot 308 2013-2020',
      suggestedPrice: 55000, price: 65000, status: 'PUBLISHED', inStock: false,
      aiConfidence: 0.78, aiGenerated: true, qualityScore: 0.82,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor2.id, name: 'Pompe à eau Mercedes Sprinter', category: 'Refroidissement',
      oemReference: 'A6512001301', vehicleCompatibility: 'Mercedes Sprinter 2014-2020',
      suggestedPrice: 30000, price: 38000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.70, aiGenerated: true, qualityScore: 0.75,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor2.id, name: 'Bougie d\'allumage Toyota Land Cruiser', category: 'Allumage',
      oemReference: '90919-01253', vehicleCompatibility: 'Toyota Land Cruiser 2016-2023',
      suggestedPrice: 3000, price: 4000, status: 'PUBLISHED', inStock: true,
      aiConfidence: 0.97, aiGenerated: true, qualityScore: 0.95,
    }}),

    // Vendor 3 — CI Pièces Auto (PENDING_ACTIVATION)
    prisma.catalogItem.create({ data: {
      vendorId: vendor3.id, name: 'Disque de frein Mitsubishi L200', category: 'Freinage',
      oemReference: 'MR407116', vehicleCompatibility: 'Mitsubishi L200 2015-2020',
      suggestedPrice: 18000, price: 20000, status: 'DRAFT', inStock: true,
      aiConfidence: 0.83, aiGenerated: true,
    }}),
    prisma.catalogItem.create({ data: {
      vendorId: vendor3.id, name: 'Bras de suspension Nissan Almera', category: 'Suspension',
      oemReference: '54500-95F0A', vehicleCompatibility: 'Nissan Almera 2010-2018',
      suggestedPrice: 15000, price: null, status: 'DRAFT', inStock: true,
      aiConfidence: 0.60, aiGenerated: true,
    }}),
  ])

  console.log(`✓ ${catalogItems.length} catalog items created`)

  // ─── ORDERS ──────────────────────────────────────────────
  // Order 1: Completed order (mechanic1 for owner1)
  const order1 = await prisma.order.create({
    data: {
      initiatorId: mechanic1.id,
      ownerPhone: owner1.phone,
      status: 'COMPLETED',
      paymentMethod: 'ORANGE_MONEY',
      shareToken: `share_${randomUUID().slice(0, 8)}`,
      totalAmount: 20000,
      deliveryFee: 2000,
      laborCost: 5000,
      paidAt: new Date(now.getTime() - 5 * 86400000),
      vendorConfirmedAt: new Date(now.getTime() - 5 * 86400000),
    },
  })

  // Order 2: In transit (mechanic2 for owner2)
  const order2 = await prisma.order.create({
    data: {
      initiatorId: mechanic2.id,
      ownerPhone: owner2.phone,
      status: 'IN_TRANSIT',
      paymentMethod: 'MTN_MOMO',
      shareToken: `share_${randomUUID().slice(0, 8)}`,
      totalAmount: 25000,
      deliveryFee: 1500,
      paidAt: new Date(now.getTime() - 2 * 86400000),
      vendorConfirmedAt: new Date(now.getTime() - 2 * 86400000),
    },
  })

  // Order 3: Pending payment (multiRole1 for self)
  const order3 = await prisma.order.create({
    data: {
      initiatorId: multiRole1.id,
      ownerPhone: multiRole1.phone,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'WAVE',
      shareToken: `share_${randomUUID().slice(0, 8)}`,
      totalAmount: 7500,
      deliveryFee: 1000,
    },
  })

  // Order 4: Cancelled order
  const order4 = await prisma.order.create({
    data: {
      initiatorId: mechanic1.id,
      ownerPhone: owner1.phone,
      status: 'CANCELLED',
      shareToken: `share_${randomUUID().slice(0, 8)}`,
      totalAmount: 65000,
      deliveryFee: 2500,
      cancelledAt: new Date(now.getTime() - 10 * 86400000),
    },
  })

  // Order 5: Delivered, awaiting confirmation
  const order5 = await prisma.order.create({
    data: {
      initiatorId: enterprise1.id,
      ownerPhone: enterprise1.phone,
      status: 'DELIVERED',
      paymentMethod: 'COD',
      shareToken: `share_${randomUUID().slice(0, 8)}`,
      totalAmount: 42000,
      deliveryFee: 3000,
      paidAt: new Date(now.getTime() - 1 * 86400000),
      vendorConfirmedAt: new Date(now.getTime() - 1 * 86400000),
    },
  })

  console.log(`✓ 5 orders created`)

  // ─── ORDER ITEMS ─────────────────────────────────────────
  await Promise.all([
    prisma.orderItem.create({ data: {
      orderId: order1.id, catalogItemId: catalogItems[0].id, vendorId: vendor1.id,
      vendorShopName: 'Auto Pièces Adjamé', name: 'Filtre à huile Toyota Corolla',
      category: 'Filtration', priceSnapshot: 5000, quantity: 1,
    }}),
    prisma.orderItem.create({ data: {
      orderId: order1.id, catalogItemId: catalogItems[1].id, vendorId: vendor1.id,
      vendorShopName: 'Auto Pièces Adjamé', name: 'Plaquettes de frein avant Corolla',
      category: 'Freinage', priceSnapshot: 15000, quantity: 1,
    }}),
    prisma.orderItem.create({ data: {
      orderId: order2.id, catalogItemId: catalogItems[5].id, vendorId: vendor2.id,
      vendorShopName: 'Garage Pièces Yopougon', name: 'Amortisseur avant Toyota Corolla',
      category: 'Suspension', priceSnapshot: 25000, quantity: 1,
    }}),
    prisma.orderItem.create({ data: {
      orderId: order3.id, catalogItemId: catalogItems[6].id, vendorId: vendor2.id,
      vendorShopName: 'Garage Pièces Yopougon', name: 'Filtre à air Hyundai Tucson',
      category: 'Filtration', priceSnapshot: 7500, quantity: 1,
    }}),
    prisma.orderItem.create({ data: {
      orderId: order4.id, catalogItemId: catalogItems[7].id, vendorId: vendor2.id,
      vendorShopName: 'Garage Pièces Yopougon', name: 'Embrayage complet Peugeot 308',
      category: 'Transmission', priceSnapshot: 65000, quantity: 1,
    }}),
    prisma.orderItem.create({ data: {
      orderId: order5.id, catalogItemId: catalogItems[3].id, vendorId: vendor1.id,
      vendorShopName: 'Auto Pièces Adjamé', name: 'Alternateur Toyota Hilux',
      category: 'Electricité', priceSnapshot: 55000, quantity: 1,
    }}),
  ])

  console.log(`✓ 6 order items created`)

  // ─── ORDER EVENTS ────────────────────────────────────────
  await Promise.all([
    // Order 1 full lifecycle
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: null, toStatus: 'DRAFT', actor: 'system' } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'DRAFT', toStatus: 'PENDING_PAYMENT', actor: mechanic1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'PAID', actor: 'cinetpay-webhook' } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'PAID', toStatus: 'VENDOR_CONFIRMED', actor: seller1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'VENDOR_CONFIRMED', toStatus: 'DISPATCHED', actor: seller1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'DISPATCHED', toStatus: 'IN_TRANSIT', actor: rider1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'IN_TRANSIT', toStatus: 'DELIVERED', actor: rider1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'DELIVERED', toStatus: 'CONFIRMED', actor: mechanic1.id } }),
    prisma.orderEvent.create({ data: { orderId: order1.id, fromStatus: 'CONFIRMED', toStatus: 'COMPLETED', actor: 'system' } }),

    // Order 2 partial lifecycle
    prisma.orderEvent.create({ data: { orderId: order2.id, fromStatus: null, toStatus: 'DRAFT', actor: 'system' } }),
    prisma.orderEvent.create({ data: { orderId: order2.id, fromStatus: 'DRAFT', toStatus: 'PENDING_PAYMENT', actor: mechanic2.id } }),
    prisma.orderEvent.create({ data: { orderId: order2.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'PAID', actor: 'cinetpay-webhook' } }),
    prisma.orderEvent.create({ data: { orderId: order2.id, fromStatus: 'PAID', toStatus: 'VENDOR_CONFIRMED', actor: seller2.id } }),
    prisma.orderEvent.create({ data: { orderId: order2.id, fromStatus: 'VENDOR_CONFIRMED', toStatus: 'IN_TRANSIT', actor: rider2.id } }),

    // Order 4 cancelled
    prisma.orderEvent.create({ data: { orderId: order4.id, fromStatus: null, toStatus: 'DRAFT', actor: 'system' } }),
    prisma.orderEvent.create({ data: { orderId: order4.id, fromStatus: 'DRAFT', toStatus: 'CANCELLED', actor: mechanic1.id, note: 'Pièce trop chère, client a refusé' } }),
  ])

  console.log(`✓ 16 order events created`)

  // ─── ESCROW TRANSACTIONS ─────────────────────────────────
  await Promise.all([
    prisma.escrowTransaction.create({ data: {
      orderId: order1.id, amount: 20000, status: 'RELEASED',
      releasedAt: new Date(now.getTime() - 3 * 86400000),
    }}),
    prisma.escrowTransaction.create({ data: {
      orderId: order2.id, amount: 25000, status: 'HELD',
    }}),
    prisma.escrowTransaction.create({ data: {
      orderId: order5.id, amount: 42000, status: 'HELD',
    }}),
  ])

  console.log(`✓ 3 escrow transactions created`)

  // ─── DELIVERIES ──────────────────────────────────────────
  const delivery1 = await prisma.delivery.create({ data: {
    orderId: order1.id, riderId: rider1.id, status: 'CONFIRMED', mode: 'STANDARD',
    pickupAddress: 'Marché Adjamé, Abidjan', pickupLat: 5.3364, pickupLng: -4.0266,
    deliveryAddress: 'Cocody Angré 7e tranche', deliveryLat: 5.3811, deliveryLng: -3.9632,
    riderLat: 5.3811, riderLng: -3.9632,
    estimatedAt: new Date(now.getTime() - 4 * 86400000),
    pickedUpAt: new Date(now.getTime() - 5 * 86400000),
    deliveredAt: new Date(now.getTime() - 4 * 86400000),
    confirmedAt: new Date(now.getTime() - 4 * 86400000),
  }})

  const delivery2 = await prisma.delivery.create({ data: {
    orderId: order2.id, riderId: rider2.id, status: 'IN_TRANSIT', mode: 'EXPRESS',
    pickupAddress: 'Yopougon Maroc, Abidjan', pickupLat: 5.3275, pickupLng: -4.0889,
    deliveryAddress: 'Plateau, Rue du Commerce', deliveryLat: 5.3207, deliveryLng: -4.0216,
    riderLat: 5.3240, riderLng: -4.0550,
    estimatedAt: new Date(now.getTime() + 3600000),
    pickedUpAt: new Date(now.getTime() - 3600000),
  }})

  await prisma.delivery.create({ data: {
    orderId: order5.id, riderId: rider1.id, status: 'DELIVERED', mode: 'STANDARD',
    pickupAddress: 'Adjamé 220 logements', pickupLat: 5.3400, pickupLng: -4.0200,
    deliveryAddress: 'Marcory Zone 4', deliveryLat: 5.3050, deliveryLng: -3.9900,
    riderLat: 5.3050, riderLng: -3.9900,
    pickedUpAt: new Date(now.getTime() - 2 * 86400000),
    deliveredAt: new Date(now.getTime() - 1 * 86400000),
    codAmount: 42000,
  }})

  console.log(`✓ 3 deliveries created`)

  // ─── REVIEWS ─────────────────────────────────────────────
  await Promise.all([
    prisma.sellerReview.create({ data: {
      orderId: order1.id, vendorId: vendor1.id, reviewerId: mechanic1.id,
      rating: 5, comment: 'Pièces de qualité, bien emballées. Merci !',
    }}),
    prisma.sellerReview.create({ data: {
      orderId: order5.id, vendorId: vendor1.id, reviewerId: enterprise1.id,
      rating: 4, comment: 'Bon service, livraison un peu lente.',
    }}),
    prisma.deliveryReview.create({ data: {
      deliveryId: delivery1.id, riderId: rider1.id, reviewerId: mechanic1.id,
      rating: 5, comment: 'Livraison rapide et soigneuse.',
    }}),
    prisma.deliveryReview.create({ data: {
      deliveryId: delivery2.id, riderId: rider2.id, reviewerId: mechanic2.id,
      rating: 3, comment: 'Un peu en retard mais pièce intacte.',
    }}),
  ])

  console.log(`✓ 4 reviews created (2 seller + 2 delivery)`)

  // ─── DISPUTES ────────────────────────────────────────────
  await Promise.all([
    prisma.dispute.create({ data: {
      orderId: order1.id, openedBy: mechanic1.id, status: 'CLOSED',
      reason: 'Filtre à huile ne correspond pas au modèle commandé',
      evidence: ['photo_filtre_recu.jpg', 'capture_commande.png'],
      resolution: 'Remplacement envoyé par le vendeur sous 48h. Client satisfait.',
      resolvedAt: new Date(now.getTime() - 2 * 86400000),
    }}),
    prisma.dispute.create({ data: {
      orderId: order5.id, openedBy: enterprise1.id, status: 'OPEN',
      reason: 'Alternateur présente des traces de rouille, état non conforme',
      evidence: ['photo_rouille_1.jpg', 'photo_rouille_2.jpg'],
    }}),
  ])

  console.log(`✓ 2 disputes created`)

  // ─── NOTIFICATION PREFERENCES ────────────────────────────
  await Promise.all([
    prisma.notificationPreference.create({ data: { userId: mechanic1.id, whatsapp: true, sms: true, push: true } }),
    prisma.notificationPreference.create({ data: { userId: mechanic2.id, whatsapp: true, sms: false, push: false } }),
    prisma.notificationPreference.create({ data: { userId: owner1.id, whatsapp: true, sms: true, push: false } }),
    prisma.notificationPreference.create({ data: { userId: owner2.id, whatsapp: false, sms: true, push: false } }),
    prisma.notificationPreference.create({ data: { userId: seller1.id, whatsapp: true, sms: true, push: true } }),
    prisma.notificationPreference.create({ data: { userId: seller2.id, whatsapp: true, sms: false, push: true } }),
    prisma.notificationPreference.create({ data: { userId: rider1.id, whatsapp: true, sms: false, push: true } }),
    prisma.notificationPreference.create({ data: { userId: rider2.id, whatsapp: true, sms: false, push: true } }),
    prisma.notificationPreference.create({ data: { userId: admin1.id, whatsapp: true, sms: true, push: true } }),
  ])

  console.log(`✓ 9 notification preferences created`)

  // ─── SEARCH SYNONYMS ────────────────────────────────────
  await Promise.all([
    prisma.searchSynonym.create({ data: { typo: 'filtre a huile', correction: 'filtre à huile' } }),
    prisma.searchSynonym.create({ data: { typo: 'plaquette frein', correction: 'plaquettes de frein' } }),
    prisma.searchSynonym.create({ data: { typo: 'amorisseur', correction: 'amortisseur' } }),
    prisma.searchSynonym.create({ data: { typo: 'bougi', correction: 'bougie' } }),
    prisma.searchSynonym.create({ data: { typo: 'amortiseur', correction: 'amortisseur' } }),
    prisma.searchSynonym.create({ data: { typo: 'alternater', correction: 'alternateur' } }),
    prisma.searchSynonym.create({ data: { typo: 'couroi', correction: 'courroie' } }),
    prisma.searchSynonym.create({ data: { typo: 'embrayag', correction: 'embrayage' } }),
    prisma.searchSynonym.create({ data: { typo: 'radiater', correction: 'radiateur' } }),
    prisma.searchSynonym.create({ data: { typo: 'pomp a eau', correction: 'pompe à eau' } }),
  ])

  console.log(`✓ 10 search synonyms created`)

  // ─── JOBS ────────────────────────────────────────────────
  await Promise.all([
    prisma.job.create({ data: {
      type: 'IMAGE_PROCESS_VARIANTS', status: 'COMPLETED',
      payload: { catalogItemId: catalogItems[0].id, imageUrl: 'uploads/filtre_huile.jpg' },
      attempts: 1, completedAt: new Date(now.getTime() - 7 * 86400000),
    }}),
    prisma.job.create({ data: {
      type: 'CATALOG_AI_IDENTIFY', status: 'COMPLETED',
      payload: { catalogItemId: catalogItems[1].id, imageUrl: 'uploads/plaquettes_frein.jpg' },
      attempts: 1, completedAt: new Date(now.getTime() - 7 * 86400000),
    }}),
    prisma.job.create({ data: {
      type: 'IMAGE_PROCESS_VARIANTS', status: 'PENDING',
      payload: { catalogItemId: catalogItems[4].id, imageUrl: 'uploads/radiateur.jpg' },
      attempts: 0,
    }}),
    prisma.job.create({ data: {
      type: 'CATALOG_AI_IDENTIFY', status: 'FAILED',
      payload: { catalogItemId: catalogItems[11].id, imageUrl: 'uploads/bras_suspension.jpg' },
      attempts: 3, error: 'Gemini API quota exceeded',
    }}),
  ])

  console.log(`✓ 4 jobs created`)

  // ─── DATA DELETION REQUESTS ──────────────────────────────
  await prisma.dataDeletionRequest.create({ data: {
    userId: owner2.id, status: 'PENDING',
  }})

  console.log(`✓ 1 data deletion request created`)

  // ─── SUMMARY ─────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log('  Seed complete! Summary:')
  console.log('═══════════════════════════════════════')
  console.log(`  Users:                  12`)
  console.log(`  Vehicles:                8`)
  console.log(`  Vendors:                 3`)
  console.log(`  Vendor KYC:              3`)
  console.log(`  Guarantee Signatures:    3`)
  console.log(`  Catalog Items:          12`)
  console.log(`  Orders:                  5`)
  console.log(`  Order Items:             6`)
  console.log(`  Order Events:           16`)
  console.log(`  Escrow Transactions:     3`)
  console.log(`  Deliveries:              3`)
  console.log(`  Seller Reviews:          2`)
  console.log(`  Delivery Reviews:        2`)
  console.log(`  Disputes:                2`)
  console.log(`  Notification Prefs:      9`)
  console.log(`  Search Synonyms:        10`)
  console.log(`  Jobs:                    4`)
  console.log(`  Data Deletion Requests:  1`)
  console.log('═══════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
