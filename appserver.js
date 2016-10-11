'use strict';

var Q = require('q'),
	path = require('path'),
	os = require('os'),
	fs = require('fs'),
	ini = require('ini'),
	spawn = require('child_process').spawn;

var TCP_STARTED = 'Application Server started on port ',
	HTTP_STARTED = 'HTTP Server started on port ';

var AppServer = function(commandLine) {
	this.tcpPort = 0;
	this.httpPort = 0;
	this.path = commandLine;
	this.proc = null;

	this.setIni();

};

AppServer.prototype.start = function start(projectDir) {
	this.path = path.join(projectDir, 'build', 'windows', 'bin', 'appserver');
	this.tcpPort = 0;
	this.httpPort = 0;

	var cli = path.join(this.path, 'appserver.exe'),
		deferred = Q.defer();

	if (cli === null) {
		deferred.reject(new Error("Não foi possivel encontrar o appserver! Verifique se ele foi instalado!"));
	}
	else {
		this.proc = spawn(cli, ['-console'], {
			cwd: this.path,
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
		});

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
};

AppServer.prototype.stop = function stop(projectDir) {
	if (this.proc) {
		this.proc.kill();
	}

	this.proc = null;
	this.path = '';
	this.tcpPort = 0;
	this.httpPort = 0;
};


AppServer.prototype.readPorts = function readPorts(output) {
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
};

AppServer.prototype.setIni = function setIni() {
	var iniPath = path.join(path.dirname(this.path), 'appserver.ini'),
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
};

module.exports = AppServer;
