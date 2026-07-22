/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// GUÍA NUPCIAL — contenido informativo para los novios
// Protocolo de mesas, ceremonia (lados, alianzas, cortejo) e
// invitaciones/regalos. Accesible desde el Salón y desde Opciones.
// ═══════════════════════════════════════════════════════════════
const GUIA_SECCIONES = [
  {id:"mesas", icon:"🪑", titulo:"Mesas y protocolo", bloques:[
    {t:"La mesa de los novios", p:"Es el punto de referencia del salón: presidencial (los novios con padres y padrinos) o \"sweetheart\" (solo los dos). Debe ver a todos los invitados y estar cerca de la pista."},
    {t:"Familia primero", p:"Las mesas más cercanas a los novios son para la familia directa: padres, hermanos y abuelos de cada lado. Después, el resto de la familia. La app aplica esto automáticamente con \"Sentar por protocolo\"."},
    {t:"Amigos cerca de la pista", p:"Los grupos más jóvenes y animados van cerca de la pista de baile: ellos la encienden. Compañeros de trabajo y conocidos pueden ir en mesas intermedias."},
    {t:"Niños juntos", p:"A partir de los 4-5 años, una mesa infantil propia (con actividades) cerca de la salida facilita que entren y salgan sin cruzar todo el salón. Bebés y muy pequeños, con sus padres, idealmente en extremos de mesa."},
    {t:"Afinidad antes que compromiso", p:"Sentá junta a la gente que se conoce o comparte edad e intereses. Evitá juntar personas enemistadas, y no armes \"la mesa de los sueltos\": repartilos donde tengan al menos un conocido."},
    {t:"Capacidades cómodas", p:"Redondas: 8-10 personas (ideales para conversar). Cuadradas: 8-12. Rectangulares e imperiales: para grupos grandes, calculá ~60 cm de mesa por persona. La app te recomienda las sillas según la medida."},
  ]},
  {id:"ceremonia", icon:"💍", titulo:"Ceremonia", bloques:[
    {t:"¿De qué lado va cada uno?", p:"En la tradición occidental (y en la ceremonia católica), la novia se ubica a la IZQUIERDA del novio mirando al altar — los invitados de la novia se sientan a la izquierda y los del novio a la derecha. En la tradición judía es al revés. En ceremonias civiles o al aire libre, cada vez más parejas lo deciden libremente."},
    {t:"¿Quién lleva las alianzas?", p:"Tradicionalmente las lleva el padrino, o un paje/niño de anillos que las entrega en el momento del rito. Consejo práctico: que el paje lleve réplicas y el padrino las verdaderas. En Paraguay y gran parte de Latinoamérica la alianza se usa en la mano derecha durante el compromiso y pasa a la izquierda al casarse (o se mantiene, según la costumbre familiar)."},
    {t:"Orden de entrada del cortejo", p:"Un orden clásico: 1) el novio entra del brazo de su madre, 2) padrinos y madrinas, 3) damas de honor y caballeros, 4) pajes y niña de las flores, 5) la novia entra última del brazo de su padre. Al salir, los novios encabezan y el cortejo los sigue en orden inverso. Es una guía, no una regla: adaptalo a tu familia."},
    {t:"Los testigos", p:"Para el civil en Paraguay se requieren testigos mayores de edad con cédula vigente (confirmá la cantidad exacta en tu oficina del Registro Civil). Elegí personas puntuales y avisales con tiempo qué documentos llevar."},
  ]},
  {id:"invitaciones", icon:"✉️", titulo:"Invitaciones y regalos", bloques:[
    {t:"¿Papel o digital?", p:"Digital: económica, rápida, con confirmación integrada (y esta app para el seguimiento). Papel: más formal y emotiva, ideal como recuerdo. Camino intermedio muy usado: papel para familia mayor y padrinos, digital para el resto. Enviá 2-3 meses antes; \"save the date\" 6+ meses si hay invitados que viajan."},
    {t:"¿A quién invitar?", p:"Una regla que ordena: si no hablaste con esa persona en el último año y no es familia, probablemente no necesita estar. Definan juntos un número máximo según presupuesto y salón, repartan cupos por lado, y armen una \"lista B\" para cubrir bajas. Sean parejos con los \"+1\": mismo criterio para todos."},
    {t:"¿Cómo pedir regalos con elegancia?", p:"Nunca en la invitación principal: usá una tarjeta aparte o la web/invitación digital. Opciones habituales: mesa de regalos en tiendas, lista de regalos online, o \"lluvia de sobres\" (aporte en efectivo, muy común en Paraguay) con una frase amable tipo \"tu presencia es nuestro mejor regalo; si querés hacernos uno, un aporte para nuestra nueva etapa nos ayuda muchísimo\". Datos bancarios solo si alguien los pide."},
    {t:"Confirmaciones (RSVP)", p:"Pedí confirmación con fecha límite (2-3 semanas antes) y un canal claro: WhatsApp, formulario o llamada. Una semana antes, repasá los \"pendientes\" de esta app y confirmalos uno a uno — el catering y las mesas dependen de ese número."},
  ]},
  {id:"presupuesto", icon:"💰", titulo:"Presupuesto", bloques:[
    {t:"Cómo se reparte un presupuesto típico", p:"Una referencia habitual: banquete y bebida 40-50%, salón 10-15%, fotografía y video 10%, música/DJ 5-8%, vestuario de ambos 8-10%, decoración y flores 8-10%, invitaciones y papelería 2-3%, y el resto para imprevistos. Ajustá los porcentajes a lo que más les importe: es SU fiesta."},
    {t:"El colchón del 10%", p:"Reservá un 10% del total para imprevistos: siempre aparecen (una prueba extra de vestido, transporte de último momento, horas extra de barra). Si no lo usás, es el arranque de la luna de miel."},
    {t:"Señas y pagos", p:"La mayoría de los proveedores reservan fecha con una seña del 20-50%. Pedí siempre recibo, acordá por escrito el cronograma de pagos y evitá pagar el 100% antes del evento: dejá un saldo para después, es tu garantía de servicio."},
    {t:"Dónde rinde ahorrar (y dónde no)", p:"Suele rendir: invitaciones digitales, decoración DIY con ayuda de amigos, temporada baja o viernes/domingo. No suele rendir: fotografía (es lo que queda para siempre), comida y bebida (es lo que más recuerdan los invitados), y el sonido."},
  ]},
  {id:"dia", icon:"⏰", titulo:"El gran día", bloques:[
    {t:"Cronograma típico de una boda de noche", p:"Peinado y maquillaje: 2-3 h antes. Fotos previas: 1 h. Ceremonia: 30-60 min. Recepción/cóctel: 60-90 min mientras los novios hacen fotos. Entrada al salón y primer baile. Cena: 90-120 min. Brindis y discursos: 20-30 min. Torta. Baile: 3-4 h. Fin de fiesta y despedida."},
    {t:"Los tiempos que siempre se estiran", p:"Las fotos grupales (asigná a alguien con la lista de fotos para agilizar), los traslados y el maquillaje. Sumá 15-20 minutos de colchón entre bloques: un cronograma con aire se disfruta, uno al milímetro se sufre."},
    {t:"Delegá el día D", p:"Los novios no coordinan su propia boda. Nombrá una persona de confianza (o wedding planner) como punto de contacto de todos los proveedores ese día, con el cronograma y los teléfonos. Ustedes solo tienen que estar presentes."},
    {t:"Kit de emergencia", p:"Alguien del cortejo debería tener: costurero, curitas, tijera, analgésicos, desodorante, maquillaje de retoque, cargador de celular, snacks y agua para los novios (¡se olvidan de comer!)."},
  ]},
  {id:"vestimenta", icon:"🤵", titulo:"Dress code", bloques:[
    {t:"Los códigos, del más al menos formal", p:"Etiqueta rigurosa (frac/vestido largo), Etiqueta o Black tie (esmoquin/vestido largo), Formal (traje oscuro/vestido largo o cóctel elegante), Cóctel (traje/vestido corto elegante), Semiformal y Casual elegante. Si no aclarás nada, la gente asume Formal para una boda de noche."},
    {t:"Cómo comunicarlo", p:"Una línea en la invitación alcanza: \"Dress code: formal\". Si el lugar lo amerita, agregá una pista práctica: \"jardín — tacos finos no recomendados\" o \"a orillas del río, puede refrescar\". Los invitados lo agradecen."},
    {t:"Colores reservados", p:"El blanco (y marfil/champán muy claro) es de la novia: evitalo como invitada salvo pedido expreso. Algunos también reservan un color para damas y madrinas — si es tu caso, avisalo en la invitación."},
    {t:"Prueba de vestuario con tiempo", p:"Vestido: encargá 6-8 meses antes, con 2-3 pruebas (la última, 2 semanas antes). Traje: 3-4 meses. Zapatos: usalos en casa varias veces antes del día D."},
  ]},
  {id:"proveedores", icon:"🤝", titulo:"Proveedores", bloques:[
    {t:"Qué preguntar antes de contratar", p:"¿Qué incluye exactamente el precio y qué se cobra aparte? ¿Cuántas horas de servicio y cuánto la hora extra? ¿Quién viene el día del evento (la misma persona que te atendió)? ¿Qué pasa si se enferman o llueve? ¿Tienen fotos/videos de eventos reales recientes?"},
    {t:"Todo por escrito", p:"Contrato o al menos un correo/mensaje que detalle: fecha, horarios, servicios incluidos, precio final, cronograma de pagos y política de cancelación. \"Lo hablamos por teléfono\" no existe cuando algo sale mal."},
    {t:"Plan B para el clima", p:"Si hay algo al aire libre, definí ANTES con el salón cuál es el plan de lluvia: qué espacio techado se usa, quién decide el cambio y con cuánta anticipación. Que no te lo estén inventando a las 18:00 del día D."},
    {t:"Degustación y visita técnica", p:"Con el catering: degustá el menú real, no el de muestra. Con el salón: visitalo a la misma hora de tu evento (la luz cambia todo) y preguntá por generador, aire acondicionado, estacionamiento y accesibilidad."},
  ]},
];

