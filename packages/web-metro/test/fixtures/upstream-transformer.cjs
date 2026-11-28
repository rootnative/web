// A Babel transformer of an app, which returns what it gets.
exports.transform = (args) => ({ from: 'upstream', args })
exports.getCacheKey = () => 'upstream-key'
