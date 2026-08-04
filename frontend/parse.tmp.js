const ts=require('typescript'),fs=require('fs');
for(const f of process.argv.slice(2)){
  const src=fs.readFileSync(f,'utf8');
  const sf=ts.createSourceFile(f,src,ts.ScriptTarget.ESNext,true,ts.ScriptKind.TSX);
  const d=sf.parseDiagnostics||[];
  console.log(f, d.length? 'SYNTAX ERRORS: '+d.length+' first@line '+(sf.getLineAndCharacterOfPosition(d[0].start).line+1)+' : '+ts.flattenDiagnosticMessageText(d[0].messageText,' '):'parses OK');
}