function FullGuideDownloadCard({source="guide_module", openFullGuideDownload, theme}){
  const THEME = theme;
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const download=async()=>{
    setError("");
    setLoading(true);
    try{ await openFullGuideDownload(source); }
    catch(e){ setError(e.message||"No pudimos preparar la descarga."); }
    finally{ setLoading(false); }
  };

  return <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(190px,100%),1fr))",gap:"clamp(18px,4vw,32px)",alignItems:"center",background:"linear-gradient(135deg,rgba(217,184,111,.18),rgba(74,94,58,.09))",border:"1px solid rgba(201,169,110,.42)",borderRadius:22,padding:"clamp(20px,4vw,30px)",marginBottom:22,overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"center"}}>
      <img src="/guias/portada-guia-completa.png" alt="Portada de la guía completa Nos comprometimos, ¿y ahora qué?" style={{width:"min(190px,68vw)",height:"auto",objectFit:"cover",objectPosition:"top",borderRadius:5,boxShadow:"0 16px 34px rgba(26,20,14,.2)"}}/>
    </div>
    <div>
      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(74,94,58,.09)",border:"1px solid rgba(74,94,58,.2)",borderRadius:999,padding:"7px 11px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"#4A5E3A",fontWeight:800,marginBottom:11}}>Incluida con tu compra · 55 páginas</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.55rem,4vw,2.15rem)",lineHeight:1.12,margin:"0 0 9px"}}>Nos comprometimos, ¿y ahora qué?</h2>
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",lineHeight:1.62,color:"rgba(26,26,20,.62)",margin:"0 0 14px"}}>La versión completa para acompañarte con presupuesto, invitados, fecha, clima, salón, ceremonia, proveedores, música y los detalles que suelen olvidarse.</p>
      <button type="button" className="pbtn" onClick={download} disabled={loading} style={{width:"100%",whiteSpace:"normal"}}>{loading?"Preparando tu guía...":"Descargar guía completa →"}</button>
      <p style={{fontFamily:"'Lora',serif",fontSize:".72rem",lineHeight:1.45,color:"rgba(26,26,20,.42)",margin:"9px 0 0",textAlign:"center"}}>Se abrirá una descarga privada vinculada a tu acceso.</p>
      {error&&<p role="alert" style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"#B5443A",lineHeight:1.45,margin:"10px 0 0"}}>{error}</p>}
    </div>
  </section>;
}

