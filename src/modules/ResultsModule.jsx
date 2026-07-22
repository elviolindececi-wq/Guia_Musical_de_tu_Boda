/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";

const CHECKLIST_BASE={
  planner:["Compartir el guion musical con al menos 3 semanas de anticipación","Alinear el timing musical con el timeline fotográfico","Confirmar posición del fotógrafo para la entrada de la novia","Definir señales de comunicación entre coordinador y músicos","Tener un plan B para cortes de luz o problemas técnicos"],
  dj:["Enviar nombre exacto de canción, artista y versión específica para cada momento","Indicar el segundo exacto de inicio — no siempre desde el principio de la canción","Confirmar quién da la señal de inicio para cada momento","Pedir confirmación de que tiene todas las canciones antes del evento","Acordar playlist de backup para imprevistos","Confirmar equipo de sonido y potencia en el lugar"],
  musicos:["Enviar la lista con al menos 2 semanas de anticipación","Confirmar que conocen cada pieza — pedir grabación si es músico nuevo","Confirmar si toca con partitura o de memoria","Acordar vestimenta, hora de llegada y espacio en el lugar","Hacer prueba de sonido antes de que lleguen los invitados"],
  iglesia:["Reunirse con el sacerdote para confirmar qué canciones están permitidas","Confirmar qué momentos litúrgicos requieren música específica (Aleluya, Comunión)","Verificar si el órgano o piano de la iglesia está disponible","Confirmar si músico externo puede tocar — algunas iglesias no lo permiten","Consultar si hay ensayo disponible en el recinto"],
  pareja:["Escuchar la canción de entrada 10 veces y confirmar que genera la emoción buscada","Verificar que la duración de cada canción se ajusta al momento real","Compartir este guion con todos los proveedores antes de fin de mes","Crear playlist de Spotify como respaldo con todas las canciones en orden","No cambiar canciones en los últimos 7 días — confiar en lo que eligieron","El día del evento: llegar con tiempo para confirmar que todo suena bien"],
};

const encodeWhatsApp = (text) => encodeURIComponent(text);

const generarMsgDJ = (form, results, arch) => {
  const canciones = (results.guion || [])
    .map(item => `• ${item.momento}: ${item.cancion} - ${item.artista}${item.version ? ` (${item.version})` : ""}${item.duracion ? ` - ${item.duracion}` : ""}`)
    .join("\n");

  return encodeWhatsApp(`Hola! Te comparto el guion musical de la boda de ${form.nombre1} y ${form.nombre2}.

Arquetipo musical: ${arch?.n || "Personalizado"}

Canciones por momento:
${canciones || "A confirmar"}

Puntos importantes:
• Confirmar versión exacta de cada canción.
• Confirmar segundo exacto de inicio.
• Tener playlist de respaldo.
• Coordinar las señales de entrada con planner o coordinación.

Gracias!`);
};

const generarMsgPlanner = (form, results, arch) => {
  const momentos = (results.guion || [])
    .map(item => `• ${item.momento}: ${item.cancion} - ${item.artista}`)
    .join("\n");

  return encodeWhatsApp(`Hola! Te comparto el guion musical de la boda de ${form.nombre1} y ${form.nombre2}.

Perfil musical: ${arch?.n || "Personalizado"}

Momentos musicales:
${momentos || "A confirmar"}

Para coordinar:
• Timing de cada entrada.
• Señal de inicio para DJ o músicos.
• Ubicación de músicos y fotógrafo.
• Plan B técnico si hay corte o retraso.

Gracias!`);
};

const generarMsgMusico = (form, results, arch) => {
  const repertorio = (results.guion || [])
    .map(item => `• ${item.momento}: ${item.cancion} - ${item.artista}${item.version ? ` (${item.version})` : ""}`)
    .join("\n");

  return encodeWhatsApp(`Hola! Te comparto el repertorio sugerido para la boda de ${form.nombre1} y ${form.nombre2}.

Arquetipo: ${arch?.n || "Personalizado"}

Repertorio:
${repertorio || "A confirmar"}

A confirmar:
• Tonalidad o versión.
• Si se toca con pista, partitura o arreglo propio.
• Hora de llegada y prueba de sonido.
• Ubicación dentro del espacio.

Gracias!`);
};

const ResultsDepsContext = createContext(null);

function useResultsDeps(){
  const deps = useContext(ResultsDepsContext);
  if(!deps) throw new Error("ResultsModule debe renderizarse dentro de ResultsDepsContext.");
  return deps;
}

