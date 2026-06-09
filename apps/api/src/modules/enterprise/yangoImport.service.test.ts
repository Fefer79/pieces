import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const driverFindMany = vi.fn()
const driverCreateMany = vi.fn()
const vehicleCreateMany = vi.fn()
const vehicleCreateManyAndReturn = vi.fn()
const driverAssignmentUpdateMany = vi.fn()
const driverAssignmentCreate = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    driver: {
      findMany: (...a: unknown[]) => driverFindMany(...a),
      createMany: (...a: unknown[]) => driverCreateMany(...a),
    },
    vehicle: {
      createMany: (...a: unknown[]) => vehicleCreateMany(...a),
      createManyAndReturn: (...a: unknown[]) => vehicleCreateManyAndReturn(...a),
    },
    driverAssignment: {
      updateMany: (...a: unknown[]) => driverAssignmentUpdateMany(...a),
      create: (...a: unknown[]) => driverAssignmentCreate(...a),
    },
    enterpriseMember: {
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
    },
  },
}))

const { importYangoFromCsv, isYangoExport } = await import('./yangoImport.service.js')

const HEADER =
  "Lead ID;Identifiant du contractant;Nom complet;Statut;Nom de code;Numéro de téléphone;Solde;Limite;Conditions du partenariat;Permis de conduire;Véhicule;Numéro de la plaque d'immatriculation du véhicule;Règles de paiement;Date de la dernière commande;Date de fin;Type de recrutement;Date de début;Commentaire;Profession;Note;Priorité;Source;Tâche;Employé responsable;Date de la prochaine interaction;Ville;Commandes terminées;Détails;Reason for rejection;Date de la première commande;Date d'ajout"

// Construit une ligne Yango : nom, tel, permis, véhicule, plaque, dateDébut.
function row(name: string, tel: string, permis: string, veh: string, plaque: string, debut = '2026-04-02') {
  return `lead;cid;${name};Actif;CODE;${tel};0;-5;On staff;${permis};${veh};${plaque};;;;Prestataire;${debut};;Taxi driver;;;Flotte;;;;;0;;;;${debut}`
}

beforeEach(() => {
  vi.clearAllMocks()
  enterpriseMemberFindUnique.mockResolvedValue({ role: 'OWNER' })
  driverFindMany.mockResolvedValue([]) // 1er appel : téléphones existants (aucun)
  driverCreateMany.mockResolvedValue({ count: 0 })
})

describe('enterprise/yangoImport', () => {
  it('reconnaît un export Yango et rejette un fichier étranger', () => {
    expect(isYangoExport(HEADER.split(';'))).toBe(true)
    expect(isYangoExport(['marque', 'modele', 'annee'])).toBe(false)
  })

  it('crée chauffeurs + véhicules dédoublonnés par plaque + affectation, depuis un BOM/;', async () => {
    const csv =
      '﻿' +
      [
        HEADER,
        row('Allou Bile', '+2250594171714', 'ALLO01', 'Suzuki Dzire', '1750WWCI01'),
        row('Bagnon Archil', '+2250506367886', 'BAGN01', 'Suzuki S-Presso', '31422-WW-CI-01'),
        // même plaque que Allou (canonique) → véhicule non recréé
        row('Sana Soumaila', '+2250769759802', 'SANA01', 'Suzuki Dzire', '1750-WW-CI-01'),
        // pas de véhicule → chauffeur seul
        row('Kone Bourama', '+2250759742802', 'KONE01', '', ''),
      ].join('\n')

    // Pour l'affectation : la 2e lecture de driver.findMany renvoie les chauffeurs créés.
    driverFindMany
      .mockResolvedValueOnce([]) // téléphones existants
      .mockResolvedValueOnce([
        { id: 'd1', name: 'Allou Bile' },
        { id: 'd2', name: 'Bagnon Archil' },
        { id: 'd3', name: 'Sana Soumaila' },
        { id: 'd4', name: 'Kone Bourama' },
      ])
    vehicleCreateManyAndReturn.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }])

    const res = await importYangoFromCsv('ent-1', 'user-1', csv)

    // 4 chauffeurs créés
    expect(driverCreateMany).toHaveBeenCalledOnce()
    const driverData = driverCreateMany.mock.calls[0][0].data as { name: string; phone: string }[]
    expect(driverData).toHaveLength(4)
    expect(driverData[0]).toMatchObject({ name: 'Allou Bile', phone: '+2250594171714' })

    // 2 véhicules uniques (plaque 1750WWCI01 dédoublonnée)
    const vehData = vehicleCreateManyAndReturn.mock.calls[0][0].data as {
      brand: string; model: string; year: number; plate: string
    }[]
    expect(vehData).toHaveLength(2)
    expect(vehData[0]).toMatchObject({ brand: 'Suzuki', model: 'Dzire', year: 2025, plate: '1750WWCI01' })
    expect(vehData[1]).toMatchObject({ brand: 'Suzuki', model: 'S-Presso', year: 2025, plate: '31422WWCI01' })

    // 2 affectations (Allou→v1, Bagnon→v2)
    expect(driverAssignmentCreate).toHaveBeenCalledTimes(2)
    expect(res.drivers.created).toBe(4)
    expect(res.vehicles.created).toBe(2)
    expect(res.vehicles.assigned).toBe(2)
  })
})
