import ghauth from 'ghauth'

const authOptions = {
  configName: 'changelog-maker',
  scopes: ['repo']
}

export async function auth () {
  return await ghauth(authOptions)
}
