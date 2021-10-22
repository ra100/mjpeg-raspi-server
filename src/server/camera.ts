import {spawn, ChildProcess} from 'child_process'

export type Config = {}

const process: {
  instance: ChildProcess | null
  status: string
  messages: Set<string>
  errors: Set<string>
} = {
  instance: null,
  status: 'closed',
  messages: new Set(),
  errors: new Set(),
}

export const start = (config: Config): Promise<void> => {
  process.instance = spawn('watch', ['ls'])

  process.instance.stdout.on('data', (data: Buffer) => {
    process.messages.add(data.toString())
  })

  process.instance.stderr.on('data', (data: Buffer) => {
    process.messages.add(data.toString())
  })

  process.instance.on('close', code => {
    process.status = 'closed'
    console.log(`child process exited with code ${code}`)
  })

  return new Promise((resolve, reject) => {
    process.instance.on('spawn', () => {
      process.status = 'running'
      resolve()
    })

    process.instance.on('error', () => {
      process.status = 'running'
      reject()
    })
  })
}

export const stop = (): Promise<void> => {
  process.instance.kill()

  return new Promise(resolve => {
    process.instance.on('close', code => {
      process.status = 'closed'
      resolve()
    })
  })
}

export const getStatus = (): {
  status: string
  messages: string
  errors: string
} => {
  const messages = [...process.messages].join('\n')
  const errors = [...process.errors].join('\n')
  process.messages.clear()
  process.errors.clear()

  return {
    status: process.status,
    messages,
    errors,
  }
}
