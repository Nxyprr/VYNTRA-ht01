import {useEffect,useState} from "react";
import {LayoutDashboard,BookOpen,Database,FlaskConical,History as Hi,ShieldCheck,ClipboardCheck,LogOut,GraduationCap,Users,Sun,Moon,Workflow,BarChart3,Bell,ChevronDown,CheckCircle2} from "lucide-react";
import {api,setToken,BASE} from "./api";
import {Admin,Demo} from "./pages";
import {Data} from "./data";
import {Learn,Lab,HistoryPage} from "./student";
import {Dashboard} from "./dash";
import {Pipeline} from "./pipeline";
import {Results} from "./results";
const NAV:any[]=[["home","Dashboard",LayoutDashboard],["learn","Fundamentos IA",BookOpen],["data","Centro de datos",Database],["lab","Laboratorio ML",FlaskConical],["pipe","Pipeline",Workflow],["res","Resultados",BarChart3],["hist","Historial",Hi],["demo","Guía de demo",ClipboardCheck],["adm","Administración",ShieldCheck]];
const ALLOW:any={Estudiante:["home","learn","data","lab","pipe","res","hist","demo"],Instructor:["home","learn","data","lab","pipe","res","hist","demo"],Administrador:["home","learn","data","hist","adm","demo"]};
const LABEL:any={Estudiante:{pipe:"Mi pipeline",res:"Mis resultados",hist:"Mi historial"},Instructor:{learn:"Fundamentos (consulta)",lab:"Crear prácticas",pipe:"Monitor de pipeline",res:"Revisión de resultados",hist:"Seguimiento de estudiantes"},Administrador:{learn:"Contenidos",data:"Datasets",hist:"Ejecuciones"}};
const DEMO=(import.meta as any).env?.VITE_DEMO_LOGIN!=="false";
const PROFILES=[["Estudiante","Aprende, practica y consulta su historial","estudiante","Est2026!",GraduationCap],["Instructor","Revisa prácticas y evidencias","instructor","Ins2026!",Users],["Administrador","Gestiona usuarios, datasets y auditoría","admin","Adm2026!",ShieldCheck]] as const;
const ts=(s:string)=>new Date(s.endsWith("Z")?s:s+"Z").getTime();
function Topbar({title,Icon,me,theme,setTheme,onOut}:any){
  const [t,setT]=useState(new Date());const [pop,setPop]=useState("");const [feed,setFeed]=useState<any[]>([]);const [seen,setSeen]=useState(Date.now());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i)},[]);
  useEffect(()=>{const l=()=>api("/stats").then((d:any)=>setFeed(d.feed||[])).catch(()=>{});l();const i=setInterval(l,15000);return()=>clearInterval(i)},[]);
  const unseen=feed.filter(a=>ts(a.at)>seen).length;
  return <div className="topbar">{pop&&<div className="pop-bg" onClick={()=>setPop("")}/>}
    <div className="crumb"><Icon size={20}/><b>{title}</b><span className="tag d">HT-01</span></div><div style={{flex:1}}/>
    <span className="clock">{t.toLocaleDateString("es-PE",{weekday:"short",day:"numeric",month:"short"})} · {t.toLocaleTimeString("es-PE")}</span>
    <span className="tag ok"><i className="live"/>Motor: ML real</span>
    <div className="pw"><button className="iconbtn" title="Notificaciones" onClick={()=>setPop(pop==="n"?"":"n")}><Bell size={18}/>{unseen>0&&<i className="badge">{unseen}</i>}</button>
      {pop==="n"&&<div className="pop"><div className="phd"><b>Notificaciones</b><button className="btn o sm" onClick={()=>setSeen(Date.now())}>Marcar leídas</button></div>{feed.length?feed.slice(0,6).map((a,i)=><div className="pit" key={i}><i className="dot"/><div><b>{a.action.replace(/_/g," ")}</b><br/><span className="mu">{a.actor} · {new Date(ts(a.at)).toLocaleTimeString("es-PE")} · {a.result}</span></div></div>):<p className="mu">Sin notificaciones.</p>}</div>}</div>
    <div className="pw"><button className="chipuser" onClick={()=>setPop(pop==="u"?"":"u")}><i className="live"/>{me.username} · {me.role}<ChevronDown size={14}/></button>
      {pop==="u"&&<div className="pop"><div className="phd"><b>{me.username}</b><span className="tag">{me.role}</span></div><button className="pit btn-l" onClick={()=>{setTheme(theme==="dark"?"light":"dark");setPop("")}}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>} Cambiar tema</button><button className="pit btn-l" onClick={onOut}><LogOut size={16}/> Cerrar sesión</button></div>}</div></div>;
}
export default function App(){
  const [me,setMe]=useState<any>(null);const [page,setPage]=useState("home");const [focus,setFocus]=useState<number|null>(null);
  const [f,setF]=useState({username:"",password:""});const [err,setErr]=useState("");const [toasts,setToasts]=useState<any[]>([]);
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("vyntra-theme")||"light"}catch{return "light"}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem("vyntra-theme",theme)}catch{}},[theme]);
  useEffect(()=>{const h=()=>{setToken("");setMe(null);setErr("Su sesión expiró. Inicie sesión nuevamente.")};window.addEventListener("expired",h);return()=>window.removeEventListener("expired",h)},[]);
  useEffect(()=>{const h=(e:any)=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,m:e.detail}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200)};window.addEventListener("toast",h);return()=>window.removeEventListener("toast",h)},[]);
  const login=async()=>{try{const r=await fetch(BASE+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});const d=await r.json();if(!r.ok)throw new Error(d.detail);setToken(d.token);setErr("");setPage("home");setMe(d)}catch(e:any){setErr(e.message||"Servicio no disponible.")}};
  const out=async()=>{try{await api("/auth/logout",{method:"POST"})}catch{}setToken("");setMe(null);setPage("home");setFocus(null);setF({username:"",password:""})};
  if(!me)return <div className="login"><div className="lcard wide view"><img src="/logo.svg" className="logo big" alt="VYNTRA"/><h1 className="brand">VYNTRA</h1><p className="mu">Plataforma Inteligente de Análisis y Explicación de IA · HT-01</p>
    <p className="lt">Iniciar sesión</p>
    <div className="lrow"><input placeholder="Usuario" value={f.username} onChange={e=>setF({...f,username:e.target.value})}/><input type="password" placeholder="Contraseña" value={f.password} onChange={e=>setF({...f,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&login()}/><button className="btn" onClick={login}>Iniciar sesión</button></div>
    {err&&<div className="alert bad">{err}</div>}
    {DEMO&&<><p className="mu sm2">Toca un perfil para autocompletar las credenciales de demostración:</p><div className="rolegrid">{PROFILES.map(([n,d,u,p,I])=><button key={n} className="rolecard" onClick={()=>{setF({username:u,password:p});setErr("")}}><span className="ic"><I size={20}/></span><b>{n}</b><span className="mu">{d}</span></button>)}</div></>}</div></div>;
  const al:string[]=ALLOW[me.role]||ALLOW.Estudiante;const nav:any[]=NAV.filter(n=>al.includes(n[0])).map(n=>[n[0],LABEL[me.role]?.[n[0]]||n[1],n[2]]);const pg=al.includes(page)?page:"home";const cur=nav.find(n=>n[0]===pg)||nav[0];
  const P:any={home:<Dashboard go={setPage} role={me.role}/>,learn:<Learn role={me.role}/>,data:<Data role={me.role}/>,lab:<Lab go={setPage}/>,pipe:<Pipeline role={me.role} focus={focus} setFocus={setFocus} go={setPage}/>,res:<Results role={me.role} focus={focus} setFocus={setFocus} go={setPage}/>,hist:<HistoryPage role={me.role}/>,demo:<Demo/>,adm:<Admin/>};
  return <div className="app"><aside><div className="brandrow"><img src="/logo.svg" className="logo" alt=""/><div><b>VYNTRA</b><small>{me.role}</small></div></div>
    {nav.map(([k,t,I])=><button key={k} className={"nv"+(pg===k?" on":"")} onClick={()=>setPage(k)}><I size={18}/><span>{t}</span></button>)}
    <div style={{flex:1}}/><button className="nv" onClick={out}><LogOut size={18}/><span>Cerrar sesión</span></button></aside>
    <main><Topbar title={cur[1]} Icon={cur[2]} me={me} theme={theme} setTheme={setTheme} onOut={out}/><div className="content" key={pg}>{P[pg]}</div></main>
    <div className="toasts">{toasts.map(t=><div key={t.id} className="toast"><CheckCircle2 size={18}/> {t.m}</div>)}</div></div>;
}
