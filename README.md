# Log Helper
A simple log helper that covers console.log and let you customize your log.
## Installation
**Using npm**
```sh
npm install --save @crescendocat/log-helper
```

**Using yarn**
```sh
yarn add @crescendocat/log-helper
```

## Usage
To use this package is very simple: add the following line to your entry file\(usually is your `index.js`\).
```javascript
require('@crescendocat/log-helper').log.cover();
```
And just `console.log` as usual!

### Example - Basic
```javascript
//index.js
require('@crescendocat/log-helper').log.cover();

console.log("Hello world");
//[02/May/2022:13:38:21:6810 +0800] verbose:  Hello world (at index.js:6:9)
```

### Example - `log.cover()`
You can use `log.cover()` in anywhere of your code. But only if you called log.cover(), the format of the log changed.
```javascript
//index.js
console.log("before log.cover()");
//before log.cover()
require('@crescendocat/log-helper').log.cover();

console.log("after log.cover()");
//[02/May/2022:13:43:25:5860 +0800] verbose:  after log.cover() (at index.js:6:9)
```

### Example - Customize configuration
You can pass a config object as the parameter into `log.cover()`
```javascript
//index.js
const cfg = {
	timeFormat: 'YYYY-MM-DDTHH:mm:ssZ'
}
require('@crescendocat/log-helper').log.cover(cfg);

console.log("log with ISO format!");
//[2022-05-02T16:26:33+08:00] verbose:  log with ISO format! (at index.js:8:9)
``` 

## How it works

**Note the side effect!** \
`log.cover()` will _inject_ the global console object. Adding/Covering the log functions with different log levels. It changes the global console object so you don't need to change your coding style. But if someone want his/her 'vanilla' console object, the package provides `log.recover()` which can place the original console object back.

**\[Log Levels\]**\
About log levels, this package has 7 log levels as the express log level style:
|log function|level|
|  ---       |---  |
|error       |0    |
|warn        |1    |
|info        |2    |
|http        |3    |
|verbose     |4    |
|debug       |5    |
|silly       |6    |
|log         |4*   |

The larger number means the importance of the level is lower.\
\*The common `console.log()` logs into `verbose` level

**\[Log Types\]**

  **infoLog**\
    Only records log level higher than 'info' (includes info, warn and error),
    (also includes http to have more level for logs)
    but without error logs.
    Logs into info.log files.

  **errorLog**\
    In the other hand, errorLog records all the error logs into error.log files

  **consoleLog**\
    For debug and develop usage, records log level higher then debug(thats noisy)
    and INCLODEs all error logs.
    Also print to the console and monitors.
    The retain file size and number is mush less then infoLog and errorLog,
    since we don't want noisy console.logs to fill up the disk.
    Logs into out.log files, and the stream is captured by forever, pm2, etc.

  **accessLog**\
	Different from above, logs all requests access to our server.
	Logs into access.log files