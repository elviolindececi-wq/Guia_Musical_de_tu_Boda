import { useEffect, useMemo, useRef, useState } from "react";

const STAGES = [
  {id:"starting",emoji:"🌱",title:"Recién empezamos",copy:"Tenemos ideas, pero todavía no un plan claro."},
  {id:"foundations",emoji:"📍",title:"Ya contratamos algunas cosas",copy:"Hay decisiones tomadas y necesitamos ordenar lo que sigue."},
  {id:"execution",emoji:"🤝",title:"Estamos con invitados y proveedores",copy:"La información empieza a quedar repartida en varios lugares."},
  {id:"final",emoji:"✨",title:"Faltan pocos meses o semanas",copy:"Necesitamos cerrar pendientes y coordinar el gran día."}
];

const CONCERNS = [
  {id:"budget",recommendationId:"budget",emoji:"💰",title:"Presupuesto y pagos"},
  {id:"guests",recommendationId:"guests",emoji:"👥",title:"Invitados y distribución de mesas"},
  {id:"tasks",recommendationId:"timeline",emoji:"📋",title:"Tareas, fechas y proveedores"},
  {id:"scattered",recommendationId:"vendors",emoji:"🗂️",title:"Tengo información repartida en todos lados"},
  {id:"music",recommendationId:"music",emoji:"🎵",title:"Música y momentos de la ceremonia"},
  {id:"overwhelm",recommendationId:"overwhelm",emoji:"🧭",title:"No sé por dónde empezar"}
];

const MODULE_LABELS = {
  "checklist-boda":"Plan y checklist",
  budget:"Presupuesto",
  guests:"Invitados",
  "salon-design":"Diseño del salón",
  vendors:"Proveedores",
  timeline:"Cronograma",
  guia:"Guion musical"
};

const DEMO_FLOWS = {
  budget:{
    title:"Una contratación actualiza todo lo relacionado",
    intro:"Ejemplo ficticio: registran el catering una sola vez y el sistema les muestra dónde impacta.",
    items:[
      {icon:"↔",label:"Proveedores",title:"Catering La Arboleda",copy:"Propuesta aceptada · Gs. 18.500.000"},
      {icon:"$",label:"Presupuesto",title:"Importe reflejado",copy:"La categoría Catering muestra lo contratado y el saldo."},
      {icon:"✓",label:"Checklist",title:"Pago vinculado",copy:"La seña y el vencimiento quedan visibles como tareas."},
      {icon:"⏰",label:"Cronograma",title:"Confirmación final",copy:"El responsable sabe cuándo reconfirmar cantidad y horario."}
    ]
  },
  guests:{
    title:"La lista se convierte en una distribución real",
    intro:"Ejemplo ficticio: una confirmación cambia la mesa y ayuda a visualizar el salón.",
    items:[
      {icon:"◎",label:"Invitados",title:"María y Juan confirmaron",copy:"Se registran dos personas y una necesidad alimentaria."},
      {icon:"◉",label:"Mesas",title:"Asignados a Mesa 6",copy:"El sistema controla capacidad y personas pendientes."},
      {icon:"⌂",label:"Diseño del salón",title:"La mesa aparece ubicada",copy:"La distribución permite revisar circulación y cercanía."}
    ]
  },
  timeline:{
    title:"Cada pendiente tiene fecha y responsable",
    intro:"Ejemplo ficticio: una tarea deja de ser una nota suelta y pasa a formar parte del plan.",
    items:[
      {icon:"✓",label:"Checklist",title:"Confirmar menú final",copy:"Vence el 12 de octubre y tiene prioridad alta."},
      {icon:"↔",label:"Proveedores",title:"Vinculado al catering",copy:"Contacto, acuerdo y próximo paso quedan juntos."},
      {icon:"⏰",label:"Cronograma",title:"Responsable asignado",copy:"Ana llama al proveedor y registra la confirmación."}
    ]
  },
  vendors:{
    title:"La información deja de vivir en chats separados",
    intro:"Ejemplo ficticio: contacto, propuesta, pago y pendiente se conectan en un mismo recorrido.",
    items:[
      {icon:"↔",label:"Proveedores",title:"Fotografía Aurora",copy:"Contacto, propuesta y condiciones en una sola ficha."},
      {icon:"$",label:"Presupuesto",title:"Monto comprometido",copy:"La categoría Fotografía se actualiza con el contrato."},
      {icon:"✓",label:"Checklist",title:"Próxima tarea",copy:"Enviar lista de fotos importantes antes del 5 de noviembre."},
      {icon:"⏰",label:"Cronograma",title:"Horario coordinado",copy:"Llegada del equipo y sesión previa quedan visibles."}
    ]
  },
  music:{
    title:"La emoción también se transforma en un plan",
    intro:"Ejemplo ficticio: sus respuestas se convierten en un guion que pueden compartir.",
    items:[
      {icon:"♫",label:"Test musical",title:"Estilo íntimo y cinematográfico",copy:"La pareja define emociones, canciones y momentos."},
      {icon:"♪",label:"Guion personalizado",title:"Una propuesta por momento",copy:"Entrada, votos, alianzas y salida tienen una intención."},
      {icon:"✓",label:"Checklist",title:"Coordinación musical",copy:"DJ, músicos y planner reciben tareas claras."}
    ]
  },
  overwhelm:{
    title:"El sistema convierte muchas ideas en un próximo paso",
    intro:"Ejemplo ficticio: en lugar de mirar toda la boda a la vez, empiezan por una decisión que ordena las demás.",
    items:[
      {icon:"🧭",label:"Diagnóstico",title:"Prioridad de esta etapa",copy:"El sistema identifica qué conviene resolver primero."},
      {icon:"✓",label:"Checklist",title:"Tres acciones concretas",copy:"Solo aparece lo importante para avanzar esta semana."},
      {icon:"↔",label:"Conexiones",title:"Datos que acompañan",copy:"Presupuesto, proveedores e invitados dejan de estar aislados."}
    ]
  }
};

