import {spawn, ChildProcess} from 'child_process'

export type Config = {
  fps?: number
  width?: number
  aspectRatio?: number
  args?: string
}

type Status = 'running' | 'closed' | 'starting' | 'camera_on'

const task: {
  instance: ChildProcess | null
  status: Status
  messages: Set<string>
  errors: Set<string>
} = {
  instance: null,
  status: 'closed',
  messages: new Set(),
  errors: new Set(),
}

const defaultAspectRatio = 1920 / 1080

const getCameraOptions = ({
  fps = 5,
  width = 800,
  aspectRatio = defaultAspectRatio,
  args = '',
}: Config = {}): string[] =>
  [
    '-o',
    `output_http.so -w ./www -p 8080`,
    '-i',
    'input_raspicam.so',
    '-fps',
    `${fps}`,
    '-x',
    `${width}`,
    '-y',
    `${Math.floor(width / aspectRatio)}`,
    args,
  ].filter(Boolean)

export const start = (config: Config): Promise<void> => {
  const path = process.env.MJPEG_CAMERA_PATH || __dirname
  task.instance = spawn('mjpg_streamer', getCameraOptions(), {cwd: path})

  task.instance.stdout.on('data', (data: Buffer) => {
    task.messages.add(data.toString())
  })

  task.instance.stderr.on('data', (data: Buffer) => {
    task.messages.add(data.toString())
  })

  return new Promise((resolve, reject) => {
    task.instance.on('spawn', () => {
      task.status = 'running'
      resolve()
    })

    task.instance.on('error', () => {
      task.status = 'running'
      reject()
    })

    task.instance.on('close', (code) => {
      task.status = 'closed'
      task.messages.add(`child task exited with code ${code}`)
      reject()
    })
  })
}

export const stop = (): Promise<void> => {
  if (task.status !== 'running') {
    return Promise.resolve()
  }

  task.instance.kill()

  return new Promise((resolve) => {
    task.instance.on('close', (code) => {
      task.status = 'closed'
      resolve()
    })
  })
}

export const getStatus = (): {
  status: string
  messages: string
  errors: string
} => {
  const messages = [...task.messages].join('\n')
  const errors = [...task.errors].join('\n')
  task.messages.clear()
  task.errors.clear()

  return {
    status: task.status,
    messages,
    errors,
  }
}
