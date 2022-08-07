<script lang="ts">
	import {onMount} from 'svelte';

	import type {UPSstate} from "../server/ups";

  export let message: string = ''
	export let logs: string = ''
	export let udp: boolean = false
	export let status: string = 'offline'
	export let battery: UPSstate | null = null
	export let fullscreen = false
	export const config = {
		fps: 24,
		port: 8080,
	}
	export const streamUrl: string = '/stream.mjpeg';

	const CONFIG_KEY = 'mjpeg:config'

  const callApi = async (path: string, method: 'POST' | 'GET' = 'POST', body?: Record<string, any>) => {
		message = 'Loading'

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
		udp = false
		const configToSave = JSON.stringify(config)
		localStorage.setItem(CONFIG_KEY, configToSave)

		await	callApi('actions/start', 'POST', config)
		await handleLogs()
	}

	const handleStartUdp = async () => {
		udp = true
		const configToSave = JSON.stringify(config)
		localStorage.setItem(CONFIG_KEY, configToSave)

		await	callApi('actions/startudp', 'POST', config)
		await handleLogs()
	}

	const handleStartTest = async () => {
		udp = true
		const configToSave = JSON.stringify(config)
		localStorage.setItem(CONFIG_KEY, configToSave)

		await	callApi('actions/starttest', 'POST', config)
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

	const toggleFullscreen = () => {
		fullscreen = !fullscreen
	}

	onMount(() => {
		getBattery()
		setInterval(getBattery, 20_000)

		const savedConfig = localStorage.getItem(CONFIG_KEY)
		if (savedConfig) {
			try {
				const parsed = JSON.parse(savedConfig)
				config.fps = parsed.fps
				config.port = parsed.port
			} catch (err) {
				console.error(err)
			}
		}
	})
</script>

<main>
  <button on:click={handleStart}>Start</button>
	<button on:click={handleStartUdp}>Start UDP</button>
	<button on:click={handleStartTest}>Start Test</button>
  <button on:click={handleStop}>Stop</button>
  <button on:click={handleLogs}>Get Logs</button>
  <button on:click={handleClearLogs}>Clear Logs</button>
	<div class="config">
		<div class="field-fps field">
			<label for="fps">FPS</label>
			<input type="number" name="fps" bind:value={config.fps}/>
		</div>
		<div class="field-port field">
			<label for="port">PORT</label>
			<input type="number" name="port" bind:value={config.port}/>
		</div>
	</div>
	{#if !udp}
		<a href={streamUrl} target="_blank" class="stream-button">Open video stream</a>
	{/if}
	{#if udp}
		<code>gst-launch-1.0 udpsrc port={config.port} ! application/x-rtp, payload=26 ! rtpjpegdepay ! jpegdec ! videoconvert ! xvimagesink</code>
	{/if}
	{#if status === 'camera_on' && !udp}
		<div class="video-wrapper" class:fullscreen={fullscreen}>
			<img src={streamUrl} alt="Video Stream" class="video" on:click={toggleFullscreen}/>
		</div>
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
		justify-content: center;
		align-items: center;
	}

	.field {
		margin: 0 1rem;
	}

	.field-fps {
		max-width: 3rem;
		flex: 1;
	}

	.field-port {
		width: 6rem;
		flex: 1;
	}

	.video-wrapper {
		width: 100vw;
	}

	.video-wrapper.fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		background-color: #000000;
		height: 100vh;
		width: 100vw;
	}

	.fullscreen .video {
		width: 100vw;
	}

	.video {
		clear: both;
		margin: auto;
	}

	input {
		max-width: 100%;
	}

	.stream-button {
		clear: both;
		margin: auto;
		width: 100%;
		text-align: center;
	}
</style>
