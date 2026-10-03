import { consumeLoginToken } from '../db/loginTokens.js'
import { SESSION_TTL } from '../config.js'

const bodySchema = {
  type: 'object',
  required: ['token'],
  properties: { token: { type: 'string', minLength: 1 } },
}

export async function authRoutes(app) {
  app.post('/api/auth/magic', { schema: { body: bodySchema } }, async (request, reply) => {
    const userId = await consumeLoginToken(request.body.token)
    if (!userId) {
      return reply.code(401).send({ error: 'Link inválido ou expirado. Envie /painel no Telegram para gerar outro.' })
    }
    const token = app.jwt.sign({ sub: userId }, { expiresIn: SESSION_TTL })
    return { token }
  })
}
