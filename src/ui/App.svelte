<script lang="ts">
	import {onMount} from 'svelte';

	import type {UPSstate} from "../server/ups";

  export let message: string = ''
	export let logs: string = ''
	export let status: string = 'offline'
	export let battery: UPSstate | null = null
	export const config = {
		fps: 5,
		width: 800,
		aspectRatio: 1920 / 1080,
		args: ''
	}
	export const streamUrl: string = `http://${document.domain}:8080/?action=stream`;

	const CONFIG_KEY = 'mjpeg:config'

  const callApi = async (path: string, method: 'POST' | 'GET' = 'POST', body?: Record<string, any>) => {
		message = 'Loading'

		const configToSave = JSON.stringify(config)
		localStorage.setItem(CONFIG_KEY, configToSave)

    try {
      const response = await fetch(path, {
				method,
				headers: body ? {
					'Content-Type': 'application/json'
				} : {},
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
		status = statusResponse.status
	}

	const handleClearLogs = () => {logs = ''}

	const getBattery = () => {
		callApi('battery', 'GET').then((batteryStatus) => {battery = batteryStatus})
	}

	onMount(() => {
		getBattery()
		setInterval(getBattery, 20_000)

		const savedConfig = localStorage.getItem(CONFIG_KEY)
		if (savedConfig) {
			try {
				const parsed = JSON.parse(savedConfig)
				config.fps = parsed.fps
				config.width = parsed.width
				config.aspectRatio = parsed.aspectRatio
				config.args = parsed.args
			} catch (err) {
				console.error(err)
			}
		}
	})
</script>

<main>
  <button on:click={handleStart}>Start</button>
  <button on:click={handleStop}>Stop</button>
  <button on:click={handleLogs}>Get Logs</button>
  <button on:click={handleClearLogs}>Clear Logs</button>
	<div class="config">
		<div class="field-fps field">
			<label for="fps">FPS</label>
			<input type="number" name="fps" bind:value={config.fps}/>
		</div>
		<div class="field-width field">
			<label for="width">Width</label>
			<input type="text" name="width" bind:value={config.width}/>
		</div>
		<div class="field-args field">
			<label for="args">Extra arguments <a target="_blank" href="https://github.com/jacksonliam/mjpg-streamer/blob/master/mjpg-streamer-experimental/plugins/input_raspicam/README.md">see docs</a></label>
			<input type="text" name="args" bind:value={config.args}/>
		</div>
	</div>
	<a href={streamUrl} target="_blank" class="stream-button">Open video stream</a>
	{#if status === 'camera_on'}
		<img src={streamUrl} alt="Video Stream" />
	{/if}
	<p>Status: {status} {message}
		{#if battery}
			Voltage: {battery.loadVoltage}V
			Current: {battery.current}mA
			Power: {battery.power}W
			Capacity: {Math.round(battery.percent)}%
		{/if}
	</p>
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

	.config {
		display: flex;
		flex-flow: row;
		justify-content: space-between;
		align-items: center;
	}

	.field {
		margin: 0 1rem;
	}

	.field-fps {
		width: 3rem;
	}

	.field-width {
		width: 4rem;
	}

	.field-args {
		flex: 1;
	}

	input {
		max-width: 100%;
	}

	.field-args input {
		width: 100%;
	}

	.stream-button {
		clear: both;
		margin: auto;
		width: 100%;
		text-align: center;
	}
</style>
