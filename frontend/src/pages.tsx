import {useEffect,useRef,useState} from "react";
import {api,apiBlob} from "./api";
const AP:any={clf:"Clasificación",reg:"Regresión",uns:"Agrupamiento"};
const LB:any={en_cola:"En cola",en_proceso:"En proceso",completada:"Completada",con_advertencias:"Con advertencias",fallida:"Fallida",cancelada:"Cancelada",valido:"Válido",valido_con_advertencias:"Válido con advertencias"};
const Tag=({s}:{s:string})=><span className={"tag "+(s==="completada"||s==="valido"?"ok":s==="fallida"||s==="cancelada"?"bad":"")}>{LB[s]||s}</span>;
const Kpi=({n,t}:{n:any;t:string})=><div className="card"><div className="kpi">{n}</div>{t}</div>;
const report=async(id:number)=>{const u=URL.createObjectURL(await apiBlob(`/executions/${id}/report`));window.open(u,"_blank")};
export function Result({r}:{r:any}){
  const m=r.result?.metrics||{};const cm=m.matriz_confusion;
  return <div className="view"><div className="alert"><b>{r.engine_type==="ml-real"?"MODELO ML REAL":"DEMOSTRACIÓN"}</b> · {r.engine_version} · {r.result?.algorithm}</div>
  <p className="mu">{r.code} · {r.dataset} · propósito: {r.objective} · objetivo: {r.target||"—"} · {new Date(r.started_at).toLocaleString()} · {r.user} <Tag s={r.status}/></p>
  {r.status==="fallida"?<div className="alert bad"><b>Estado: Fallida</b> · {r.error}. Corrija la configuración o el dataset y reintente.</div>:r.status==="cancelada"?<div className="alert bad">Ejecución cancelada.</div>:<>
  <div className="grid">{Object.entries(m).filter(([k])=>k!=="matriz_confusion").map(([k,v])=><div className="card" key={k}><div className="kpi sm">{String(v)}</div>{k.replace(/_/g," ")}</div>)}</div>
  {cm&&<table><thead><tr><th>Real \ Predicho</th>{cm.labels.map((l:string)=><th key={l}>{l}</th>)}</tr></thead><tbody>{cm.matrix.map((row:number[],i:number)=><tr key={i}><td>{cm.labels[i]}</td>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>}
  <p className="mu">Variables usadas: {(r.result?.features||[]).join(", ")||"—"} · excluidas: {(r.result?.excluded||[]).join(", ")||"ninguna"} · {r.result?.split||""}</p>
  {(r.result?.warnings||[]).map((w:string)=><div className="alert" key={w}>{w}</div>)}<div className="alert">Limitación: resultado orientativo; depende del dataset y de la partición usada.</div>
  <button className="btn" onClick={()=>report(r.id)}>Generar reporte imprimible</button></>}</div>;
}
export function Learn(){
  const [u,setU]=useState<any[]>([]);const [msg,setMsg]=useState<any>({});const [cmp,setCmp]=useState("s");
  const load=()=>api("/learning").then(setU);useEffect(()=>{load()},[]);
  const ans=async(id:number,c:number)=>{const r=await api(`/learning/${id}/answer`,{method:"POST",body:JSON.stringify({choice:c})});setMsg({...msg,[id]:r.correct?"✔ Correcto: unidad revisada":"✘ Intente de nuevo"});load()};
  const done=u.filter(x=>x.done).length;
  const C:any={s:["Datos con etiqueta (variable objetivo)","Clasificación o regresión","Predecir fraude con transacciones etiquetadas","Exactitud, F1, MAE, R²"],n:["Datos sin etiqueta objetivo","Agrupamiento y patrones","Agrupar clientes por frecuencia y gasto","Tamaño y perfil de grupos"]};
  const S=["Definir problema","Comprender datos","Preparar datos","Separar datos","Entrenar / ejecutar","Evaluar","Interpretar","Registrar"];
  return <div className="view"><h1>Fundamentos de IA</h1><p className="mu">Unidades revisadas: {done}/{u.length}</p><div className="bar"><i style={{width:(u.length?done/u.length*100:0)+"%"}}/></div>
  <div className="grid">{u.map(x=><div className="card" key={x.id}><h3>{x.title} {x.done&&<span className="tag ok">Revisada</span>}</h3><p className="mu">{x.body}</p><p><b>{x.question}</b></p>{x.options.map((o:string,i:number)=><button key={i} className="btn o opt" onClick={()=>ans(x.id,i)}>{o}</button>)}{msg[x.id]&&<p>{msg[x.id]}</p>}</div>)}</div>
  <h2>Comparador: supervisado vs. no supervisado</h2><button className={"btn"+(cmp==="s"?"":" o")} onClick={()=>setCmp("s")}>Supervisado</button> <button className={"btn"+(cmp==="n"?"":" o")} onClick={()=>setCmp("n")}>No supervisado</button>
  <table><thead><tr><th>Datos de entrada</th><th>Resultado típico</th><th>Ejemplo</th><th>Salidas</th></tr></thead><tbody><tr>{C[cmp].map((v:string)=><td key={v}>{v}</td>)}</tr></tbody></table>
  <h2>Flujo de Machine Learning</h2><div className="grid">{S.map((s,i)=><div className="card" key={s} style={{animationDelay:`${i*70}ms`}}><span className="n">{i+1}</span> <b>{s}</b></div>)}</div></div>;
}
export function Data(){
  const [ds,setDs]=useState<any[]>([]);const [sel,setSel]=useState<any>(null);const [err,setErr]=useState("");const [o,setO]=useState({sep:",",encoding:"utf-8"});
  const load=()=>api("/datasets").then(d=>{setDs(d);setSel((s:any)=>s?d.find((x:any)=>x.id===s.id)||d[0]:d[0])});useEffect(()=>{load()},[]);
  const up=async(f?:File)=>{if(!f)return;setErr("");const fd=new FormData();fd.append("file",f);fd.append("sep",o.sep);fd.append("encoding",o.encoding);try{const d=await api("/datasets/upload",{method:"POST",body:fd});await load();setSel(d)}catch(e:any){setErr(e.message)}};
  const del=async(id:number)=>{try{await api(`/datasets/${id}`,{method:"DELETE"});setSel(null);load()}catch(e:any){setErr(e.message)}};
  const cols=sel?.profile.columns||[];const nc=cols.find((c:any)=>c.mean!==undefined);const ix=cols.indexOf(nc);
  return <div className="view"><h1>Centro de datos</h1><div className="grid">{ds.map(d=><button key={d.id} className={"card link"+(sel?.id===d.id?" sel":"")} onClick={()=>setSel(d)}><b>{d.name}</b><p className="mu">{d.rows} filas · {d.cols} columnas</p><Tag s={d.status}/></button>)}
  <div className="card"><b>Importar CSV</b><label>Separador<select value={o.sep} onChange={e=>setO({...o,sep:e.target.value})}><option value=",">Coma (,)</option><option value=";">Punto y coma (;)</option><option value={"\t"}>Tabulación</option><option value="|">Barra (|)</option></select></label>
  <label>Codificación<select value={o.encoding} onChange={e=>setO({...o,encoding:e.target.value})}><option value="utf-8">UTF-8</option><option value="latin-1">Latin-1</option></select></label><input type="file" accept=".csv" onChange={e=>{up(e.target.files?.[0]);e.target.value=""}}/></div></div>
  {err&&<div className="alert bad">{err}</div>}
  {sel&&<><h2>{sel.name} <Tag s={sel.status}/> <button className="btn o" onClick={()=>del(sel.id)}>Eliminar</button></h2>{sel.profile.warnings.map((w:string)=><div className="alert" key={w}>{w}</div>)}
  <table><thead><tr><th>Columna</th><th>Tipo</th><th>Faltantes</th><th>Distintos</th><th>Mín</th><th>Máx</th><th>Prom.</th><th>Desv.</th><th>Atípicos / frecuentes</th></tr></thead><tbody>{cols.map((c:any)=><tr key={c.name}><td>{c.name}</td><td>{c.type}</td><td>{c.nulls}</td><td>{c.distinct}</td><td>{c.min??"—"}</td><td>{c.max??"—"}</td><td>{c.mean??"—"}</td><td>{c.std??"—"}</td><td>{c.outliers??(c.top||[]).map((t:any)=>t.join(": ")).join(" · ")}</td></tr>)}</tbody></table>
  {nc&&<><h2>Dato vs. información (dataset activo)</h2><div className="grid"><div className="card"><span className="tag">Dato</span><p className="mono">{nc.name} = {sel.profile.preview[0][ix]}</p><p className="mu">Un valor aislado, sin contexto.</p></div><div className="card"><span className="tag ok">Información</span><p>El promedio de <b>{nc.name}</b> es <b className="mono">{nc.mean}</b> en {sel.rows} registros (rango {nc.min}–{nc.max}).</p><p className="mu">El dato organizado e interpretado.</p></div></div></>}
  <h2>Vista previa</h2><table><thead><tr>{cols.map((c:any)=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{sel.profile.preview.map((r:string[],i:number)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></>}</div>;
}
const SG=["Validando","Preparando","Procesando","Evaluando","Finalizando"];
export function Lab(){
  const [ds,setDs]=useState<any[]>([]);const [f,setF]=useState<any>({title:"",objective:"",dataset_id:0,approach:"clf",target:"",features:[]});
  const [pid,setPid]=useState<number|null>(null);const [ex,setEx]=useState<any>(null);const [err,setErr]=useState("");const tm=useRef<any>(null);
  useEffect(()=>{api("/datasets").then(d=>{setDs(d);if(d[0])setF((x:any)=>({...x,dataset_id:d[0].id,target:d[0].profile.columns.at(-1).name}))});return()=>clearInterval(tm.current)},[]);
  const cur=ds.find(d=>d.id===+f.dataset_id);const set=(p:any)=>{setF({...f,...p});setPid(null)};
  const tc=cur?.profile.columns.find((c:any)=>c.name===f.target);
  const sug=f.approach==="uns"?"Sin variable objetivo: exploración no supervisada.":tc?.type==="numérico"&&tc.distinct>10?"Objetivo numérico continuo → sugerencia: Regresión.":"Objetivo con pocas categorías → sugerencia: Clasificación.";
  const nums=(cur?.profile.columns||[]).filter((c:any)=>c.type==="numérico"&&c.name!==f.target);
  const active=ex&&["en_cola","en_proceso"].includes(ex.status);
  const tog=(n:string)=>set({features:f.features.includes(n)?f.features.filter((x:string)=>x!==n):[...f.features,n]});
  const save=async()=>{setErr("");try{const p=await api("/practices",{method:"POST",body:JSON.stringify({...f,dataset_id:+f.dataset_id,target:f.approach==="uns"?null:f.target})});setPid(p.id)}catch(e:any){setErr(e.message)}};
  const poll=(id:number)=>{clearInterval(tm.current);tm.current=setInterval(async()=>{try{const x=await api(`/executions/${id}`);setEx(x);if(!["en_cola","en_proceso"].includes(x.status))clearInterval(tm.current)}catch{clearInterval(tm.current)}},600)};
  const run=async()=>{if(!pid||active)return;setErr("");try{const x=await api(`/practices/${pid}/run`,{method:"POST"});setEx(x);poll(x.id)}catch(e:any){setErr(e.message)}};
  const cancel=async()=>{setEx(await api(`/executions/${ex.id}/cancel`,{method:"POST"}))};
  return <div className="view"><h1>Laboratorio ML</h1><div className="card form">
    <label>Dataset<select value={f.dataset_id} onChange={e=>{const d=ds.find(x=>x.id===+e.target.value);set({dataset_id:e.target.value,target:d.profile.columns.at(-1).name,features:[]})}}>{ds.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>Enfoque<select value={f.approach} onChange={e=>set({approach:e.target.value})}><option value="clf">Supervisado · Clasificación</option><option value="reg">Supervisado · Regresión</option><option value="uns">No supervisado · Agrupamiento</option></select></label>
    {f.approach!=="uns"&&<label>Variable objetivo<select value={f.target} onChange={e=>set({target:e.target.value,features:[]})}>{cur?.profile.columns.map((c:any)=><option key={c.name}>{c.name}</option>)}</select></label>}
    <div className="alert">{sug} El sistema orienta; usted confirma.</div>
    <label>Variables de entrada (sin marcar = todas las numéricas)</label><div className="chips">{nums.map((c:any)=><button key={c.name} className={"chip"+(f.features.includes(c.name)?" on":"")} onClick={()=>tog(c.name)}>{c.name}</button>)}</div>
    <label>Título<input value={f.title} onChange={e=>set({title:e.target.value})}/></label>
    <label>Objetivo de la práctica (lenguaje sencillo)<input value={f.objective} onChange={e=>set({objective:e.target.value})} placeholder="Ej.: predecir el riesgo de cada solicitud"/></label>
    <button className="btn o" onClick={save}>Guardar práctica</button> <button className="btn" disabled={!pid||!!active} onClick={run}>Ejecutar práctica</button> <Tag s={pid?"completada":"borrador"}/><span className="mu"> {pid?"Borrador guardado":"Borrador sin guardar"}</span></div>
  {err&&<div className="alert bad">{err}</div>}
  {ex&&<div className="stages"><p>{ex.code} · <Tag s={ex.status}/> {active&&<button className="btn o" onClick={cancel}>Cancelar</button>} {(ex.status==="fallida"||ex.status==="cancelada")&&<button className="btn" onClick={run}>Reintentar</button>}</p>
    {SG.map((s,i)=>{const k=SG.indexOf(ex.stage);const ok=ex.status==="completada"||ex.status==="con_advertencias"||k>i;return <div key={s} className={"st"+(ok?" ok":k===i?" on":"")}><span className="n">{i+1}</span>{s}</div>})}</div>}
  {ex&&!active&&<><h2>Resultados</h2><Result r={ex}/></>}</div>;
}
export function HistoryPage({role}:{role:string}){
  const [e,setE]=useState<any[]>([]);const [sel,setSel]=useState<any>(null);const [q,setQ]=useState<any>({status:"",approach:"",dataset:"",user:"",desde:"",hasta:""});
  const load=()=>api("/executions?"+new URLSearchParams(q).toString()).then(setE);useEffect(()=>{load()},[q]);
  const rv=async(id:number)=>{await api(`/executions/${id}/review`,{method:"POST"});load()};const s=(k:string)=>(x:any)=>setQ({...q,[k]:x.target.value});
  return <div className="view"><h1>Historial</h1><div className="filters"><select value={q.status} onChange={s("status")}><option value="">Todos los estados</option>{Object.keys(LB).slice(0,6).map(k=><option key={k} value={k}>{LB[k]}</option>)}</select>
  <select value={q.approach} onChange={s("approach")}><option value="">Todos los enfoques</option>{Object.entries(AP).map(([k,v])=><option key={k} value={k}>{v as string}</option>)}</select>
  <input placeholder="Dataset" value={q.dataset} onChange={s("dataset")}/>{role!=="Estudiante"&&<input placeholder="Usuario" value={q.user} onChange={s("user")}/>}<input type="date" value={q.desde} onChange={s("desde")}/><input type="date" value={q.hasta} onChange={s("hasta")}/></div>
  <table><thead><tr><th>ID</th><th>Fecha</th><th>Usuario</th><th>Dataset</th><th>Enfoque</th><th>Estado</th><th></th></tr></thead><tbody>{e.map(x=><tr key={x.id}><td>{x.code}</td><td>{new Date(x.started_at).toLocaleString()}</td><td>{x.user}</td><td>{x.dataset}</td><td>{AP[x.approach]}</td><td><Tag s={x.status}/></td>
  <td><button className="btn o" onClick={()=>setSel(x)}>Ver</button> {x.reviewed?<span className="tag ok">Revisada</span>:role!=="Estudiante"&&<button className="btn o" onClick={()=>rv(x.id)}>Marcar revisada</button>}</td></tr>)}</tbody></table>
  {!e.length&&<div className="alert">No hay ejecuciones con estos filtros.</div>}{sel&&<Result r={sel}/>}</div>;
}
export function Admin(){
  const [tab,setTab]=useState("u");const [u,setU]=useState<any[]>([]);const [a,setA]=useState<any[]>([]);const [d,setD]=useState<any[]>([]);const [un,setUn]=useState<any[]>([]);const [cf,setCf]=useState<any>({});const [nu,setNu]=useState({username:"",password:"",role:"Estudiante"});const [msg,setMsg]=useState("");
  const load=()=>{api("/admin/users").then(setU);api("/admin/audit").then(setA);api("/datasets").then(setD);api("/learning").then(setUn);api("/admin/settings").then(setCf)};useEffect(()=>{load()},[]);
  const go=async(fn:()=>Promise<any>,ok="Guardado")=>{try{await fn();setMsg(ok);load()}catch(e:any){setMsg(e.message)}};
  const T=[["u","Usuarios"],["d","Datasets"],["c","Contenidos"],["p","Parámetros"],["a","Auditoría"]];
  return <div className="view"><h1>Administración</h1><div className="tabs">{T.map(([k,t])=><button key={k} className={"chip"+(tab===k?" on":"")} onClick={()=>{setTab(k);setMsg("")}}>{t}</button>)}</div>{msg&&<div className="alert">{msg}</div>}
  {tab==="u"&&<><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead><tbody>{u.map(x=><tr key={x.id}><td>{x.username}</td><td><select value={x.role} onChange={e=>go(()=>api(`/admin/users/${x.id}`,{method:"PATCH",body:JSON.stringify({role:e.target.value})}))}>{["Estudiante","Instructor","Administrador"].map(r=><option key={r}>{r}</option>)}</select></td><td><button className="btn o" onClick={()=>go(()=>api(`/admin/users/${x.id}`,{method:"PATCH",body:JSON.stringify({active:!x.active})}))}>{x.active?"Activo · bloquear":"Inactivo · activar"}</button></td></tr>)}</tbody></table>
  <h2>Nuevo usuario</h2><div className="filters"><input placeholder="Usuario" value={nu.username} onChange={e=>setNu({...nu,username:e.target.value})}/><input type="password" placeholder="Contraseña (8+)" value={nu.password} onChange={e=>setNu({...nu,password:e.target.value})}/><select value={nu.role} onChange={e=>setNu({...nu,role:e.target.value})}>{["Estudiante","Instructor","Administrador"].map(r=><option key={r}>{r}</option>)}</select><button className="btn" onClick={()=>go(()=>api("/admin/users",{method:"POST",body:JSON.stringify(nu)}),"Usuario creado")}>Crear</button></div></>}
  {tab==="d"&&<><table><thead><tr><th>Dataset</th><th>Origen</th><th>Filas</th><th>Habilitado</th><th></th></tr></thead><tbody>{d.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.source}</td><td>{x.rows}</td><td><button className="btn o" onClick={()=>go(()=>api(`/admin/datasets/${x.id}`,{method:"PATCH",body:JSON.stringify({enabled:!x.enabled})}))}>{x.enabled?"Habilitado":"Deshabilitado"}</button></td><td><button className="btn o" onClick={()=>go(()=>api(`/datasets/${x.id}`,{method:"DELETE"}),"Eliminado")}>Eliminar</button></td></tr>)}</tbody></table>
  <button className="btn" onClick={()=>go(async()=>{const r=await api("/admin/purge",{method:"POST"});setMsg(`Archivos depurados: ${r.deleted}`)},"")}>Depurar archivos vencidos (retención)</button></>}
  {tab==="c"&&un.map((x,i)=><div className="card form" key={x.id}><label>Título<input value={x.title} onChange={e=>setUn(un.map((y,j)=>j===i?{...y,title:e.target.value}:y))}/></label><label>Contenido<textarea value={x.body} rows={3} onChange={e=>setUn(un.map((y,j)=>j===i?{...y,body:e.target.value}:y))}/></label><button className="btn o" onClick={()=>go(()=>api(`/admin/units/${x.id}`,{method:"PUT",body:JSON.stringify({title:x.title,body:x.body})}))}>Guardar</button></div>)}
  {tab==="p"&&<div className="card form">{[["max_upload_mb","Tamaño máximo de CSV (MB)"],["retention_days","Retención de archivos (días)"]].map(([k,t])=><label key={k}>{t}<input value={cf[k]||""} onChange={e=>setCf({...cf,[k]:e.target.value})}/></label>)}<button className="btn" onClick={()=>go(async()=>{for(const k of Object.keys(cf))await api("/admin/settings",{method:"PUT",body:JSON.stringify({key:k,value:String(cf[k])})})})}>Guardar parámetros</button></div>}
  {tab==="a"&&<table><thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Recurso</th><th>Resultado</th></tr></thead><tbody>{a.map((x,i)=><tr key={i}><td>{new Date(x.at).toLocaleString()}</td><td>{x.actor}</td><td>{x.action}</td><td>{x.entity}</td><td>{x.result}</td></tr>)}</tbody></table>}</div>;
}
const GUION=[["Ingresar con usuario estudiante","El sistema valida identidad y aplica permisos."],["Mostrar dashboard","Los indicadores resumen actividad y accesos."],["Abrir Fundamentos IA","Se enseñan los conceptos antes de la práctica."],["Entrar al Centro de datos y elegir dataset demo","Entrada controlada y documentada."],["Revisar el perfilado","Estructura, tipos, faltantes y calidad."],["Configurar objetivo y enfoque en el Laboratorio","La elección depende del objetivo y la variable objetivo."],["Guardar y ejecutar el pipeline","Cada etapa tiene progreso y estado."],["Abrir resultados","Métricas, contexto y limitaciones."],["Mostrar la etiqueta del motor","Se distingue demostración de modelo ML real."],["Consultar historial y generar el reporte","La práctica queda trazable y exportable."]];
const CHK=["Credenciales de demostración preparadas y roles probados","Dataset de ejemplo documentado y validado","Objetivo y variable objetivo definidos","Se conoce si el motor es simulado o real","Estados de ejecución y mensajes de error funcionan","Historial y reporte corresponden a los datos persistidos","No se exponen datos sensibles ni rutas internas","Evidencia de pruebas y limitaciones conocidas disponibles"];
const ACC=["Accede al contenido de introducción a IA","Distingue datos e información con ejemplos","Compara aprendizaje supervisado y no supervisado","Reconoce clasificación y regresión","Visualiza el flujo ML en etapas","Selecciona o importa un dataset válido y ve su perfil","Registra una práctica y presenta un resultado trazable","Diferencia demostración de modelo ML real","Pasan las pruebas críticas de carga, permisos y ejecución","Guía de uso y documentación técnica disponibles"];
export function Demo(){
  const [c,setC]=useState<any>({});const L=(t:string[],p:string)=>t.map((x,i)=><label key={x} className="ck"><input type="checkbox" checked={!!c[p+i]} onChange={()=>setC({...c,[p+i]:!c[p+i]})}/> {x}</label>);
  return <div className="view"><h1>Guía de demostración</h1><p className="mu">Guion empresarial, checklist previo y criterios de aceptación de HT-01.</p>
  <h2>Guion de demostración</h2><table><thead><tr><th>N.º</th><th>Acción</th><th>Qué explicar</th></tr></thead><tbody>{GUION.map((g,i)=><tr key={i}><td>{i+1}</td><td>{g[0]}</td><td>{g[1]}</td></tr>)}</tbody></table>
  <h2>Checklist antes de presentar</h2><div className="card">{L(CHK,"k")}</div><h2>Criterios de aceptación HT-01</h2><div className="card">{L(ACC,"a")}</div></div>;
}
