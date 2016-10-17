'use strict';

let	Q = require('q'),
	path = require('path'),
	os = require('os'),
	fs = require('fs'),
	ini = require('ini'),
	spawn = require('child_process').spawn;

const TCP_STARTED = 'Application Server started on port ';
const HTTP_STARTED = 'HTTP Server started on port ';

class AppServer {

	constructor(directory, executable) {
		this.tcpPort = 0;
		this.httpPort = 0;
		this.proc = null;

		this.cwd = path.resolve(directory || process.cwd());
		this.command = executable || (os.platform() === 'win32' ? 'appserver.exe' : 'appsrvlinux');

		var exe = path.join(this.cwd, this.command);

		if (!fs.statSync(exe).isFile()) {
			throw new Error('File not found: "' + exe + '"');
		}

		this.setIni();
	}

	start() {
		var _this = this,
			cli = path.join(this.cwd, this.command),
			deferred = Q.defer();

		if (cli === null) {
			deferred.reject(new Error("Não foi possivel encontrar o appserver! Verifique se ele foi instalado!"));
		}
		else {
			this.proc = spawn(cli, ['-console'], {
				cwd: this.cwd,
				stdio: ['ignore', 'pipe', 'pipe']
			});

			this.proc.stdout.on('data', function(data) {
				var out = data.toString('ascii');

				if (out.trim()) {
					console.log(out);
				}

				if (this.tcpPort === 0) {
					this.readPorts(out);
				}

				if (this.tcpPort !== 0) {
					deferred.resolve();
				}
			}.bind(this));

			this.proc.stderr.on('data', function(data) {
				var err = data.toString('ascii');

				if (err.trim()) {
					console.error(err);
				}
			});

			this.proc.on('close', function(code) {
				if (code !== 0) {
					deferred.reject(new Error("AppServer process exited with code " + code));
				}
				else {
					deferred.resolve();
				}
			});

			this.proc.on('exit', function(code) {
				if (code !== 0) {
					deferred.reject(new Error("AppServer process exited with code " + code));
				}
				else {
					deferred.resolve();
				}
			});

			this.proc.on('error', function(err) {
				deferred.reject(err);
			});
		}

		return deferred.promise;
	}

	stop() {
		if (this.proc) {
			this.proc.kill();
		}

		this.proc = null;
		this.tcpPort = 0;
		this.httpPort = 0;
	}

	readPorts(output) {
		var pos = output.indexOf(TCP_STARTED);
		var end = null;

		if (pos > -1) {
			pos += TCP_STARTED.length;
			end = output.indexOf('.', pos);

			this.tcpPort = Number(output.substring(pos, end));
		}

		pos = output.indexOf(HTTP_STARTED);
		end = null;

		if (pos > -1) {
			pos += HTTP_STARTED.length;
			end = output.indexOf('.', pos);

			this.httpPort = Number(output.substring(pos, end));
		}
	}

	setIni() {
		var iniPath = path.join(this.cwd, 'appserver.ini'),
			iniContent = fs.readFileSync(iniPath, 'utf-8'),
			config = ini.parse(iniContent),
			sectionName = '',
			keyName = '';

		Object.keys(config).forEach(function(section, index) {
			if (section.toUpperCase() === 'GENERAL') {
				sectionName = section;
			}
		});

		if (sectionName === '') {
			sectionName = 'General';

			if (config[sectionName] === undefined) {
				config[sectionName] = {};
			}
		}

		Object.keys(config[sectionName]).forEach(function(key, index) {
			if (key.toUpperCase() === 'FLUSHCONSOLELOG') {
				keyName = key;
			}
		});

		if (keyName === '') {
			keyName = 'FlushConsoleLog';
		}

		if (config[sectionName][keyName] !== 1) {
			config[sectionName][keyName] = 1;

			fs.writeFileSync(iniPath + '.bak', iniContent);
			fs.writeFileSync(iniPath, ini.stringify(config, { whitespace: false }));
		}
	}
}

module.exports = AppServer;
