import type { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'

export async function cors(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    // Les vitrines de sous-domaine (flotte, logistique) appellent l'API en
    // direct plutôt que via le proxy Next : le multipart 5 Mo traverse mal le
    // Worker open-next, et le proxy masquerait l'IP visiteur dont l'anti-abus
    // du formulaire public a besoin. Cette liste est donc load-bearing.
    origin: [
      'https://pieces.ci',
      'https://flotte.pieces.ci',
      'https://logistique.pieces.ci',
      // La console ERP appelle l'API via le proxy Next (même origine), donc
      // CORS ne la concerne pas aujourd'hui. Elle est listée quand même : les
      // modules /admin restent joignables depuis ce domaine (passe-droit du
      // lot 1) et certains téléversent en direct pour la même raison que les
      // vitrines. Sans cette ligne, la panne serait silencieuse et lointaine.
      'https://erp.pieces.ci',
      'http://localhost:3000',
    ],
    credentials: true,
  })
}
