class AlbumsHandler {
  constructor(service, validator) {
    this._service = service
    this._validator = validator
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload)
    const { name, year } = request.payload

    const albumId = await this._service.addAlbum({ name, year })

    const response = h.response({
      status: 'success',
      data: {
        albumId,
      },
    })
    response.code(201)
    return response
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params
    const album = await this._service.getAlbumById(id)
    return {
      status: 'success',
      data: {
        album,
      },
    }
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload)
    const { name, year } = request.payload
    const { id } = request.params

    await this._service.editAlbumById(id, { name, year })

    return {
      status: 'success',
      message: 'Album berhasil diperbarui',
    }
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params
    await this._service.deleteAlbumById(id)

    return {
      status: 'success',
      message: 'Album berhasil dihapus',
    }
  }

  async postAlbumCoverHandler(request, h) {
    const { cover } = request.payload
    const { id } = request.params

    this._validator.validateUploadCoverHeadersSchema(cover.hapi.headers)
    const filename = await this._service.uploadCover(cover)
    await this._service.editAlbumCoverById(id, filename)

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    })

    response.code(201)
    return response
  }

  async postAlbumLikeHandler(request, h) {
    const { id } = request.params
    const { id: userId } = request.auth.credentials

    const isAlbumsLike = await this._service.verifyExistAlbumLikeStatusById(id, userId)
    if (isAlbumsLike > 0) {
      await this._service.deleteAlbumLikeStatusById(id, userId)
      const response = h.response({
        status: 'success',
        message: 'Berhasil melakukan dislike pada album!',
      })
      response.code(201)
      return response
    }
    await this._service.addAlbumLikeStatus(id, userId)

    const response = h.response({
      status: 'success',
      message: 'Berhasil menyukai album!',
    })
    response.code(201)
    return response
  }

  async getAlbumLikesHandler(request, h) {
    const { id } = request.params
    const { count, isCache } = await this._service.getAlbumLikesCountByAlbumId(id)

    const response = {
      status: 'success',
      data: { likes: count },
    }

    if (isCache) {
      return h.response(response).header('X-Data-Source', 'cache')
    }

    return response
  }
}

module.exports = AlbumsHandler
