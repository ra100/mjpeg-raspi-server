const registerClickEvent = (id, callback) => {
  document.getElementById(id).addEventListener('click', callback)
}

const callApi = async path => {
  const response = await fetch(path, {method: 'POST'})
  const json = await response.json()
  console.log(json)
}

document.addEventListener('DOMContentLoaded', () => {
  registerClickEvent('start', () => callApi('actions/start'))
  registerClickEvent('stop', () => callApi('actions/stop'))
})
