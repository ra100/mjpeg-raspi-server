import {spawn, execSync, ChildProcess} from 'child_process'

export type Config = {
  fps?: number
  port?: number
  videoBoundary: string
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
  fps = 24,
  port = 8080,
  videoBoundary,
}: Config): string[] => [
  'v4l2src',
  '!',
  `video/x-raw,format=UYVY,interlace-mode=progressive,colorimetry=bt601,framerate=${fps}/1`,
  '!',
  'v4l2jpegenc',
  'output-io-mode=dmabuf-import',
  '!',
  'multipartmux',
  `boundary="${videoBoundary}"`,
  '!',
  'tcpserversink',
  'host=localhost',
  `port=${port}`,
]

const closeListener = (callback?: () => void) => (code: number) => {
  task.status = 'closed'
  task.messages.add(`child task exited with code ${code}`)
  task.instance?.removeAllListeners()
  task.instance = null
  callback?.()
}

export const start = (
  config: Config,
  {port, videoBoundary}: {port: number; videoBoundary: string}
): Promise<void> => {
  if (task.instance?.pid) {
    task.messages.add('\nCamera already running\n')
    return Promise.resolve()
  }

  const options = getCameraOptions({...config, port, videoBoundary})

  console.log('Starging ', options)

  try {
    task.messages.add(execSync('v4l2-ctl --query-dv-timings').toString())
    task.messages.add(execSync('v4l2-ctl --set-dv-bt-timings query').toString())
    task.messages.add(execSync('v4l2-ctl -V').toString())
  } catch (err) {
    const error = err.message.toString()
    task.messages.add(error)
    console.error(error)
  }

  task.instance = spawn('gst-launch-1.0', options)

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
    const startFailedListener = closeListener(reject)

    const messageListener = (data: Buffer) => {
      const message = data.toString()
      task.messages.add(message)
      console.log(message)

      if (message.includes('PLAYING')) {
        task.status = 'camera_on'
        task.instance.off('exit', startFailedListener)
        task.instance.on('exit', closeListener())
        resolve()
      }
    }

    task.instance.stdout.on('data', messageListener)
    task.instance.stderr.on('data', messageListener)
    task.instance.on('exit', startFailedListener)
  })
}

const forceKillMjpg = () => {
  try {
    execSync('pkill -f gst-launch-1.0')
  } catch (e) {
    task.messages.add('Failed to kill gst-launch-1.0')
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
      task.instance?.removeAllListeners()
      task.instance = null
      resolve()
    })

    task.instance.kill('SIGINT')
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
