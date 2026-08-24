const {DesignPatternAnalyzer}=require('./src/designPatternAnalyzer');
const a = new DesignPatternAnalyzer();
const c1 = 'o null == ) return "x" ;';
const c2 = 'u null == ) return "" ;';
console.log('tokens c1:', c1.match(/[\w.$]+/g));
console.log('idx:', (c1.match(/[\w.$]+/g)||[]).findIndex(t=>t.toLowerCase()==='null'));
console.log('result c1:', a['nullCheckTarget'](c1));
console.log('result c2:', a['nullCheckTarget'](c2));
