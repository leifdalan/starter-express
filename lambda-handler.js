const awsServerlessExpress = require("./aws-express-lambda-edge");
process.env.NODE_ENV = 'production';
const app = require('./express-app');

const binaryMimeTypes = [
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/xml',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'text/comma-separated-values',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/text',
  'text/xml',
  'application/manifest+json',
];

const server = awsServerlessExpress.createServer(app);
exports.handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line
  return awsServerlessExpress.proxy(server, event, context);
};
