const fs=require('fs'); const vm=require('vm'); const s=fs.readFileSync('e:/ControleWebapp/frontend/app.js','utf8');
let lo=0, hi=s.length, bad=-1;
while(lo<hi){
  let mid=Math.floor((lo+hi)/2);
  try{ vm.Script(s.slice(0, mid)); lo=mid+1; } catch(e){ bad=mid; hi=mid; }
}
if(bad===-1) console.log('No syntax error in prefixes'); else {
  console.log('approx error index:', bad);
  const before=s.slice(Math.max(0,bad-120), bad+60);
  console.log('context near error:\n', before.replace(/\n/g,'\n'));
}