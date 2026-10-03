import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import { authRoutes } from './routes/auth.js'
import { transactionRoutes } from './routes/transactions.js'

const WEB_DIST_DIR = fileURLToPath(new URL('../../web/dist', import.meta.url))

export async function buildServer({ jwtSecret }) {
  const app = Fastify({ logger: true })

  await app.register(fastifyJwt, { secret: jwtSecret })
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (error) {
      request.log.info({ err: error }, 'Rejected request with invalid session')
      return reply.code(401).send({ error: 'Sessão expirada. Envie /painel no Telegram para entrar de novo.' })
    }
  })

  await app.register(authRoutes)
  await app.register(transactionRoutes)

  if (existsSync(WEB_DIST_DIR)) {
    await app.register(fastifyStatic, { root: WEB_DIST_DIR })
  } else {
    app.log.warn(`Web build not found at ${WEB_DIST_DIR}; run "npm run build" to serve the panel.`)
  }

  return app
}
