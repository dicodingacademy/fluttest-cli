const exec = require('child_process').exec;
const glob = require("glob")
const chalk = require("chalk")

module.exports.commandExecutors = (cmd) => {
    return new Promise((resolve, rejects) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                rejects(stderr)
                return
            }
            resolve(stdout)
        })
    })
}

module.exports.testDirectory = (src, callback) => {
    glob(src + '/**/*', callback);
}

module.exports.log = {
    nl: () => console.log(`\n`),
    error: message => {
        console.log(`${chalk.bold.bgRed.white(" ERROR ")} ${message}`);
    }
}