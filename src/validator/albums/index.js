const InvariantError = require('../../exceptions/InvariantError')
const { AlbumPayloadSchema, UploadImageHeadersSchema } = require('./schema')

const AlbumsValidator = {
  validateAlbumPayload: (payload) => {
    const validationResult = AlbumPayloadSchema.validate(payload)
    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message)
    }
  },
  validateUploadCoverHeadersSchema: (header) => {
    const validationResult = UploadImageHeadersSchema.validate(header)

    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message)
    }
  },
}

module.exports = AlbumsValidator
