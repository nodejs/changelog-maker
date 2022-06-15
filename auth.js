import { promisify } from 'util'
import ghauth from 'ghauth'

const authOptions = {
  configName: 'changelog-maker',
  scopes: ['repo'],
  noDeviceFlow: true
}

export async function auth () {
  return await promisify(ghauth)(authOptions)
}
