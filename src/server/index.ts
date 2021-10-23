import path from 'path'

import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import {Config, getStatus, start, stop} from './camera'

const fastify = Fastify({
  logger: true,
})

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
})

fastify.get('/', (request, reply) => {
  reply.sendFile('index.html')
})

fastify.post<{Body: Config}>('/actions/start', async (request, reply) => {
  await start(request.body)
  reply.send({result: 'started'})
})

fastify.post('/actions/stop', async (request, reply) => {
  await stop()
  reply.send({result: 'stopped'})
})

fastify.get('/status', (request, reply) => {
  reply.send(getStatus())
})

fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening on ${address}`)
})
