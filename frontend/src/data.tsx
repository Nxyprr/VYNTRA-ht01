import {useEffect,useState} from "react";
import {Database,FileSpreadsheet,UploadCloud,Search,Trash2,CheckCircle2,AlertTriangle,Table2,BarChart3,Lightbulb,Layers,Rows3} from "lucide-react";
import {api} from "./api";
const LB:any={valido:"Válido",valido_con_advertencias:"Válido con advertencias"};
const Tag=({s}:{s:string})=><span className={"tag "+(s==="valido"?"ok":"")}>{LB[s]||s}</span>;
function Count({n,s=""}:{n:number;s?:string}){const [x,setX]=useState(0);useEffect(()=>{let v=0;const t=setInterval(()=>{v=Math.min(n,v+Math.max(1,Math.ceil(n/25)));setX(v);if(v>=n)clearInterval(t)},35);return()=>clearInterval(t)},[n]);return <>{x}{s}</>}
const cmp=(d:any)=>{const n=d.profile.columns.reduce((a:number,c:any)=>a+c.nulls,0);return Math.max(0,Math.round(100*(1-n/Math.max(1,d.rows*d.cols))))};
const SEP:[string,string][]=[[",","Coma ,"],[";","Punto y coma ;"],["\t","Tabulación"],["|","Barra |"]];
export function Data({role}:{role?:string}){
  const [ds,setDs]=useState<any[]>([]);const [sel,setSel]=useState<number|null>(null);const [err,setErr]=useState("");const [ok,setOk]=useState("");
  const [o,setO]=useState({sep:",",encoding:"utf-8"});const [tab,setTab]=useState("p");const [qs,setQs]=useState("");const [drag,setDrag]=useState(false);const [busy,setBusy]=useState(false);const [ctx,setCtx]=useState(false);const [conf,setConf]=useState(false);
  const load=(pick?:number)=>api("/datasets").then(d=>{setDs(d);setSel(s=>pick??(s&&d.find((x:any)=>x.id===s)?s:d[0]?.id??null))});
  useEffect(()=>{load()},[]);
  const cur=ds.find(d=>d.id===sel);const list=ds.filter(d=>d.name.toLowerCase().includes(qs.toLowerCase()));
  const up=async(f?:File)=>{if(!f)return;setErr("");setOk("");setBusy(true);const fd=new FormData();fd.append("file",f);fd.append("sep",o.sep);fd.append("encoding",o.encoding);
    try{const d=await api("/datasets/upload",{method:"POST",body:fd});await load(d.id);setOk(`«${d.name}» importado y validado: ${d.rows} filas y ${d.cols} columnas.`);setTab("p")}catch(e:any){setErr(e.message)}finally{setBusy(false)}};
  const del=async()=>{if(!conf){setConf(true);return}try{await api(`/datasets/${cur.id}`,{method:"DELETE"});setConf(false);setOk("Dataset eliminado.");load()}catch(e:any){setErr(e.message);setConf(false)}};
  const tot=ds.reduce((a,d)=>a+d.rows,0),valid=ds.filter(d=>d.status==="valido").length,avg=ds.length?Math.round(ds.reduce((a,d)=>a+cmp(d),0)/ds.length):0;
  const cols=cur?.profile.columns||[];const nc=cols.find((c:any)=>c.mean!==undefined);const ix=cols.indexOf(nc);
  const P=cur?.profile;const outl=cols.reduce((a:number,c:any)=>a+(c.outliers||0),0);const cst=cols.filter((c:any)=>c.distinct<2).length;
  return <div className="view">
  <div className="hero"><div className="hrow"><div className="ic big"><Database size={26}/></div><div><h1>Centro de datos</h1><p>Importa, valida y explora los datasets antes de practicar</p></div><span className="tag d"><i className="live"/>{ds.length} datasets</span></div></div>
  <div className="grid"><div className="card kp"><div className="ic"><Database size={22}/></div><div><div className="kpi"><Count n={ds.length}/></div><div className="mu">Datasets</div></div></div>
    <div className="card kp"><div className="ic"><Rows3 size={22}/></div><div><div className="kpi"><Count n={tot}/></div><div className="mu">Filas totales</div></div></div>
    <div className="card kp"><div className="ic ok"><CheckCircle2 size={22}/></div><div><div className="kpi"><Count n={valid}/></div><div className="mu">Válidos sin advertencias</div></div></div>
    <div className="card kp"><div className="ic"><BarChart3 size={22}/></div><div><div className="kpi"><Count n={avg} s="%"/></div><div className="mu">Completitud media</div></div></div></div>
  <h2 className="h2i" style={{marginTop:22}}><UploadCloud size={18}/> Importar datos</h2>
  <div className={"drop"+(drag?" over":"")} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);up(e.dataTransfer.files?.[0])}}>
    <UploadCloud size={36} className="up"/><b>Arrastra tu archivo CSV aquí</b><span className="mu">o selecciónalo desde tu computadora · máx. según parámetro del administrador</span>
    <label className="btn">Seleccionar archivo<input hidden type="file" accept=".csv" onChange={e=>{up(e.target.files?.[0]);e.target.value=""}}/></label>
    <div className="hrow" style={{justifyContent:"center"}}><div className="seg">{SEP.map(([v,t])=><button key={v} className={o.sep===v?"on":""} onClick={()=>setO({...o,sep:v})}>{t}</button>)}</div><div className="seg">{[["utf-8","UTF-8"],["latin-1","Latin-1"]].map(([v,t])=><button key={v} className={o.encoding===v?"on":""} onClick={()=>setO({...o,encoding:v})}>{t}</button>)}</div></div>
    {busy&&<div className="bar" style={{width:"60%"}}><i style={{width:"100%"}}/></div>}</div>
  {err&&<div className="alert bad"><AlertTriangle size={16}/> {err}</div>}{ok&&<div className="alert"><CheckCircle2 size={16}/> {ok}</div>}
  <div className="hrow" style={{margin:"22px 0 10px"}}><h2 className="h2i" style={{margin:0}}><Layers size={18}/> Catálogo</h2><div className="sbox"><Search size={16}/><input placeholder="Buscar dataset…" value={qs} onChange={e=>setQs(e.target.value)}/></div></div>
  <div className="dsl">{list.map((d,i)=>{const num=d.profile.columns.filter((c:any)=>c.type==="numérico").length;return <div key={d.id} className={"dc"+(d.id===sel?" sel":"")} style={{animationDelay:i*70+"ms"}} onClick={()=>{setSel(d.id);setTab("p");setConf(false);setCtx(false)}}>
    <div className="dch"><span className="ic">{d.source==="csv"?<FileSpreadsheet size={20}/>:<Database size={20}/>}</span><span className="tag">{d.source==="csv"?"CSV importado":"Sintético"}</span></div>
    <b className="dcn">{d.name}</b><div className="dcs"><span>{d.rows} filas</span><span>·</span><span>{d.cols} columnas</span></div>
    <div className="qb"><span>Completitud</span><div className="bar"><i style={{width:cmp(d)+"%"}}/></div><b>{cmp(d)}%</b></div>
    <div className="pills"><span className="pill">{num} numéricas</span><span className="pill">{d.cols-num} categóricas</span></div><Tag s={d.status}/>{!d.enabled&&<span className="tag bad">Deshabilitado</span>}</div>})}
    {!list.length&&<div className="alert"><Search size={16}/> No hay datasets con ese nombre.</div>}</div>
  {cur&&<div key={cur.id} className="view"><div className="hrow" style={{margin:"26px 0 8px"}}><h2 className="h2i" style={{margin:0}}>{cur.name}</h2><Tag s={cur.status}/>{role==="Administrador"&&<button className="btn o sm" style={{marginLeft:"auto"}} onClick={async()=>{try{await api(`/admin/datasets/${cur.id}`,{method:"PATCH",body:JSON.stringify({enabled:!cur.enabled})});load()}catch(e:any){setErr(e.message)}}}>{cur.enabled?"Deshabilitar para estudiantes":"Habilitar para estudiantes"}</button>}<button className={"btn o sm"} style={{marginLeft:role==="Administrador"?0:"auto"}} onClick={del}><Trash2 size={14}/> {conf?"Confirmar eliminación":"Eliminar"}</button></div>
    <div className="seg" style={{marginBottom:14}}>{[["p","Perfil y calidad",BarChart3],["v","Vista previa",Table2],["d","Dato vs. información",Lightbulb]].map(([k,t,I]:any)=><button key={k} className={tab===k?"on":""} onClick={()=>setTab(k)}><I size={16}/> {t}</button>)}</div>
    {tab==="p"&&<><div className="grid"><div className="card kp"><div className={"ic "+(cmp(cur)===100?"ok":"warn")}><CheckCircle2 size={22}/></div><div><div className="kpi"><Count n={cmp(cur)} s="%"/></div><div className="mu">Completitud</div></div></div>
      <div className="card kp"><div className={"ic "+(P.duplicates?"warn":"ok")}><Layers size={22}/></div><div><div className="kpi"><Count n={P.duplicates}/></div><div className="mu">Filas duplicadas</div></div></div>
      <div className="card kp"><div className={"ic "+(cst?"warn":"ok")}><AlertTriangle size={22}/></div><div><div className="kpi"><Count n={cst}/></div><div className="mu">Columnas constantes</div></div></div>
      <div className="card kp"><div className={"ic "+(outl?"warn":"ok")}><BarChart3 size={22}/></div><div><div className="kpi"><Count n={outl}/></div><div className="mu">Valores atípicos</div></div></div></div>
      {P.warnings.map((w:string)=><div className="alert" key={w}><AlertTriangle size={16}/> {w}</div>)}
      <table><thead><tr><th>Columna</th><th>Tipo</th><th>Completitud</th><th>Distintos</th><th>Rango y promedio</th><th>Atípicos / frecuentes</th></tr></thead><tbody>{cols.map((c:any)=>{const pc=Math.round(100*(1-c.nulls/Math.max(1,cur.rows)));const pos=c.max>c.min?(c.mean-c.min)/(c.max-c.min)*100:50;return <tr key={c.name}><td><b>{c.name}</b></td><td><span className="tag">{c.type}</span></td>
        <td><div className="cbar"><i style={{width:pc+"%"}}/></div><span className="mu">{pc}%</span></td><td>{c.distinct}</td>
        <td>{c.mean!==undefined?<><div className="rb"><i style={{left:pos+"%"}}/></div><span className="mu">{c.min} – {c.max} · prom. {c.mean}</span></>:"—"}</td>
        <td>{c.outliers!==undefined?<span className={"tag "+(c.outliers?"bad":"ok")}>{c.outliers} atípicos</span>:<div className="pills">{(c.top||[]).map((t:any)=><span className="pill" key={t[0]}>{t[0]} · {t[1]}</span>)}</div>}</td></tr>})}</tbody></table></>}
    {tab==="v"&&<table><thead><tr>{cols.map((c:any)=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{P.preview.map((r:string[],i:number)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>}
    {tab==="d"&&(nc?<div className="card form"><p className="mu">Con los datos del dataset activo, mira cómo un valor aislado se convierte en información:</p><div className="flip" key={String(ctx)}>{ctx?<><span className="tag ok">Información</span><p>El promedio de <b>{nc.name}</b> es <b className="mono">{nc.mean}</b> en {cur.rows} registros (rango {nc.min} – {nc.max}).</p></>:<><span className="tag">Dato</span><p className="big2">{nc.name} = {P.preview[0][ix]}</p><p className="mu">Un valor aislado, sin contexto.</p></>}</div><button className="btn" onClick={()=>setCtx(!ctx)}><Lightbulb size={16}/> {ctx?"Volver al dato":"Dar contexto"}</button></div>:<div className="alert">Este dataset no tiene columnas numéricas para el ejemplo.</div>)}</div>}</div>;
}
