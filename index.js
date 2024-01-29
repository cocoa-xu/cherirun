const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const pty = require('node-pty');
const fs = require('fs');
const pug = require('pug');

app.use(express.static('static'));
app.set('view engine', 'pug');
const partial_run_script = fs.readFileSync('./static/js/run.js', 'utf8');

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
  const [_docker_image_name, error_message, arch, disk_image, version, code, run_url] = check_configurations(conf);
  if (error_message != '') {
    res.render('./index.pug', { message: code, run_url: run_url});
  } else {
    const conf_script = JSON.stringify({architecture: arch, disk_image: disk_image, version: version});
    const run_script = `const conf = ${conf_script};\n${partial_run_script}`;
    res.render('./run.pug', { run_script: run_script });
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');

  let term = undefined;
  socket.on('request_start', (conf) => {
    if (conf == {}  || conf === undefined || (conf.architecture === undefined && conf.disk_image === undefined && conf.version === undefined)) {
      socket.emit('request_error', 'error: invalid configuration');
      socket.disconnect();
      return;
    }
    const [docker_image_name, error_message, _arch, _disk_image, _version, _code, _run_url] = check_configurations(conf);
    if (error_message != '') {
      socket.emit('request_error', 'error: invalid configuration');
      socket.disconnect();
      return;
    }

    term = pty.spawn('docker', [
      'run', '-it', '--rm', 
      '--cpus=2', '--memory=1024m', 
      '--storage-opt', 'size=16G', 
      '--device-read-bps', '50m',
      '--device-write-bps', '50m',
      docker_image_name], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env,
    });
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
      console.log('user disconnected');
      term.write(Uint8Array.from([0x01, 'x'.charCodeAt(0)]));
      term.kill(9);
    });
    term.onExit((code, signal) => {
      socket.emit('Process exited with code ' + code);
      socket.disconnect();
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (term === undefined) {
      return;
    }
    term.write(Uint8Array.from([0x01, 'x'.charCodeAt(0)]));
    term.kill(9);
    term = undefined;
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
