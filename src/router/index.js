const http = require('../api/http');

const AWS_IOT_THING_NAME = process.env.AWS_IOT_THING_NAME;

console.log('router index.js AWS_IOT_THING_NAME:' + AWS_IOT_THING_NAME);

module.exports = app => {
  app.use('/aiFace/dev2service/api', http);
}