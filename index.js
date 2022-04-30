/**
 * index.js, 用於產生log stream與檔案。
 * 暴露log物件:
 * log: console.log取代工具，會取代整份執行程式的console物件，代換成winston logger物件。
 *         因此在全部的程式中console.log都會執行logger.log，將log輸出到更多不同的位置而非僅有console。
 *         使用 log.cover()執行這個動作，並使用log.recover()復原被取代的console物件
 *    ex:
 *      const { log } = require('helper');
 *      log.cover();
 *
 *         加入log level函式，可以使用console.[log-level]() 進行輸出，更方便log分流與debug。
 *    ex:
 *      //after log.cover()
 *      console.error("We are done!");
 *      console.warn("Something bad...");
 *      console.info("We are good.");
 *      console.http("I should reply error 404.");
 *      console.verbose("Content of db returns: ...");
 *      console.debug(`1+1 = ${1+1}`); // 1+1 = 2
 *      console.silly("!!!!!!!!!!");
 *      
 *         
 */

/*******


[Log Levels]
error    0
warn     1
info     2
http     3
verbose  4 
debug    5
silly    6

The larger number means the importance of the level is lower.
Also, the common console.log() logs into verbose level

[Log Types]
 **infoLog**
  Only records log level higher than 'info' (includes info, warn and error),
  (also includes http to have more level for logs)
  but without error logs.
  Logs into info.log files.

 **errorLog**
  In the other hand, errorLog records all the error logs into error.log files

 **consoleLog**
  For debug and develop usage, records log level higher then debug(thats noisy)
  and INCLODEs all error logs.
  Also print to the console and monitors.
  The retain file size and number is mush less then infoLog and errorLog,
  since we don't want noisy console.logs to fill up the disk.
  Logs into out.log files, and the stream is captured by forever, pm2, etc.

 **accessLog**
	Different from above, logs all requests access to our server.
	Logs into access.log files

*******/
const fs = require('fs');
const path = require('path');
const util = require('util');
const { getKey } = require('./util');
const rfs = require('rotating-file-stream') //rotating log file
const { Writable } = require('stream');
const moment = require('moment')
const winston = require('winston') // log helper package
//importing syslog requirement
require('winston-syslog').Syslog;

//自定義winston log format。可以使用config.general.logs.timeFormat更改。
const myFormat = winston.format.printf((info, cfg) => {
	const formatString = getKey(cfg, "timeFormat", 'DD/MMM/YYYY:HH:mm:ss:SSSS ZZ');
	const t = moment(info.timestamp).format(formatString)
	if(info.error)
		return	`[${t}] ${info.level}: ${info.message}`
	else 
		return	`[${t}] ${info.level}: ${info.message} (at ${info.position})`
})



function rotateFileNameGenerator(type, cfg) {
	let defaultFileName = {
		accessLog: "access.log",
		consoleLog: "out.log",
		infoLog: "info.log",
		errorLog: "error.log"
	}
	return (time, index) => {
		var fileName = getKey(cfg, `${type}.filename`, defaultFileName[type]); 
	  if (!time) return fileName;

	  var formatString = getKey(cfg, `${type}.perfix`, 'YYYY-MM/MMDD-HHmm-$#');
	  var formatedPerfix = moment(time).format(formatString)
	  formatedPerfix = formatedPerfix.replace('$#', index);

	  return `${formatedPerfix}-${fileName}`;
	}
};

// create a rotating write stream
function createRotateStream(type, cfg) {
	let absolute_log_path = path.resolve(getKey(cfg, `${type}.path`, getKey(cfg, `path`, 'logs')))
	console.info(`log type \`${type}\` into: ${absolute_log_path}`);
	return rfs.createStream(rotateFileNameGenerator(type, cfg), {
		size: getKey(cfg, `${type}.rotate.size`, '20M'),
	  interval: getKey(cfg, `${type}.rotate.interval`, '1d'), // rotate daily
	  path: absolute_log_path,
	  intervalBoundary: false,
	  maxSize: getKey(cfg, `${type}.rotate.maxSize`, '20M'),
	})
}

