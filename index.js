const path = require('path')

const Fastify = require('fastify')
const fastifyStatic = require('fastify-static')

const fastify = Fastify({
  logger: true,
})

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'static'),
  prefix: '/',
})

fastify.get('/', (request, reply) => {
  reply.sendFile('index.html')
})

fastify.post('/actions/start', (request, reply) => {
  reply.send({result: 'started'})
})

fastify.post('/actions/stop', (request, reply) => {
  reply.send({result: 'stopped'})
})

// Run the server!
fastify.listen(3000, (err, address) => {
  if (err) throw err
})
