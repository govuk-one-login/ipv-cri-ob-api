type TokenProvider = () => Promise<string>

const createBaseHttpClient = (tokenProvider: TokenProvider) => {
  return {
    post: async (path: string, body: string): Promise<Response> => {
      const token = await tokenProvider()

      return fetch(path, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
    }
  }
}

export { createBaseHttpClient }
