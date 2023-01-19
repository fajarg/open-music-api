class AuthenticationsHandler {
  constructor(authenticationsService, usersService, tokenManager, validator) {
    this._authenticationsService = authenticationsService
    this._usersService = usersService
    this._tokenManager = tokenManager
    this._validator = validator
  }

  async postAuthenticationHandler(request, h) {
    this._validator.validatePostAuthenticationPayload(request.payload)

    const { username, password } = request.payload
    const id = await this._usersService.verifyUserCrendential(
      username,
      password,
    )

    const jwtAccessToken = await this._tokenManager.generateAccessToken({ id })
    const jwtRefreshToken = await this._tokenManager.generateRefreshToken({
      id,
    })

    await this._authenticationsService.addRefreshToken(jwtRefreshToken)

    const response = h.response({
      status: 'success',
      data: {
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
      },
    })

    response.code(201)
    return response
  }

  async putAuthenticationHandler(request) {
    this._validator.validatePutAuthenticationPayload(request.payload)

    const { refreshToken } = request.payload
    await this._authenticationsService.verifyRefreshToken(refreshToken)
    const { id } = await this._tokenManager.verifyRefreshToken(refreshToken)
    const jwtAccessToken = await this._tokenManager.generateAccessToken({ id })

    return {
      status: 'success',
      data: {
        accessToken: jwtAccessToken,
      },
    }
  }

  async deleteAuthenticationHandler(request) {
    this._validator.validateDeleteAuthenticationPayload(request.payload)

    const { refreshToken } = request.payload
    await this._tokenManager.verifyRefreshToken(refreshToken)
    await this._authenticationsService.deleteRefreshToken(refreshToken)

    return {
      status: 'success',
      message: 'Refresh token berhasil dihapus',
    }
  }
}

module.exports = AuthenticationsHandler
