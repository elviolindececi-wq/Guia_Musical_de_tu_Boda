/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";

const THEME = {
  text: {
    micro: "max(10px,.56rem)",
    tiny: "max(11px,.62rem)",
    label: "max(12px,.72rem)",
  },
};

function BackToHome({onBack, style={}}){
  return <div style={{textAlign:"center",padding:"28px 20px 0",...style}}>
    <button onClick={onBack} style={{
      display:"inline-flex",alignItems:"center",gap:8,
      background:"#FBF7EF",border:"1px solid rgba(74,94,58,.25)",
      borderRadius:100,padding:"clamp(10px,1.5vw,13px) clamp(14px,2.5vw,32px)",
      fontFamily:"'Lora',serif",fontWeight:600,fontSize:".95rem",
      color:"#4A5E3A",cursor:"pointer",
      boxShadow:"0 2px 8px rgba(74,94,58,.08)"
    }}>
      🏠 Volver al menú principal
    </button>
  </div>;
}

// ─── MÓDULO CRONOGRAMA ────────────────────────────────────────────────────────
const TIMELINE_DEFAULTS = [
  {id:"t1", hora:"08:00",titulo:"Peinado y maquillaje — Novia",  duracion:180,lugar:"",notas:"",color:"#C9A96E"},
  {id:"t2", hora:"11:00",titulo:"Peinado y maquillaje — Damas",  duracion:90, lugar:"",notas:"",color:"#7B8C6E"},
  {id:"t3", hora:"12:30",titulo:"Llegada del fotógrafo",         duracion:0,  lugar:"",notas:"",color:"#4A5E3A"},
  {id:"t4", hora:"13:00",titulo:"Sesión de fotos previa",        duracion:60, lugar:"",notas:"",color:"#4A5E3A"},
  {id:"t5", hora:"15:00",titulo:"Llegada de invitados",          duracion:30, lugar:"",notas:"",color:"#4A5E3A",  cancion:"",esVivo:false,quienToca:""},
  {id:"t6", hora:"15:30",titulo:"Ceremonia",                     duracion:60, lugar:"",notas:"",color:"#1A1A14", cancion:"",esVivo:false,quienToca:""},
  {id:"t7", hora:"16:30",titulo:"Salida y fotos en altar",       duracion:30, lugar:"",notas:"",color:"#4A5E3A",  cancion:"",esVivo:false,quienToca:""},
  {id:"t8", hora:"17:00",titulo:"Cóctel",                        duracion:90, lugar:"",notas:"",color:"#C9A96E", cancion:"",esVivo:false,quienToca:""},
  {id:"t9", hora:"18:30",titulo:"Ingreso al salón",              duracion:15, lugar:"",notas:"",color:"#1A1A14"},
  {id:"t10",hora:"18:45",titulo:"Primer baile de novios",        duracion:10, lugar:"",notas:"",color:"#C9A96E", cancion:"",esVivo:false,quienToca:""},
  {id:"t10b",hora:"18:55",titulo:"Vals / Baile con los padres",  duracion:8,  lugar:"",notas:"",color:"#C9A96E", cancion:"",esVivo:false,quienToca:""},
  {id:"t11",hora:"19:00",titulo:"Brindis",                       duracion:15, lugar:"",notas:"",color:"#C9A96E"},
  {id:"t12",hora:"19:15",titulo:"Cena",                          duracion:90, lugar:"",notas:"",color:"#4A5E3A",  cancion:"",esVivo:false,quienToca:""},
  {id:"t13",hora:"20:45",titulo:"Torta y baile general",         duracion:30, lugar:"",notas:"",color:"#C9A96E", cancion:"",esVivo:false,quienToca:""},
  {id:"t14",hora:"21:00",titulo:"Baile y fiesta",                duracion:180,lugar:"",notas:"",color:"#4A5E3A",  cancion:"",esVivo:false,quienToca:""},
  {id:"t15",hora:"00:00",titulo:"Cierre",                        duracion:0,  lugar:"",notas:"",color:"#1A1A14"},
];


