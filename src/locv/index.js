const parse = require('lcov-parse');
const Table = require('tty-table');

const { header, options } = require("../table.config")

const groupBy = (arr, key) => {
    const initialValue = {};
    return arr.reduce((acc, cval) => {
        const myAttribute = cval[key];
        acc[myAttribute] = [...(acc[myAttribute] || []), cval]
        return acc;
    }, initialValue);
};

const lcovResult = (success, failed) => {
    parse('./coverage/lcov.info', function (err, data) {
        if (!err) {
            let lineHit = 0
            let lineFound = 0
            const reportByFile = []
            Array.from(data).forEach(report => {
                lineHit += report.lines.hit
                lineFound += report.lines.found
                const file = report.file.split("/").slice(-1).pop()
                const dir = report.file.split("/")
                dir.pop()

                reportByFile.push({
                    lineHit: report.lines.hit,
                    lineFound: report.lines.found,
                    file: file,
                    dir: dir.join('/')
                })
            })

            const finalResult = []
            const groupedByDir = groupBy(reportByFile, 'dir')
            Object.keys(groupedByDir).forEach(key => {
                let lineHit = 0
                let lineFound = 0

                groupedByDir[key].forEach(result => {
                    lineHit += result.lineHit
                    lineFound += result.lineFound
                })
                const coverage = (100 * lineHit) / lineFound
                finalResult.push({
                    "Line Coverage": coverage.toFixed(1) + "%",
                    "Line": `${lineHit}/${lineFound}`,
                    "Directory": key
                })
            })

            success({
                coverage: (100 * lineHit) / lineFound,
                coverageInfo: Table(header, finalResult, options).render()
            })
        } else {
            failed(err)
        }
    });
}

module.exports = lcovResult