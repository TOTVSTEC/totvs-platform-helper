'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	spawn = require('child_process').spawn;

class TDS {

	constructor(directory) {
		this.cwd = path.resolve(directory || process.env.TDS_HOME || process.cwd());
		this.cwd = path.normalize(this.cwd + path.sep);

		//this.command = (os.platform() === 'win32' ? 'eclipsec.exe' : 'developerStudio');
		this.command = path.join('jre', 'bin', (os.platform() === 'win32' ? 'java.exe' : 'java'));
		//Mac?
		//Eclipse.app/Contents/MacOS/eclipse
	}

	compile(options) {
		var deferred = Q.defer();

		var args = this._get_args('compile', options),
			proc = null;

		proc = spawn(this.command, args, {
			cwd: this.cwd,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		proc.stdout.on('data', function(data) {
			var out = data.toString('utf8');
			out = out.replace(/^>>>>> Compil.*(.|[\r\n])*?>>>>\s*$/gm, "0");
			out = out.replace(/^>>>>.*(.|[\r\n])*?>>>>\s*$/gm, "");

			if (out.trim()) {
				console.log(out);
			}
		});

		proc.stderr.on('data', function(data) {
			var err = data.toString('utf8');
			err = err.replace(/^Warning: NLS unused message: (.*)$/gm, "");

			if (err.trim()) {
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
		var args = [];
		args.push('-Dfile.encoding=UTF-8');
		args.push('-jar');
		args.push('plugins/org.eclipse.equinox.launcher_1.3.0.v20140415-2008.jar');
		args.push('-application');
		args.push('br.com.totvs.tds.cli.tdscli');
		args.push('-nosplash');
		args.push(target);

		if (options.workspace) {
			args.push("-options");
			args.push(options.workspace);
			args.push("workspace=true");
		}

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

}

module.exports = TDS;
