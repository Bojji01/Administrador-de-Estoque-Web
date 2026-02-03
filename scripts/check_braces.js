const fs=require('fs');
const s=fs.readFileSync('e:/ControleWebapp/frontend/app.js','utf8');
let inSingle=false, inDouble=false, inTemplate=false, inLineComment=false, inBlockComment=false;
let line=1, col=0, balance=0; let problemLines=[];
for(let i=0;i<s.length;i++){
  const ch=s[i], prev=s[i-1];
  if(ch==='\n'){ inLineComment=false; line++; col=0; continue; }
  col++;
  if(inLineComment) continue;
  if(inBlockComment){ if(prev==='*' && ch==='/' ) { inBlockComment=false; } continue; }
  if(!inSingle && !inDouble && !inTemplate && ch=== '/' && s[i+1]==='/'){ inLineComment=true; continue; }
  if(!inSingle && !inDouble && !inTemplate && ch==='/' && s[i+1]==='*'){ inBlockComment=true; continue; }
  if(!inDouble && !inTemplate && ch==="'" && prev!=='\\'){ inSingle=!inSingle; continue; }
  if(!inSingle && !inTemplate && ch==='"' && prev!=='\\'){ inDouble=!inDouble; continue; }
  if(!inSingle && !inDouble && ch==='`' && prev!=='\\'){ inTemplate=!inTemplate; continue; }
  if(inSingle || inDouble || inTemplate) continue;
  if(ch==='{') balance++;
  if(ch==='}'){
    balance--;
    if(balance<0){ problemLines.push({line,col,reason:'negative balance'}); balance=0; }
  }
}
console.log('final balance', balance);
if(problemLines.length) console.log('problems', problemLines.slice(0,10));
// show vicinity of last few closing braces
const lines=s.split('\n');
for(let i=0;i<lines.length;i++){
  if(lines[i].trim()==='}') console.log('line', i+1, '\n...\n'+(lines[i-3]||'')+'\n'+(lines[i-2]||'')+'\n'+(lines[i-1]||'')+'\n'+lines[i]);
}