const OFFER_ITEMS = [
  {icon:"✓",title:"Aplicación completa con guardado",copy:"Continuá desde distintos dispositivos sin perder avances."},
  {icon:"↔",title:"Módulos conectados",copy:"Presupuesto, proveedores, invitados, mesas, salón, tareas, cronograma y música."},
  {icon:"▦",title:"9 archivos Excel",copy:"Plantillas y recursos descargables incluidos con la compra."},
  {icon:"📖",title:"Guía completa de 55 páginas",copy:"Nos comprometimos, ¿y ahora qué? incluida como bono."},
  {icon:"⚡",title:"Acceso inmediato",copy:"Pago único y acceso al sistema para comenzar hoy."}
];

export default function GuidedDiscoveryModule({onBack,onBuy,onLogin,getRecommendation,trackEvent}){
  const [step,setStep] = useState(1);
  const [stage,setStage] = useState("");
  const [concern,setConcern] = useState("");
  const [showIncludes,setShowIncludes] = useState(false);
  const startedRef = useRef(false);
  const recommendationTrackedRef = useRef("");

  const track = (name,payload={}) => {
    try { trackEvent?.(name,payload); } catch(e) {}
  };

  useEffect(()=>{
    if(startedRef.current) return;
    startedRef.current=true;
    track("guided_discovery_started",{source:"public"});
  },[]);

  const selectedConcern = CONCERNS.find(item=>item.id===concern);
  const recommendationConcern = selectedConcern?.recommendationId || "overwhelm";
  const recommendation = useMemo(
    ()=>getRecommendation?.({stage:stage||"starting",concern:recommendationConcern}) || {},
    [stage,recommendationConcern,getRecommendation]
  );
  const demo = DEMO_FLOWS[recommendationConcern] || DEMO_FLOWS.overwhelm;
  const stageLabel = STAGES.find(item=>item.id===stage)?.title || "Tu etapa";
  const concernLabel = selectedConcern?.title || "Tu preocupación principal";
  const steps = recommendation.steps || [];

  useEffect(()=>{
    if(step!==3 || !stage || !concern) return;
    const key=`${stage}:${concern}:${recommendation.module||"unknown"}`;
    if(recommendationTrackedRef.current===key) return;
    recommendationTrackedRef.current=key;
    track("guided_recommendation_shown",{stage,concern,recommended_module:recommendation.module||"unknown"});
  },[step,stage,concern,recommendation.module]);

  const chooseStage=(id)=>{
    setStage(id);
    setConcern("");
    track("guided_stage_selected",{stage:id});
    setStep(2);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const chooseConcern=(id)=>{
    setConcern(id);
    const mapped=CONCERNS.find(item=>item.id===id)?.recommendationId||id;
    track("guided_concern_selected",{concern:id,recommendation_concern:mapped,stage});
  };

  const showRecommendation=()=>{
    if(!stage||!concern) return;
    setStep(3);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const showDemo=()=>{
    track("guided_demo_started",{stage,concern,recommended_module:recommendation.module||"unknown"});
    setStep(4);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const completeDemo=()=>{
    track("guided_demo_completed",{stage,concern,recommended_module:recommendation.module||"unknown"});
    setStep(5);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const buy=()=>{
    track("guided_purchase_clicked",{stage,concern,recommended_module:recommendation.module||"unknown"});
    onBuy?.();
  };

  const login=()=>{
    track("existing_buyer_login_clicked",{source:"guided_discovery"});
    onLogin?.();
  };

  return <div className="guided-discovery">
    <header className="guided-discovery-header">
      <div className="guided-discovery-header-inner">
        <button type="button" className="guided-discovery-back" onClick={onBack}>← Volver</button>
        <div className="guided-discovery-brand">
          <span>El Violín de Ceci</span>
          <strong>Tu Boda Organizada</strong>
        </div>
        <button type="button" className="guided-discovery-login" onClick={login}>Ya compré / Ingresar</button>
      </div>
    </header>

    <main className="guided-discovery-shell">
      <div className="guided-discovery-progress" aria-label={`Paso ${step} de 5`}>
        {[1,2,3,4,5].map(value=><span key={value} className={value<=step?"is-active":""}/>) }
      </div>
      <div className="guided-discovery-step-label">Paso {step} de 5</div>

      {step===1&&<section className="guided-discovery-card fu" aria-labelledby="guided-stage-title">
        <div className="guided-discovery-kicker">Empecemos por su realidad</div>
        <h1 id="guided-stage-title">¿En qué momento de la organización están?</h1>
        <p className="guided-discovery-lead">No vamos a pedirte que cargues toda la boda. Elegí la etapa que más se parece a la situación de hoy.</p>
        <div className="guided-discovery-options guided-discovery-options-stage">
          {STAGES.map(item=><button key={item.id} type="button" onClick={()=>chooseStage(item.id)} className="guided-discovery-option">
            <span className="guided-discovery-option-icon">{item.emoji}</span>
            <strong>{item.title}</strong>
            <small>{item.copy}</small>
          </button>)}
        </div>
      </section>}

      {step===2&&<section className="guided-discovery-card fu" aria-labelledby="guided-concern-title">
        <button type="button" className="guided-discovery-inline-back" onClick={()=>setStep(1)}>← Cambiar etapa</button>
        <div className="guided-discovery-kicker">{stageLabel}</div>
        <h1 id="guided-concern-title">¿Qué parte de organizar la boda les genera más estrés?</h1>
        <p className="guided-discovery-lead">Elegí una sola. El sistema usa esa prioridad para mostrarte por dónde conviene empezar.</p>
        <div className="guided-discovery-options guided-discovery-options-concern">
          {CONCERNS.map(item=><button key={item.id} type="button" aria-pressed={concern===item.id} onClick={()=>chooseConcern(item.id)} className={`guided-discovery-option guided-discovery-option-row${concern===item.id?" is-selected":""}`}>
            <span className="guided-discovery-option-icon">{item.emoji}</span>
            <strong>{item.title}</strong>
          </button>)}
        </div>
        <button type="button" className="guided-discovery-primary" disabled={!concern} onClick={showRecommendation}>Descubrir mi próximo paso →</button>
      </section>}

      {step===3&&<section className="guided-discovery-card guided-discovery-recommendation fu" aria-labelledby="guided-recommendation-title">
        <button type="button" className="guided-discovery-inline-back" onClick={()=>setStep(2)}>← Cambiar respuesta</button>
        <div className="guided-discovery-kicker">Tu recomendación personalizada</div>
        <h1 id="guided-recommendation-title">Tu próximo paso no es hacer todo.</h1>
        <p className="guided-discovery-lead">Como <strong>{stageLabel.toLowerCase()}</strong> y hoy les preocupa <strong>{concernLabel.toLowerCase()}</strong>, conviene empezar por una acción que ordene las siguientes.</p>

        <div className="guided-discovery-recommendation-box">
          <span className="guided-discovery-recommendation-icon">{recommendation.emoji||"🧭"}</span>
          <div>
            <div className="guided-discovery-recommendation-label">Empezá por {MODULE_LABELS[recommendation.module]||"este paso"}</div>
            <h2>{recommendation.title||"Definir un comienzo posible"}</h2>
            <p>{recommendation.why||"Un primer paso claro reduce la sobrecarga y ayuda a ordenar las decisiones siguientes."}</p>
          </div>
        </div>

        <div className="guided-discovery-plan">
          <div className="guided-discovery-plan-title">Tres primeros pasos concretos</div>
          {steps.slice(0,3).map((item,index)=><div className="guided-discovery-plan-row" key={`${index}-${item}`}>
            <span>{index+1}</span>
            <p>{item}</p>
          </div>)}
        </div>

        <button type="button" className="guided-discovery-primary" onClick={showDemo}>Ver cómo el sistema lo organiza →</button>
      </section>}

      {step===4&&<section className="guided-discovery-card guided-discovery-demo fu" aria-labelledby="guided-demo-title">
        <button type="button" className="guided-discovery-inline-back" onClick={()=>setStep(3)}>← Volver a mi recomendación</button>
        <div className="guided-discovery-kicker">Demostración con datos ficticios</div>
        <h1 id="guided-demo-title">{demo.title}</h1>
        <p className="guided-discovery-lead">{demo.intro}</p>
        <div className="guided-discovery-demo-note">Esta vista es solo una demostración. No solicita datos personales, no guarda información y no se conecta con Supabase.</div>

        <div className="guided-discovery-flow">
          {demo.items.map((item,index)=><div key={`${item.label}-${item.title}`} className="guided-discovery-flow-wrap">
            <article className="guided-discovery-flow-card">
              <div className="guided-discovery-flow-icon">{item.icon}</div>
              <div className="guided-discovery-flow-label">{item.label}</div>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </article>
            {index<demo.items.length-1&&<div className="guided-discovery-flow-arrow" aria-hidden="true">↓</div>}
          </div>)}
        </div>

        <div className="guided-discovery-system-message">
          <strong>No estás comprando herramientas aisladas.</strong>
          <span>Estás reuniendo decisiones, personas, pagos y pendientes en un sistema que te muestra qué falta y qué viene después.</span>
        </div>
        <button type="button" className="guided-discovery-primary" onClick={completeDemo}>Ver qué incluye el acceso completo →</button>
      </section>}

      {step===5&&<section className="guided-discovery-card guided-discovery-offer fu" aria-labelledby="guided-offer-title">
        <div className="guided-discovery-kicker">Tu boda organizada en un solo lugar</div>
        <h1 id="guided-offer-title">Pasá de la información dispersa a un plan que pueden seguir.</h1>
        <p className="guided-discovery-lead">El acceso completo les permite guardar cada avance, continuar desde cualquier dispositivo y conectar todo lo que acaban de ver con su boda real.</p>

        <div className="guided-discovery-offer-highlight">
          <span>Pago único</span>
          <strong>USD 37</strong>
          <span>Acceso inmediato · Sin suscripción</span>
        </div>

        <div className={`guided-discovery-includes${showIncludes?" is-expanded":""}`}>
          {OFFER_ITEMS.map(item=><article key={item.title} className="guided-discovery-include-card">
            <span>{item.icon}</span>
            <div><strong>{item.title}</strong><p>{item.copy}</p></div>
          </article>)}
        </div>

        <button type="button" className="guided-discovery-secondary" onClick={()=>setShowIncludes(value=>!value)} aria-expanded={showIncludes}>
          {showIncludes?"Ver menos":"Ver todo lo que incluye"}
        </button>
        <button type="button" className="guided-discovery-primary guided-discovery-buy" onClick={buy}>Quiero organizar mi boda · USD 37 →</button>
        <p className="guided-discovery-trust">USD 37 · Pago seguro en Hotmart · Usá el mismo email para comprar y crear tu acceso.</p>
        <div className="guided-discovery-offer-links">
          <button type="button" onClick={()=>setStep(4)}>Volver a la demostración</button>
          <button type="button" onClick={login}>Ya compré / Ingresar</button>
        </div>
      </section>}
    </main>
  </div>;
}
