const modulePath = require.resolve('./src/javaParser');
console.log('resolved', modulePath);
const JavaParser = require('./src/javaParser').JavaParser;
console.log('has getBlockStatements', typeof JavaParser.prototype.getBlockStatements);
console.log('analyzeMethodBody source includes getBlockStatements?', JavaParser.prototype.analyzeMethodBody.toString().includes('getBlockStatements'));
