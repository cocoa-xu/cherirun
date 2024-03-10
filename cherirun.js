const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const fs = require('fs');
const { rateLimit } = require('express-rate-limit');
const pino = require('pino');
const pinoms = require('pino-multi-stream');
let log_dir = './logs';
const streams = [
  { stream: process.stdout },
  { stream: fs.createWriteStream(`${log_dir}/cherirun.log`, { flags: 'a' }) },
]
const logger = pino({ level: 'info' }, pinoms.multistream(streams));
const pino_http = require('pino-http')({logger});

const server_port = 4000;
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.set('trust proxy', 1);
app.use('/run', limiter);
app.use(express.static('static'));
app.use(pino_http);
app.set('view engine', 'pug');

const code = `# You can run CheriBSD locally 
# with Docker using the following commands
docker pull cocoa-xu/cheribsd-purecap
docker run -it --rm cocoa-xu/cheribsd-purecap

# Additionally, you can pass your custom CPU and RAM configuration
# when running the Docker image locally, for example
NCPUS=8
MEMORY=8192
docker run -it --rm cocoa-xu/cheribsd-purecap \${NCPUS} \${MEMORY}`;
const run_url = `/cloudshell`;

app.get('/', (req, res) => {
  res.render('./index.pug', { message: code, run_url: run_url});
});

app.get('/cloudshell', (req, res) => {
  res.render('./cloudshell.pug', {});
});

server.listen(server_port, '127.0.0.1', () => {
  logger.info({event: 'server_start', port: server_port});
});