function BotanicalDivider({label}){
  const {THEME} = useResultsDeps();
  return <div style={{position:"relative",padding:"clamp(20px,3vw,32px) 0",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <svg viewBox="0 0 340 44" width="100%" height="44" style={{display:"block"}}>
      <line x1="10" y1="22" x2="130" y2="22" stroke="#C9A96E" strokeWidth="0.6" opacity="0.4"/>
      <path d="M80,22 Q68,16 58,10" stroke="#4A5E3A" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M58,10 Q54,6 50,8 Q54,10 58,10" fill="#4A5E3A" opacity="0.45"/>
      <path d="M100,22 Q90,15 84,9" stroke="#4A5E3A" strokeWidth="0.9" fill="none" opacity="0.4"/>
      <path d="M84,9 Q80,5 76,7 Q80,9 84,9" fill="#4A5E3A" opacity="0.4"/>
      <path d="M116,22 Q110,17 106,13" stroke="#7B8C6E" strokeWidth="0.7" fill="none" opacity="0.35"/>
      <circle cx="170" cy="22" r="7" fill="none" stroke="#C9A96E" strokeWidth="0.8" opacity="0.55"/>
      <circle cx="170" cy="22" r="3" fill="#C9A96E" opacity="0.5"/>
      <circle cx="170" cy="13" r="2.5" fill="#FBF7EF" stroke="#C9A96E" strokeWidth="0.7" opacity="0.7"/>
      <circle cx="170" cy="31" r="2.5" fill="#FBF7EF" stroke="#C9A96E" strokeWidth="0.7" opacity="0.7"/>
      <circle cx="161" cy="22" r="2.5" fill="#FBF7EF" stroke="#C9A96E" strokeWidth="0.7" opacity="0.7"/>
      <circle cx="179" cy="22" r="2.5" fill="#FBF7EF" stroke="#C9A96E" strokeWidth="0.7" opacity="0.7"/>
      <path d="M260,22 Q272,16 282,10" stroke="#4A5E3A" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M282,10 Q286,6 290,8 Q286,10 282,10" fill="#4A5E3A" opacity="0.45"/>
      <path d="M240,22 Q250,15 256,9" stroke="#4A5E3A" strokeWidth="0.9" fill="none" opacity="0.4"/>
      <path d="M256,9 Q260,5 264,7 Q260,9 256,9" fill="#4A5E3A" opacity="0.4"/>
      <path d="M224,22 Q230,17 234,13" stroke="#7B8C6E" strokeWidth="0.7" fill="none" opacity="0.35"/>
      <line x1="210" y1="22" x2="328" y2="22" stroke="#C9A96E" strokeWidth="0.6" opacity="0.4"/>
    </svg>
    {label&&<div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",background:"#F5EFE0",padding:"0 14px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(74,94,58,.6)"}}>{label}</div>}
  </div>;
}

function AccordionBlock({id,icon,title,subtitle,isOpen,onToggle,children,defaultTag}){
  const {G,C,DIM} = useResultsDeps();
  return <div style={{marginBottom:12,border:`1px solid ${isOpen?"rgba(74,94,58,.28)":"rgba(74,94,58,.08)"}`,borderRadius:18,overflow:"hidden",transition:"border-color .25s"}}>
    <button onClick={onToggle} style={{width:"100%",background:isOpen?"#FBF7EF":"rgba(251,247,239,.95)",border:"none",cursor:"pointer",padding:"18px 22px",display:"flex",alignItems:"center",gap:14,textAlign:"left",transition:"background .25s"}}>
      <span style={{fontSize:"1.3rem",flexShrink:0}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.05rem,2vw,1.2rem)",fontWeight:600,color:isOpen?G:C,lineHeight:1.2,transition:"color .25s"}}>{title}</div>
        {subtitle&&<div style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:DIM,marginTop:3,lineHeight:1.4}}>{subtitle}</div>}
      </div>
      {defaultTag&&<span style={{fontFamily:"'Lora',serif",fontSize:".75rem",padding:"3px 10px",borderRadius:20,background:"rgba(74,94,58,.08)",color:G,border:"1px solid rgba(201,169,110,.2)",flexShrink:0,display:"none"}} className="tag-desktop">{defaultTag}</span>}
      <span style={{color:G,fontSize:"1.1rem",flexShrink:0,transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s"}}>▾</span>
    </button>
    {isOpen&&<div style={{padding:"4px 22px 22px",background:"rgba(234,228,210,.7)"}}>{children}</div>}
  </div>;
}

function SecLabel({children}){
  return <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0 14px"}}>
    <div style={{height:"1px",width:16,background:`linear-gradient(to right,transparent,rgba(201,169,110,.3))`}}/>
    <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(201,169,110,.55)",whiteSpace:"nowrap"}}>{children}</div>
    <div style={{height:"1px",flex:1,background:`linear-gradient(to right,rgba(201,169,110,.3),transparent)`}}/>
  </div>;
}

function PlaylistRow({item,num}){
  const {C,DIM,AudioButton} = useResultsDeps();
  const q=encodeURIComponent(`${item.c||""} ${item.a||""}`);
  return <div style={{padding:"10px 0",borderBottom:"1px solid rgba(201,169,110,.05)"}}>
    <div style={{display:"grid",gridTemplateColumns:"22px 1fr auto",alignItems:"center",gap:10}}>
      <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(74,94,58,.3)",textAlign:"center"}}>{num}</div>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:C,lineHeight:1.3}}>{item.c}</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:DIM}}>{item.a}</div>
      </div>
      <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.45)",whiteSpace:"nowrap"}}>{item.d}</div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,paddingLeft:32}}>
      <AudioButton cancion={item.c} artista={item.a}/>
      <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{padding:"6px 10px",fontSize:".8rem"}}>YT</a>
    </div>
  </div>;
}

function CheckItem({label,done,onToggle,important}){
  const {G,C,THEME} = useResultsDeps();
  return <div className="ci" onClick={onToggle}>
    <div className={`cb${done?" ck":""}`} style={{borderColor:important&&!done?"rgba(201,169,110,.5)":undefined}}>
      {done&&<span style={{color:G,fontSize:THEME.text.label,fontWeight:700}}>✓</span>}
    </div>
    <span style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:done?"rgba(26,26,20,.22)":C,textDecoration:done?"line-through":"none",lineHeight:1.55,transition:"all .2s"}}>{label}</span>
  </div>;
}

