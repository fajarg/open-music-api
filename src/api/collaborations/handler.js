class collaborationsHandler {
  constructor(
    collaborationsService,
    playlistsService,
    usersService,
    validator,
  ) {
    this._collaborationsService = collaborationsService
    this._playlistsService = playlistsService
    this._usersServices = usersService
    this._validator = validator
  }

  async postCollaborationHandler(request, h) {
    this._validator.validatePostCollaborationSchema(request.payload)

    const { id: credentialId } = request.auth.credentials
    const { playlistId, userId } = request.payload

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId)
    await this._usersServices.verifyExistingUserWithUserId(userId)
    const id = await this._collaborationsService.addCollaboration(
      playlistId,
      userId,
    )

    const response = h.response({
      status: 'success',
      message: 'Kolaborasi berhasil ditambahkan',
      data: {
        collaborationId: id,
      },
    })

    response.code(201)
    return response
  }

  async deleteCollaborationHandler(request) {
    this._validator.validateDeleteCollaborationSchema(request.payload)

    const { id: credentialId } = request.auth.credentials
    const { playlistId, userId } = request.payload

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId)
    await this._collaborationsService.deleteCollaboration(playlistId, userId)

    return {
      status: 'success',
      message: 'Kolaborasi berhasil dihapus',
    }
  }
}

module.exports = collaborationsHandler
