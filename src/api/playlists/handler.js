class playlistsHandler {
  constructor(service, validator) {
    this._service = service
    this._validator = validator
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistSchema(request.payload)
    const { name } = request.payload

    const { id: credentialId } = request.auth.credentials
    const id = await this._service.addPlaylist(name, credentialId)

    const response = h.response({
      status: 'success',
      data: {
        playlistId: id,
      },
    })

    response.code(201)
    return response
  }

  async getPlaylistsHandler(request) {
    const { id: userId } = request.auth.credentials
    const result = await this._service.getPlaylists(userId)

    return {
      status: 'success',
      data: {
        playlists: result,
      },
    }
  }

  async deletePlaylistHandler(request) {
    const { playlistId } = request.params
    const { id: credentialId } = request.auth.credentials

    await this._service.verifyPlaylistOwner(playlistId, credentialId)
    await this._service.deletePlaylistById(playlistId)

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    }
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePostSongToPlaylistSchema(request.payload)

    const { songId } = request.payload
    const { playlistId } = request.params
    const { id: userId } = request.auth.credentials

    await this._service.verifyPlaylistAccess(playlistId, userId)
    await this._service.addSongToPlaylist(songId, playlistId)
    await this._service.addPlaylistActivities('add', {
      playlistId,
      userId,
      songId,
    })

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
    })

    response.code(201)
    return response
  }

  async getSongsFromPlaylistHandler(request) {
    const { playlistId } = request.params
    const { id: credentialId } = request.auth.credentials

    await this._service.verifyPlaylistAccess(playlistId, credentialId)
    const playlistData = await this._service.getPlaylistById(playlistId)
    const songsData = await this._service.getSongsFromPlaylist(playlistId)

    return {
      status: 'success',
      data: {
        playlist: {
          ...playlistData,
          songs: songsData,
        },
      },
    }
  }

  async deleteSongFromPlaylistHandler(request) {
    this._validator.validateDeleteSongFromPlaylistSchema(request.payload)

    const { playlistId } = request.params
    const { songId } = request.payload
    const { id: userId } = request.auth.credentials

    await this._service.verifyPlaylistAccess(playlistId, userId)
    await this._service.deleteSongFromPlaylistBySongId(songId, playlistId)
    await this._service.addPlaylistActivities('delete', {
      playlistId,
      userId,
      songId,
    })

    return {
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist',
    }
  }

  async getPlalistActivitiesHandler(request) {
    const { playlistId } = request.params
    const { id: userId } = request.auth.credentials

    await this._service.verifyPlaylistAccess(playlistId, userId)
    const activities = await this._service.getPlaylistActivityById(playlistId)

    return {
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    }
  }
}

module.exports = playlistsHandler
