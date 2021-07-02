const http = require('../api/http');

module.exports = app => {
  app.use('/aiFace/dev2service/api', http);
}