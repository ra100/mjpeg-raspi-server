<script lang="ts">
  export let message: string = ''
	export let logs: string = ''
	export let status: string = 'offline'
	export const config = {
		fps: 5,
		width: 800,
		aspectRatio: 1920 / 1080,
		args: ''
	}

  const callApi = async (path: string, method: 'POST' | 'GET' = 'POST', body?: Record<string, any>) => {
		message = 'Loading'

    try {
      const response = await fetch(path, {
				method,
				body: body ? JSON.stringify(body) : null
			})

      const json = await response.json()
      message = ''

			return json
    } catch (err) {
      message = err.message
    }
  }

  const handleStart = async () => {
		await	callApi('actions/start', 'POST', config)
		await handleLogs()
	}

  const handleStop = async () => {
		await callApi('actions/stop')
		await handleLogs()
	}

  const handleLogs = async () => {
		const statusResponse = await callApi('status', 'GET')
		logs += statusResponse.messages ? `\n${new Date()}\n${statusResponse.messages}\n` : ''
		logs += statusResponse.errors ? `\n${new Date()}\n${statusResponse.errors}\n` : ''
		status = statusResponse.status
	}

	const handleClearLogs = () => {logs = ''}
</script>

<main>
  <button on:click={handleStart}>Start</button>
  <button on:click={handleStop}>Stop</button>
  <button on:click={handleLogs}>Get Logs</button>
  <button on:click={handleClearLogs}>Clear Logs</button>
	<div class="config">
		<label for="fps">FPS</label>
		<input type="number" name="fps" bind:value={config.fps}/>
		<label for="width">Width</label>
		<input type="text" name="width" bind:value={config.width}/>
		<label for="args">Extra arguments <a target="_blank" href="https://github.com/jacksonliam/mjpg-streamer/blob/master/mjpg-streamer-experimental/plugins/input_raspicam/README.md">see docs</a></label>
		<input type="text" name="args" bind:value={config.args}/>
	</div>
	<p>Status: {status} {message}</p>
	<textarea class="logs">{logs}</textarea>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }

	.logs {
		width: 500px;
		min-height: 300px;
	}
</style>