function GuionCarousel({items}){
  const {G,C,DIM,THEME,AudioButton} = useResultsDeps();
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if(!el) return;
    const cards = el.querySelectorAll('.momento-slide');
    if(cards[idx]) cards[idx].scrollIntoView({behavior:'smooth', block:'nearest', inline:'start'});
    setActiveIdx(idx);
  };

  useEffect(()=>{
    const el = scrollRef.current;
    if(!el) return;
    const onScroll = () => {
      const cards = el.querySelectorAll('.momento-slide');
      let closest = 0, minDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.getBoundingClientRect().left - el.getBoundingClientRect().left);
        if(dist < minDist){ minDist = dist; closest = i; }
      });
      setActiveIdx(closest);
    };
    el.addEventListener('scroll', onScroll, {passive:true});
    return ()=>el.removeEventListener('scroll', onScroll);
  },[]);

  if(!items || items.length === 0) return <p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:DIM,textAlign:"center",padding:"20px 0"}}>El guion musical no pudo generarse. Intentá de nuevo.</p>;

  return <div>
    {/* Scroll horizontal */}
    <div ref={scrollRef} style={{display:"flex",overflowX:"auto",gap:14,scrollSnapType:"x mandatory",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",padding:"4px 2px 8px",cursor:"grab"}}>
      {items.map((item,i)=>{
        const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}`);
        const isNovia=item.momento?.toLowerCase().includes("novia");
        return <div key={i} className="momento-slide" style={{
          minWidth:"min(88vw,360px)",maxWidth:380,scrollSnapAlign:"start",flexShrink:0,
          background:"#FBF7EF",
          border:"0.5px solid rgba(201,169,110,.28)",
          borderRadius:18,padding:"clamp(12px,2.5vw,22px) clamp(10px,2vw,20px)",position:"relative",overflow:"hidden"
        }}>
          {isNovia&&<div style={{position:"absolute",top:0,right:0,width:6,height:80,background:"linear-gradient(to bottom,#C9A96E,transparent)",borderRadius:"0 18px 0 0",opacity:.4,pointerEvents:"none"}}/>}
          {/* Número y ícono */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1.4rem"}}>{item.icono||"♪"}</span>
              <div>
                <div style={{fontFamily:"'Lora',serif",fontSize:".75rem",letterSpacing:".1em",textTransform:"uppercase",color:"#4A5E3A"}}>{item.momento}</div>
                {isNovia&&<div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(74,94,58,.6)",fontStyle:"italic"}}>El momento más recordado</div>}
              </div>
            </div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(26,26,20,.32)",background:"rgba(74,94,58,.06)",padding:"3px 8px",borderRadius:20}}>{item.duracion}</div>
          </div>
          {/* Canción principal */}
          <div style={{borderTop:"1px solid rgba(201,169,110,.1)",paddingTop:14,marginBottom:12}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.2rem,3vw,1.45rem)",color:C,marginBottom:4,lineHeight:1.15}}>{item.cancion}</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:isNovia?"rgba(245,239,224,.65)":"rgba(26,26,20,.65)"}}>{item.artista}{item.version&&<em style={{color:"rgba(26,26,20,.38)",fontStyle:"italic"}}> · {item.version}</em>}</div>
          </div>
          {/* Razón de Ceci */}
          {item.razon&&<p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:"rgba(26,26,20,.72)",lineHeight:1.65,margin:"0 0 14px",fontStyle:"italic",borderLeft:"2px solid rgba(201,169,110,.4)",paddingLeft:12}}>{item.razon}</p>}
          {/* Footer */}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:"auto",paddingTop:4}}>
            {item.alt&&<div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.28)"}}>Alt: {item.alt}</div>}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <AudioButton cancion={item.cancion} artista={item.artista} version={item.version} alt={item.alt}/>
              <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".82rem",padding:"6px 10px"}}>YT</a>
            </div>
          </div>
        </div>;
      })}
    </div>
    {/* Dots de navegación */}
    <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:12}}>
      {items.map((_,i)=><button key={i} onClick={()=>scrollTo(i)} style={{width:i===activeIdx?22:7,height:7,borderRadius:4,border:"none",background:i===activeIdx?G:"rgba(74,94,58,.2)",cursor:"pointer",transition:"all .3s",padding:0}}/>)}
    </div>
    <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.45)",textAlign:"center",marginTop:6,fontStyle:"italic"}}>
      {activeIdx+1} de {items.length} · Deslizá para ver todos los momentos
    </p>
  </div>;
}

function ResultsContent({results,form,checked,setChecked,arquetipo,resultToken,onRestart,onLogout,onGoHome,archetypes}){
  const {THEME,G,C,DIM,BackToHome,showToast} = useResultsDeps();
  const tog=k=>setChecked(c=>({...c,[k]:!c[k]}));
  const [open,setOpen]=useState({resumen:true,arquetipo:false,guion:true,playlists:false,checklist:false,compartir:false,exportar:false});
  const toggle=k=>setOpen(o=>({...o,[k]:!o[k]}));

  if(!results) return null;

  const fecha=form.fechaBoda?new Date(form.fechaBoda+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}):"";
  const arch=archetypes?.[arquetipo];
  const isCatolica=(form.tipoCeremonia?.includes("Religiosa")&&form.denominacionReligiosa==="Católica")||form.tipoCeremonia?.includes("Religiosa católica");
  const tieneMusico=form.formatoMusical?.some(f=>["Violín en vivo","Banda","Cuarteto cuerdas","Piano","Cantante"].includes(f));

  const checklistFull={
    planner:[...CHECKLIST_BASE.planner,...(results.checklist?.planner||[])],
    dj:[...CHECKLIST_BASE.dj,...(results.checklist?.dj||[])],
    musicos:tieneMusico?[...CHECKLIST_BASE.musicos,...(results.checklist?.musicos||[])]:[],
    iglesia:isCatolica?CHECKLIST_BASE.iglesia:[],
    pareja:[...CHECKLIST_BASE.pareja,...(results.checklist?.pareja||[])],
  };

  const totalItems=Object.values(checklistFull).flat().length;
  const doneItems=Object.entries(checklistFull).flatMap(([k,items])=>items.map((_,i)=>checked[`${k}_${i}`])).filter(Boolean).length;
  const pct=totalItems>0?Math.round(doneItems/totalItems*100):0;

  return <div style={{maxWidth:960,margin:"0 auto",background:"rgba(245,239,224,.88)",minHeight:"100dvh",padding:"0 0 100px"}}>

    {/* ══ NAV BAR ══ */}
    <div className="no-print" style={{background:"rgba(245,239,224,.95)",backdropFilter:"blur(8px)",borderBottom:"0.5px solid rgba(201,169,110,.2)",padding:"10px clamp(14px,3vw,32px)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"sticky",top:0,zIndex:20}}>
      <button onClick={onGoHome} style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(74,94,58,.08)",border:"1px solid rgba(74,94,58,.2)",borderRadius:100,fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:600,color:"#4A5E3A",cursor:"pointer",padding:"7px 14px"}}>
        ← Inicio
      </button>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.7)"}}>Tu Banda Sonora de Boda</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onGoHome} style={{background:"#4A5E3A",border:"none",borderRadius:100,padding:"8px 18px",fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:700,color:"#F5EFE0",cursor:"pointer"}}>🏠 Módulos</button>
      </div>
    </div>

    {/* ══ PORTADA ══ */}
    <div className="pdf-cover" style={{padding:"clamp(36px,6vw,64px) clamp(20px,4vw,48px)",textAlign:"center",borderBottom:"0.5px solid rgba(201,169,110,.25)",position:"relative",overflow:"hidden",background:"#4A5E3A"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,255,255,.06) 0%,transparent 100%)",pointerEvents:"none"}}/>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(.72rem,.9vw,.86rem)",letterSpacing:".22em",textTransform:"uppercase",color:"rgba(201,169,110,.8)",marginBottom:18}}>El Violín de Ceci · Tu Banda Sonora de Boda</div>
      <h1 style={{fontFamily:"'Great Vibes',cursive",fontSize:"clamp(2.8rem,7vw,4.2rem)",fontWeight:400,color:"#F5EFE0",margin:"0 0 4px",lineHeight:1.1}}>
        {form.nombre1} <span style={{color:"rgba(201,169,110,.8)"}}>&amp;</span> {form.nombre2}
      </h1>
      {(fecha||form.ciudad)&&<p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:"rgba(245,239,224,.55)",margin:"0 0 18px",letterSpacing:".04em"}}>{fecha}{fecha&&form.ciudad?" · ":""}{form.ciudad}</p>}
      {arch&&<div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(201,169,110,.15)",border:"0.5px solid rgba(201,169,110,.4)",borderRadius:100,padding:"9px 20px",marginBottom:16}}>
        <span style={{fontSize:"1.2rem"}}>{arch.e}</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G,fontStyle:"italic"}}>{arch.n}</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",color:"rgba(201,169,110,.55)"}}>{arch.m}</div>
        </div>
      </div>}
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:"rgba(245,239,224,.4)",margin:0,lineHeight:1.6}}>
        No necesitás leer todo de una vez. Abrí cada sección cuando la necesites.
      </p>
    </div>

    <div style={{padding:"12px 16px 0"}}>
      <BotanicalDivider/>
      {/* Link privado */}
      {resultToken&&<div className="no-print" style={{background:"rgba(201,169,110,.05)",border:"0.5px solid rgba(201,169,110,.25)",borderRadius:14,padding:"14px 18px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:G,marginBottom:3}}>Tu link privado de acceso</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:DIM,lineHeight:1.4}}>Guardalo para volver a tu guion desde cualquier dispositivo.</div>
          </div>
          <button className="lbtn" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?r=${resultToken}`);showToast("Link copiado ✓","success");}catch(e){}}}>Copiar link</button>
        </div>
      </div>}

      {/* ══ 1. RESUMEN GENERAL ══ */}
      <AccordionBlock id="resumen" icon="✦" title="Resumen de su boda" subtitle={`${form.nombre1} & ${form.nombre2}${arch?` · ${arch.n}`:""}`} isOpen={open.resumen} onToggle={()=>toggle("resumen")}>
        <div style={{paddingTop:16}}>
          {results.nota&&<div style={{position:"relative",padding:"20px 20px 16px",borderRadius:12,background:"#FBF7EF",border:"1px solid rgba(74,94,58,.14)",marginBottom:16}}>
            <div style={{position:"absolute",top:12,left:16,fontFamily:"'Playfair Display',serif",fontSize:"3rem",color:"rgba(201,169,110,.07)",lineHeight:1,userSelect:"none"}}>"</div>
            <p style={{fontFamily:"'Lora',serif",fontSize:"1.05rem",fontStyle:"italic",color:C,lineHeight:1.78,margin:"0 0 12px",paddingTop:6}}>{results.nota}</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{height:"1px",width:20,background:G,opacity:.4}}/>
              <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:G}}>Ceci · El Violín de Ceci</div>
            </div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16}}>
            {[{l:"Pareja",v:`${form.nombre1} & ${form.nombre2}`},{l:"Fecha",v:fecha||"—"},{l:"Ciudad",v:form.ciudad||"—"},{l:"Arquetipo",v:arch?.n||"—"}].map(it=><div key={it.l} style={{background:"#FBF7EF",borderRadius:10,padding:"14px 16px",border:"0.5px solid rgba(201,169,110,.28)",boxShadow:"0 1px 4px rgba(74,94,58,.06)"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".16em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:5}}>{it.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:600,color:"#1A1A14",lineHeight:1.3}}>{it.v}</div>
            </div>)}
          </div>
          <button className="pbtn" onClick={()=>setOpen(o=>({...o,guion:true,resumen:false}))} style={{width:"100%"}}>Empezar por mi guion musical →</button>
        </div>
      </AccordionBlock>

      {/* ══ 2. ARQUETIPO ══ */}
      <AccordionBlock id="arquetipo" icon={arch?.e||"♪"} title="Su perfil musical" subtitle={arch?`${arch.n} · ${arch.m}`:""} isOpen={open.arquetipo} onToggle={()=>toggle("arquetipo")}>
        {arch&&results.perfil&&<div style={{paddingTop:16}}>
          <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(201,169,110,.12)",marginBottom:12}}>
            <div style={{background:"linear-gradient(135deg,#EAE4D2,#F5EFE0)",padding:"16px 18px",borderBottom:"1px solid rgba(201,169,110,.1)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:"1.8rem"}}>{arch.e}</span>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontStyle:"italic",color:G}}>{arch.n}</div>
                  <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(201,169,110,.55)",marginTop:2}}>{arch.m}</div>
                </div>
              </div>
            </div>
            <div style={{background:"#FBF7EF",padding:"14px 18px"}}>
              {results.perfil.cluster&&<div style={{fontFamily:"'Lora',serif",fontSize:".76rem",letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.35)",marginBottom:8}}>{results.perfil.cluster}</div>}
              {results.perfil.desc&&<p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:C,lineHeight:1.68,margin:"0 0 8px"}}>{results.perfil.desc}</p>}
              {results.perfil.concepto&&<p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"rgba(26,26,20,.38)",lineHeight:1.62,fontStyle:"italic",margin:0,borderTop:"1px solid rgba(201,169,110,.06)",paddingTop:10}}>{results.perfil.concepto}</p>}
            </div>
          </div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:DIM,lineHeight:1.6,fontStyle:"italic",padding:"0 4px"}}>{arch.d}</div>
        </div>}
      </AccordionBlock>

      {/* ══ 3. GUION ══ */}
      <AccordionBlock id="guion" icon="♩" title="Guion musical de la ceremonia" subtitle="Deslizá para ver cada momento de la ceremonia" isOpen={open.guion} onToggle={()=>toggle("guion")} defaultTag="Principal">
        <div style={{paddingTop:16}}>
          {isCatolica&&<div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(74,94,58,.14)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>⚠️ Los momentos litúrgicos (Aleluya, Comunión, Ofertorio) requieren música aprobada por la iglesia. Confirmá con el sacerdote antes de cerrar el repertorio.</p>
          </div>}
          <GuionCarousel items={results.guion||[]}/>
        </div>
      </AccordionBlock>

      {/* ══ 4. PLAYLISTS ══ */}
      {(results.coctel?.length>0||results.cena?.length>0)&&<AccordionBlock id="playlists" icon="◈" title="Playlists de cóctel y cena" subtitle="Canciones curadas para después de la ceremonia" isOpen={open.playlists} onToggle={()=>toggle("playlists")}>
        <div style={{paddingTop:16}}>
          {results.coctel?.length>0&&<div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,169,110,.5)",marginBottom:8}}>Cóctel</div>
            <div style={{background:"#FBF7EF",border:"1px solid rgba(201,169,110,.07)",borderRadius:12,padding:"4px 14px"}}>
              {results.coctel.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
            </div>
          </div>}
          {results.cena?.length>0&&<div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,169,110,.5)",marginBottom:8}}>Cena</div>
            <div style={{background:"#FBF7EF",border:"1px solid rgba(201,169,110,.07)",borderRadius:12,padding:"4px 14px"}}>
              {results.cena.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
            </div>
          </div>}
        </div>
      </AccordionBlock>}

      {/* ══ 5. CHECKLIST ══ */}
      <AccordionBlock id="checklist" icon="✓" title="Checklist de coordinación" subtitle={`${doneItems} de ${totalItems} tareas completadas · ${pct}%`} isOpen={open.checklist} onToggle={()=>toggle("checklist")}>
        <div style={{paddingTop:16}}>
          <div style={{background:"#FBF7EF",border:"1px solid rgba(201,169,110,.1)",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:C}}>{doneItems} de {totalItems} completados</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",color:pct===100?G:DIM}}>{pct}%</div>
            </div>
            <div style={{height:5,background:"rgba(74,94,58,.08)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(to right,${G},#E6C76A)`,borderRadius:3,transition:"width .4s ease"}}/>
            </div>
            {pct===100&&<p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:G,fontStyle:"italic",margin:"8px 0 0",textAlign:"center"}}>¡Todo listo para el gran día! ✨</p>}
          </div>
          {[
            {k:"planner",l:"Wedding Planner",e:"📋",important:[0,1,2]},
            {k:"dj",l:"DJ",e:"🎧",important:[0,1,2]},
            {k:"musicos",l:"Músicos en vivo",e:"🎻",important:[0,1]},
            {k:"iglesia",l:"Iglesia",e:"⛪",important:[0,1,2]},
            {k:"pareja",l:"Para la pareja",e:"💍",important:[0,1,5]},
          ].filter(cat=>checklistFull[cat.k]?.length>0).map(cat=>(
            <div key={cat.k} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:"1rem"}}>{cat.e}</span>
                <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:G}}>{cat.l}</div>
                <div style={{flex:1,height:"1px",background:"rgba(74,94,58,.08)"}}/>
                <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(74,94,58,.35)"}}>
                  {checklistFull[cat.k].filter((_,i)=>checked[`${cat.k}_${i}`]).length}/{checklistFull[cat.k].length}
                </div>
              </div>
              <div style={{background:"#FBF7EF",border:"1px solid rgba(201,169,110,.07)",borderRadius:12,padding:"2px 14px"}}>
                {checklistFull[cat.k].map((item,i)=><CheckItem key={i} label={item} done={!!checked[`${cat.k}_${i}`]} onToggle={()=>tog(`${cat.k}_${i}`)} important={cat.important.includes(i)}/>)}
              </div>
            </div>
          ))}
          {results.errores?.length>0&&<>
            <SecLabel>⚠ Errores frecuentes para esta boda</SecLabel>
            {results.errores.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<results.errores.length-1?"1px solid rgba(201,169,110,.06)":"none"}}>
                <div style={{width:22,height:22,minWidth:22,borderRadius:"50%",background:"rgba(74,94,58,.08)",border:"1px solid rgba(201,169,110,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",color:G,flexShrink:0,marginTop:2}}>!</div>
                <p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:C,lineHeight:1.62,margin:0}}>{e}</p>
              </div>
            ))}
          </>}
        </div>
      </AccordionBlock>

      {/* ══ 6. COMPARTIR ══ */}
      <AccordionBlock id="compartir" icon="📤" title="Compartir con proveedores" subtitle="Mensajes listos para enviar por WhatsApp a cada proveedor" isOpen={open.compartir} onToggle={()=>toggle("compartir")}>
        <div style={{paddingTop:16}}>
          <p style={{fontFamily:"'Lora',serif",fontSize:".97rem",color:DIM,lineHeight:1.65,marginBottom:14}}>Estos botones preparan un mensaje de WhatsApp adaptado para cada proveedor. No todos necesitan recibir la misma información — cada uno recibe exactamente lo que necesita.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <a className="wbtn" href={`https://wa.me/?text=${generarMsgDJ(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{justifyContent:"center"}}>🎧 DJ</a>
            <a className="wbtn" href={`https://wa.me/?text=${generarMsgPlanner(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{justifyContent:"center"}}>📋 Planner</a>
          </div>
          {tieneMusico&&<a className="wbtn" href={`https://wa.me/?text=${generarMsgMusico(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{width:"100%",justifyContent:"center",display:"flex"}}>🎻 Músico en vivo</a>}
        </div>
      </AccordionBlock>

      {/* ══ 7. EXPORTAR ══ */}
      <AccordionBlock id="exportar" icon="📄" title="Guardar o exportar" subtitle="PDF para imprimir o compartir con quien necesites" isOpen={open.exportar} onToggle={()=>toggle("exportar")}>
        <div style={{paddingTop:16}}>
          <p style={{fontFamily:"'Lora',serif",fontSize:".97rem",color:DIM,lineHeight:1.65,marginBottom:14}}>Guardá tu guion como PDF para tenerlo siempre a mano o enviárselo a tu planner.</p>
          <button onClick={()=>window.print()} style={{width:"100%",background:"#FBF7EF",border:"1px solid rgba(74,94,58,.14)",borderRadius:12,padding:"14px 18px",fontFamily:"'Lora',serif",fontSize:"1rem",color:C,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:"1.2rem"}}>🖨️</span>
            <div>
              <div style={{marginBottom:2}}>Guardar como PDF</div>
              <div style={{fontSize:".85rem",color:"rgba(26,26,20,.28)"}}>En el diálogo de impresión, elegí "Guardar como PDF"</div>
            </div>
          </button>
          {resultToken&&<div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(74,94,58,.14)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:G,marginBottom:6}}>Volver a tu resultado desde cualquier dispositivo</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:DIM,wordBreak:"break-all",marginBottom:10,lineHeight:1.4}}>{typeof window!=="undefined"?`${window.location.origin}${window.location.pathname}?r=${resultToken}`:""}</div>
            <button className="lbtn" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?r=${resultToken}`);showToast("Link copiado ✓","success");}catch(e){}}}>Copiar link privado</button>
          </div>}
        </div>
      </AccordionBlock>

      {/* ══ UPSELL ══ */}
      <div className="no-print" style={{marginTop:20,background:"linear-gradient(135deg,#EAE4D2,#F5EFE0)",border:"1px solid rgba(201,169,110,.28)",borderRadius:18,padding:"clamp(22px,4vw,32px)",textAlign:"center"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".16em",textTransform:"uppercase",color:G,marginBottom:12}}>Servicio adicional</div>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.3rem,3vw,1.6rem)",fontWeight:600,color:C,margin:"0 0 10px",lineHeight:1.2}}>¿Querés que Ceci revise tu guion con vos?</h3>
        <div style={{display:"inline-block",background:"rgba(74,94,58,.08)",border:"1px solid rgba(201,169,110,.28)",borderRadius:100,padding:"7px 20px",marginBottom:14}}>
          <span style={{fontFamily:"'Lora',serif",fontSize:"1.08rem",color:G,fontWeight:600,letterSpacing:".02em"}}>Revisión personalizada de 45 minutos — USD 30</span>
        </div>
        <p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:DIM,lineHeight:1.68,margin:"0 auto 20px",maxWidth:400}}>Escribile a Ceci por WhatsApp y coordinan fecha y forma de pago.</p>
        <a className="pbtn" href="https://wa.me/595985689454?text=Hola%20Ceci!%20Me%20interesa%20la%20revisión%20personalizada%20de%20mi%20guion%20musical%20(USD%2030%20-%2045%20min)" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",textDecoration:"none"}}>Escribirle a Ceci →</a>
        <p style={{marginTop:12,fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.42)"}}>@elviolindececi · +595 985 689 454</p>
      </div>

      <div className="no-print" style={{textAlign:"center",marginTop:20,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="gbtn" onClick={onRestart}>← Volver a hacer el test</button>
        <button className="gbtn" onClick={onLogout}>Cerrar sesión</button>
      </div>
      <div className="no-print"><BackToHome onBack={onGoHome} style={{paddingBottom:24}}/></div>

    </div>
  </div>;
}

export default function ResultsModule({
  theme,
  AudioButtonComponent,
  BackToHomeComponent,
  showToastFn,
  archetypes,
  ...props
}){
  const deps = useMemo(()=>({
    THEME:theme,
    G:theme?.color?.gold || "#C9A96E",
    C:theme?.color?.ink || "#1A1A14",
    DIM:theme?.color?.inkDim || "rgba(26,26,20,.65)",
    AudioButton:AudioButtonComponent,
    BackToHome:BackToHomeComponent,
    showToast:showToastFn
  }),[theme,AudioButtonComponent,BackToHomeComponent,showToastFn]);

  return <ResultsDepsContext.Provider value={deps}>
    <ResultsContent {...props} archetypes={archetypes}/>
  </ResultsDepsContext.Provider>;
}