function FullGuideLockedCard({onRequestPurchase, theme}){
  const THEME = theme;
  return <section style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:16,alignItems:"center",background:"rgba(251,247,239,.96)",border:"1px solid rgba(201,169,110,.38)",borderRadius:20,padding:"18px",marginBottom:22}}>
    <div style={{position:"relative"}}>
      <img src="/guias/portada-guia-completa.png" alt="Portada de la guía completa" style={{width:82,height:114,objectFit:"cover",objectPosition:"top",borderRadius:4,filter:"saturate(.78)",boxShadow:"0 8px 20px rgba(26,20,14,.15)"}}/>
      <div aria-hidden="true" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,26,20,.34)",borderRadius:4,fontSize:"1.55rem"}}>🔒</div>
    </div>
    <div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"#4A5E3A",fontWeight:800,marginBottom:5}}>Guía completa para compradores</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.15rem,3vw,1.42rem)",lineHeight:1.18,margin:"0 0 7px"}}>Todo el camino, en 55 páginas</h2>
      <p style={{fontFamily:"'Lora',serif",fontSize:".79rem",lineHeight:1.48,color:"rgba(26,26,20,.56)",margin:"0 0 10px"}}>Está incluida con el acceso completo junto con todos los módulos de planificación.</p>
      <button type="button" className="lbtn" onClick={onRequestPurchase}>Desbloquear guía y módulos →</button>
    </div>
  </section>;
}

