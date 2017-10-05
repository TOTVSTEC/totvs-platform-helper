#!/usr/bin/env node
'use strict';

let path = require('path'),
	fs = require('fs'),
	shelljs = require('shelljs');
	//execFileSync = require('child_process').execFileSync,
	

const ARCHITECTURES = ['x86', 'x86_64'];

if (process.platform !== 'win32') {
	let basedir = path.join(__dirname, '..', 'appre'),
		os = process.platform === 'darwin' ? 'mac' : 'linux';

	ARCHITECTURES.forEach((arch, index) => {
		let file = path.join(basedir, arch, os, 'appre');

		if (fs.existsSync(file)) {
			console.log('chmod +x ' + file);
			shelljs.chmod("+x", file);
			//execFileSync('chmod', ['+x', file]);
		}
	});
}
