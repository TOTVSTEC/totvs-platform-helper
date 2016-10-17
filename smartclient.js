'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	spawn = require('child_process').spawn;

class SmartClient {

	constructor(directory, executable) {
		this.cwd = path.resolve(directory || process.cwd());
		this.command = executable || (os.platform() === 'win32' ? 'smartclient.exe' : 'smartclient');
	}

	run(options) {
		var args = this._get_args(options),
			cli = path.join(this.cwd, this.command),
			deferred = Q.defer();

		//console.log("SMARTCLIENT: " + cmd);

		this.proc = spawn(cli, args, {
			cwd: this.cwd,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		this.proc.stdout.on('data', function(data) {
			var out = data.toString('ascii').trim();

			if (out) {
				console.log(out);
			}

			if (out.indexOf('Application Server started on port') > -1) {
				deferred.resolve();
			}
		});

		this.proc.stderr.on('data', function(data) {
			var err = data.toString('ascii').replace(/^Warning: NLS unused message: (.*)$/gm, "").trim();

			if (err) {
				console.error(err);
			}
		});

		this.proc.on('close', function(code) {
			if (code !== 0) {
				deferred.reject(new Error("SmartClient process exited with code " + code));
			}
			else {
				deferred.resolve();
			}
		});

		this.proc.on('exit', function(code) {
			if (code !== 0) {
				deferred.reject(new Error("SmartClient process exited with code " + code));
			}
			else {
				deferred.resolve();
			}
		});

		this.proc.on('error', function(err) {
			deferred.reject(err);
		});


		return deferred.promise;
	}

	close() {
		if (this.proc) {
			this.proc.kill();
			this.proc = null;
		}
	}

	_get_args(options) {
		var result = [];

		options = options || {};
		options.program = options.program || "";
		options.environment = options.environment || "ENVIRONMENT";
		options.communication = options.communication || "TCP";
		options.quiet = options.quiet || true;
		options.args = options.args || [];

		if (options.program)
			result.push('-P=' + options.program);

		result.push('-E=' + options.environment);

		if (typeof options.communication === 'object') {
			var c = options.communication;

			if ((c.address !== undefined) && (c.port !== undefined)) {
				result.push('-Z=' + c.address);
				result.push('-Y=' + c.port);
			}
		}
		else if (typeof options.communication === 'string') {
			result.push('-C=' + options.communication);
		}


		if (options.quiet)
			result.push('-Q');

		if (options.args.length > 0) {
			for (var i = 0; i < options.args.length; i++) {
				result.push('-A=' + options.args[i]);
			}
		}

		return result;
	}

}

module.exports = SmartClient;
