const {JavaParser}=require('../../dist/infrastructure/javaParser');
const {APIResourceLayerAnalyzer}=require('../../dist/analyzers/apiResourceLayerDetector');
const p=new JavaParser({appendLine:()=>{}});
const code = `package x;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
@RestController
class C {
  @PostMapping("/a") String a(@RequestBody OrderDto dto){return "";}
  @PostMapping("/b") String b(@Valid @RequestBody OrderDto dto){return "";}
  @GetMapping("/c") String c(@RequestParam Long id){return "";}
  @GetMapping("/d/{id}") String d(@PathVariable Long orderId){return "";}
  @GetMapping("/e") String e(@RequestParam String q){return "";}
  @PostMapping("/g") String g(OrderDto raw){return "";} // no annotation at all -> flag
}
class OrderDto{}
@Validated
class V {
  @GetMapping("/h") String h(@RequestParam String id){return "";}
}`;
let asts=[p.parse(code,'C.java')];
// split into two files so @Validated class separate
const codeV = `package x;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
@Validated
class V {
  @GetMapping("/h") String h(@RequestParam String id){return "";}
}`;
asts.push(p.parse(codeV,'V.java'));
let vs=new APIResourceLayerAnalyzer().analyze(asts).filter(v=>v.type==='missing-validation');
console.log('V206 flagged methods:',vs.map(v=>v.methodName+':'+(v.message.match(/'(\w+)'/)?.[1]||'?')));
