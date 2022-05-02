const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

afterAll(() => {
  console.log("remove all logs");
  fs.rm(path.join(__dirname, 'logs'), { recursive: true }, 
    (err) => {
      if(err) console.error("failed to remove logs dir: ", error);
    })
})

describe('logger behaviour', () => {
  it('logs successfully', done => {
    let script = `
require('../index.js').log.cover();
console.log("test");
`
    console.log(__dirname)
    const testApp = spawn('node', ["-e", script], {cwd: __dirname});
    
    testApp.stdout.on('data', data => {
      console.log(data.toString());
      const stdoutData = data.toString()
      expect(stdoutData).toMatch(/test/)
      testApp.kill('SIGINT')
      done()
    })
    testApp.stderr.on('data', data => {
      console.log(data.toString());
    })
  });

  it('logs customize timeFormat', done => {
    let script = `
//index.js
const cfg = {
  timeFormat: 'YYYY-MM-DDTHH:mm:ssZ'
}
require('../index.js').log.cover(cfg);

console.log("log with ISO format!");
`
    console.log(__dirname)
    const testApp = spawn('node', ["-e", script], {cwd: __dirname});
    
    testApp.stdout.on('data', data => {
      console.log(data.toString());
      const stdoutData = data.toString()
      expect(stdoutData).toMatch(/log with ISO format!/);
      expect(stdoutData).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}\]/);
      testApp.kill('SIGINT');
      done()
    })
    testApp.stderr.on('data', data => {
      console.log(data.toString());
    })
  })
});

