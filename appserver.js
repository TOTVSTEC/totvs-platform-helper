'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	fs = require('fs'),
	ini = require('ini'),
	spawn = require('child_process').spawn;

const TCP_STARTED = 'Application Server started on port ';
const HTTP_STARTED = 'HTTP Server started on port ';

const DEFAULT_OPTIONS = {
	silent: false,
	debug: false
};

class AppServer {

	constructor(options) {
		this.tcpPort = 0;
		this.httpPort = 0;
		this.proc = null;
		this.stdout = '';
		this.stderr = '';

		this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});

		this.cwd = path.resolve(options.target ? path.dirname(options.target) : process.cwd());
		this.command = options.target ? path.basename(options.target) : null;

		if (this.command === null) {
			if (os.platform() === 'win32')
				this.command = 'appserver.exe';
			else if (os.platform() === 'linux')
				this.command = 'appsrvlinux';
			else if (os.platform() === 'darwin')
				this.command = 'appserver';
		}

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

				this.stdout += out;

				if ((!this.options.silent) && (out.trim())) {
					console.log(out);
				}

				if (this.tcpPort === 0) {
					this.readServerInfo(out);
				}

				if (this.tcpPort !== 0) {
					deferred.resolve();
				}
			}.bind(this));

			this.proc.stderr.on('data', function(data) {
				var err = data.toString('ascii');

				if ((!this.options.silent) && (err.trim())) {
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

	readServerInfo(output) {
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

		var test = /(?:TOTVS - Build )(\d{1}\.\d{2}\.\d{6}\w{1})(?: - )/igm,
			result = test.exec(output);

		if (result && result.length > 1) {
			this.build =  result[1];
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

		if (Number(config[sectionName][keyName]) !== 1) {
			config[sectionName][keyName] = 1;

			fs.writeFileSync(iniPath + '.bak', iniContent);
			fs.writeFileSync(iniPath, ini.stringify(config, { whitespace: false }));
		}
	}
}

module.exports = AppServer;
