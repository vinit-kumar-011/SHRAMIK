const fs=require('fs');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const src=fs.readFileSync('/mnt/data/shramik_emerging_skills(1)(1).tsx','utf8');
const result=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React,esModuleInterop:true,useDefineForClassFields:true,removeComments:true,sourceMap:false},fileName:'shramik_emerging_skills.tsx',reportDiagnostics:true});
const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
if(errors.length){console.error(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));process.exit(1)}
fs.writeFileSync('/mnt/data/SHRAMIK_Emerging_Skills_Production/assets/EmergingSkillsPage.js',result.outputText);
console.log('TSX transpile passed:',Buffer.byteLength(src),'bytes ->',Buffer.byteLength(result.outputText),'bytes');