export function GuiaNupcial({abierta, seccionInicial="mesas", onClose, theme}){
  const THEME = theme;
  const [sec, setSec] = useState(seccionInicial);
  useEffect(()=>{ if(abierta) setSec(seccionInicial); },[abierta,seccionInicial]);
  useEffect(()=>{
    if(!abierta) return;
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=prev;};
  },[abierta]);
  if(!abierta) return null;
  const actual = GUIA_SECCIONES.find(s=>s.id===sec)||GUIA_SECCIONES[0];
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:THEME.z.modal,background:"rgba(26,26,20,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:680,background:THEME.color.cream2,borderRadius:"20px 20px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -10px 40px rgba(0,0,0,.3)"}}>
      <div style={{padding:"14px 18px 10px",borderBottom:"0.5px solid rgba(74,94,58,.12)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontFamily:THEME.font.display,fontSize:"1.25rem",fontWeight:700,color:THEME.color.ink}}>📖 Guía nupcial</div>
          <button onClick={onClose} style={{background:"rgba(74,94,58,.08)",border:"none",borderRadius:"50%",width:36,height:36,minHeight:36,fontSize:"1rem",color:"rgba(26,26,20,.5)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {GUIA_SECCIONES.map(s=>
            <button key={s.id} onClick={()=>setSec(s.id)}
              style={{background:sec===s.id?THEME.color.sage:"transparent",color:sec===s.id?THEME.color.cream:"rgba(26,26,20,.55)",border:`1px solid ${sec===s.id?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"9px 14px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",fontWeight:sec===s.id?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              {s.icon} {s.titulo}
            </button>
          )}
        </div>
      </div>
      <div style={{overflowY:"auto",padding:"14px 18px",paddingBottom:"calc(20px + env(safe-area-inset-bottom))"}}>
        {actual.bloques.map((b,i)=>
          <div key={i} style={{marginBottom:16}}>
            <div style={{fontFamily:THEME.font.display,fontSize:"1rem",fontWeight:700,color:THEME.color.sage,marginBottom:5}}>{b.t}</div>
            <p style={{fontFamily:THEME.font.body,fontSize:"max(14px,.9rem)",color:"rgba(26,26,20,.75)",lineHeight:1.65,margin:0}}>{b.p}</p>
          </div>
        )}
        <p style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.35)",fontStyle:"italic",marginTop:18,borderTop:"0.5px solid rgba(74,94,58,.1)",paddingTop:10}}>Estas son costumbres y recomendaciones generales — cada boda es de ustedes: adapten lo que les sirva y descarten el resto.</p>
      </div>
    </div>
  </div>;
}

// ─── MÓDULO GUÍA PARA NOVIOS (página completa) ────────────────────────────
export default function GuiaModule({onBack,isDemo=false,onRequestPurchase,theme,openFullGuideDownload}){
  const THEME = theme;
  const [sec, setSec] = useState("mesas");
  const actual = GUIA_SECCIONES.find(s=>s.id===sec)||GUIA_SECCIONES[0];
  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    <div style={{background:THEME.color.sage,padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button type="button" onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:7,border:"1px solid rgba(245,239,224,.3)",background:"transparent",color:"rgba(245,239,224,.86)",borderRadius:999,padding:"8px 13px",fontFamily:THEME.font.body,fontSize:".78rem",fontWeight:700,cursor:"pointer",marginBottom:14}}>← Volver</button>
        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Guía</div>
        <h1 style={{fontFamily:THEME.font.display,fontSize:"clamp(1.35rem,4vw,2.6rem)",color:THEME.color.cream,margin:"0 0 4px",lineHeight:1.1}}>📖 Guía para novios</h1>
        <p style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(245,239,224,.65)",margin:0}}>Tu biblioteca de orientación, protocolo y decisiones para cada etapa</p>
      </div>
    </div>
    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0",width:"100%",boxSizing:"border-box"}}>
      {isDemo
        ? <FullGuideLockedCard onRequestPurchase={onRequestPurchase} theme={THEME}/>
        : <FullGuideDownloadCard source="guide_module" openFullGuideDownload={openFullGuideDownload} theme={THEME}/>
      }

      <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12,margin:"4px 0 12px",flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,letterSpacing:".14em",textTransform:"uppercase",color:THEME.color.sage,marginBottom:4}}>Consultar dentro de la app</div>
          <div style={{fontFamily:THEME.font.body,fontSize:".8rem",color:"rgba(26,26,20,.46)"}}>Elegí un tema y volvé cuando lo necesites.</div>
        </div>
      </div>

      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12}}>
        {GUIA_SECCIONES.map(s=>
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{background:sec===s.id?THEME.color.sage:THEME.color.cream2,color:sec===s.id?THEME.color.cream:"rgba(26,26,20,.55)",border:`1px solid ${sec===s.id?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"10px 15px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(12px,.82rem)",fontWeight:sec===s.id?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {s.icon} {s.titulo}
          </button>
        )}
      </div>
      <div style={{background:THEME.color.cream2,border:"0.5px solid rgba(201,169,110,.22)",borderRadius:16,padding:"clamp(16px,3.5vw,30px)"}}>
        <div style={{fontFamily:THEME.font.display,fontSize:"clamp(1.15rem,3vw,1.5rem)",fontWeight:700,color:THEME.color.ink,marginBottom:14}}>{actual.icon} {actual.titulo}</div>
        {actual.bloques.map((b,i)=>
          <div key={i} style={{marginBottom:18}}>
            <div style={{fontFamily:THEME.font.display,fontSize:"1.02rem",fontWeight:700,color:THEME.color.sage,marginBottom:5}}>{b.t}</div>
            <p style={{fontFamily:THEME.font.body,fontSize:"max(14px,.92rem)",color:"rgba(26,26,20,.75)",lineHeight:1.7,margin:0}}>{b.p}</p>
          </div>
        )}
        <p style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.35)",fontStyle:"italic",marginTop:20,borderTop:"0.5px solid rgba(74,94,58,.1)",paddingTop:12,marginBottom:0}}>Costumbres y recomendaciones generales — cada boda es de ustedes: adapten lo que les sirva y descarten el resto.</p>
      </div>
    </div>
  </div>;
}
