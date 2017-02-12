var mine = require('./mine');
var config = require('../config');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var zlib = require('zlib');
const server = {
	isStatic(pathname) {
		let isStatic = false,
			patt = new RegExp(config.static_match, 'ig');
		if (pathname == '/' || !pathname || patt.test(pathname)) {
			isStatic = true;
		}
		return isStatic;
	},
	run() {
		http.createServer((req, res) => {
			let realurl = url.parse(req.url);
			//是否静态文件
			if (server.isStatic(realurl.pathname)) {
				let pathname = (realurl.pathname == '/' || !realurl.pathname) ? 'index.html' : realurl.pathname.replace(/\.\./g, ''),
					file_Path = path.join(config.root, config.static_dir, pathname),
					ext = path.extname(file_Path);
				ext = ext ? ext.slice(1) : 'unknown';
				fs.stat(file_Path, (err, stat) => {
					if (err) {
						if (err.code == 'ENOENT') {
							res.writeHead(404, 'Not Found', {
								'Content-Type': 'text/plain'
							});
						} else {
							res.writeHead(500, 'Internal Server Error', {
								'Content-Type': 'text/plain'
							});
						}
						res.end();
					} else {
						let last_modified = stat.mtime.toUTCString();
						if (ext.match(config.expires.file_match)) {
							let expires = new Date();
							expires.setTime(expires.getTime() + config.expires.max_age * 1000);
							res.setHeader('Expires', expires.toUTCString());
							res.setHeader('Cache-Control', 'max-age=' + config.expires.max_age);
							res.setHeader('Last-Modified', last_modified);
						}
						if (req.headers['if-modified-since'] && req.headers['if-modified-since'] == last_modified) {
							res.writeHead(304, 'Not Modified');
							res.end();
						} else {
							let stream = fs.createReadStream(file_Path),
								acceptEncoding = req.headers['accept-encoding'] || '',
								matched = ext.match(config.compress.match);
							res.setHeader('Content-Length', stat.size);
							res.setHeader('Content-Type', mine.get(ext) || 'text/plain');
							/*if (matched && acceptEncoding.match(/\bgzip\b/)) {
								console.log(matched);
								res.setHeader('Content-Encoding', 'gzip');
								stream = stream.pipe(zlib.createGzip());
								console.log('end');
							} else if (matched && acceptEncoding.match(/\bdeflate\b/)) {
								res.setHeader('Content-Encoding', 'deflate');
								stream = stream.pipe(zlib.createDeflate());
							} */
							res.writeHead(200, 'Ok');
							stream.pipe(res);
							stream.on('error', err => {
								res.writeHead(500, 'Internal Server Error', {
									'Content-Type': 'text/plain'
								});
								res.end();
								console.log('找不到静态文件');
							});
						}

					}
				});
			} else {
				//不是静态文件
				res.writeHead(404, 'Not Found', {
					'Content-Type': 'text/plain'
				});
				res.end();
			}
		}).listen(config.port);
		console.log('HTTP server is listening at port ' + config.port);
	}
};

//server.run();

module.exports = server;