// ─── COMPARTIR CRONOGRAMA ─────────────────────────────────────────────────────
function ShareCronograma({ events, form }){
  const pareja = [form?.nombre1, form?.nombre2].filter(Boolean).join(" & ");
  const fecha = form?.fechaBoda
    ? new Date(form.fechaBoda+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    : "";
  const sorted = [...(events||[])].sort((a,b)=>a.hora.localeCompare(b.hora));

  const imprimirPDF = () => {
    const evRows = sorted.map(ev => {
      const durLabel = ev.duracion>0
        ? (ev.duracion<60 ? `${ev.duracion} min` : `${Math.floor(ev.duracion/60)}h${ev.duracion%60>0?" "+ev.duracion%60+"min":""}`)
        : "";
      const cancionHtml = ("cancion" in ev) && ev.cancion
        ? `<div class="ev-cancion">🎵 ${ev.cancion}${ev.esVivo?' <span class="badge-vivo">EN VIVO</span>':""}${ev.quienToca?' <span class="ev-quien">'+ev.quienToca+'</span>':""}</div>`
        : "";
      const notaHtml = ev.notas
        ? `<div class="ev-nota">📝 ${ev.notas}</div>`
        : "";
      const lugarHtml = ev.lugar
        ? `<span class="ev-lugar">📍 ${ev.lugar}</span>`
        : "";
      return `
        <div class="ev-row">
          <div class="ev-hora">${ev.hora}</div>
          <div class="ev-dot"></div>
          <div class="ev-content">
            <div class="ev-titulo">${ev.titulo}${durLabel?` <span class="ev-dur">${durLabel}</span>`:""}</div>
            ${lugarHtml}
            ${cancionHtml}
            ${notaHtml}
          </div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Cronograma · ${pareja||"Boda"}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Great+Vibes&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:0}
  html,body{width:210mm;min-height:297mm;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Lora',serif;color:#1A1A14}

  .cover{
    background:#4A5E3A;
    padding:40px 48px 32px;
    text-align:center;
    border-bottom:3px solid #C9A96E;
  }
  .cover-kicker{font-family:'Cinzel',serif;font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:rgba(201,169,110,.8);margin-bottom:14px}
  .cover-names{font-family:'Great Vibes',cursive;font-size:52px;color:#F5EFE0;line-height:1.1;margin-bottom:6px}
  .cover-fecha{font-family:'Lora',serif;font-size:12px;color:rgba(245,239,224,.55);letter-spacing:.06em;margin-bottom:20px;text-transform:capitalize}
  .cover-title{font-family:'Cinzel',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#C9A96E;margin-bottom:4px}
  .cover-sub{font-family:'Lora',serif;font-size:10px;color:rgba(245,239,224,.4);font-style:italic}

  .body{padding:32px 48px 40px}

  .section-label{
    font-family:'Cinzel',serif;font-size:8px;letter-spacing:.22em;text-transform:uppercase;
    color:rgba(74,94,58,.5);margin-bottom:20px;padding-bottom:8px;
    border-bottom:0.5px solid rgba(201,169,110,.25);
  }

  .timeline{position:relative;padding-left:60px}
  .timeline::before{
    content:'';position:absolute;left:36px;top:6px;bottom:6px;
    width:1.5px;background:rgba(74,94,58,.15);border-radius:2px;
  }

  .ev-row{position:relative;margin-bottom:18px;display:flex;gap:0;align-items:flex-start}
  .ev-row:last-child{margin-bottom:0}

  .ev-hora{
    position:absolute;left:-60px;width:44px;text-align:right;
    font-family:'Cinzel',serif;font-size:10px;font-weight:600;
    color:#4A5E3A;letter-spacing:.04em;padding-top:1px;
  }
  .ev-dot{
    position:absolute;left:-18px;top:4px;
    width:10px;height:10px;border-radius:50%;
    background:#C9A96E;border:2px solid #fff;
    box-shadow:0 0 0 1.5px rgba(201,169,110,.4);
    flex-shrink:0;
  }
  .ev-content{flex:1;min-width:0}
  .ev-titulo{
    font-family:'Playfair Display',serif;font-size:13px;font-weight:600;
    color:#1A1A14;line-height:1.25;margin-bottom:3px;
  }
  .ev-dur{
    font-family:'Lora',serif;font-size:9px;font-weight:400;
    color:rgba(26,26,20,.35);margin-left:6px;
  }
  .ev-lugar{
    display:block;font-family:'Lora',serif;font-size:10px;
    color:rgba(74,94,58,.6);margin-bottom:3px;
  }
  .ev-cancion{
    font-family:'Lora',serif;font-size:10.5px;color:rgba(201,169,110,.85);
    font-style:italic;margin-bottom:2px;display:flex;align-items:center;gap:6px;
  }
  .badge-vivo{
    font-family:'Cinzel',serif;font-size:7px;letter-spacing:.1em;text-transform:uppercase;
    background:rgba(74,94,58,.12);color:#4A5E3A;padding:2px 6px;border-radius:100px;
    font-style:normal;
  }
  .ev-quien{
    font-family:'Cinzel',serif;font-size:7px;letter-spacing:.08em;text-transform:uppercase;
    background:rgba(201,169,110,.12);color:rgba(201,169,110,.85);padding:2px 6px;border-radius:100px;
    font-style:normal;margin-left:4px;
  }
  .ev-nota{
    font-family:'Lora',serif;font-size:9.5px;color:rgba(26,26,20,.4);
    font-style:italic;margin-top:2px;
  }

  .footer{
    margin-top:36px;padding-top:16px;border-top:0.5px solid rgba(201,169,110,.2);
    text-align:center;
  }
  .footer-logo{font-family:'Cinzel',serif;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:rgba(74,94,58,.5)}
  .footer-sub{font-family:'Lora',serif;font-size:8px;color:rgba(26,26,20,.3);font-style:italic;margin-top:3px}

  @media print{
    html,body{width:210mm;min-height:297mm}
    .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-kicker">El Violín de Ceci · Mi Boda Organizada</div>
    <div class="cover-names">${pareja||"Tu Boda"}</div>
    ${fecha?`<div class="cover-fecha">${fecha.charAt(0).toUpperCase()+fecha.slice(1)}</div>`:""}
    <div class="cover-title">Cronograma del día</div>
    <div class="cover-sub">Documento para coordinadora · DJ · Fotógrafo</div>
  </div>
  <div class="body">
    <div class="section-label">Timeline · ${sorted.length} momentos</div>
    <div class="timeline">${evRows}</div>
    <div class="footer">
      <div class="footer-logo">El Violín de Ceci</div>
      <div class="footer-sub">Generado con Mi Boda Organizada · guia-musical-de-tu-boda.vercel.app</div>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 600);
    };
  };

  return <div style={{background:"rgba(74,94,58,.05)",border:"0.5px solid rgba(74,94,58,.18)",borderRadius:14,padding:"16px 18px",marginTop:20}}>
    <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:10}}>📄 Exportar cronograma</div>
    <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,margin:"0 0 14px"}}>
      Generá un PDF listo para compartir con tu coordinadora, DJ o fotógrafo.
    </p>
    <button onClick={imprimirPDF} style={{display:"inline-flex",alignItems:"center",gap:8,background:"#4A5E3A",border:"none",borderRadius:100,padding:"12px 24px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".9rem",color:"#F5EFE0",cursor:"pointer"}}>
      📄 Descargar PDF del cronograma
    </button>
    <p style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.3)",margin:"10px 0 0",fontStyle:"italic"}}>
      En el diálogo de impresión elegí "Guardar como PDF"
    </p>
  </div>;
}

function TimelineModule({user, form, results, onBack, getDataClient}){
  const [events, setEvents] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newEv, setNewEv]   = useState({id:"",hora:"",titulo:"",duracion:30,lugar:"",notas:"",cancion:"",esVivo:false,quienToca:""});
  const [aprobacion, setAprobacion] = useState({n1:false, n2:false});
  const [vendorsMusica, setVendorsMusica] = useState([]);

  useEffect(()=>{
    if(!user) return;
    getDataClient(user).from("wedding_data").select("timeline,timeline_aprobacion,vendors").eq("user_id",user.id).maybeSingle()
      .then(({data:row})=>{
        setEvents(Array.isArray(row?.timeline)&&row.timeline.length>0?row.timeline:TIMELINE_DEFAULTS);
        if(row?.timeline_aprobacion) setAprobacion(row.timeline_aprobacion);
        // Vendors de música para selector
        const vm = (Array.isArray(row?.vendors)?row.vendors:[])
          .filter(v=>v.cat==="musica"&&v.estado!=="descartado");
        setVendorsMusica(vm);
      })
      .catch(()=>setEvents(TIMELINE_DEFAULTS));
  },[user]);

  const save = async(list) => {
    setSaving(true);
    try{
      await getDataClient(user).from("wedding_data").upsert({user_id:user.id,timeline:list||events,timeline_aprobacion:aprobacion,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      setSaved(true); setTimeout(()=>setSaved(false),1500);
    }catch(e){}
    setSaving(false);
  };

  const sorted = [...(events||[])].sort((a,b)=>a.hora.localeCompare(b.hora));

  const aprobar = async (quien) => {
    const next = {...aprobacion, [quien]: !aprobacion[quien]};
    setAprobacion(next);
    try{
      await getDataClient(user).from("wedding_data").upsert({user_id:user.id,timeline_aprobacion:next,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    }catch(e){}
  };
  const ambosAprobaron = aprobacion.n1 && aprobacion.n2;

  const MOMENTO_KEYWORDS = {
    "t5":  ["llegada","invitados"],
    "t6":  ["ceremonia","votos","alianzas","anillos","firmas","aleluya","ofertorio","comunion"],
    "t7":  ["salida","fotos"],
    "t8":  ["coctel","cóctel"],
    "t10": ["primer baile","baile de novios","primer_baile"],
    "t10b":["vals","baile con los padres"],
    "t12": ["cena"],
  };
  const getSugerencia = (evId) => {
    if(!results?.guion) return null;
    const keys = MOMENTO_KEYWORDS[evId];
    if(!keys) return null;
    const match = results.guion.find(g =>
      keys.some(k => (g.momento||"").toLowerCase().includes(k))
    );
    return match ? `${match.cancion} — ${match.artista}${match.version&&match.version!=="Vocal original"?" ("+match.version+")":""}` : null;
  };

  const addEvent = () => {
    if(!newEv.titulo.trim()||!newEv.hora) return;
    const next = [...(events||[]),{...newEv,id:"ev_"+Date.now()}];
    setEvents(next); save(next); setAdding(false);
    setNewEv({id:"",hora:"",titulo:"",duracion:30,lugar:"",notas:""});
  };
  const updateEv = (id,field,val) => { const next=events.map(e=>e.id===id?{...e,[field]:val}:e); setEvents(next); save(next); };
  const removeEv = (id) => { const next=events.filter(e=>e.id!==id); setEvents(next); save(next); };

  if(events===null) return <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'Lora',serif",color:"#4A5E3A"}}>Cargando cronograma...</p></div>;

  const fecha = form?.fechaBoda?new Date(form.fechaBoda+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):null;

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    <div style={{background:"#4A5E3A",padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:"0 0 4px",lineHeight:1.1}}>⏰ Cronograma del día</h1>
            {fecha&&<div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(245,239,224,.5)",textTransform:"capitalize"}}>{fecha}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setAdding(true)} style={{background:"#C9A96E",color:"#1A1A14",border:"none",padding:"10px 18px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".88rem",borderRadius:100,cursor:"pointer"}}>+ Evento</button>
            <button onClick={()=>save()} style={{background:"rgba(245,239,224,.12)",color:"#F5EFE0",border:"1px solid rgba(245,239,224,.2)",padding:"10px 16px",fontFamily:"'Lora',serif",fontSize:".85rem",borderRadius:100,cursor:"pointer"}}>{saving?"Guardando...":saved?"✓ Guardado":"Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>
      {adding&&<div style={{background:"#FBF7EF",border:"1px solid rgba(74,94,58,.25)",borderRadius:16,padding:"18px",marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100px,45vw),1fr))",gap:6,marginBottom:8}}>
          {[{label:"Hora",key:"hora",type:"time"},{label:"Evento",key:"titulo",type:"text",placeholder:"ej: Primer baile"},{label:"Duración (min)",key:"duracion",type:"number"},{label:"Lugar",key:"lugar",type:"text",placeholder:"ej: Jardín"}].map(f=>
            <div key={f.key}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.55)",marginBottom:4}}>{f.label}</div>
              <input name="app-field-13130" type={f.type} value={newEv[f.key]} onChange={e=>setNewEv(x=>({...x,[f.key]:e.target.value}))} placeholder={f.placeholder||""}
                style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)"}}>
            <input name="app-field-13137" type="checkbox" checked={"cancion" in newEv} onChange={e=>setNewEv(x=>{
              if(e.target.checked)return{...x,cancion:"",esVivo:false,quienToca:""};
              const{cancion,esVivo,quienToca,...rest}=x;return rest;
            })} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
            🎵 Tiene música
          </label>
        </div>
        {"cancion" in newEv && <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:6}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input name="app-field-13146" type="text" value={newEv.cancion||""} onChange={e=>setNewEv(x=>({...x,cancion:e.target.value}))} placeholder="Canción (opcional)"
              style={{flex:1,fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14"}}/>
            <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0,fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)",whiteSpace:"nowrap"}}>
              <input name="app-field-13149" type="checkbox" checked={!!newEv.esVivo} onChange={e=>setNewEv(x=>({...x,esVivo:e.target.checked}))} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
              En vivo
            </label>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",flexShrink:0}}>🎻 Quién toca:</span>
            {vendorsMusica.length>0
              ? <select name="app-field-13156" value={newEv.quienToca||""} onChange={e=>setNewEv(x=>({...x,quienToca:e.target.value}))}
                  style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}>
                  <option value="">Sin asignar</option>
                  {vendorsMusica.map(v=><option key={v.id} value={v.nombre||v.id}>{v.nombre||"Sin nombre"}</option>)}
                  <option value="DJ">DJ</option>
                  <option value="Música grabada">Música grabada</option>
                </select>
              : <input name="app-field-13163" type="text" value={newEv.quienToca||""} onChange={e=>setNewEv(x=>({...x,quienToca:e.target.value}))}
                  placeholder="ej: DJ, Violín de Ceci, Banda..."
                  style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}/>
            }
          </div>
        </div>}
        <textarea name="app-field-13169" value={newEv.notas} onChange={e=>setNewEv(x=>({...x,notas:e.target.value}))} rows={2} placeholder="Notas para proveedores..."
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14",resize:"none",boxSizing:"border-box",marginBottom:10}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={addEvent} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"9px 20px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".88rem",cursor:"pointer"}}>✓ Agregar</button>
          <button onClick={()=>setAdding(false)} style={{background:"transparent",border:"1px solid rgba(74,94,58,.22)",borderRadius:100,padding:"9px 16px",fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.42)",cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>}
      <div style={{position:"relative",paddingLeft:24}}>
        <div style={{position:"absolute",left:10,top:0,bottom:0,width:2,background:"rgba(74,94,58,.1)",borderRadius:2}}/>
        {sorted.map((ev,idx)=>{
          const isEdit=editId===ev.id;
          const hora=parseInt(ev.hora?.split(":")?.[0]||0);
          const prevHora=idx>0?parseInt(sorted[idx-1].hora?.split(":")?.[0]||0):hora;
          const getMomento=(h)=>h<12?"🌅 Mañana":h<16?"☀️ Tarde":h<20?"🌆 Tardecita":"🌙 Noche";
          const showSep=idx===0||getMomento(hora)!==getMomento(prevHora);
          return <div key={ev.id}>
          {showSep&&<div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 8px"}}>
            <div style={{flex:1,height:"0.5px",background:"rgba(201,169,110,.2)"}}/>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(201,169,110,.55)",whiteSpace:"nowrap"}}>{getMomento(hora)}</span>
            <div style={{flex:1,height:"0.5px",background:"rgba(201,169,110,.2)"}}/>
          </div>}
          <div style={{position:"relative",marginBottom:10,paddingLeft:18}}>
            <div style={{position:"absolute",left:-6,top:13,width:13,height:13,borderRadius:"50%",background:ev.color||"#4A5E3A",border:"2px solid #F5EFE0",boxShadow:"0 0 0 2px rgba(74,94,58,.15)"}}/>
            <div style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.2)",borderRadius:12,padding:"12px 14px"}}>
              {!isEdit?<div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".08em",color:"#4A5E3A",fontWeight:600}}>{ev.hora}</div>
                    {ev.duracion>0&&<div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.32)",background:"rgba(74,94,58,.05)",padding:"1px 8px",borderRadius:100}}>⏱ {ev.duracion<60?`${ev.duracion} min`:`${Math.floor(ev.duracion/60)}h${ev.duracion%60>0?` ${ev.duracion%60}min`:""}`}</div>}
                  </div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:600,color:"#1A1A14"}}>{ev.titulo}</div>
                  {ev.lugar&&<div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(74,94,58,.55)",marginTop:2}}>📍 {ev.lugar}</div>}
                  {/* Solo mostrar bloque musical si el evento tiene habilitada la música */}
                  {"cancion" in ev && (ev.cancion
                    ? <div style={{marginTop:4,display:"flex",flexDirection:"column",gap:3}}>
                        <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(201,169,110,.75)",display:"flex",alignItems:"center",gap:6}}>
                          🎵 {ev.cancion}{ev.esVivo&&<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",background:"rgba(74,94,58,.12)",color:"#4A5E3A",padding:"2px 7px",borderRadius:100}}>En vivo</span>}
                        </div>
                        {ev.quienToca&&<div style={{fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(74,94,58,.55)",display:"flex",alignItems:"center",gap:4}}>🎻 {ev.quienToca}</div>}
                      </div>
                    : getSugerencia(ev.id)
                      ? <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(74,94,58,.45)",marginTop:2,fontStyle:"italic",display:"flex",alignItems:"center",gap:5}}>
                          💡 Sugerencia: {getSugerencia(ev.id)}
                          <button onClick={()=>updateEv(ev.id,"cancion",getSugerencia(ev.id))} style={{background:"rgba(74,94,58,.1)",border:"0.5px solid rgba(74,94,58,.25)",borderRadius:100,padding:"1px 8px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".06em",color:"#4A5E3A",cursor:"pointer",whiteSpace:"nowrap"}}>Usar</button>
                        </div>
                      : <div style={{fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(74,94,58,.3)",marginTop:2,fontStyle:"italic"}}>🎵 Sin canción asignada</div>
                  )}
                  {ev.notas&&<div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.38)",fontStyle:"italic",marginTop:3}}>{ev.notas}</div>}
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <button onClick={()=>setEditId(ev.id)} style={{background:"transparent",border:"0.5px solid rgba(74,94,58,.18)",borderRadius:100,padding:"4px 10px",fontFamily:"'Lora',serif",fontSize:".78rem",color:"#4A5E3A",cursor:"pointer"}}>Editar</button>
                  <button onClick={()=>removeEv(ev.id)} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.18)",fontSize:"1rem",cursor:"pointer",padding:"2px"}}>×</button>
                </div>
              </div>
              :<div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",marginBottom:7,width:"100%"}}>
                  <input name="app-field-13225" type="time" defaultValue={ev.hora} onBlur={e=>updateEv(ev.id,"hora",e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",width:90}}/>
                  <input name="app-field-13226" type="text" defaultValue={ev.titulo} onBlur={e=>updateEv(ev.id,"titulo",e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",flex:1,minWidth:120}}/>
                  <input name="app-field-13227" type="number" defaultValue={ev.duracion} onBlur={e=>updateEv(ev.id,"duracion",e.target.value)} placeholder="min" title="Duración en minutos" style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",width:70}}/>
                  <button onClick={()=>setEditId(null)} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"7px 14px",fontFamily:"'Lora',serif",fontSize:".82rem",cursor:"pointer"}}>✓</button>
                </div>
                <input name="app-field-13230" type="text" defaultValue={ev.lugar||""} onBlur={e=>updateEv(ev.id,"lugar",e.target.value)} placeholder="Lugar" style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box",marginBottom:5}}/>
                {/* Toggle música */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)"}}>
                    <input name="app-field-13234" type="checkbox" checked={"cancion" in ev} onChange={e=>{
                      if(e.target.checked) updateEv(ev.id,"cancion","");
                      else {
                        const next=events.map(x=>{if(x.id!==ev.id)return x;const{cancion,esVivo,quienToca,...rest}=x;return rest;});
                        setEvents(next);save(next);
                      }
                    }} style={{width:16,height:16,accentColor:"#4A5E3A",cursor:"pointer"}}/>
                    🎵 Este momento tiene música
                  </label>
                </div>
                {"cancion" in ev && <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:5}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
                      <input name="app-field-13247" type="text" defaultValue={ev.cancion||""} onBlur={e=>updateEv(ev.id,"cancion",e.target.value)}
                        placeholder={getSugerencia(ev.id) ? "Sugerencia del guion abajo ↓" : "Canción (ej: Can't Help Falling in Love)"}
                        style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
                      {!ev.cancion && getSugerencia(ev.id) && <button onClick={()=>updateEv(ev.id,"cancion",getSugerencia(ev.id))}
                        style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(74,94,58,.6)",cursor:"pointer",textAlign:"left",padding:"0 2px"}}>
                        💡 Usar del guion: {getSugerencia(ev.id)}
                      </button>}
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0,fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.6)",whiteSpace:"nowrap"}}>
                      <input name="app-field-13256" type="checkbox" defaultChecked={!!ev.esVivo} onChange={e=>updateEv(ev.id,"esVivo",e.target.checked)} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
                      En vivo
                    </label>
                  </div>
                  {/* Quién toca */}
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",flexShrink:0}}>🎻 Quién toca:</span>
                    {vendorsMusica.length>0
                      ? <select name="app-field-13264" defaultValue={ev.quienToca||""} onBlur={e=>updateEv(ev.id,"quienToca",e.target.value)}
                          style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}>
                          <option value="">Sin asignar</option>
                          {vendorsMusica.map(v=><option key={v.id} value={v.nombre||v.id}>{v.nombre||"Proveedor sin nombre"}</option>)}
                          <option value="DJ">DJ</option>
                          <option value="Música grabada">Música grabada</option>
                        </select>
                      : <input name="app-field-13271" type="text" defaultValue={ev.quienToca||""} onBlur={e=>updateEv(ev.id,"quienToca",e.target.value)}
                          placeholder="ej: DJ, Violín de Ceci, Banda..."
                          style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}/>
                    }
                  </div>
                </div>}
              </div>}
            </div>
          </div>
          </div>
        })}
      {/* ── APROBACIÓN DEL CRONOGRAMA ── */}
      <div style={{background:ambosAprobaron?"rgba(74,94,58,.08)":"rgba(201,169,110,.05)",border:`0.5px solid ${ambosAprobaron?"rgba(74,94,58,.3)":"rgba(201,169,110,.25)"}`,borderRadius:14,padding:"16px 18px",marginTop:16}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:10}}>
          {ambosAprobaron?"✓ Cronograma aprobado por ambos":"✓ Aprobar el cronograma"}
        </div>
        {ambosAprobaron
          ? <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(74,94,58,.7)",margin:"0 0 10px",lineHeight:1.5}}>Los dos confirmaron el cronograma. ¡Listo para compartir con los proveedores!</p>
          : <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.5)",margin:"0 0 14px",lineHeight:1.5}}>Cuando ambos estén conformes con el cronograma, apruébenlo para darlo por cerrado.</p>
        }
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[
            {key:"n1", nombre:form?.nombre1||"Novio/a 1"},
            {key:"n2", nombre:form?.nombre2||"Novio/a 2"},
          ].map(({key,nombre})=>{
            const aprobado = aprobacion[key];
            return <button key={key} onClick={()=>aprobar(key)} style={{
              display:"inline-flex",alignItems:"center",gap:8,
              background:aprobado?"#4A5E3A":"transparent",
              border:`1px solid ${aprobado?"#4A5E3A":"rgba(74,94,58,.3)"}`,
              borderRadius:100,padding:"10px 20px",
              fontFamily:"'Lora',serif",fontWeight:600,fontSize:".88rem",
              color:aprobado?"#F5EFE0":"rgba(74,94,58,.7)",cursor:"pointer",transition:"all .2s"
            }}>
              <span style={{fontSize:"1rem"}}>{aprobado?"✓":"○"}</span>
              {nombre} {aprobado?"aprobó":"aprobar"}
            </button>;
          })}
        </div>
      </div>
      <ShareCronograma events={events} form={form}/>
      <BackToHome onBack={onBack}/>
    </div>
  </div>
</div>;
}


export default TimelineModule;
