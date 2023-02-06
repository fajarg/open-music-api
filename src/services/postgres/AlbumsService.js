const fs = require('fs')
const { Pool } = require('pg')
const { nanoid } = require('nanoid')
const InvariantError = require('../../exceptions/InvariantError')
const NotFoundError = require('../../exceptions/NotFoundError')

class AlbumsService {
  constructor({ coverUploadFolder, cacheService }) {
    this._pool = new Pool()

    this._coverUploadFolder = coverUploadFolder
    this._cacheService = cacheService

    if (!fs.existsSync(coverUploadFolder)) {
      fs.mkdirSync(coverUploadFolder, { recursive: true })
    }
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    }

    const result = await this._pool.query(query)

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan')
    }

    await this._cacheService.del('albums')
    return result.rows[0].id
  }

  async getAlbumById(id) {
    const queryAlbum = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    }
    const resultAlbum = await this._pool.query(queryAlbum)

    if (!resultAlbum.rows.length) {
      throw new NotFoundError('Album tidak ditemukan')
    }

    const querySongs = {
      text: 'SELECT id, title, performer FROM songs WHERE album_id = $1',
      values: [id],
    }
    const resultSongs = await this._pool.query(querySongs)

    const album = resultAlbum.rows[0]

    return {
      id: album.id,
      name: album.name,
      year: album.year,
      coverUrl: album.cover ? `http://${process.env.HOST}:${process.env.PORT}/albums/cover/${album.cover}` : null,
      songs: resultSongs.rows,
    }
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id',
      values: [name, year, id],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan')
    }
    await this._cacheService.del('albums')
  }

  async editAlbumCoverById(id, filename) {
    const query = {
      text: 'UPDATE albums SET cover = $1 WHERE id = $2',
      values: [filename, id],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new NotFoundError('Cannot find album ID!')
    }
    await this._cacheService.del('albums')
  }

  async deleteAlbumById(id) {
    const { coverUrl } = await this.getAlbumById(id)
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new NotFoundError('Gagal menghapus album. Id tidak ditemukan')
    }

    if (coverUrl) {
      fs.unlink(`${this._coverUploadFolder}/${coverUrl}`)
    }

    await this._cacheService.del('albums')
  }

  async uploadCover(file) {
    const filename = `cover-${nanoid(12)}${file.hapi.filename}`
    const directory = `${this._coverUploadFolder}/${filename}`
    const fileStream = fs.createWriteStream(directory)

    return new Promise((resolve, reject) => {
      fileStream.on('error', (error) => reject(error))
      file.pipe(fileStream)
      file.on('end', () => resolve(filename))
    })
  }

  async _verifyExistAlbumById(id) {
    const query = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [id],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new NotFoundError('Album ID not found!')
    }
  }

  async verifyExistAlbumLikeStatusById(albumId, userId) {
    await this._verifyExistAlbumById(albumId)
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, userId],
    }

    const result = await this._pool.query(query)
    return result.rowCount
  }

  async addAlbumLikeStatus(albumId, userId) {
    const id = `like-${nanoid(16)}`
    const query = {
      text: 'INSERT INTO user_album_likes VALUES ($1, $2, $3)',
      values: [id, userId, albumId],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new InvariantError('Cannot like album ID!')
    }

    await this._cacheService.del(`album:like:${albumId}`)
  }

  async deleteAlbumLikeStatusById(albumId, userId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, userId],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new NotFoundError('Cannot find album & user ID!')
    }

    await this._cacheService.del(`album:like:${albumId}`)
  }

  async getAlbumLikesCountByAlbumId(albumId) {
    try {
      const likeCounts = await this._cacheService.get(`album:like:${albumId}`)
      return {
        count: JSON.parse(likeCounts),
        isCache: true,
      }
    } catch {
      const query = {
        text: 'SELECT user_id FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      }

      const result = await this._pool.query(query)
      if (!result.rowCount) {
        throw new NotFoundError('Cannot find album ID!')
      }
      await this._cacheService.set(`album:like:${albumId}`, JSON.stringify(result.rowCount))

      return {
        count: result.rowCount,
        isCache: false,
      }
    }
  }
}

module.exports = AlbumsService
