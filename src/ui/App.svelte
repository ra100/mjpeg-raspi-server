<script lang="ts">
  export let message: string = ''

  const callApi = async (path: string) => {
		message = 'Loading'
    try {
      const response = await fetch(path, {method: 'POST'})
      const json = await response.json()
      message = JSON.stringify(json)
    } catch (err) {
      message = err.message
    }
  }

  const handleStart = () => callApi('actions/start')
  const handleStop = () => callApi('actions/stop')
</script>

<main>
  <button on:click={handleStart}>Start</button>
  <button on:click={handleStop}>Stop</button>
  <p>{message}</p>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }
</style>
