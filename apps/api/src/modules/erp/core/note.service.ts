import { prisma } from '../../../lib/prisma.js'
import { requireStaffId, type ErpStaffContext } from '../../../plugins/erpAuth.js'
import type { CreateNoteInput, NoteListQuery } from 'shared/validators'

// Notes internes. À distinguer d'`ActivityLog` : celui-ci est un journal
// d'audit écrit par la machine, celles-ci sont de la saisie humaine
// (« relancé, rappelle lundi », « RIB reçu par WhatsApp »).

const NOTE_SELECT = {
  id: true,
  body: true,
  relatedType: true,
  relatedId: true,
  pinned: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      staffRole: true,
      user: { select: { name: true } },
    },
  },
} as const

export async function listNotes(query: NoteListQuery) {
  const where = { relatedType: query.relatedType, relatedId: query.relatedId }

  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: NOTE_SELECT,
    }),
    prisma.note.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function createNote(input: CreateNoteInput, staff: ErpStaffContext) {
  const authorStaffId = requireStaffId(staff)

  return prisma.note.create({
    data: {
      body: input.body,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      pinned: input.pinned,
      authorStaffId,
    },
    select: NOTE_SELECT,
  })
}
