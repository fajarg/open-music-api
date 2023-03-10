const { Pool } = require('pg')
const { nanoid } = require('nanoid')
const InvariantError = require('../../exceptions/InvariantError')
const NotFoundError = require('../../exceptions/NotFoundError')
const AuthorizationError = require('../../exceptions/AuthorizationError')

class PlaylistsService {
  constructor({ collaborationsService, songsService, cacheService }) {
    this._pool = new Pool()
    this._collaborationsService = collaborationsService
    this._songsService = songsService
    this._cacheService = cacheService
  }

  async addPlaylist(name, owner) {
    const id = `playlist-${nanoid(16)}`
    const query = {
      text: 'INSERT INTO playlists VALUES ($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    }

    const result = await this._pool.query(query)

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan')
    }

    await this._cacheService.del('playlists')
    return result.rows[0].id
  }

  async getPlaylists(owner) {
    try {
      const result = await this._cacheService.get('playlists')
      return JSON.parse(result)
    } catch {
      const query = {
        text: `
            SELECT playlists.id, playlists.name, users.username
            FROM playlists
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            INNER JOIN users ON playlists.owner = users.id
            WHERE playlists.owner = $1 OR collaborations.user_id = $1
            GROUP BY playlists.id, users.id
          `,
        values: [owner],
      }

      const result = await this._pool.query(query)
      await this._cacheService.set('playlists', JSON.stringify(result.rows))

      return result.rows
    }
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1',
      values: [id],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new NotFoundError('Gagal menghapus playlist, Id tidak ditemukan')
    }

    await this._cacheService.del('playlists')
  }

  async addSongToPlaylist(songId, playlistId) {
    await this._songsService.verifyExistingSongById(songId)

    const id = `playlist-songs-${nanoid(16)}`
    const query = {
      text: 'INSERT INTO playlist_songs VALUES ($1, $2, $3)',
      values: [id, playlistId, songId],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new InvariantError('Gagal menambahkan lagu ke playlist')
    }

    await this._cacheService.del(`playlist:song:${playlistId}`)
  }

  async getPlaylistById(playlistId) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username FROM playlists
        LEFT JOIN users ON users.id = playlists.owner
        WHERE playlists.id = $1
      `,
      values: [playlistId],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan')
    }

    return result.rows[0]
  }

  async getSongsFromPlaylist(playlistId) {
    try {
      const result = await this._cacheService.get(`playlist:song:${playlistId}`)
      return JSON.parse(result)
    } catch {
      const query = {
        text: `
            SELECT songs.id, songs.title, songs.performer FROM songs
            LEFT JOIN playlist_songs ON songs.id = playlist_songs.song_id
            WHERE playlist_songs.playlist_id = $1
            GROUP BY songs.id
          `,
        values: [playlistId],
      }
      const result = await this._pool.query(query)

      await this._cacheService.set(`playlist:song:${playlistId}`, JSON.stringify(result.rows))
      return result.rows
    }
  }

  async deleteSongFromPlaylistBySongId(songId, playlistId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE song_id = $1',
      values: [songId],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new InvariantError('Gagal menghapus lagu dari playlist')
    }

    await this._cacheService.del(`playlist:song:${playlistId}`)
  }

  async verifyPlaylistOwner(playlistId, owner) {
    const query = {
      text: 'SELECT id, owner FROM playlists WHERE id = $1',
      values: [playlistId],
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan')
    }

    const playlist = result.rows[0]
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak mempunyai hak untuk akses')
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }

      try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId)
      } catch {
        throw error
      }
    }
  }

  async addPlaylistActivities(type, { playlistId, userId, songId }) {
    const id = `activity-${nanoid(16)}`
    const timeNow = new Date().toISOString()

    const query = {
      text:
        'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, userId, type, timeNow],
    }

    const result = await this._pool.query(query)
    if (!result.rowCount) {
      throw new InvariantError('Gagal menambahkan aktivitas pada playlist')
    }

    await this._cacheService.del(`playlist:activities:${playlistId}`)
  }

  async getPlaylistActivityById(playlistId) {
    try {
      const history = await this._cacheService.get(`playlist:activities:${playlistId}`)
      return JSON.parse(history)
    } catch {
      const query = {
        text: `
            SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time FROM playlist_song_activities
            INNER JOIN users ON users.id = playlist_song_activities.user_id
            INNER JOIN songs ON songs.id = playlist_song_activities.song_id
            WHERE playlist_song_activities.playlist_id = $1
          `,
        values: [playlistId],
      }

      const result = await this._pool.query(query)

      if (!result.rowCount) {
        throw new NotFoundError('playlist tidak ditemukan')
      }
      await this._cacheService.set(`playlist:activities:${playlistId}`, JSON.stringify(result.rows))

      return result.rows
    }
  }
}

module.exports = PlaylistsService
