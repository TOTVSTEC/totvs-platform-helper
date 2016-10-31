'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	fs = require('fs'),
	spawn = require('child_process').spawn,
	execSync = require('child_process').execSync;

class TDS {

	constructor(directory) {
		this.findTdsHome();
		this.findJava();
		this.findLauncher();
		this.findVersion();

		this.cwd = path.resolve(directory || process.env.TDS_HOME || process.cwd());
		this.cwd = path.normalize(this.cwd + path.sep);

		console.log("TDS Version: " + this.version);

		//this.command = (os.platform() === 'win32' ? 'eclipsec.exe' : 'developerStudio');
		//Mac?
		//Eclipse.app/Contents/MacOS/eclipse
	}

	compile(options) {
		var deferred = Q.defer();

		var args = this._get_args('compile', options),
			proc = null;

		console.log("COMMAND:\n" + this.java + ' ' + args.join(' '));

		proc = spawn(this.java, args, {
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
		this.changeOptions(options);

		let args = [
			'-Dfile.encoding=UTF-8',
			'-jar'
		];

		if (this.version.minor === '2') {
			args.push(path.join(this.tdsHome, 'tdscli.jar'));
		}
		else {
			args.push(this.launcher);
			args.push('-application');
			args.push('br.com.totvs.tds.cli.tdscli');
			args.push('-nosplash');
		}

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

	findTdsHome() {
		//C:\Totvs\TotvsDeveloperStudio-11.3\
		this.tdsHome = process.env.TDS_HOME || process.env.TDS_APPRE || process.cwd();

		if (!process.env.TDS_APPRE) {
			process.env.TDS_APPRE = this.tdsHome;
		}
	}

	findJava() {
		if (process.env.TDS_HOME) {
			this.java = path.join(process.env.TDS_HOME, 'jre', 'bin', 'java');
		}
		else if (process.env.JAVA_HOME) {
			this.java = path.join(process.env.JAVA_HOME, 'bin', 'java');
		}

		if (os.platform() === 'win32') {
			this.java += '.exe';
		}

		if (this.java.indexOf(' ') !== -1) {
			this.java = '"' + this.java + '"';
		}
	}

	findVersion() {
		this.version = {
			value: '',
			major_minor: '',
			major: '',
			minor: '',
			patch: ''
		};

		let command = [
			this.java,
			'-jar',
			this.launcher,
			'-application',
			'org.eclipse.equinox.p2.director',
			'-nosplash',
			'-listInstalledRoots'
		].join(' '),
			out = null,
			result = null,
			test = /(?:(?:developerStudio\.full\/)|(?:br\.com\.totvs\.tds\.(?:classic|startup)\.product\/))(\d+\.\d+\.\d+)/igm;

		out = execSync(command, { encoding: 'utf8' });
		result = test.exec(out);

		if (result && result.length > 1) {
			let v = result[1].split('.');

			this.version.value = result[1];
			this.version.major_minor = v[0] + '.' + v[1];
			this.version.major = v[0];
			this.version.minor = v[1];
			this.version.patch = v[2];
		}

		if (this.version.major_minor === '11.3') {
			test = /(?:br\.com\.totvs\.tds\.feature\.tdscli\.feature\.group\/)(\d+\.\d+\.\d+)/igm;
			result = test.exec(out);

			console.log("TDSCLI: " + JSON.stringify(result));

			if (!result || result.length < 2) {
				console.log("Instaling tdscli...");
				this.installTdsCli();
			}
		}
	}

	installTdsCli() {
		let command = [
			this.java,
			'-jar',
			this.launcher,
			'-application',
			'org.eclipse.equinox.p2.director',
			'-nosplash',
			'-repository',
			'http://ds.totvs.com/updates/tds' + this.version.major + this.version.minor,
			'-installIU',
			'br.com.totvs.tds.feature.tdscli.feature.group,br.com.totvs.tds.feature.sdk.feature.group'
		].join(' ');

		execSync(command, { encoding: 'utf8' });

		//eclipsec.exe -application org.eclipse.equinox.p2.director -repository http://ds.totvs.com/updates/tds113 -nosplash -installIU br.com.totvs.tds.feature.tdscli.feature.group
		//http://ds.totvs.com/updates/tds113
	}

	changeOptions(options) {
		if (this.version.major_minor === '11.2') {
			if (options.serverType !== undefined) {
				if (options.serverType.toUpperCase() !== 'ADVPL')
					options.serverType = '4GL';
			}

			if (typeof options.recompile === 'boolean') {
				options.recompile = options.recompile ? 't' : 'f';
			}
		}
		else {
			if (options.serverType !== undefined) {
				if (options.serverType.toUpperCase() !== 'ADVPL')
					options.serverType = 'Logix';
			}

			if (typeof options.recompile === 'string') {
				options.recompile = (options.recompile.toLowerCase() === 't');
			}
		}
	}

	findLauncher() {
		let iniContent = fs.readFileSync(path.join(this.tdsHome, 'developerStudio.ini'), 'utf-8'),
			test = /(?:-startup\r?\n)(.+)(?:\r?\n)/igm,
			result = test.exec(iniContent);

		if (result && result.length > 1) {
			this.launcher = path.join(this.tdsHome, result[1]);
		}
		else {
			this.launcher = '';
		}
	}
}

module.exports = TDS;
