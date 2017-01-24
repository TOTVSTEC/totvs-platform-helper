'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	spawn = require('child_process').spawn;

const DEFAULT_OPTIONS = {
	silent: false,
	debug: false
};

class SmartClient {

	constructor(options) {
		this.stdout = '';
		this.stderr = '';

		this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});

		this.cwd = path.resolve(options.target ? path.dirname(options.target) : process.cwd());
		this.command = options.target ? path.basename(options.target) : null;

		if (this.command === null) {
			if (os.platform() === 'win32')
				this.command = 'smartclient.exe';
			else
				this.command = 'smartclient';
		}
	}

	run(options, extraArgs) {
		var _this = this,
			args = this._get_args(options, extraArgs),
			cli = path.join(this.cwd, this.command),
			deferred = Q.defer();

		this.proc = spawn(cli, args, {
			cwd: this.cwd,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		this.proc.stdout.on('data', function(data) {
			var out = data.toString('ascii').trim();

			if ((!_this.options.silent) && (out.trim())) {
				console.log(out);
			}
		});

		this.proc.stderr.on('data', function(data) {
			var err = data.toString('ascii');//.replace(/^Warning: NLS unused message: (.*)$/gm, "").trim();

			if ((!_this.options.silent) && (err.trim())) {
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

	_get_args(options, extras) {
		var result = [];

		options = options || {};
		options.program = options.program || "";
		options.environment = options.environment || "ENVIRONMENT";
		options.communication = options.communication || "TCP";
		options.quiet = options.quiet || true;
		options.multiple = options.multiple || true;
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

		if (options.multiple)
			result.push('-M');

		if (options.args.length > 0) {
			for (var i = 0; i < options.args.length; i++) {
				result.push('-A=' + options.args[i]);
			}
		}

		if ((extras) && (Array.isArray(extras))) {
			result = result.concat(extras);
		}

		return result;
	}

}

module.exports = SmartClient;
