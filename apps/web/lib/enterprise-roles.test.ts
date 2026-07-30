import { describe, it, expect } from 'vitest'
import { can, type FleetRole } from './enterprise-roles'

const ROLES: FleetRole[] = ['OWNER', 'MANAGER', 'MECHANIC', 'ACCOUNTANT']

describe('can', () => {
  it('le propriétaire peut tout', () => {
    const actions = [
      'viewFinance',
      'viewAccounting',
      'manageFleet',
      'enterData',
      'manageMembers',
      'approve',
      'createRequest',
    ] as const
    for (const action of actions) {
      expect(can('OWNER', action)).toBe(true)
    }
  })

  it("le mécanicien ne voit ni la comptabilité ni les factures", () => {
    expect(can('MECHANIC', 'viewFinance')).toBe(false)
    expect(can('MECHANIC', 'viewAccounting')).toBe(false)
  })

  it('le mécanicien saisit et demande, mais ne gère pas le parc', () => {
    expect(can('MECHANIC', 'enterData')).toBe(true)
    expect(can('MECHANIC', 'createRequest')).toBe(true)
    expect(can('MECHANIC', 'manageFleet')).toBe(false)
    expect(can('MECHANIC', 'approve')).toBe(false)
  })

  it('le comptable lit les finances sans toucher au parc', () => {
    expect(can('ACCOUNTANT', 'viewFinance')).toBe(true)
    expect(can('ACCOUNTANT', 'viewAccounting')).toBe(true)
    expect(can('ACCOUNTANT', 'manageFleet')).toBe(false)
    expect(can('ACCOUNTANT', 'enterData')).toBe(false)
  })

  it("le gestionnaire n'accède pas au FEC", () => {
    expect(can('MANAGER', 'viewFinance')).toBe(true)
    expect(can('MANAGER', 'viewAccounting')).toBe(false)
  })

  it('seul le propriétaire gère les membres', () => {
    for (const role of ROLES) {
      expect(can(role, 'manageMembers')).toBe(role === 'OWNER')
    }
  })

  it('un rôle absent ne peut rien', () => {
    expect(can(null, 'enterData')).toBe(false)
    expect(can(undefined, 'viewFinance')).toBe(false)
  })
})
