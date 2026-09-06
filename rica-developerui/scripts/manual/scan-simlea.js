const fs=require('fs'),path=require('path');
const {JavaParser}=require('../../dist/infrastructure/javaParser');
const {ServiceLayerAnalyzer}=require('../../dist/analyzers/serviceLayerDetector');
const {ControllerLayerAnalyzer}=require('../../dist/analyzers/controllerLayerDetector');
const {EntityLayerAnalyzer}=require('../../dist/analyzers/entityLayerDetector');
const {APIResourceLayerAnalyzer}=require('../../dist/analyzers/apiResourceLayerDetector');
const {DesignPatternAnalyzer}=require('../../dist/analyzers/designPatternAnalyzer');
const {buildGraphFromFiles}=require('../../dist/core/dependencyGraph');
const {CrossFileAnalyzer}=require('../../dist/analyzers/crossFileAnalyzer');
const {PackageBoundaryAnalyzer}=require('../../dist/analyzers/packageBoundaryDetector');
const p=new JavaParser({appendLine:()=>{}});
const root='E:/DevMyX/Simlea Web/backend';
function findJava(dir,out=[]){for(let e of fs.readdirSync(dir)){if(['.git','.gradle','target','build','node_modules','.idea','bin'].includes(e))continue;let fp=path.join(dir,e);let s;try{s=fs.statSync(fp)}catch{continue}if(s.isDirectory())findJava(fp,out);else if(fp.endsWith('.java'))out.push(fp);}return out;}
function scan(){
  let files=findJava(root);
  let map={}; let asts=[];
  for(let f of files){ let src; try{src=fs.readFileSync(f,'utf8')}catch{continue}
    let rel=path.relative(root,f).replace(/\\/g,'/');
    let ast; try{ast=p.parse(src,rel)}catch{continue}
    map[rel]=ast; asts.push(ast);
  }
  let sA=new ServiceLayerAnalyzer().analyze(asts);
  let cA=new ControllerLayerAnalyzer().analyze(asts);
  let eA=new EntityLayerAnalyzer().analyze(asts);
  let aA=new APIResourceLayerAnalyzer().analyze(asts);
  let graph=buildGraphFromFiles(map);
  let dp=new DesignPatternAnalyzer().analyze(asts,graph,map);
  let cf=new CrossFileAnalyzer().analyze(graph,map);
  let pb=new PackageBoundaryAnalyzer().analyze(asts,graph,new Map());
  function g(l){let m={};for(let v of l){let c=v.code||v.type||'?';m[c]=(m[c]||0)+1;}return m;}
  return {
    total:sA.length+cA.length+eA.length+aA.length+dp.length+cf.length+pb.length,
    v206:aA.filter(v=>v.type==='missing-validation').length,
    v317:dp.filter(v=>v.code==='RICA-V317').length,
    v319:dp.filter(v=>v.code==='RICA-V319').length,
    v321:dp.filter(v=>v.code==='RICA-V321').length,
    v403:cf.filter(v=>v.code==='RICA-V403').length,
    v304:dp.filter(v=>v.code==='RICA-V304').length,
    anemicEntity:eA.filter(v=>v.type==='anemic-entity').length,
    service:g(sA), controller:g(cA), entity:g(eA), api:g(aA), dp:g(dp), cf:g(cf), pb:g(pb)
  };
}
console.log(JSON.stringify(scan(),null,1));
