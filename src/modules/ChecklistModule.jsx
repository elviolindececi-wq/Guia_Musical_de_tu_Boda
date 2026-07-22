/* eslint-disable */
// @ts-nocheck
import { useEffect, useRef, useState } from "react";

const CHECKLIST_GENERAL = [
  {etapa:"12+ meses", items:[
    "Definir fecha y ciudad de la boda",
    "Establecer el presupuesto total",
    "Elegir el tipo de ceremonia (religiosa, civil, simbólica)",
    "Definir cantidad aproximada de invitados",
    "Reservar el salón / venue principal",
    "Contratar fotógrafo (los buenos se agotan con mucha anticipación)",
    "Contratar videógrafo",
    "Empezar a buscar vestido de novia (requiere meses de producción)",
    "Definir el estilo general de la boda",
  ]},
  {etapa:"9-12 meses", items:[
    "Contratar catering",
    "Contratar DJ o banda / músicos para la fiesta",
    "Elegir música para la ceremonia (violín, cuarteto, piano, etc.)",
    "Reservar estadía para la noche de bodas",
    "Iniciar lista de invitados completa",
    "Elegir padrinos y damas",
    "Comenzar a planificar la luna de miel",
    "Buscar y reservar florista / decoradora",
  ]},
  {etapa:"6-9 meses", items:[
    "Enviar invitaciones de Save the Date",
    "Hacer prueba de vestido",
    "Contratar maquilladora y peluquera",
    "Definir menú con el catering",
    "Contratar la torta de bodas",
    "Definir papelería e invitaciones formales",
    "Reservar transporte para el día de la boda",
    "Armar el guion musical de la ceremonia",
    "Coordinar lista de canciones con DJ o músico",
  ]},
  {etapa:"3-6 meses", items:[
    "Enviar invitaciones formales",
    "Organizar lista de mesas y seating chart",
    "Confirmar todos los proveedores contratados",
    "Hacer segunda prueba de vestido","Prueba de dulces y mesa de postres con el proveedor","Prueba de tragos y bebidas con el catering o bartender","Definir el vals y primer baile - confirmar version y si es en vivo",
    "Elegir y comprar alianzas",
    "Planificar el cronograma del día de la boda",
    "Organizar ensayo de ceremonia",
    "Reservar lugares para el ensayo de la novia y cortejo",
  ]},
  {etapa:"1-3 meses", items:[
    "Confirmar asistencia de todos los invitados",
    "Finalizar seating chart con nombres definitivos",
    "Hacer prueba de maquillaje y peinado",
    "Compartir el guion musical con DJ, fotógrafo y coordinador",
    "Preparar sobre de propinas para proveedores",
    "Confirmar horarios con cada proveedor",
    "Armar la playlist de canciones de la fiesta",
    "Preparar el discurso o carta si lo hay",
  ]},
  {etapa:"Último mes", items:[
    "Confirmar todos los proveedores con llamada o mensaje",
    "Enviar cronograma del día a cada proveedor",
    "Hacer prueba final de vestido",
    "Preparar la valija de la luna de miel",
    "Designar a alguien de confianza para coordinar el día",
    "Preparar sobre con documentos necesarios (acta, pasaportes si viajan, etc.)",
    "Hacer depósitos finales a proveedores que lo requieran",
  ]},
  {etapa:"Semana de la boda", items:[
    "Confirmar horarios con TODOS los proveedores",
    "Preparar los sobres de pago del día",
    "Ensayo de ceremonia con cortejo y músicos",
    "Prueba de sonido en el venue",
    "Descansar y delegar lo que se pueda",
    "Preparar las cosas para el día (vestido, accesorios, etc.)",
  ]},
  {etapa:"Día anterior", items:[
    "Confirmar que todos los proveedores están en orden",
    "Preparar lo que no se puede olvidar el día de mañana",
    "Descansar temprano",
    "Tener el número de todos los proveedores a mano",
    "Cargar todos los teléfonos",
  ]},
  {etapa:"Día de la boda", items:[
    "Desayunar bien",
    "Revisar que el anillo / alianza esté lista",
    "Confirmar la llegada del fotógrafo y músico",
    "Revisar que el DJ tenga el guion musical impreso",
    "Disfrutar — cada detalle ya está coordinado",
  ]},
];

