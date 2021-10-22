<script lang="ts">
  export let message: string = ''
	export let logs: string = ''

  const callApi = async (path: string, method: 'POST' | 'GET' = 'POST') => {
		message = 'Loading'
    try {
      const response = await fetch(path, {method})
      const json = await response.json()
      message = ''

			return json
    } catch (err) {
      message = err.message
    }
  }

  const handleStart = () => callApi('actions/start')
  const handleStop = () => callApi('actions/stop')
  const handleLogs = async () => {
		const status = await callApi('status', 'GET')
		logs = status.messages
	}
</script>

<main>
  <button on:click={handleStart}>Start</button>
  <button on:click={handleStop}>Stop</button>
  <button on:click={handleLogs}>Get Logs</button>
  <p>{message}</p>
	<pre>{logs}</pre>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }
</style>
