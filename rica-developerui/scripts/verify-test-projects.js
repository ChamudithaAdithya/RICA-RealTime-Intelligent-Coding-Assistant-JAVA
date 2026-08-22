/**
 * Verify 3 test-projects via deterministic RICA analyzers (no AI).
 * Usage: node scripts/verify-test-projects.js
 */
const fs=require('fs'),path=require('path');
const {JavaParser}=require('../src/infrastructure/javaParser');
const {DesignPatternAnalyzer}=require('../src/designPatternAnalyzer');
const {ProjectDependencyGraph,buildGraphFromFiles}=require('../src/dependencyGraph');
const {CrossFileAnalyzer}=require('../src/crossFileAnalyzer');
const {PackageBoundaryAnalyzer}=require('../src/packageBoundaryDetector');
const p=new JavaParser({appendLine:()=>{}});
function findJava(dir){let out=[];for(let e of fs.readdirSync(dir)){let fp=path.join(dir,e);let s=fs.statSync(fp);if(s.isDirectory()) out.push(...findJava(fp)); else if(fp.endsWith('.java')) out.push(fp);}return out;}
function analyze(root){
  let files=findJava(root);
  let map={}; let asts=[];
  for(let f of files){let src=fs.readFileSync(f,'utf8');let rel=path.relative(root,f).replace(/\\/g,'/');let ast=p.parse(src,rel);map[rel]=ast; asts.push(ast);}
  let graph=buildGraphFromFiles(map);
  let dp=new DesignPatternAnalyzer().analyze(asts,graph,map);
  let cf=new CrossFileAnalyzer().analyze(graph,map);
  let pb=[]; try{ pb=new PackageBoundaryAnalyzer().analyze(asts,graph,new Map()); }catch{}
  const {ServiceLayerAnalyzer}=require('../src/serviceLayerDetector');
  const {ControllerLayerAnalyzer}=require('../src/controllerLayerDetector');
  const {EntityLayerAnalyzer}=require('../src/entityLayerDetector');
  const {APIResourceLayerAnalyzer}=require('../src/apiResourceLayerDetector');
  let s=new ServiceLayerAnalyzer().analyze(asts).length;
  let c=new ControllerLayerAnalyzer().analyze(asts).length;
  let e2=new EntityLayerAnalyzer().analyze(asts).length;
  let a=new APIResourceLayerAnalyzer().analyze(asts).length;
  return {files:asts.length, layer:{s,c,e:e2,a}, dp, cf, pb};
}
for(let proj of ['rica-clean','rica-violations-heavy','rica-structural']){
  let root=path.join(__dirname,'..','..','test-projects',proj);
  console.log('\n===',proj,'===');
  let r=analyze(root);
  console.log('Files:',r.files,' Layer S/C/E/A:',r.layer,' DP:',r.dp.length,' CF:',r.cf.length,' PB:',r.pb.length);
  let byCode={}; for(let v of [...r.dp,...r.cf,...r.pb]){let code=v.code||'PB';byCode[code]=(byCode[code]||0)+1;}
  console.log('ByCode:',byCode);
}