function createLogger(cfg){
	//設定winston logger
	return winston.createLogger({
		exitOnError: false,
	  transports: [
	    //transport for infoLog
	    new winston.transports.Stream({
	    	level: 'http',
				format: winston.format.combine(
					winston.format((info) => info.level === "error" ? false : info)(), //filter error messages
					winston.format.padLevels(),
					winston.format.timestamp(),
					myFormat
				),
			  stream: createRotateStream("infoLog", cfg)
			}),

			//transports for consoleLog
			new winston.transports.Stream({
	      level: 'debug',
	      format: winston.format.combine(
	      	//prevent duplicated error logs
	      	winston.format((info) => info.level === "error" ? false : info)(), //filter error messages
	        winston.format.colorize(),
	        winston.format.padLevels(),
	        winston.format.timestamp(),
	        myFormat
	        
	      ),
	      stream: process.stdout
	    }),
	    new winston.transports.Stream({
	    	level: 'debug',
				format: winston.format.combine(
					winston.format.padLevels(),
					winston.format.timestamp(),
					myFormat
				),
			  stream: createRotateStream("consoleLog", cfg)
			}),

	    //transports for error log
	  	new winston.transports.Stream({
	    	level: 'error',
				format: winston.format.combine(
					winston.format.errors(),
					winston.format.padLevels(),
					winston.format.timestamp(),
					myFormat
				),
				handleExceptions: true,
			  stream: createRotateStream("errorLog", cfg)
			}),
	    new winston.transports.Stream({
	      level: 'error',
	      format: winston.format.combine(
	      	winston.format.errors(),
	        winston.format.colorize(),
	        winston.format.padLevels(),
	        winston.format.timestamp(),
	        myFormat
	      ),
	      handleExceptions: true,
	      stream: process.stderr
	    }),
	    new winston.transports.Syslog({
	    	level: 'error',
	    	format: winston.format.combine(
					winston.format.errors(),
					winston.format.padLevels(),
					winston.format.timestamp(),
					myFormat
				),
				handleExceptions: true,
				app_name: [getKey(cfg, "syslog.appNamePrefix"), "errorLog"].join("."),
				host: getKey(cfg, "syslog.remote")
	    })
	  ]
	});
}

const log = {
	//replace original global console object with our logger
	/**
	 * cover: helper的主要function之一，呼叫cover()可以使用自定義的winston logger取代原有的console.log物件
	 * 將log輸出到我們希望的地方，而非只是stdout
	 * @param  {Object}    cfg  設定檔物件。
	 *   使用物件來傳遞config，而非直接使用require('./config')，以供在程式中可以動態修改config的值。
	 * @return {Boolean}        設定成功與否，成功則會回傳true，否則回傳false
	 */
  cover: (cfg) => {
  	const logger = createLogger(cfg);
  	
  	//產生真正要使用的logger
  	const loggerGenerator = (level) => {
  		return (...thisArgs) => {
				//處理log輸出行號的位置。在每一行log的結尾都會附上這行log是從哪個檔案的第幾行第幾列輸出的。
				//實際達成方式使用nodejs的stackTrace物件
				const originalPrepareStackTrace = Error.prepareStackTrace;
			  Error.prepareStackTrace = (_, stack) => stack;
			  const stack = new Error().stack
			  //stack: 取得所有function呼叫堆疊，0是起始function，也就是這個function。
			  //因此要拿到真正呼叫console.log()的檔案位置，必須取用stack[1]，也就是這個function的callee
			  const callee = stack[1];
			  Error.prepareStackTrace = originalPrepareStackTrace;
			  const relativeFileName = path.relative(process.cwd(), callee.getFileName());
			  const position = `${relativeFileName}:${callee.getLineNumber()}:${callee.getColumnNumber()}`;
				logger.log(level, util.format(...thisArgs), {position})
			}
  	}
  	//set default log level as verbose
		const log_wrapper = {
			log: loggerGenerator('verbose')
		}
		//log levels: error, warn, info, http, verbose, debug, silly
		Object.keys(winston.config.npm.levels).forEach(level => {
			log_wrapper[level] = loggerGenerator(level);
		})
		try {
			
			//replace original global console object with our logger
			global._console = global.console
			global.console = {
				...global.console,
				...log_wrapper
			}
		} catch(e) {
			global.console = global._console;
			delete global._console;
			return false
		}
		return true;
	},
	recover: () => {
		delete global.console;
		global.console = global._console;
		delete global._console;
		return false
	}
}






module.exports = {
	log
}
