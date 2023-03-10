const redis = require('redis')
const InvariantError = require('../../exceptions/InvariantError')

class CacheService {
  constructor() {
    this._client = redis.createClient({
      socket: {
        host: process.env.REDIS_SERVER,
      },
    })

    this._client.on('error', (error) => {
      throw new InvariantError(error)
    })

    this._client.connect()
  }

  async set(key, value, expInSec = 1800) {
    await this._client.set(key, value, {
      EX: expInSec,
    })
  }

  async get(key) {
    const result = await this._client.get(key)
    if (!result) throw new Error('Cache not found')
    return result
  }

  del(key) {
    return this._client.del(key)
  }
}

module.exports = CacheService
