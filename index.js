const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const pty = require('node-pty');
const fs = require('fs');
const pug = require('pug');
const logger = require('pino')();
const pino = require('pino-http')();
const crypto = require('crypto');

const partial_run_script = fs.readFileSync('./static/js/run.js', 'utf8');
// const max_network_lose_seconds = 2 * 60;
const max_session_seconds = 2 * 60 * 60;

app.use(express.static('static'));
app.use(pino);
app.set('view engine', 'pug');

check_configurations = (conf) => {
  let arch = conf.architecture;
  let disk_image = conf.disk_image;
  let version = conf.version;
  let error_message = '';
  if (['purecap', 'hybrid'].includes(arch) == false) {
    error_message += `error: invalid architecture: ${arch}, will use default architecture \`purecap\`\n`;
    arch = 'purecap';
  }
  if (['normal', 'minimal'].includes(disk_image) == false) {
    error_message += `error: invalid disk_image: ${disk_image}, will use default disk image type \`normal\`\n`;
    disk_image = 'normal';
  }
  if (['latest', 'v2024.01.05-f8b62f01'].includes(version) == false) {
    error_message += `error: invalid version: ${version}, will use default version \`latest\`\n`;
    version = 'latest';
  }
  let docker_image_name = '';
  if (disk_image == 'normal') {
    docker_image_name = `cocoaxu/cheribsd-${arch}:${version}`;
  } else {
    docker_image_name = `cocoaxu/cheribsd-minimal-${arch}:${version}`;
  }
  const code = `${error_message}# You're about to start a CheriBSD with the following configuration
# CPU: 2 cores
# Memory: 512MB
# CheriBSD build: ${version}
# CheriBSD architecture: ${arch}
# CheriBSD disk image: ${disk_image}

# Alternatively, you can run the same CheriBSD locally
# with Docker using the following commands
docker pull ${docker_image_name}
docker run -it --rm ${docker_image_name}

# Furthermore, you can pass your custom CPU and RAM configuration
# when running the Docker image locally, for example
NCPUS=8
MEMORY=8192
docker run -it --rm ${docker_image_name} \${NCPUS} \${MEMORY}`;
  const run_url = `/run?architecture=${arch}&disk_image=${disk_image}&version=${version}`;
  return [docker_image_name, error_message, arch, disk_image, version, code, run_url];
}

createShortHash = (address, length = 8) => {
  const hash = crypto.createHash('sha256');
  hash.update(`${address}`);
  const fullHash = hash.digest('hex');
  return fullHash.substring(0, length);
}

app.get('/', (req, res) => {
  let conf = req.query;
  if (conf == {}  || conf === undefined || (conf.architecture === undefined && conf.disk_image === undefined && conf.version === undefined)) {
    conf = {
      architecture: 'purecap',
      disk_image: 'normal',
      version: 'latest',
    }
  }

  const [_docker_image_name, _error_message, _arch, _disk_image, _version, code, run_url] = check_configurations(conf);
  res.render('./index.pug', { message: code, run_url: run_url});
});

app.get('/run', (req, res) => {
  let conf = req.query;
  if (conf == {}  || conf === undefined || (conf.architecture === undefined && conf.disk_image === undefined && conf.version === undefined)) {
    res.redirect('/');
  }
  const [docker_image_name, error_message, arch, disk_image, version, code, run_url] = check_configurations(conf);
  if (error_message != '') {
    res.render('./index.pug', { message: code, run_url: run_url});
  } else {
    const title = docker_image_name.replace('cocoaxu/', '');
    const conf_script = JSON.stringify({architecture: arch, disk_image: disk_image, version: version, title: title});
    const run_script = `const conf = ${conf_script};\n${partial_run_script}`;
    res.render('./run.pug', { run_script: run_script, title: title });
  }
});

io.on('connection', (socket) => {
  const address = socket.handshake.address;
  const user = createShortHash(address);

  logger.info(`[${user}@${address}] socketio connected`);
  let term = undefined;
  socket.on('request_start', (conf) => {
    if (conf == {}  || conf === undefined || (conf.architecture === undefined && conf.disk_image === undefined && conf.version === undefined)) {
      logger.error(`[${user}@${address}] missing parameters in configuration`);
      socket.emit('request_error', 'error: missing parameters in configuration');
      socket.disconnect();
      return;
    }
    const [docker_image_name, error_message, _arch, _disk_image, _version, _code, _run_url] = check_configurations(conf);
    if (error_message != '') {
      logger.error(`[${user}@${address}] invalid configuration`);
      socket.emit('request_error', 'error: invalid configuration');
      socket.disconnect();
      return;
    }

    const session_start = Date.now();
    let session_time = 0;
    // term = pty.spawn('docker', [
    //   'run', '-it', '--rm', 
    //   '--cpus=2', '--memory=1024m', 
    //   // '--storage-opt', 'size=16G', 
    //   // '--device-read-bps', '50mb',
    //   // '--device-write-bps', '50mb',
    //   docker_image_name], {
    term = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env,
    });
    session_time_handle = setInterval(() => {
      session_time = Math.floor((Date.now() - session_start) / 1000);
      socket.emit('session_time', { session_start: session_start, session_time: session_time, max_session_seconds: max_session_seconds });
      if (session_time > max_session_seconds) {
        logger.info(`[${user}@${address}] max session time reached`);
        socket.disconnect();
        session_time_handle && clearInterval(session_time_handle);
        session_time_handle = undefined;
      }
    }, 1000);
    term.onData((data) => {
      socket.emit('data', data);
    });
    socket.on('data', (data) => {
      term.write(data);
    });
    socket.on('resize', (data) => {
      term.resize(data.cols, data.rows);
    });
    socket.on('disconnect', () => {
      logger.info(`[${user}@${address}] socketio disconnected`);
      term.write(Uint8Array.from([0x01, 'x'.charCodeAt(0)]));
      term.kill(9);
      session_time_handle && clearInterval(session_time_handle);
      session_time_handle = undefined;
    });
    term.onExit(e => {
      logger.info(`[${user}@${address}] processes exited, code=${e.exitCode}, signal=${e.signal}`);
      socket.emit('Process exited with code ' + e.exitCode);
      socket.disconnect();
    });
  });
});

server.listen(3000, () => {
  logger.info(`listening on *:3000`);
});
