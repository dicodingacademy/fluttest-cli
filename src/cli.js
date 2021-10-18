#!/usr/bin/env node

const logUpdate = require('log-update')
const cliSpinners = require('cli-spinners');
const chalk = require("chalk")
const { program } = require('commander');
const glob = require("glob")

const lcovResult = require("./locv")
const generateTestResult = require("./test")

const { commandExecutors, testDirectory, log } = require("./helper")

const publishTestResult = testResult => {
    log.nl()
    testResult.result.forEach(result => {
        if (result.isError) {
            process.stdout.write(chalk.white.bold.bgRed(" FAIL ") + " " + result.classname + "\n\n")
            result.testcases.forEach((testcase, index) => {
                if (testcase.isError) {
                    process.stdout.write(chalk.bold.red(" ∙ ") + " " + testcase.testcasename + "\n")
                    process.stdout.write('\n' + testcase.message + '\n')
                } else {
                    process.stdout.write(chalk.hex('#2bff00').bold(" ∙ ") + " " + testcase.testcasename + "\n")
                }

                if (index === result.testcases.length - 1) {
                    log.nl()
                }
            })
        } else {
            process.stdout.write(chalk.bold.hex('#FFFFFF').bgGreen(" PASS ") + " " + result.classname + "\n\n")
            result.testcases.forEach((testcase, index) => {
                process.stdout.write(chalk.bold.dim.green(" ∙ ") + " " + testcase.testcasename + "\n")
                if (index === result.testcases.length - 1) {
                    log.nl()
                }
            })
        }
    })

    process.stdout.write("  " + chalk.hex('#FFFFFF').bold(`Total              : ${testResult.totalTestcase} testcase\n`));
    if (testResult.totalTestcasePass > 0) {
        process.stdout.write("  " + chalk.hex('#2bff00').bold(`Success            : ${testResult.totalTestcasePass} testcase\n`));
    }

    if (testResult.totalTestcaseError > 0) {
        process.stdout.write("  " + chalk.hex('#ff0d00').bold(`Failed             : ${testResult.totalTestcaseError} testcase\n`))
    }
}

const runSingleTest = async (source) => {
    if (!source.endsWith('_test.dart')) {
        log.nl()
        log.error(`Test files should always end with ${chalk.red.bold('_test.dart')}`)
        return
    }

    try {
        glob(`**/${source}`, async (err, paths) => {
            if (err) {
                console.log(err.message)
                return
            }

            if (paths.length === 0) {
                log.nl()
                log.error("Test file not found!")
                return
            }

            let i = 0;

            const loading = setInterval(() => {
                const { frames } = cliSpinners.dots;
                logUpdate('\n' + frames[i = ++i % frames.length] + ` Running ${paths[0]}`);
            }, cliSpinners.dots.interval);

            const result = await commandExecutors(`flutter test ${paths[0]} --machine | tojunit`)

            clearInterval(loading)
            logUpdate.clear()
            logUpdate.done()

            generateTestResult(result, testResult => publishTestResult(testResult))
        })
    } catch (err) {
        log.nl()
        log.error(err.message)
    }
}

const doTest = () => {

    program.version('0.0.5')
    program
        .option('-a, --all', 'Run all testing in project')
        .option('-s, --source <testfilename>', 'Run single testing by argument. Just give me the name of test file and i will find and run it for you')

    program.parse(process.argv)

    if (Object.keys(program.opts()).length === 0) {
        console.log(program.helpInformation())
        return
    }

    if (program.opts().source !== undefined) {
        runSingleTest(program.opts().source)
        return
    }

    testDirectory('test', async (err, res) => {
        if (err) {
            process.stdout.write(`${chalk.bold.bgRed.white(" ERROR ")} ${err.message}`);
        } else {
            const testFiles = res.filter(file => file.endsWith("_test.dart"))
            if (testFiles.length > 0) {
                let i = 0;

                const loading = setInterval(() => {
                    const { frames } = cliSpinners.dots;
                    logUpdate('\n' + frames[i = ++i % frames.length] + ` Running ${testFiles.length} test files`);
                }, cliSpinners.dots.interval);

                try {
                    const result = await commandExecutors(`flutter test --machine --coverage | tojunit`)

                    clearInterval(loading)
                    logUpdate.clear()
                    logUpdate.done()

                    generateTestResult(result, testResult => publishTestResult(testResult))

                    lcovResult(testResult => {
                        if (testResult.coverage > 80) {
                            process.stdout.write("  " + chalk.hex('#2bff00').bold(`Test Coverage      : ${testResult.coverage.toFixed(1)}%\n`));
                        } else {
                            process.stdout.write("  " + chalk.hex('#ff0d00').bold(`Test Coverage      : ${testResult.coverage.toFixed(1)}%\n`));
                        }

                        console.log(chalk.hex('#FFFFFFF')(testResult.coverageInfo));
                        log.nl()

                    }, _ => {
                        log.nl()
                        log.error("Fail to generate test coverage!")
                    })

                } catch (error) {

                    clearInterval(loading)
                    logUpdate.clear()
                    logUpdate.done()

                    process.stdout.write("\n" + chalk.white.bgRed.bold(' ERROR ') + '  ' + chalk.bold.red("Fail to run testing files\n"));
                    console.log(error + '\n');
                }
            } else {
                log.nl()
                log.error("Empty test files!")
            }
        }
    });
}

doTest()