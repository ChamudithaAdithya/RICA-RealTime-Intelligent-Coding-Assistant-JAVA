const modulePath = require.resolve('../../dist/javaParser');
console.log('resolved', modulePath);
const JavaParser = require('../../dist/javaParser').JavaParser;
console.log('has getBlockStatements', typeof JavaParser.prototype.getBlockStatements);
console.log('analyzeMethodBody source includes getBlockStatements?', JavaParser.prototype.analyzeMethodBody.toString().includes('getBlockStatements'));