export default function ChecklistModule({
  user,
  form,
  results,
  onGoMusic,
  onBack,
  getDataClient,
  theme,
  WeatherWidgetComponent,
  BackToHomeComponent
}){
  const [checked,   setChecked]   = useState(null);
  const [custom,    setCustom]    = useState({}); // {etapaIdx: [{id,texto,completada}]}
  const [order,     setOrder]     = useState({}); // {etapaIdx: [idx array for predefined]}
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [openStage, setOpenStage] = useState(0);
  const [addingTo,  setAddingTo]  = useState(null);
  const [newText,   setNewText]   = useState("");
  const [notas,     setNotas]     = useState({});
  const [resp,      setResp]      = useState({});
  const [filtro,    setFiltro]    = useState("todas");
  const [filtroRes, setFiltroRes] = useState("todos");
  const [expandKey, setExpandKey] = useState(null);
  const [vendors4Chk, setVendors4Chk] = useState([]);
  const dragItem    = useRef(null);
  const dragOver    = useRef(null);
  const pointerDrag = useRef(null);
  const [pointerDragState, setPointerDragState] = useState(null);
  const timerRef    = useRef(null);
  const notesTimerRef = useRef(null);
  const savedTimerRef = useRef(null);

  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await getDataClient(user).from("wedding_data")
          .select("checklist_general,checklist_custom,checklist_order,checklist_notas,checklist_resp")
          .eq("user_id",user.id).maybeSingle();
        setChecked(row?.checklist_general || {});
        setCustom(row?.checklist_custom || {});
        setOrder(row?.checklist_order || {});
        setNotas(row?.checklist_notas || {});
        setResp(row?.checklist_resp || {});
        // Cargar vendors para vincular tareas
        try{
          const {data:vrow} = await getDataClient(user).from("wedding_data").select("vendors").eq("user_id",user.id).maybeSingle();
          if(Array.isArray(vrow?.vendors)) setVendors4Chk(vrow.vendors.filter(v=>v.estado!=="descartado"));
        }catch(e){}
      }catch(e){ setChecked({}); setCustom({}); setOrder({}); }
    };
    load();
  },[user]);

  const saveChecklistPatch = async(patch) => {
    if(!user?.id) return false;
    setSaving(true);
    setSaveError(false);
    try{
      const {error} = await getDataClient(user).from("wedding_data").upsert({
        user_id:user.id,
        ...patch,
        updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      if(error) throw error;
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(()=>setSaved(false),1800);
      return true;
    }catch(e){
      setSaveError(true);
      return false;
    }finally{
      setSaving(false);
    }
  };

  const persist = async(ch, cu, ord) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(()=>{
      saveChecklistPatch({
        checklist_general: ch ?? checked,
        checklist_custom: cu ?? custom,
        checklist_order: ord ?? order
      });
    }, 500);
  };

  const saveAllChanges = () => saveChecklistPatch({
    checklist_general: checked || {},
    checklist_custom: custom || {},
    checklist_order: order || {},
    checklist_notas: notas || {},
    checklist_resp: resp || {}
  });

  const toggleItem = (key, val) => {
    const next = {...checked, [key]: val===undefined?!checked[key]:val};
    setChecked(next); persist(next, null, null);
  };

  const setNota = (key, text) => {
    const next = {...notas, [key]: text};
    setNotas(next);
    clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(()=>{
      saveChecklistPatch({checklist_notas:next});
    }, 800);
  };

  const setResponsable = (key, value) => {
    const next = {...resp, [key]: value};
    setResp(next);
    saveChecklistPatch({checklist_resp:next});
  };

  const RESPONSABLES = ["Novio","Novia","Ambos","Coordinadora"];
  const RESP_COLORS = {"Novio":"rgba(74,94,58,.7)","Novia":"rgba(201,169,110,.8)","Ambos":"rgba(26,26,20,.5)","Coordinadora":"rgba(100,80,160,.7)"};

  // Vendor link helpers
  const getVendorId = (key) => notas[key+"__vendor"] || "";
  const setVendorId = (key, val) => {
    const next = {...notas, [key+"__vendor"]: val};
    setNotas(next);
    saveChecklistPatch({checklist_notas:next});
  };
  const getVendorLabel = (key) => {
    const vid = getVendorId(key);
    if(!vid) return null;
    const v = vendors4Chk.find(x=>x.id===vid);
    return v ? (v.nombre||"Proveedor") : null;
  };

  // Fecha límite helpers
  const getFecha = (key) => notas[key+"__fecha"] || "";
  const setFecha = (key, val) => {
    const next = {...notas, [key+"__fecha"]: val};
    setNotas(next);
    saveChecklistPatch({checklist_notas:next});
  };
  const badgeFecha = (key) => {
    const f = getFecha(key);
    if(!f) return null;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const limite = new Date(f+"T12:00:00");
    const diff = Math.round((limite-hoy)/(1000*60*60*24));
    if(diff < 0)  return {label:"Vencida", color:"rgba(200,60,60,.85)", bg:"rgba(200,60,60,.1)", border:"rgba(200,60,60,.3)"};
    if(diff <= 7) return {label:`${diff===0?"Hoy":diff===1?"Mañana":"En "+diff+" días"}`, color:"rgba(180,120,0,.85)", bg:"rgba(255,200,0,.1)", border:"rgba(180,120,0,.3)"};
    return {label:`${diff} días`, color:"rgba(74,94,58,.7)", bg:"rgba(74,94,58,.07)", border:"rgba(74,94,58,.25)"};
  };

  const addCustom = (ei) => {
    if(!newText.trim()) return;
    const id = "c_"+Date.now();
    const etapaItems = [...(custom[ei]||[]), {id, texto:newText.trim(), completada:false}];
    const next = {...custom, [ei]: etapaItems};
    setCustom(next); setNewText(""); setAddingTo(null);
    persist(null, next, null);
  };

  const removeCustom = (ei, id) => {
    const next = {...custom, [ei]: (custom[ei]||[]).filter(x=>x.id!==id)};
    setCustom(next); persist(null, next, null);
  };

  const toggleCustom = (ei, id) => {
    const next = {...custom, [ei]: (custom[ei]||[]).map(x=>x.id===id?{...x,completada:!x.completada}:x)};
    setCustom(next); persist(null, next, null);
  };

  // Drag reorder for predefined items
  const getOrder = (ei) => order[ei] || CHECKLIST_GENERAL[ei].items.map((_,i)=>i);

  const reorderPredefined = (ei, from, to) => {
    if(from===undefined || to===undefined || from===to) return;
    const ord = [...getOrder(ei)];
    if(from<0 || to<0 || from>=ord.length || to>=ord.length) return;
    const [moved] = ord.splice(from, 1);
    ord.splice(to, 0, moved);
    const next = {...order, [ei]: ord};
    setOrder(next); persist(null, null, next);
  };

  const handleDragStart = (ei, idx) => { dragItem.current = {ei, idx}; };
  const handleDragEnter = (ei, idx) => { dragOver.current = {ei, idx}; };
  const handleDrop = (ei) => {
    if(!dragItem.current || dragItem.current.ei !== ei) return;
    const from = dragItem.current.idx;
    const to   = dragOver.current?.idx;
    reorderPredefined(ei, from, to);
    dragItem.current = null; dragOver.current = null;
  };

  // Touch/pen reorder from the ⠿ handle. Native HTML drag works on desktop,
  // but mobile browsers do not reliably emit drag events from a finger.
  const beginPointerDrag = (e, ei, idx) => {
    if(e.pointerType==="mouse") return;
    e.preventDefault();
    e.stopPropagation();
    const active = {ei, idx, over:idx, pointerId:e.pointerId};
    pointerDrag.current = active;
    setPointerDragState(active);
    try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(err){}
  };

  const movePointerDrag = (e) => {
    const active = pointerDrag.current;
    if(!active || active.pointerId!==e.pointerId) return;
    e.preventDefault();

    const target = document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-checklist-drag-row="true"]');
    const targetStage = Number(target?.dataset?.checklistStage);
    const targetIdx = Number(target?.dataset?.checklistOrderIndex);
    if(targetStage===active.ei && Number.isInteger(targetIdx) && targetIdx!==active.over){
      const next = {...active, over:targetIdx};
      pointerDrag.current = next;
      setPointerDragState(next);
    }

    const edge = 72;
    if(e.clientY<edge) window.scrollBy(0,-12);
    else if(e.clientY>window.innerHeight-edge) window.scrollBy(0,12);
  };

  const endPointerDrag = (e, cancelled=false) => {
    const active = pointerDrag.current;
    if(!active || active.pointerId!==e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    if(!cancelled) reorderPredefined(active.ei, active.idx, active.over);
    pointerDrag.current = null;
    setPointerDragState(null);
    try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch(err){}
  };

  // Move custom item up/down
  const moveCustom = (ei, id, dir) => {
    const items = [...(custom[ei]||[])];
    const idx = items.findIndex(x=>x.id===id);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    const next = {...custom, [ei]: items};
    setCustom(next); persist(null, next, null);
  };

  if(checked===null) return <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'Lora',serif",color:"#4A5E3A"}}>Cargando checklist...</p></div>;

  const totalPre  = CHECKLIST_GENERAL.reduce((s,e)=>s+e.items.length,0);
  const totalCust = Object.values(custom).flat().length;
  const totalItems = totalPre + totalCust;
  const donePre  = CHECKLIST_GENERAL.reduce((s,e,ei)=>s+getOrder(ei).filter(ii=>checked[`${ei}_${ii}`]).length,0);
  const doneCust = Object.values(custom).flat().filter(x=>x.completada).length;
  const doneItems = donePre + doneCust;
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    {/* Header */}
    <div style={{background:"#4A5E3A",padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:0,lineHeight:1.1}}>📋 Checklist de la boda</h1>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2rem,4vw,3rem)",color:"#C9A96E",fontWeight:700,lineHeight:1}}>{pct}%</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(245,239,224,.55)"}}>{doneItems} de {totalItems} completados</div>
            {(saving||saved||saveError)&&<div style={{fontFamily:"'Lora',serif",fontSize:".75rem",color:saveError?"#F3B4B4":"rgba(201,169,110,.8)",marginTop:2}}>{saveError?"No se pudo guardar":saving?"Guardando...":"✓ Guardado"}</div>}
          </div>
        </div>
        <div style={{marginTop:16,height:6,background:"rgba(255,255,255,.15)",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#C9A96E",borderRadius:6,transition:"width .4s"}}/>
        </div>
      </div>
    </div>

    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>

      {/* ── CLIMA ── */}
      <WeatherWidgetComponent fechaBoda={form?.fechaBoda} ciudad={form?.ciudad}/>

      {/* ── BANDA SONORA ── */}
      <div style={{background:results?"rgba(74,94,58,.06)":"rgba(201,169,110,.06)",border:`0.5px solid ${results?"rgba(74,94,58,.2)":"rgba(201,169,110,.25)"}`,borderRadius:14,padding:"16px 18px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>🎵 Tu Banda Sonora de Boda</div>
            {results
              ? <><div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1A1A14",marginBottom:4}}>Guion musical creado ✓</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.5)",lineHeight:1.5}}>
                  Recordá compartir el guion con tu DJ y fotógrafo, y confirmar la versión exacta de cada canción.
                </div></>
              : <><div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1A1A14",marginBottom:4}}>Todavía no creaste tu guion musical</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.5)"}}>El guion define qué suena en cada momento de tu ceremonia.</div></>
            }
          </div>
          <button onClick={onGoMusic} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"10px 20px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".88rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {results?"Ver guion →":"Crear guion →"}
          </button>
        </div>
        {results&&<div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid rgba(74,94,58,.12)"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:8}}>Tareas clave del guion musical</div>
          {[
            {k:"mx1",t:"Compartir guion con DJ y fotógrafo"},
            {k:"mx2",t:"Confirmar versión exacta de cada canción con el DJ"},
            {k:"mx3",t:"Definir el segundo exacto de inicio de la entrada de la novia"},
            {k:"mx4",t:"Confirmar playlist de cóctel y cena con el DJ"},
            {k:"mx5",t:"Hacer prueba de sonido antes de la ceremonia"},
          ].map(item=>{
            const done = !!checked[item.k];
            return <div key={item.k} onClick={()=>toggleItem(item.k)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid rgba(74,94,58,.08)",cursor:"pointer"}}>
              <div style={{width:20,height:20,minWidth:20,borderRadius:4,border:`1px solid ${done?"#4A5E3A":"rgba(74,94,58,.3)"}`,background:done?"#4A5E3A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {done&&<span style={{color:"#F5EFE0",fontSize:theme.text.tiny,fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:done?"rgba(26,26,20,.3)":"rgba(26,26,20,.7)",textDecoration:done?"line-through":"none",lineHeight:1.45}}>{item.t}</span>
            </div>;
          })}
        </div>}
      </div>

      {/* ── FILTROS ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <div style={{display:"flex",background:"#FBF7EF",borderRadius:100,padding:3,border:"0.5px solid rgba(201,169,110,.2)"}}>
          {[["todas","Todas"],["pendientes","Pendientes"],["completadas","Completadas"]].map(([id,label])=>
            <button key={id} onClick={()=>setFiltro(id)} style={{padding:"6px 14px",borderRadius:100,border:"none",fontFamily:"'Lora',serif",fontSize:".82rem",cursor:"pointer",background:filtro===id?"#4A5E3A":"transparent",color:filtro===id?"#F5EFE0":"rgba(26,26,20,.45)",transition:"all .2s"}}>{label}</button>
          )}
        </div>
        <select name="app-field-13668" value={filtroRes} onChange={e=>setFiltroRes(e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"6px 12px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
          <option value="todos">Todos los responsables</option>
          {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        {(filtro!=="todas"||filtroRes!=="todos")&&<button onClick={()=>{setFiltro("todas");setFiltroRes("todos");}} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.4)",fontFamily:"'Lora',serif",fontSize:".82rem",cursor:"pointer"}}>Limpiar filtros</button>}
      </div>

      {pct===100&&<div style={{background:"rgba(74,94,58,.1)",border:"0.5px solid rgba(74,94,58,.3)",borderRadius:14,padding:"16px 20px",marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:"1.8rem",marginBottom:6}}>🎉</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",color:"#1A1A14"}}>¡Todo listo para el gran día!</div>
      </div>}

      {CHECKLIST_GENERAL.map((etapa,ei)=>{
        const ord = getOrder(ei);
        const etapaCustItems = custom[ei]||[];
        const etapaDonePre  = ord.filter(ii=>checked[`${ei}_${ii}`]).length;
        const etapeDoneCust = etapaCustItems.filter(x=>x.completada).length;
        const etapaDone = etapaDonePre + etapeDoneCust;
        const etapaTotal = etapa.items.length + etapaCustItems.length;
        const etapaPct = Math.round(etapaDone/etapaTotal*100)||0;
        const isOpen = openStage===ei;

        return <div key={ei} style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.22)",borderRadius:16,marginBottom:10,overflow:"hidden"}}>
          {/* Stage header */}
          <button onClick={()=>setOpenStage(isOpen?-1:ei)} style={{width:"100%",background:"transparent",border:"none",padding:"16px 18px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
            <div style={{width:36,height:36,minWidth:36,borderRadius:"50%",background:etapaPct===100?"#4A5E3A":"rgba(74,94,58,.1)",border:`2px solid ${etapaPct===100?"#4A5E3A":"rgba(74,94,58,.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {etapaPct===100?<span style={{color:"#F5EFE0",fontSize:".85rem"}}>✓</span>:<span style={{fontFamily:"'Lora',serif",fontSize:theme.text.label,fontWeight:700,color:"#4A5E3A"}}>{etapaPct}%</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"1rem",color:"#1A1A14",lineHeight:1.2}}>{etapa.etapa}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                <div style={{flex:1,maxWidth:90,height:3,background:"rgba(74,94,58,.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${etapaPct}%`,background:etapaPct===100?"#4A5E3A":"rgba(201,169,110,.65)",borderRadius:3,transition:"width .3s"}}/>
                </div>
                <span style={{fontFamily:"'Lora',serif",fontSize:theme.text.label,color:"rgba(26,26,20,.4)"}}>{etapaDone}/{etapaTotal}</span>
              </div>
              <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.35)",marginTop:2,display:"none"}}>{etapaDone} de {etapaTotal} completadas{etapaCustItems.length>0?` · ${etapaCustItems.length} personalizada${etapaCustItems.length!==1?"s":""}`:""}
              </div>
            </div>
            <div style={{width:60,height:4,background:"rgba(74,94,58,.1)",borderRadius:4,overflow:"hidden",flexShrink:0}}>
              <div style={{height:"100%",width:`${etapaPct}%`,background:"#4A5E3A",borderRadius:4,transition:"width .3s"}}/>
            </div>
            <span style={{color:"rgba(74,94,58,.5)",fontSize:"1rem",flexShrink:0,transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s"}}>▾</span>
          </button>

          {isOpen&&<div style={{padding:"2px 18px 16px"}}>
            {/* Predefined items — draggable */}
            {ord.filter(function(ii){
              var done = !!checked[`${ei}_${ii}`];
              var r = resp[`${ei}_${ii}`] || "";
              if(filtro==="pendientes" && done) return false;
              if(filtro==="completadas" && !done) return false;
              if(filtroRes!=="todos" && r !== filtroRes) return false;
              return true;
            }).map((ii)=>{
              const item = etapa.items[ii];
              const done = !!checked[`${ei}_${ii}`];
              const orderIdx = ord.indexOf(ii);
              const isPointerTarget = pointerDragState?.ei===ei && pointerDragState?.over===orderIdx;
              return <div key={ii}
                data-checklist-drag-row="true"
                data-checklist-stage={ei}
                data-checklist-order-index={orderIdx}
                draggable
                onDragStart={()=>handleDragStart(ei,orderIdx)}
                onDragEnter={()=>handleDragEnter(ei,orderIdx)}
                onDragEnd={()=>handleDrop(ei)}
                onDragOver={e=>e.preventDefault()}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"0.5px solid rgba(74,94,58,.08)",cursor:"default",userSelect:"none",flexDirection:"column",background:isPointerTarget?"rgba(74,94,58,.07)":"transparent",borderRadius:isPointerTarget?8:0,transition:"background .12s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%"}}>
                  <span
                    role="button"
                    aria-label={`Mover tarea: ${item}`}
                    title="Arrastrar para reordenar"
                    onPointerDown={e=>beginPointerDrag(e,ei,orderIdx)}
                    onPointerMove={movePointerDrag}
                    onPointerUp={e=>endPointerDrag(e,false)}
                    onPointerCancel={e=>endPointerDrag(e,true)}
                    onContextMenu={e=>e.preventDefault()}
                    style={{width:34,minWidth:34,minHeight:36,display:"grid",placeItems:"center",color:pointerDragState?.ei===ei&&pointerDragState?.idx===orderIdx?"#4A5E3A":"rgba(74,94,58,.32)",cursor:"grab",fontSize:"1.08rem",marginTop:-6,marginBottom:-6,marginLeft:-7,flexShrink:0,touchAction:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}
                  >⠿</span>
                  <div onClick={()=>toggleItem(`${ei}_${ii}`)} style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,cursor:"pointer"}}>
                    <div style={{width:21,height:21,minWidth:21,borderRadius:4,border:`1px solid ${done?"#4A5E3A":"rgba(74,94,58,.3)"}`,background:done?"#4A5E3A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:1,flexShrink:0}}>
                      {done&&<span style={{color:"#F5EFE0",fontSize:theme.text.tiny,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <span style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:done?"rgba(26,26,20,.3)":"rgba(26,26,20,.75)",textDecoration:done?"line-through":"none",lineHeight:1.5}}>{item}</span>
                      {notas[`${ei}_${ii}`]&&<div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(74,94,58,.6)",fontStyle:"italic",marginTop:3}}>📝 {notas[`${ei}_${ii}`]}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center",flexWrap:"wrap"}}>
                    {resp[`${ei}_${ii}`]&&<span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.tiny,letterSpacing:".08em",padding:"2px 7px",borderRadius:100,background:"rgba(74,94,58,.08)",color:RESP_COLORS[resp[`${ei}_${ii}`]]||"rgba(26,26,20,.5)"}}>{resp[`${ei}_${ii}`]}</span>}
                    {(()=>{const b=badgeFecha(`${ei}_${ii}`);return b?<span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.micro,letterSpacing:".06em",padding:"2px 7px",borderRadius:100,background:b.bg,color:b.color,border:`0.5px solid ${b.border}`,whiteSpace:"nowrap"}}>📅 {b.label}</span>:null;})()}
                    {getVendorLabel(`${ei}_${ii}`)&&<span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.micro,letterSpacing:".06em",padding:"2px 7px",borderRadius:100,background:"rgba(74,94,58,.07)",color:"rgba(74,94,58,.65)",border:"0.5px solid rgba(74,94,58,.2)",whiteSpace:"nowrap"}}>🏢 {getVendorLabel(`${ei}_${ii}`)}</span>}
                    <button onClick={()=>setExpandKey(expandKey===`${ei}_${ii}`?null:`${ei}_${ii}`)} style={{background:"transparent",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:100,padding:"2px 8px",fontFamily:"'Lora',serif",fontSize:theme.text.label,color:"rgba(74,94,58,.5)",cursor:"pointer"}}>+</button>
                  </div>
                </div>
                {expandKey===`${ei}_${ii}`&&<div style={{display:"flex",gap:6,paddingLeft:0,width:"100%",flexWrap:"wrap",alignItems:"flex-start",marginTop:6}}>
                  <select name="app-field-13751" value={resp[`${ei}_${ii}`]||""} onChange={e=>setResponsable(`${ei}_${ii}`,e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
                    <option value="">Sin responsable</option>
                    {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <input name="app-field-13755" type="text" value={notas[`${ei}_${ii}`]||""} onChange={e=>setNota(`${ei}_${ii}`,e.target.value)} placeholder="Nota (proveedor, recordatorio...)" style={{flex:1,minWidth:120,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"4px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Límite:</span>
                    <input name="app-field-13758" type="date" value={getFecha(`${ei}_${ii}`)} onChange={e=>setFecha(`${ei}_${ii}`,e.target.value)}
                      style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14",width:"min(130px,100%)",boxSizing:"border-box"}}/>
                    {getFecha(`${ei}_${ii}`)&&<button onClick={()=>setFecha(`${ei}_${ii}`,"")} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",cursor:"pointer",fontSize:".9rem",padding:"0 2px",lineHeight:1}}>×</button>}
                  </div>
                  {vendors4Chk.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Proveedor:</span>
                    <select name="app-field-13764" value={getVendorId(`${ei}_${ii}`)} onChange={e=>setVendorId(`${ei}_${ii}`,e.target.value)}
                      style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14",maxWidth:140}}>
                      <option value="">Ninguno</option>
                      {vendors4Chk.map(v=><option key={v.id} value={v.id}>{v.nombre||"Sin nombre"}</option>)}
                    </select>
                  </div>}
                  <button onClick={saveAllChanges} disabled={saving} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"6px 12px",fontFamily:"'Lora',serif",fontSize:".8rem",fontWeight:700,cursor:saving?"wait":"pointer",opacity:saving?.65:1,whiteSpace:"nowrap"}}>{saving?"Guardando...":"Guardar cambios"}</button>
                  {saveError&&<span style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(180,50,50,.85)",alignSelf:"center"}}>No se pudo guardar. Probá nuevamente.</span>}
                </div>}
              </div>;
            })}

            {/* Custom items */}
            {etapaCustItems.map((item,ci)=>{
              return <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 0",borderBottom:"0.5px solid rgba(201,169,110,.1)"}}>
                <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,marginTop:1}}>
                  <button onClick={()=>moveCustom(ei,item.id,-1)} disabled={ci===0} style={{background:"transparent",border:"none",cursor:ci===0?"default":"pointer",color:"rgba(74,94,58,.3)",fontSize:".75rem",padding:"0 2px",lineHeight:1}}>▲</button>
                  <button onClick={()=>moveCustom(ei,item.id,1)} disabled={ci===etapaCustItems.length-1} style={{background:"transparent",border:"none",cursor:ci===etapaCustItems.length-1?"default":"pointer",color:"rgba(74,94,58,.3)",fontSize:".75rem",padding:"0 2px",lineHeight:1}}>▼</button>
                </div>
                <div onClick={()=>toggleCustom(ei,item.id)} style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,cursor:"pointer"}}>
                  <div style={{width:21,height:21,minWidth:21,borderRadius:4,border:`1px solid ${item.completada?"#C9A96E":"rgba(201,169,110,.4)"}`,background:item.completada?"#C9A96E":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:1,flexShrink:0}}>
                    {item.completada&&<span style={{color:"#1A1A14",fontSize:theme.text.tiny,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:item.completada?"rgba(26,26,20,.3)":"rgba(26,26,20,.75)",textDecoration:item.completada?"line-through":"none",lineHeight:1.5}}>
                    {item.texto} <span style={{fontFamily:"'Cinzel',serif",fontSize:theme.text.micro,letterSpacing:".08em",color:"rgba(201,169,110,.6)",marginLeft:4}}>personalizada</span>
                  </span>
                </div>
                <button onClick={()=>removeCustom(ei,item.id)} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.2)",fontSize:"1rem",cursor:"pointer",padding:"0 4px",flexShrink:0,marginTop:2}}>×</button>
              </div>;
            })}

            {/* Add custom item */}
            {addingTo===ei
              ? <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center"}}>
                  <input name="app-field-13796" autoFocus type="text" value={newText} onChange={e=>setNewText(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")addCustom(ei);if(e.key==="Escape"){setAddingTo(null);setNewText("");}}}
                    placeholder="Escribí la tarea y presioná Enter..."
                    style={{flex:1,fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(74,94,58,.3)",background:"#F5EFE0",color:"#1A1A14"}}/>
                  <button onClick={()=>addCustom(ei)} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"8px 14px",fontFamily:"'Lora',serif",fontSize:".85rem",cursor:"pointer"}}>+ Agregar</button>
                  <button onClick={()=>{setAddingTo(null);setNewText("");}} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",fontSize:"1.1rem",cursor:"pointer"}}>×</button>
                </div>
              : <button onClick={()=>{setAddingTo(ei);setOpenStage(ei);}} style={{marginTop:10,background:"transparent",border:"0.5px dashed rgba(74,94,58,.3)",borderRadius:8,padding:"8px 14px",fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(74,94,58,.6)",cursor:"pointer",width:"100%",textAlign:"left"}}>
                  + Agregar tarea personalizada a esta etapa
                </button>
            }
          </div>}
        </div>;
      })}

      <div style={{background:"rgba(74,94,58,.06)",border:"0.5px solid rgba(74,94,58,.15)",borderRadius:12,padding:"14px 18px",marginTop:20,display:"flex",gap:10}}>
        <span>⠿</span>
        <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,margin:0}}>
          Arrastrá los ítems por el ícono ⠿ para reordenarlos. Las tareas personalizadas tienen botones ▲▼ para moverlas.
        </p>
      </div>
      <BackToHomeComponent onBack={onBack}/>
    </div>
  </div>;
}
