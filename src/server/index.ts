import path from 'path'
import {createConnection} from 'net'
import {PassThrough} from 'stream'

import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'

import {Config, getStatus, start, stop} from './camera'
import {getUPSstate} from './ups'

let streamerPort = 8080
export const VIDEO_BOUNDARY = '--videoboundary'

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
  await start(request.body, {
    port: request.body.port || streamerPort,
    videoBoundary: VIDEO_BOUNDARY,
  })
  reply.send({result: 'started'})
})

fastify.post<{Body: Config}>('/actions/startudp', async (request, reply) => {
  await start(request.body, {
    port: request.body.port || streamerPort,
    udp: true,
  })
  reply.send({result: 'started'})
})

fastify.post<{Body: Config}>('/actions/starttest', async (request, reply) => {
  await start(request.body, {
    port: request.body.port || streamerPort,
    udp: true,
    test: true,
  })
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

fastify.get('/stream.mjpeg', (request, reply) => {
  const client = createConnection({port: streamerPort}, () => {
    const pipe = new PassThrough()
    client.pipe(pipe)
    reply.raw.writeHead(200, {
      'content-type': `multipart/x-mixed-replace;boundary=${VIDEO_BOUNDARY}`,
    })
    pipe.on('data', (data: Buffer) => {
      reply.raw.write(data)
    })
  })

  client.on('error', (err) => {
    console.log('socket error', err)
    reply.send(err)
  })

  client.on('close', () => {
    console.log('socket closed')
    if (!reply.sent) {
      client.destroy()
      reply.raw.end()
    }
  })

  request.raw.on('error', () => {
    console.log('client disconnected')
    client.destroy()
  })
})

fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening on ${address}`)
})
