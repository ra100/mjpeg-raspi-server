import path from 'path'

import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import fastifyProxy from 'fastify-http-proxy'

import {Config, getStatus, start, stop} from './camera'
import {getUPSstate} from './ups'

const streamerPort = 8080

const fastify = Fastify({
  logger: true,
})

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
})

fastify.register(fastifyProxy, {
  upstream: `http://localhost:${streamerPort}`,
  prefix: '/stream',
  http2: false,
  replyOptions: {
    rewriteHeaders: (headers) => ({
      ...headers,
      'content-type': 'image/jpeg',
    }),
  },
})

fastify.get('/', (_request, reply) => {
  reply.sendFile('index.html')
})

fastify.post<{Body: Config}>('/actions/start', async (request, reply) => {
  await start(request.body, streamerPort)
  reply.send({result: 'started'})
})

fastify.post('/actions/stop', async (_request, reply) => {
  await stop()
  reply.send({result: 'stopped'})
})

fastify.get('/status', (_request, reply) => {
  reply.send(getStatus())
})

fastify.get('/battery', (_request, reply) => {
  const batteryStatus = getUPSstate()
  reply.send(batteryStatus)
})

fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening on ${address}`)
})
