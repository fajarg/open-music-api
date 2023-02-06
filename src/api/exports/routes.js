const routes = (handler) => [
  {
    method: 'POST',
    path: '/export/playlists/{playlistId}',
    handler: (request, h) => handler.postExportSongsHandler(request, h),
    options: {
      auth: 'openmusic_jwt',
    },
  },
]

module.exports = routes
