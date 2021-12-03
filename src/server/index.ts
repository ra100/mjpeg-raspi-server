import path from 'path'
import net from 'net'
import {Duplex} from 'stream'

import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'

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

fastify.get('/stream', (_request, reply) => {
  const stream = new Duplex()
  const tcpServer = net.createServer((socket) => {
    socket.pipe(stream)
  })

  tcpServer.maxConnections = 1

  tcpServer.listen(streamerPort)

  reply.type('image/jpeg').send(stream)
})

fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening on ${address}`)
})
