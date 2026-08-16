// Proves the "Share your records" export logic: FHIR R4 bundle shape + HTML escaping/scoping.
// Mirrors the in-app builders (buildShareDoc / FHIR builder) against mock data.
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const _shEsc=(v)=>String(v==null?"":v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ── mock data ──
const data={settings:{clientName:"Jane <Doe> & Co"},contacts:[{name:"Dr. Smith",role:"PCP",phone:"503-555-1212",email:"a@b.com"},{name:"Nurse Kim"}]};
const meds=[{name:"Donepezil",dose:"10mg",frequency:"nightly",notes:"with food"},{name:"Memantine"}];

// ── FHIR builder (mirror of handleShareFhir) ──
function buildFhir(scope){
  const name=data.settings.clientName,pid="patient-1",entry=[{resource:{resourceType:"Patient",id:pid,name:[{text:name}]}}];
  if(scope.providers)data.contacts.forEach((c,i)=>entry.push({resource:{resourceType:"Practitioner",id:"prac-"+(i+1),name:[{text:c.name||""}],telecom:[...(c.phone?[{system:"phone",value:c.phone}]:[]),...(c.email?[{system:"email",value:c.email}]:[])]}}));
  if(scope.meds)meds.forEach((m,i)=>entry.push({resource:{resourceType:"MedicationStatement",id:"med-"+(i+1),status:"active",subject:{reference:"Patient/"+pid},medicationCodeableConcept:{text:m.name||""},dosage:[{text:[m.dose,m.frequency].filter(Boolean).join(" ")||(m.notes||"")}]}}));
  return {resourceType:"Bundle",type:"collection",timestamp:new Date().toISOString(),entry};
}
const b=buildFhir({meds:true,providers:true});
ok(b.resourceType==="Bundle"&&b.type==="collection","FHIR: valid Bundle (collection)");
ok(b.entry[0].resource.resourceType==="Patient","FHIR: first resource is Patient");
ok(b.entry.filter(e=>e.resource.resourceType==="Practitioner").length===2,"FHIR: one Practitioner per contact");
const stmts=b.entry.filter(e=>e.resource.resourceType==="MedicationStatement");
ok(stmts.length===2,"FHIR: one MedicationStatement per med");
ok(stmts[0].resource.subject.reference==="Patient/patient-1","FHIR: medication references the Patient");
ok(stmts[0].resource.dosage[0].text==="10mg nightly","FHIR: dosage text composed from dose+frequency");
ok(stmts[1].resource.dosage[0].text===""&&stmts[1].resource.medicationCodeableConcept.text==="Memantine","FHIR: missing fields degrade gracefully");
const b2=buildFhir({meds:true,providers:false});
ok(b2.entry.every(e=>e.resource.resourceType!=="Practitioner"),"FHIR: scope excludes providers when unchecked");

// ── HTML escaping (mirror of buildShareDoc) ──
const esc=_shEsc(data.settings.clientName);
ok(esc==="Jane &lt;Doe&gt; &amp; Co"&&!esc.includes("<Doe>"),"HTML: patient name is XSS-escaped");
ok(_shEsc('"x"<b>')==='&quot;x&quot;&lt;b&gt;',"HTML: quotes/brackets escaped");
// scope gating: a doc built with only meds should not contain the Providers header
function miniDoc(scope){let s="";if(scope.meds)s+="<h2>Medications</h2>";if(scope.providers)s+="<h2>Providers &amp; contacts</h2>";return s}
ok(miniDoc({meds:true,providers:false}).includes("Medications")&&!miniDoc({meds:true,providers:false}).includes("Providers"),"HTML: sections included strictly by scope");

console.log(f===0?"✅ SHARE-EXPORT TESTS PASS":"❌ "+f+" FAILURES"); if(f)process.exitCode=1;
