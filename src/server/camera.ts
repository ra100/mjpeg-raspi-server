import {spawn, execSync, ChildProcess} from 'child_process'

export type Config = {
  fps?: number
  width?: number
  aspectRatio?: number
  args?: string
}

type Status = 'running' | 'closed' | 'starting' | 'camera_on' | 'errored'

const task: {
  instance: ChildProcess | null
  status: Status
  messages: Set<string>
} = {
  instance: null,
  status: 'closed',
  messages: new Set(),
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
    `input_raspicam.so ${[
      '-fps',
      fps,
      '-x',
      width,
      '-y',
      Math.floor(width / aspectRatio),
      args,
    ]
      .filter(Boolean)
      .join(' ')}`,
  ].filter(Boolean)

export const start = (config: Config): Promise<void> => {
  if (task.instance?.pid) {
    task.messages.add('\nCamera already running\n')
    return Promise.resolve()
  }

  const path = process.env.MJPEG_CAMERA_PATH || __dirname

  const options = getCameraOptions(config)

  console.log('Starging ', path, options)

  task.instance = spawn('./mjpg_streamer', options, {cwd: path})

  task.instance.on('message', (message: string) => {
    console.log('Message from process\n', message)
  })

  task.instance.on('spawn', () => {
    task.status = 'running'
  })

  task.instance.on('error', () => {
    task.status = 'errored'
  })

  return new Promise((resolve, reject) => {
    const closeListener = (code: number) => {
      task.status = 'closed'
      task.messages.add(`child task exited with code ${code}`)
      task.instance.removeAllListeners()
      reject()
    }

    const messageListener = (data: Buffer) => {
      const message = data.toString()
      task.messages.add(message)
      console.log(message)

      if (message.includes('Encoder Buffer Size')) {
        task.status = 'camera_on'
        task.instance.off('exit', closeListener)
        resolve()
      }
    }

    task.instance.stdout.on('data', messageListener)
    task.instance.stderr.on('data', messageListener)
    task.instance.on('exit', closeListener)
  })
}

const forceKillMjpg = () => {
  try {
    execSync('pkill -f mjpg_streamer')
  } catch (e) {
    task.messages.add('Failed to kill mjpg_streamer')
    task.messages.add(e.message)
  }
}

export const stop = (): Promise<void> => {
  if (!task.instance.pid) {
    forceKillMjpg()
    task.instance = null
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    task.instance.on('exit', (code) => {
      task.status = 'closed'
      task.instance.removeAllListeners()
      task.instance = null
      resolve()
    })

    task.instance.kill('SIGTERM')
  })
}

export const getStatus = (): {
  status: string
  messages: string
} => {
  const messages = [...task.messages].join('\n')
  task.messages.clear()

  return {
    status: task.status,
    messages,
  }
}
