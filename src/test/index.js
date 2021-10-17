const convert = require('xml-js');

let totalTestcaseError = 0
let totalTestcasePass = 0
let totalTestcase = 0

const writeTestcase = testcase => {
    totalTestcase++
    const testcasename = testcase["_attributes"].name
    const expectedSysout = testcase["system-out"]
    const expectedFailure = testcase["failure"]
    const expectedError = testcase["error"]

    if (expectedFailure !== undefined) {
        totalTestcaseError++
        return {
            isError: true,
            testcasename,
            message: expectedFailure._text
        }
    }

    if (expectedError !== undefined) {
        totalTestcaseError++
        if (expectedSysout !== undefined) {
            const errorTestcase = expectedError._text.split("The test description was: ").slice(-1).pop()
            return {
                isError: true,
                testcasename: errorTestcase,
                message: expectedSysout._text
            }
        }
        return {
            isError: true,
            testcasename: testcasename.split("/").slice(-1).pop() + '_test.dart',
            message: expectedError._text
        }
    }

    totalTestcasePass++
    return {
        isError: false,
        testcasename
    }
}

const generateTestsuites = (testSuite) => {
    const attribute = {
        errors: parseInt(testSuite[`_attributes`].errors),
        failures: parseInt(testSuite[`_attributes`].failures),
        tests: parseInt(testSuite[`_attributes`].tests),
        classname: testSuite[`_attributes`].name.split(".test.").slice(-1).pop() + '_test.dart'
    }

    if (attribute.tests === 0) {
        return
    }

    const testcase = testSuite.testcase
    let isError = attribute.errors > 0 || attribute.failures > 0

    if (attribute.tests > 1) {
        return { isError, classname: attribute.classname, testcases: [...testcase.map(test => writeTestcase(test))] }
    } else {
        return { isError, classname: attribute.classname, testcases: [writeTestcase(testcase)] }
    }
}

const generateTestResult = (result, callback) => {
    const testResult = convert.xml2json(result, { compact: true, spaces: 4 })
    const testData = JSON.parse(testResult)
    const testSuite = testData.testsuites.testsuite
    const allTestcaseResult = []

    if (testSuite.length !== undefined) {
        testSuite.forEach(suites => {
            allTestcaseResult.push(generateTestsuites(suites))
        })
    } else {
        allTestcaseResult.push(generateTestsuites(testSuite))
    }

    callback({ result: allTestcaseResult, totalTestcase, totalTestcaseError, totalTestcasePass })
}

module.exports = generateTestResult