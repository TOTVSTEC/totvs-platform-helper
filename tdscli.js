'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	fs = require('fs'),
	spawn = require('child_process').spawn,
	execSync = require('child_process').execSync;

const DEFAULT_OPTIONS = {
	silent: false,
	debug: false
};

class TDS {

	constructor(options) {
		this.findJava();

		this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});
		this.stdout = "";
		this.stderr = "";
	}

	compile(options) {
		return this._exec('compile', options);
	}

	generatePatch(options) {
		return this._exec('patchgen', options);
	}

	applyPatch(options) {
		return this._exec('patchapply', options);
	}

	_exec(command, options) {
		var _this = this,
			deferred = Q.defer(),
			args = this._get_args(command, options),
			proc = null;

		this.stdout = "";
		this.stderr = "";

		if (this.options.debug) {
			console.log("COMMAND:\n" + this.java + ' ' + args.join(' '));
		}

		proc = spawn(this.java, args, {
			cwd: path.normalize(__dirname + path.sep),
			stdio: ['ignore', 'pipe', 'pipe']
		});

		proc.stdout.on('data', function(data) {
			var out = data.toString('utf8');
			out = out.replace(/^>>>>> Compil.*(.|[\r\n])*?>>>>\s*$/gm, "0");
			out = out.replace(/^>>>>.*(.|[\r\n])*?>>>>\s*$/gm, "");

			this.stdout += out;

			if ((!_this.options.silent) && (out.trim())) {
				console.log(out);
			}
		});

		proc.stderr.on('data', function(data) {
			var err = data.toString('utf8');
			err = err.replace(/^Warning: NLS unused message: (.*)$/gm, "");

			this.stderr += err;

			if ((!_this.options.silent) && (err.trim())) {
				console.error(err);
			}
		});

		proc.on('close', function(code) {
			if (code !== 0) {
				deferred.reject(new Error("Tdscli process exited with code " + code));
			}
			else {
				deferred.resolve();
			}
		});

		return deferred.promise;
	}

	_get_args(target, options) {
		let args = [
			'-Dfile.encoding=UTF-8',
			'-jar',
			path.join(__dirname, 'tdscli.jar')
		];

		args.push(target);

		this.changeOptions(options);

		var keys = Object.keys(options);
		var index = keys.indexOf("workspace");
		if (index > -1) {
			keys.splice(index, 1);
		}

		keys.forEach(function(key, index) {
			var value = key + "=";

			if (Array.isArray(options[key])) {
				value += options[key].join(";");
			}
			else {
				value += options[key];
			}

			args.push(value);
		});

		return args;
	}

	findJava() {
		/*if (process.env.TDS_HOME) {
			this.java = path.join(process.env.TDS_HOME, 'jre', 'bin', 'java');
		}
		else*/
		if (process.env.JAVA_HOME) {
			this.java = path.join(process.env.JAVA_HOME, 'bin', 'java');
		}
		else if (process.env.JRE_HOME) {
			this.java = path.join(process.env.JRE_HOME, 'bin', 'java');
		}

		if (os.platform() === 'win32') {
			this.java += '.exe';
		}

		/*
		if (this.java.indexOf(' ') !== -1) {
			this.java = '"' + this.java + '"';
		}*/
	}

	changeOptions(options) {
		if (options.serverType !== undefined) {
			if (options.serverType.toUpperCase() !== 'ADVPL')
				options.serverType = '4GL';
		}

		if (typeof options.recompile === 'boolean') {
			options.recompile = options.recompile ? 't' : 'f';
		}
	}

}

module.exports = TDS;
