/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef, createContext, useContext, lazy, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import PhoneInput, { isValidPhoneNumber, getCountryCallingCode } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./app.css";

const TimelineModule = lazy(() => import("./modules/TimelineModule.jsx"));

// ─── Supabase inline (funciona en preview y en Vercel) ─────────────────────
// En Vercel: configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
const SB_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL;
const SB_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabase = SB_URL && SB_KEY
  ? createClient(SB_URL, SB_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;


const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/W106077396L?checkoutMode=10&bid=1783991520846";
const FREE_GUIDE_URL = "/guias/nos-comprometimos-guia-gratuita.pdf";
const FULL_GUIDE_ENDPOINT = "/api/full-guide";
const EXCEL_DOWNLOAD_ENDPOINT = "/api/excel-download";

const EXCEL_TEMPLATES = Object.freeze({
  master: {
    title: "Planificador maestro",
    shortTitle: "Planificador maestro",
    description: "Presupuesto, invitados, proveedores, pagos, tareas, música, mesas y día de la boda en un solo archivo."
  },
  budget: {
    title: "Presupuesto de la boda",
    shortTitle: "Presupuesto",
    description: "Controlá estimados, contratados, pagos, saldos y desvíos."
  },
  guests: {
    title: "Lista de invitados",
    shortTitle: "Invitados",
    description: "Gestioná confirmaciones, grupos, restricciones y asignación de mesas."
  },
  guestImportTemplate: {
    title: "Plantilla XLSX de invitados",
    shortTitle: "Plantilla de invitados",
    description: "Descargala vacía, completala en Excel y después importala en Invitados."
  },
  vendors: {
    title: "Gestión de proveedores",
    shortTitle: "Proveedores",
    description: "Compará propuestas, contactos, contratos, pagos y pendientes."
  },
  vendorImportTemplate: {
    title: "Plantilla XLSX de proveedores",
    shortTitle: "Plantilla de proveedores",
    description: "Descargala vacía, completala en Excel y después importala en Proveedores."
  },
  checklist: {
    title: "Cronograma y checklist",
    shortTitle: "Checklist",
    description: "Ordená tareas, responsables, vencimientos y etapas de la boda."
  },
  payments: {
    title: "Pagos y contratos",
    shortTitle: "Pagos y contratos",
    description: "Registrá cuotas, vencimientos, comprobantes y contratos."
  },
  music: {
    title: "Música de la boda",
    shortTitle: "Música",
    description: "Definí canciones, momentos, versiones, responsables y alternativas."
  },
  tables: {
    title: "Distribución de mesas",
    shortTitle: "Mesas",
    description: "Controlá capacidad, asignaciones y necesidades de cada mesa."
  },
  weddingDay: {
    title: "Cronograma del día de la boda",
    shortTitle: "Día de la boda",
    description: "Coordiná horarios, responsables, proveedores y planes alternativos."
  }
});

const EXCEL_TEMPLATES_BY_VIEW = Object.freeze({
  vendors: ["vendorImportTemplate"],
  guests: ["guestImportTemplate"]
});
const FULL_GUIDE_WELCOME_KEY = "ceci_full_guide_welcome_seen_v1";
const HOTMART_SEND_FORM_ID = "BEudGxe";
const HOTMART_SEND_ACTION = "https://handler.send.hotmart.com/subscription/BEudGxe?hotfeature=53";
const MARKETING_PARAMS_KEY = "ceci_marketing_params_v1";
const MARKETING_PARAM_NAMES = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","sck","src"];

const captureMarketingParams = () => {
  if(typeof window === "undefined") return {};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(MARKETING_PARAMS_KEY) || "{}"); } catch(e) {}

  const current = new URLSearchParams(window.location.search || "");
  const merged = {...saved};
  let changed = false;

  MARKETING_PARAM_NAMES.forEach((name) => {
    const value = current.get(name);
    if(value){
      merged[name] = String(value).trim().slice(0, 200);
      changed = true;
    }
  });

  if(changed){
    try { localStorage.setItem(MARKETING_PARAMS_KEY, JSON.stringify(merged)); } catch(e) {}
  }
  return merged;
};

const buildHotmartCheckoutUrl = (checkoutUrl = HOTMART_CHECKOUT_URL) => {
  if(typeof window === "undefined") return checkoutUrl;
  try {
    const marketingParams = captureMarketingParams();
    const url = new URL(checkoutUrl);
    MARKETING_PARAM_NAMES.forEach((name) => {
      const value = marketingParams[name];
      if(value && !url.searchParams.has(name)) url.searchParams.set(name, value);
    });
    return url.toString();
  } catch(e) {
    return checkoutUrl;
  }
};

// Guarda las UTMs apenas se abre la app, antes de que otros flujos limpien la URL.
captureMarketingParams();
const DEMO_WEDDING_KEY = "ceci_demo_wedding_data_v1";
const DEMO_USER_KEY = "ceci_demo_user_id_v1";
const DEMO_TEST_FORM_KEY = "ceci_demo_test_form_v1";
const DEMO_TEST_STEP_KEY = "ceci_demo_test_step_v1";
const DEMO_BLOCKED_VIEWS = new Set(["results","generating"]);
const START_PROFILE_KEY = "ceci_start_profile_v1";
const PRODUCT_EVENTS_KEY = "ceci_product_events_v1";

const trackProductEvent = (name, payload={}) => {
  const event = { name, payload, at:new Date().toISOString() };
  try {
    const current = JSON.parse(localStorage.getItem(PRODUCT_EVENTS_KEY) || "[]");
    localStorage.setItem(PRODUCT_EVENTS_KEY, JSON.stringify([...current.slice(-99), event]));
  } catch(e) {}
  try { if(typeof window.clarity === "function") window.clarity("event", name); } catch(e) {}
  try { if(typeof window.gtag === "function") window.gtag("event", name, payload); } catch(e) {}
  try { console.debug("[product-event]", name, payload); } catch(e) {}
};

const readStartProfile = () => {
  try { return JSON.parse(localStorage.getItem(START_PROFILE_KEY) || "null"); }
  catch(e) { return null; }
};

const getWeddingRecommendation = (profile={}) => {
  const stage = profile?.stage || "starting";
  const concern = profile?.concern || "overwhelm";

  // La recomendación combina la etapa real de la boda con el dolor principal.
  // No alcanza con enviar siempre al mismo módulo: también cambian el mensaje,
  // la primera acción y el plan concreto de tres pasos.
  const recommendations = {
    starting:{
      overwhelm:{module:"checklist-boda",emoji:"📋",title:"Definir un comienzo posible",why:"Cuando recién empiezan, la prioridad no es completar todo: es acordar qué decisiones importan ahora y cuáles pueden esperar.",cta:"Crear mi plan inicial",steps:["Conversen sobre las tres cosas que más quieren cuidar en la boda.","Definan una primera decisión concreta para esta semana.","Dejen por escrito qué temas pueden esperar sin culpa."]},
      budget:{module:"budget",emoji:"💰",title:"Acordar un límite inicial",why:"Antes de pedir muchos presupuestos, conviene definir un rango realista y las prioridades que no quieren negociar.",cta:"Definir presupuesto inicial",steps:["Anoten cuánto pueden invertir sin comprometer otras prioridades.","Elijan tres categorías importantes para ustedes.","Reservá un pequeño margen para cambios e imprevistos."]},
      guests:{module:"guests",emoji:"👥",title:"Crear una primera lista",why:"No necesita ser definitiva. Una primera estimación ayuda a conversar sobre presupuesto, salón y tipo de celebración.",cta:"Empezar la lista",steps:["Creen una lista amplia sin discutir todavía cada nombre.","Sepárenla en imprescindibles, deseados y por revisar.","Usen el total estimado para orientar las siguientes decisiones."]},
      salon:{module:"salon-design",emoji:"🏛️",title:"Definir qué espacio necesitan",why:"Antes de enamorarse de un salón, conviene saber cuántas personas esperan y cómo quieren que se sienta la celebración.",cta:"Pensar el espacio",steps:["Definan una cantidad estimada de invitados.","Anoten tres necesidades del lugar que no quieren negociar.","Usen el diseñador para probar una primera distribución."]},
      vendors:{module:"vendors",emoji:"🏢",title:"Preparar la búsqueda de proveedores",why:"Ordenar criterios antes de pedir presupuestos evita comparar propuestas que no responden a la misma necesidad.",cta:"Organizar proveedores",steps:["Elegí qué proveedor necesitan consultar primero.","Anotá qué debe incluir cada propuesta para poder compararla.","Cargá los contactos y presupuestos en un solo lugar."]},
      timeline:{module:"checklist-boda",emoji:"⏰",title:"Ordenar qué viene primero",why:"En esta etapa todavía no necesitás un cronograma del día: necesitás un orden simple para las próximas decisiones.",cta:"Ver mi plan",steps:["Identificá las decisiones que condicionan a las demás.","Elegí una tarea pequeña para completar esta semana.","Revisá el plan nuevamente después de cada decisión importante."]},
      music:{module:"guia",emoji:"🎵",title:"Descubrir el estilo musical de la boda",why:"La música puede empezar como una conversación sobre emociones y momentos, sin elegir todavía todas las canciones.",cta:"Empezar el recorrido musical",steps:["Conversen sobre cómo quieren que se sienta la ceremonia.","Anoten artistas o canciones que representan a la pareja.","Usen el test para crear una primera dirección musical."]}
    },
    foundations:{
      overwhelm:{module:"checklist-boda",emoji:"📋",title:"Ordenar las decisiones que faltan",why:"Con fecha o salón definidos, conviene convertir todo lo pendiente en un orden claro y posible.",cta:"Ordenar mi plan",steps:["Marcá qué decisiones ya están cerradas.","Elegí las tres que condicionan al resto.","Trabajá esta semana en una sola de ellas."]},
      budget:{module:"budget",emoji:"💰",title:"Distribuir el presupuesto",why:"Ahora que existen algunas bases, el presupuesto debe mostrar cuánto destinar a cada categoría y qué margen queda disponible.",cta:"Distribuir presupuesto",steps:["Cargá el total disponible o estimado.","Asigná montos a las categorías principales.","Compará lo cotizado con lo que todavía queda disponible."]},
      guests:{module:"guests",emoji:"👥",title:"Convertir la lista en una decisión",why:"La cantidad de invitados afecta directamente presupuesto, mesas, catering y capacidad del salón.",cta:"Ordenar invitados",steps:["Unificá las listas de la pareja y las familias.","Marcá prioridades y nombres por confirmar.","Usá el total para validar salón y presupuesto."]},
      salon:{module:"salon-design",emoji:"🏛️",title:"Probar la distribución del salón",why:"Con el lugar definido, conviene verificar mesas, circulación y zonas importantes antes de cerrar decisiones de ambientación.",cta:"Diseñar el salón",steps:["Cargá las medidas principales del espacio.","Ubicá mesas y sectores imprescindibles.","Revisá circulación, visibilidad y comodidad de los invitados."]},
      vendors:{module:"vendors",emoji:"🏢",title:"Comparar propuestas con claridad",why:"Centralizar lo que incluye cada proveedor ayuda a decidir sin depender de chats, capturas o memoria.",cta:"Comparar proveedores",steps:["Cargá las opciones que ya consultaste.","Marcá qué incluye y qué no incluye cada propuesta.","Definí el próximo contacto o decisión pendiente."]},
      timeline:{module:"checklist-boda",emoji:"⏰",title:"Crear un orden de contratación",why:"En esta etapa el tiempo se organiza mejor con prioridades y fechas de decisión, no con el minuto a minuto del evento.",cta:"Ordenar pendientes",steps:["Listá los servicios que todavía faltan contratar.","Asigná una fecha límite realista a cada decisión.","Empezá por lo que tiene menos disponibilidad."]},
      music:{module:"guia",emoji:"🎵",title:"Definir la identidad musical",why:"Con el estilo de la boda más claro, ya pueden elegir la emoción y el tono de cada momento importante.",cta:"Crear mi propuesta musical",steps:["Definan el clima emocional de la ceremonia.","Elijan los momentos que necesitan música.","Completen el test para recibir una primera propuesta."]}
    },
    execution:{
      overwhelm:{module:"vendors",emoji:"🏢",title:"Centralizar lo contratado",why:"Cuando ya hay varios proveedores, ordenar contactos, acuerdos y pendientes reduce la sensación de tener todo repartido.",cta:"Ordenar proveedores",steps:["Cargá primero los proveedores ya contratados.","Marcá qué pagaste y qué queda pendiente.","Agregá la próxima fecha o decisión de cada proveedor."]},
      budget:{module:"budget",emoji:"💰",title:"Revisar contratado, pagado y pendiente",why:"El presupuesto debe mostrar la diferencia entre lo cotizado, lo comprometido y lo que todavía falta pagar.",cta:"Revisar presupuesto",steps:["Cargá los importes de los proveedores contratados.","Marcá señas y pagos realizados.","Identificá categorías que superan lo planificado."]},
      guests:{module:"guests",emoji:"👥",title:"Preparar confirmaciones y mesas",why:"Con la organización en marcha, la lista debe empezar a convertirse en confirmaciones, grupos y necesidades concretas.",cta:"Gestionar invitados",steps:["Actualizá los datos de la lista principal.","Marcá confirmados, pendientes y bajas.","Agrupá personas que probablemente se sienten juntas."]},
      salon:{module:"salon-design",emoji:"🏛️",title:"Convertir el salón en un plan real",why:"Ahora conviene trabajar con las medidas, muebles y necesidades concretas de los proveedores ya contratados.",cta:"Ajustar el diseño",steps:["Cargá la distribución real del lugar.","Sumá mesas, mobiliario y sectores contratados.","Validá circulación y espacios de trabajo de los proveedores."]},
      vendors:{module:"vendors",emoji:"🏢",title:"Controlar acuerdos y próximos pasos",why:"La prioridad ya no es solamente comparar: es saber qué está contratado, qué falta confirmar y qué pago viene después.",cta:"Controlar proveedores",steps:["Actualizá el estado de cada proveedor.","Registrá pagos, contactos y acuerdos principales.","Definí un próximo pendiente para cada uno."]},
      timeline:{module:"timeline",emoji:"⏰",title:"Construir una primera secuencia",why:"Con varios servicios contratados, ya podés empezar a ordenar horarios, responsables y dependencias del gran día.",cta:"Crear cronograma",steps:["Cargá los horarios ya confirmados.","Asigná responsables a los momentos importantes.","Detectá huecos, cruces o tiempos poco realistas."]},
      music:{module:"guia",emoji:"🎵",title:"Cerrar los momentos musicales",why:"Con la ceremonia y la celebración más definidas, es momento de conectar canciones, versiones y responsables.",cta:"Completar mi guion musical",steps:["Confirmá qué momentos necesitan música.","Elegí canciones principales y alternativas.","Compartí el guion con músicos, DJ o responsables."]}
    },
    final:{
      overwhelm:{module:"checklist-boda",emoji:"📋",title:"Ver solamente lo crítico",why:"Cerca de la boda, una lista extensa aumenta la ansiedad. Conviene separar lo urgente de lo que ya está resuelto.",cta:"Revisar pendientes finales",steps:["Marcá todo lo que ya está confirmado.","Filtrá los pendientes que deben resolverse esta semana.","Delegá al menos una tarea con una persona responsable."]},
      budget:{module:"budget",emoji:"💰",title:"Cerrar pagos y margen final",why:"En las últimas semanas necesitás saber qué está pagado, qué vence y cuánto margen queda para imprevistos.",cta:"Revisar pagos finales",steps:["Marcá todos los pagos ya realizados.","Ordená los vencimientos por fecha.","Reservá un margen final para ajustes o emergencias."]},
      guests:{module:"guests",emoji:"👥",title:"Cerrar confirmaciones y distribución",why:"La lista debe transformarse en una versión operativa para catering, mesas y responsables.",cta:"Cerrar invitados",steps:["Confirmá asistentes y bajas definitivas.","Registrá restricciones o necesidades especiales.","Validá la distribución final de mesas y grupos."]},
      salon:{module:"salon-design",emoji:"🏛️",title:"Validar el salón definitivo",why:"La distribución final debe responder a invitados confirmados, circulación, proveedores y plan alternativo.",cta:"Revisar distribución final",steps:["Actualizá la cantidad definitiva de mesas y personas.","Confirmá zonas de ceremonia, música y proveedores.","Prepará una alternativa para clima o cambios de último momento."]},
      vendors:{module:"vendors",emoji:"🏢",title:"Confirmar a cada proveedor",why:"La tranquilidad final viene de saber que todos tienen horarios, contactos, pagos y responsabilidades claras.",cta:"Confirmar proveedores",steps:["Revisá contratos, saldos y datos de contacto.","Confirmá horario, lugar y responsable con cada proveedor.","Registrá cualquier pendiente o cambio acordado."]},
      timeline:{module:"timeline",emoji:"⏰",title:"Cerrar el cronograma del día",why:"La prioridad es que cada persona sepa qué sucede, cuándo sucede y quién es responsable.",cta:"Cerrar cronograma",steps:["Validá horarios con los proveedores principales.","Asigná responsables y contactos de respaldo.","Compartí una versión simple con quienes deben ejecutarla."]},
      music:{module:"guia",emoji:"🎵",title:"Confirmar el guion musical",why:"Ya no hace falta seguir explorando: conviene cerrar canciones, versiones, entradas y señales con quienes las ejecutarán.",cta:"Revisar guion musical",steps:["Confirmá la canción y versión de cada momento.","Definí quién dará cada señal musical.","Compartí el orden final con músicos, DJ y coordinación."]}
    }
  };

  return recommendations[stage]?.[concern]
    || recommendations[stage]?.overwhelm
    || recommendations.starting.overwhelm;
};
let demoWeddingMemory = {};

const isDemoUser = (user) => !!user?.is_demo;

const getDemoUser = () => {
  let id = "demo-local";
  try {
    id = localStorage.getItem(DEMO_USER_KEY) || `demo-${generarToken()}`;
    localStorage.setItem(DEMO_USER_KEY, id);
  } catch(e) {}
  return { id, email:"", is_demo:true, user_metadata:{ name:"Invitado" } };
};

const readDemoWeddingData = () => demoWeddingMemory;

const requestDemoPurchase = () => {
  try { window.dispatchEvent(new CustomEvent("ceci-demo-save-attempt")); } catch(e) {}
};

// En modo prueba, los módulos funcionan con una memoria temporal de la sesión.
// Nada se envía a Supabase ni se conserva al recargar o salir de la prueba.
const demoDataClient = {
  from: () => {
    const query = {
      select(){ return query; },
      eq(){ return query; },
      maybeSingle(){ return Promise.resolve({data:readDemoWeddingData(), error:null}); },
      upsert(payload){
        if(payload && typeof payload === "object"){
          demoWeddingMemory = {...demoWeddingMemory, ...payload};
          try { window.dispatchEvent(new CustomEvent("ceci-demo-change")); } catch(e) {}
        }
        return Promise.resolve({data:demoWeddingMemory, error:null});
      }
    };
    return query;
  }
};

const dataClient = (user) => isDemoUser(user) ? demoDataClient : supabase;

const generarToken = () => {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sbFetch = async (path, opts={}) => {
  if(!SB_URL || !SB_KEY || !supabase) {
    console.error('Faltan variables de Supabase', { SB_URL, SB_KEY });
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || SB_KEY;

  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'Prefer': opts.upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
      ...opts.headers
    }
  });

  if(!r.ok) {
    const errorText = await r.text();
    console.error('Error Supabase:', r.status, errorText);
    return null;
  }

  const text = await r.text();
  if(!text) return null;
  const d = JSON.parse(text);
  return Array.isArray(d) ? d[0] : d;
};

const guardarSesion = async ({
  user_id,
  email,
  nombre1,
  nombre2,
  fechaBoda,
  ciudad,
  form,
  results,
  arquetipo,
  checked,
  result_token
}) => {
  try {
    if (!email || !user_id) return null;

    const payload = {
      user_id,
      email: email.toLowerCase().trim(),
      nombre1,
      nombre2,
      fecha_boda: fechaBoda,
      ciudad,
      form,
      results,
      arquetipo,
      checked,
      result_token,
      updated_at: new Date().toISOString()
    };

    // Importante: no usamos upsert con on_conflict=user_id porque requiere
    // una constraint UNIQUE en Supabase. En producción es más robusto:
    // 1) buscar si ya existe una sesión del usuario;
    // 2) actualizarla;
    // 3) si no existe, crearla.
    const existing = await cargarSesionPorUsuario(user_id);

    if (existing?.id) {
      return await sbFetch(`sesiones?id=eq.${encodeURIComponent(existing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    return await sbFetch('sesiones', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.error('Error guardando sesión:', e);
    return null;
  }
};

const cargarSesion = async (email) => {
  try {
    if (!email) return null;
    return await sbFetch(`sesiones?select=*&email=eq.${encodeURIComponent(email.toLowerCase().trim())}&order=updated_at.desc&limit=1`);
  } catch(e) { return null; }
};

const cargarSesionPorUsuario = async (userId) => {
  try {
    if (!userId) return null;
    return await sbFetch(`sesiones?select=*&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`);
  } catch(e) { return null; }
};

const cargarSesionPorToken = async (token) => {
  try {
    if (!token) return null;
    return await sbFetch(`sesiones?select=*&result_token=eq.${encodeURIComponent(token)}&order=updated_at.desc&limit=1`);
  } catch(e) { return null; }
};

const actualizarChecked = async ({ user_id, email, checked }) => {
  try {
    if (user_id) {
      await sbFetch(`sesiones?user_id=eq.${encodeURIComponent(user_id)}`, {
        method: 'PATCH', body: JSON.stringify({checked})
      });
      return;
    }
    if (email) {
      await sbFetch(`sesiones?email=eq.${encodeURIComponent(email.toLowerCase().trim())}`, {
        method: 'PATCH', body: JSON.stringify({checked})
      });
    }
  } catch(e) {}
};



// ══════════════════════════════════════════════════════════════
// THEME — sistema de tokens de diseño (Sistema Ceci)
// Fuente única de verdad para colores, tipografía, radios,
// espaciado y objetivos táctiles. Los alias G/C/DIM/... se
// mantienen por retrocompatibilidad con estilos existentes.
// ══════════════════════════════════════════════════════════════
const THEME = {
  color: {
    gold:       "#C9A96E",
    goldBright: "#D9B86F",
    goldDeep:   "#E6C76A",
    ink:        "#1A1A14",
    inkDim:     "rgba(26,26,20,.65)",
    inkSoft:    "rgba(26,26,20,.42)",
    inkFaint:   "rgba(26,26,20,.3)",
    cream:      "#F5EFE0",
    cream2:     "#FBF7EF",
    cream3:     "#EAE4D2",
    creamText:  "rgba(245,239,224,.75)",
    sage:       "#4A5E3A",
    sageLight:  "#7B8C6E",
    sageBorder: "rgba(74,94,58,.3)",
    sageSoft:   "rgba(74,94,58,.08)",
    border:     "rgba(201,169,110,.28)",
    danger:     "#B5443A",
    dangerSoft: "rgba(200,60,60,.15)",
    success:    "#2ECC71",
    confColors: { confirmado:"#4A5E3A", pendiente:"#C9A96E", no_va:"rgba(26,26,20,.3)" },
  },
  font: {
    display: "'Playfair Display',serif",
    label:   "'Cinzel',serif",
    body:    "'Lora',serif",
    script:  "'Great Vibes',cursive",
  },
  // Tipografía con piso legible en mobile (html base 17px)
  text: {
    micro:  "max(10px,.56rem)",   // etiquetas micro (Cinzel uppercase tracking)
    tiny:   "max(11px,.62rem)",   // metadatos, hints
    label:  "max(12px,.72rem)",   // labels de sección
    small:  "max(13px,.82rem)",   // texto secundario
    body:   "max(14px,.95rem)",   // cuerpo mínimo
    md:     "1.05rem",
    lg:     "1.15rem",
  },
  radius: { sm:8, md:12, lg:16, xl:20, xxl:24, pill:100 },
  space:  { xs:6, sm:10, md:14, lg:20, xl:28, xxl:40 },
  shadow: {
    card:  "0 4px 20px rgba(74,94,58,.08)",
    float: "0 8px 28px rgba(26,20,14,.16)",
    modal: "0 12px 48px rgba(26,20,14,.18)",
    pop:   "0 8px 24px rgba(0,0,0,.12)",
  },
  tap: { min:44, comfortable:48 },
  z:   { nav:100, sheet:200, modal:900, toast:9999 },
};
// Alias retrocompatibles
const G=THEME.color.gold, C=THEME.color.ink, DIM=THEME.color.inkDim, DIMSOFT=THEME.color.inkSoft, BG=THEME.color.cream, BG2=THEME.color.cream2, BG3=THEME.color.cream3, BORDER=THEME.color.border, SAGE=THEME.color.sage, SAGE_L=THEME.color.sageLight;

const CECI_VOICE = `Sos Ceci, violinista con 200 bodas en Paraguay y Brasil. Estilo: Emocional, Elegante, Cinematográfico.
FILOSOFÍA: La música no es decoración — es la emoción que todos van a recordar. Lo que la gente recuerda es cómo se sintió cuando empezó la música. En boda luxury, hasta los silencios tienen intención.
ERRORES: elegir pensando en el público no en los novios; canciones de moda que no los representan; ignorar la letra; dejar la música para último; canciones rítmicas sin voz (Your Song, Signed Sealed Delivered pierden fuerza en instrumental).
SIEMPRE FUNCIONA: Can't Help Falling in Love.
EJEMPLO REGIONAL: en Paraguay es comun celebrar dos ceremonias el mismo dia (religiosa + civil), cada una en un lugar distinto. La ceremonia religiosa catolica suele ser en iglesia; ceremonias cristianas no catolicas y civiles suelen ser en salones u otros venues.`;

// Guía de criterio musical de Ceci por momento — función emocional + ejemplos reales
// Pool de canciones validadas por Ceci (de su guía real) — punto de partida por momento
const CECI_SONG_POOL = {
  novio: ["Now We Are Free (Gladiador)", "Mi Corazón Encantado", "Himno de la Champions"],
  cortejo: ["Canon in D - Pachelbel", "Yo Soy Tu Amigo Fiel", "Slipping Through My Fingers - ABBA"],
  novia: ["Can't Help Falling in Love - Elvis Presley", "Young and Beautiful - Lana Del Rey", "Veo en Ti la Luz (Tangled)"],
  votos: ["Your Song - Elton John", "Memories - Maroon 5", "No Hay Nadie Más - Sebastián Yatra"],
  alianzas: ["Hasta Mi Final - Il Divo", "Por Ti Seré - Il Divo", "Make You Feel My Love - Adele"],
  firmas: ["Lover - Taylor Swift", "Esta Noche Es Para Amar - Luciano Pereyra", "Enchanted - Taylor Swift"],
  fotos: ["Here Comes the Sun - The Beatles", "Just the Way You Are - Bruno Mars", "Que Suerte Tenerte - Luck Ra"],
  salida: ["Viva la Vida - Coldplay", "Marry You - Bruno Mars", "Que Suerte Tenerte - Luck Ra"],
  primer_baile: ["Just the Two of Us", "Sarà Perché Ti Amo - Ricchi e Poveri", "How Long Will I Love You - Ellie Goulding"],
  coctel: ["If I Ain't Got You - Alicia Keys", "Golden Hour - JVKE", "Telepatía - Kali Uchis"],
  cena: ["Fly Me to the Moon - Frank Sinatra", "The Girl from Ipanema - João Gilberto", "At Last - Etta James"],
};

const CECI_MOMENTOS_GUIA = {
  llegada: "Función: crear atmósfera y anticipación antes de que empiece la ceremonia, sin robar protagonismo a lo que viene. Emociones: calidez, anticipación, recogimiento.",
  cortejo: "Función: suavizar la transición y preparar el terreno para lo importante, transmitiendo delicadeza. Emociones: ternura, inocencia, expectativa creciente. Ejemplos que funcionan: Canon in D (Pachelbel), Yo Soy Tu Amigo Fiel, Slipping Through My Fingers (ABBA). Evitar canciones enérgicas, especialmente si el cortejo son niños — priorizar inocencia.",
  novio: "Función: abrir la puerta emocional, crear anticipación SIN dramatismo, que los invitados respiren profundo antes de la entrada de la novia. Emociones: alegría (pero no euforia), calidez, expectativa. Ejemplos que funcionan: Now We Are Free (Gladiador), Mi Corazón Encantado, Himno de la Champions. Evitar temas muy dramáticos.",
  novia: "Función: DEJAR SIN ALIENTO — convertir este momento en una película, sostener la emoción de TODOS los presentes. Es el momento más recordado e IRREPETIBLE de toda la boda. Emociones: majestuosidad, solemnidad, romance profundo, emoción contenida. Ejemplos que funcionan: Can't Help Falling in Love, Young and Beautiful, Veo en Ti la Luz. La canción debe generar piel de gallina y acompañar una caminata lenta.",
  votos: "Función: crear un contenedor emocional seguro — la música NO compite con las palabras de la pareja, sostiene la intimidad sin invadir. Emociones: sinceridad, vulnerabilidad, amor profundo, intimidad. Ejemplos que funcionan: Your Song, Memories, No Hay Nadie Más. Si la pareja tiene una canción que se dedicaron, este es el momento ideal para usarla. Preferentemente instrumental o muy suave, requiere micrófono para los novios.",
  alianzas: "Función: elevar el momento del intercambio de anillos y el primer beso — marcar el antes y el después, transmitir romance. Es un momento breve (aprox 1 minuto). Emociones: romance, celebración contenida, conexión profunda, promesa. Ejemplos que funcionan: Hasta Mi Final, Por Ti Seré, Make You Feel My Love. Tip: usar la parte del coro/estribillo de la canción elegida, ya que el momento es corto.",
  aleluya: "Momento litúrgico OBLIGATORIO en misa católica — debe ser el Aleluya u otro himno aprobado por la iglesia, NUNCA música secular. Función: celebración litúrgica dentro del rito.",
  ofertorio: "Función: acompañar la preparación del altar con recogimiento, sin distraer. Música sacra y suave. Emociones: fe, paz, trascendencia. Coordinar siempre con el sacerdote.",
  comunion: "Función: sostener el momento de mayor recogimiento de la misa, conectar con lo trascendente. Emociones: fe, solemnidad, trascendencia, paz. Ejemplos que funcionan: Ave María, Hallelujah, cánticos de la iglesia local. NUNCA música secular — coordinar siempre con el sacerdote.",
  firmas: "Función: acompañar un momento de acción (firma del acta) sin distraer, pero transmitiendo que algo importante está pasando. Emociones: solemnidad, celebración contenida, seguridad. Ejemplos que funcionan: Lover, Esta Noche Es Para Amar, Enchanted. Tip: en este momento las canciones suelen sonar completas — elegir temas que la pareja disfrute de principio a fin. Regla práctica: 1 canción completa por cada 3 testigos en el altar.",
  fotos: "Función: cambiar TOTALMENTE el tono del evento — de solemne a festivo, que los invitados empiecen a sonreír mientras la pareja sale a sacarse fotos ya casados. Emociones: alegría, celebración, felicidad, esperanza. Ejemplos que funcionan: Here Comes the Sun, Just the Way You Are, Que Suerte Tenerte. Canciones enérgicas, con presencia de percusión/bombo.",
  salida: "Función: CELEBRAR CON ALEGRÍA — la pareja ya está casada, es el clímax emocional feliz de toda la ceremonia. Emociones: alegría desbordante, celebración, triunfo del amor, esperanza. Ejemplos que funcionan: Viva la Vida, Marry You, Que Suerte Tenerte. Que se sienta totalmente de la pareja — épico pero cálido.",
  primer_baile: "Función: SER SU HISTORIA — que cada nota cuente quiénes son como pareja, convirtiendo unos minutos en un recuerdo eterno. Emociones: amor profundo, intimidad (aunque todos miren), alegría, conexión. Ejemplos de referencia: Just the Two of Us, Sarà Perché Ti Amo, How Long Will I Love You — o idealmente la canción personal que la pareja eligió. Este es el momento MÁS personal de toda la boda, no seguir tendencias genéricas.",
};

const CECI_COCTEL_GUIA = "Recepción/cóctel: la música debe acompañar sin dominar, crear una atmósfera agradable para que los invitados conversen cómodamente mientras la pareja está en sesión de fotos — honrando el atardecer. Emociones: calidez, modernidad, relajación, sofisticación. Volumen moderado-bajo. Referencias de estilo: If I Ain't Got You, Golden Hour, Telepatía. Se pueden mezclar estilos musicales.";

const CECI_CENA_GUIA = "Cena: la música debe ser FUNCIONAL sin desaparecer — que los invitados puedan conversar tranquilos, sin competir con el momento, generando una atmósfera agradable de disfrute. Emociones: comodidad, alegría suave, conexión, disfrute. Estilos recomendados: Jazz, Bossa Nova, Soul, Pop acústico. Volumen bajo-moderado, evitar temas con mucha letra que distraigan la conversación.";

const ARQUETIPOS = {
  cinematograficos:{e:"🎬",n:"Los Cinematográficos",d:"Su boda va a ser una escena que la gente recuerde como si hubiera salido de una película.",m:"Bandas sonoras, épico, arreglos orquestales"},
  clasicos:{e:"💐",n:"Los Clásicos Románticos",d:"Elegancia atemporal. La boda que siempre imaginaron, sin sorpresas — solo emoción pura.",m:"Clásica, romántica, atemporal, con historia"},
  modernos:{e:"⚡",n:"Los Modernos",d:"No quieren nada que ya hayan visto en otra boda. Su boda va a sorprender.",m:"Contemporáneo, pop sofisticado, indie, diferente"},
  intimos:{e:"🌿",n:"Los Íntimos",d:"Pocos invitados, mucho amor. Que se sienta como la reunión familiar más especial.",m:"Acústico, suave, folk, orgánico, personal"},
  festivos:{e:"🎊",n:"Los Festivos",d:"La energía arranca desde la ceremonia. Quieren que nadie se quede sentado sin sentir algo.",m:"Alegre, festivo, latino, con ritmo"},
  luxury:{e:"👑",n:"Los Luxury",d:"Cada detalle curado. La música es parte de una experiencia completa que nadie va a olvidar.",m:"Estratégico, atmosférico, preciso, de alta gama"},
};


// ─── GUÍA DE CANCIONES ───────────────────────────────────────────────────────
const CANCIONES_POR_MOMENTO = {
  llegada:{titulo:"Llegada de invitados",icono:"🕯️",guia:"Esta música crea el ambiente antes de que empiece todo. No necesita ser el centro — necesita preparar el corazón. Elegí algo suave, instrumental, que haga que la gente baje el volumen y empiece a sentir que algo especial está por pasar.",errores:"Error frecuente: poner música demasiado conocida o movida que distrae en lugar de crear atmósfera.",canciones:[{t:"Experience",a:"Ludovico Einaudi",n:"Piano y cuerdas. Cinematográfica sin llamar atención sobre sí misma."},{t:"River Flows in You",a:"Yiruma",n:"Suave, reconocible, no tan repetida en bodas. Perfecta como fondo."},{t:"Clair de Lune",a:"Debussy",n:"Clásica atemporal. Elegante desde la primera nota."},{t:"Canon en Re",a:"Pachelbel",n:"Siempre funciona — pero elegí una versión con tempo adecuado, no demasiado lenta."},{t:"A Thousand Years",a:"Christina Perri (piano solo)",n:"Funcioná para llegada solo en versión instrumental — con voz, guardar para otro momento."}]},
  novio:{titulo:"Entrada del novio",icono:"🤵",guia:"El novio entra y espera. La música correcta lo sostiene y le dice a todos que esto ya empezó de verdad. No tiene que ser dramática — tiene que ser genuina.",errores:"Error frecuente: usar la misma canción para el novio y la novia, o una tan discreta que nadie nota que está entrando.",canciones:[{t:"Marry Me",a:"Train",n:"Dice exactamente lo que el novio está sintiendo sin que él tenga que decir nada."},{t:"Can't Help Falling in Love",a:"Elvis (versión violín)",n:"Inevitable. El tono de toda la ceremonia queda establecido desde que arranca."},{t:"Everything",a:"Michael Bublé",n:"Moderno, cálido, genuino. Para bodas con espíritu contemporáneo."},{t:"Grow Old With Me",a:"Tom Odell",n:"Íntima, sincera, menos obvia. Ideal para bodas pequeñas."},{t:"Make You Feel My Love",a:"Adele (piano)",n:"Emotiva sin ser teatral. Funciona para casi cualquier estilo."}]},
  novia:{titulo:"Entrada de la novia",icono:"👰",guia:"El momento más importante de toda la ceremonia. La canción que elijas es la que vas a escuchar el resto de tu vida y volver a ese instante exacto. No puede ser genérica. Tiene que ser absolutamente tuya.",errores:"Error crítico: canción con intro larga — la novia puede llegar al altar antes del coro. Definir el segundo exacto de inicio con el DJ.",canciones:[{t:"A Thousand Years",a:"Christina Perri",n:"La más pedida en Paraguay. Emotiva y poderosa — si no te importa que sea esperada, es una elección segura."},{t:"Can't Help Falling in Love",a:"Elvis / versión violín",n:"Inevitable y eterno. En violín pocas cosas lo igualan en emoción."},{t:"Perfect",a:"Ed Sheeran (versión lenta)",n:"Moderna y reconocida. Ideal para arquetipo moderno o clásico romántico."},{t:"Ave Maria",a:"Schubert",n:"Para bodas religiosas o ceremonias que buscan solemnidad y belleza clásica."},{t:"Turning Page",a:"Sleeping at Last",n:"Menos conocida, muy emotiva. Para la novia que no quiere la canción de todas las demás."},{t:"La Vie en Rose",a:"Edith Piaf (instrumental)",n:"Romántica, cinematográfica, atemporal. Hace llorar a casi cualquier invitado."}]},
  ceremonia:{titulo:"Durante la ceremonia",icono:"💍",guia:"La música durante los votos no puede competir con las palabras — tiene que sostenerlas. El error más común es elegir algo tan conocido que los invitados empiecen a tararear. Instrumental suave que llene el silencio sin robar protagonismo.",errores:"Error frecuente: dejar silencio durante los votos. O poner una canción demasiado conocida que distrae.",canciones:[{t:"Comptine d'un autre été",a:"Yann Tiersen",n:"Delicada, reconocible (Amélie), perfecta como fondo sin protagonismo."},{t:"Oblivion",a:"Piazzolla (violín)",n:"Profunda, emotiva, con alma. Especial para momentos de firma."},{t:"Gymnopédie No. 1",a:"Satie",n:"Minimalista y perfecta. No compite con nada, simplemente sostiene."},{t:"All of Me",a:"John Legend (piano solo)",n:"Conocida pero funciona como fondo instrumental. Evitar la versión con voz."},{t:"Somewhere Over the Rainbow",a:"Versión ukulele",n:"Suave, emotiva, sorpresiva. Para bodas íntimas o simbólicas."}]},
  salida:{titulo:"Salida de los novios",icono:"🎊",guia:"Acaban de decirse que sí. La música de salida es la primera canción que suena después del sí. Puede subir la energía para arrancar la fiesta — depende de su arquetipo y del espíritu de su boda.",errores:"Error frecuente: salida demasiado suave cuando todos quieren celebrar, o demasiado estridente después de una ceremonia íntima.",canciones:[{t:"Marry You",a:"Bruno Mars",n:"Energética y alegre. La gente naturalmente empieza a sonreír y aplaudir."},{t:"Ho Hey",a:"The Lumineers",n:"Fresca, moderna, festiva sin ser exagerada."},{t:"Happy",a:"Pharrell Williams",n:"Pura alegría. Para bodas donde la fiesta arranca desde la ceremonia."},{t:"Better Together",a:"Jack Johnson",n:"Suave e íntima. Para bodas pequeñas o de espíritu más tranquilo."},{t:"God Only Knows",a:"The Beach Boys",n:"Emotiva y festiva a la vez. Clásica para bodas elegantes."}]}
};

const GUIA_TIPS = [
  {t:"Escuchá la canción entera antes de elegirla",d:"No alcanza con conocer el estribillo. Hay canciones con letras hermosas en el coro pero problemáticas en los versos. Escuchá todo — especialmente la letra completa."},
  {t:"Definí el segundo exacto de inicio",d:"Muchas canciones tienen intros largas. Si la novia llega al altar en 45 segundos y el coro recién llega al minuto 1:30, el momento queda descolgado. Definí el punto exacto con el DJ."},
  {t:"Verificá la versión, no solo el nombre",d:"'A Thousand Years' tiene 12 versiones distintas. El DJ necesita saber exactamente cuál — con artista, año y si es original o cover."},
  {t:"No cambies canciones la última semana",d:"Cada cambio de último momento multiplica las chances de error el día del evento. Elegí con criterio y confiá."},
  {t:"La música instrumental no es segunda opción",d:"Una versión en violín de la canción perfecta puede ser más emotiva que la versión original. No subestimes el poder de la instrumentación."},
];

function GuiaCanciones({onStart,onBack}){
  const [tab,setTab]=useState("llegada");
  const momento=CANCIONES_POR_MOMENTO[tab];
  const tabs=Object.keys(CANCIONES_POR_MOMENTO);
  const tabRef=useRef(null);

  const scrollTab=(k)=>{
    setTab(k);
    // Scroll the active tab into view
    const el=tabRef.current?.querySelector(`[data-tab="${k}"]`);
    if(el) el.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  };

  return <div style={{width:"100%",minHeight:"100dvh",background:"rgba(245,239,224,.9)",paddingBottom:60}}>

    {/* Header */}
    <div style={{textAlign:"center",padding:"clamp(16px,5vw,40px) clamp(16px,5vw,48px) clamp(18px,3vw,32px)",borderBottom:"0.5px solid rgba(201,169,110,.2)",background:"rgba(245,239,224,.5)",position:"relative"}}>

      <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(.72rem,.9vw,.86rem)",letterSpacing:".24em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:12}}>El Violín de Ceci</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2.2rem,5vw,5rem)",fontWeight:700,color:"#1A1A14",margin:"0 auto 10px",lineHeight:1.05,letterSpacing:"-.01em",maxWidth:720}}>
        La Banda Sonora<br/><span style={{color:"#C9A96E"}}>de tu Boda</span>
      </h1>
      <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(1rem,1.6vw,1.25rem)",color:"rgba(26,26,20,.55)",margin:"0 auto",lineHeight:1.55,fontStyle:"italic",maxWidth:580}}>Qué funciona en cada momento — y por qué</p>
    </div>

    {/* Tab bar — horizontal scroll en mobile, centrado en desktop */}
    <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(245,239,224,.96)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderBottom:"0.5px solid rgba(201,169,110,.2)",paddingBottom:0}}>
      <div ref={tabRef} className="tabs-scroll-container" style={{display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",padding:"0 12px",justifyContent:"flex-start",flexWrap:"nowrap"}}>
        {tabs.map(k=>{
          const m=CANCIONES_POR_MOMENTO[k];
          const active=tab===k;
          return <button key={k} data-tab={k} onClick={()=>scrollTab(k)} style={{
            display:"inline-flex",alignItems:"center",gap:6,padding:"13px 16px",
            border:"none",borderBottom:`2.5px solid ${active?"#4A5E3A":"transparent"}`,
            background:active?"rgba(74,94,58,.06)":"transparent",
            cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
            fontFamily:"'Lora',serif",fontWeight:active?700:500,fontSize:"clamp(.8rem,.85vw,.92rem)",
            color:active?"#4A5E3A":"rgba(26,26,20,.5)",transition:"all .2s",
            borderRadius:active?"8px 8px 0 0":"0"
          }}>
            <span style={{fontSize:"1rem"}}>{m.icono}</span>
            <span>{m.titulo}</span>
          </button>;
        })}
      </div>
      {/* Scroll hint */}
      <div style={{textAlign:"center",fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.35)",padding:"4px 0 8px",fontStyle:"italic"}}>
        ← Deslizá para ver todos los momentos →
      </div>
    </div>

    {/* Main content — single column on mobile, two on desktop */}
    <div style={{maxWidth:1100,margin:"0 auto",padding:"clamp(16px,4vw,40px) clamp(12px,4vw,48px) 0"}}>
      <div className="desktop-guide-grid" style={{display:"grid",gap:"clamp(16px,3vw,36px)",alignItems:"start"}}>

        {/* LEFT — Momento actual */}
        <div key={tab} style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.28)",borderRadius:18,overflow:"hidden"}}>

          {/* Momento header */}
          <div style={{background:"#4A5E3A",padding:"18px 22px 16px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:6}}>Criterio de Ceci</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.4rem,2.5vw,1.85rem)",fontWeight:600,color:"#F5EFE0",margin:0,lineHeight:1.15}}>{momento.icono} {momento.titulo}</h2>
          </div>

          {/* Momento body */}
          <div style={{padding:"clamp(16px,3vw,28px)"}}>
            <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(1rem,1.2vw,1.12rem)",color:"rgba(26,26,20,.72)",lineHeight:1.75,margin:"0 0 16px"}}>{momento.guia}</p>

            {/* Error frecuente */}
            <div style={{background:"rgba(201,169,110,.08)",border:"0.5px solid rgba(201,169,110,.35)",borderRadius:10,padding:"12px 16px",marginBottom:22,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{flexShrink:0,fontSize:"1rem",marginTop:2}}>⚠️</span>
              <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(.9rem,1vw,1rem)",color:"rgba(26,26,20,.65)",margin:0,lineHeight:1.55}}>{momento.errores}</p>
            </div>

            {/* Canciones */}
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:14}}>Las más pedidas por los novios</div>
            {momento.canciones.map((c,i)=>{
              const q=encodeURIComponent(c.t+" "+c.a);
              return <div key={i} style={{padding:"14px 0",borderBottom:i<momento.canciones.length-1?"0.5px solid rgba(201,169,110,.18)":"none"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:8}}>
                  <div style={{width:24,height:24,minWidth:24,borderRadius:"50%",background:"rgba(74,94,58,.1)",border:"0.5px solid rgba(74,94,58,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".78rem",color:"#4A5E3A",flexShrink:0,marginTop:2}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.05rem,1.4vw,1.25rem)",color:"#1A1A14",lineHeight:1.2,marginBottom:2}}>{c.t}</div>
                    <div style={{fontFamily:"'Lora',serif",fontSize:"clamp(.9rem,1.1vw,1rem)",color:"rgba(26,26,20,.55)",marginBottom:4}}>{c.a}</div>
                    <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(74,94,58,.7)",fontStyle:"italic",lineHeight:1.5}}>"{c.n}"</div>
                  </div>
                </div>
                <div style={{paddingLeft:36,display:"flex",gap:8,alignItems:"center"}}>
                  <AudioButton cancion={c.t} artista={c.a}/>
                  <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".78rem",padding:"5px 10px"}}>YT</a>
                </div>
              </div>;
            })}
          </div>
        </div>

        {/* RIGHT — Tips + CTA */}
        <div>
          {/* 5 reglas */}
          <div style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.25)",borderRadius:18,padding:"clamp(18px,2.5vw,28px)",marginBottom:16}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:18}}>5 reglas de Ceci para elegir bien</div>
            {GUIA_TIPS.map((tip,i)=><div key={i} style={{display:"flex",gap:14,paddingBottom:i<4?16:0,borderBottom:i<4?"0.5px solid rgba(74,94,58,.1)":"none",marginBottom:i<4?16:0}}>
              <div style={{width:28,height:28,minWidth:28,borderRadius:"50%",background:"rgba(74,94,58,.08)",border:"0.5px solid rgba(74,94,58,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:700,color:"#4A5E3A",flexShrink:0,marginTop:2}}>{i+1}</div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1rem,1.15vw,1.1rem)",color:"#1A1A14",marginBottom:4,lineHeight:1.25,fontWeight:600}}>{tip.t}</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:"clamp(.9rem,1vw,.98rem)",color:"rgba(26,26,20,.62)",lineHeight:1.65}}>{tip.d}</div>
              </div>
            </div>)}
          </div>

          {/* CTA */}
          <div style={{background:"#4A5E3A",border:"0.5px solid rgba(201,169,110,.3)",borderRadius:18,padding:"clamp(22px,3vw,32px)",textAlign:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:12}}>El siguiente nivel</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.4rem,2.2vw,1.85rem)",fontWeight:600,color:"#F5EFE0",margin:"0 0 12px",lineHeight:1.15}}>Hacé el test personalizado</h3>
            <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(.95rem,1.1vw,1.06rem)",color:"rgba(245,239,224,.65)",lineHeight:1.65,margin:"0 0 22px"}}>La guía te da el criterio general. El test crea el guion musical exacto para tu boda — con tu arquetipo, tus momentos y el checklist para tus proveedores.</p>
            <button style={{background:"#C9A96E",color:"#1A1A14",border:"none",padding:"14px 28px",fontFamily:"'Lora',serif",fontSize:"1rem",fontWeight:700,letterSpacing:".04em",borderRadius:100,cursor:"pointer",width:"100%"}} onClick={onStart}>Crear mi guion personalizado →</button>
            <p style={{marginTop:10,fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(245,239,224,.4)"}}>15 minutos · Resultado inmediato</p>
          </div>
        </div>
      </div>
<BackToHome onBack={onBack}/>
    </div>
  </div>;
}
function calcularArquetipo(form){
  const s={cinematograficos:0,clasicos:0,modernos:0,intimos:0,festivos:0,luxury:0};
  const est=form.palabrasEstilo||[];
  const obj=form.objetivoEmocional||"";
  const per=form.personalidad||"";
  if(est.includes("Cinematográfica"))s.cinematograficos+=3;
  if(est.includes("Elegante"))s.clasicos+=2;
  if(est.includes("Moderna"))s.modernos+=3;
  if(est.includes("Íntima"))s.intimos+=3;
  if(est.includes("Alegre")||est.includes("Festiva"))s.festivos+=3;
  if(est.includes("Luxury"))s.luxury+=3;
  if(est.includes("Romántica"))s.clasicos+=2;
  if(est.includes("Clásica"))s.clasicos+=2;
  if(est.includes("Bohemia"))s.intimos+=2;
  if(obj.includes("película"))s.cinematograficos+=3;
  if(obj.includes("lloren"))s.clasicos+=2;
  if(obj.includes("Moderno"))s.modernos+=3;
  if(obj.includes("ntimo"))s.intimos+=3;
  if(obj.includes("Festivo"))s.festivos+=3;
  if(obj.includes("Clásico"))s.clasicos+=2;
  if(per.includes("película"))s.cinematograficos+=2;
  if(per.includes("ntima")||per.includes("pequeña"))s.intimos+=2;
  if(per.includes("ujo"))s.luxury+=2;
  if(per.includes("fiesta")||per.includes("arranca"))s.festivos+=2;
  if(per.includes("diferente"))s.modernos+=2;
  const inv=form.invitados||"";
  if(inv==="Menos de 30")s.intimos+=2;
  if(inv==="Más de 250")s.luxury+=1;
  return Object.entries(s).sort((a,b)=>b[1]-a[1])[0][0];
}

// Momentos por tipo de ceremonia
const MOMENTOS_CIVIL_SIMBOLICA = [
  {id:"llegada",icono:"🕯️",nombre:"Llegada de invitados",emocion:"Anticipación y atmósfera",desc:"Prepara el corazón de los invitados antes de que empiece todo. Crea el ambiente sin robar protagonismo.",duracion:"20–40 min antes"},
  {id:"cortejo",icono:"🌸",nombre:"Entrada del cortejo / familiares",emocion:"Calidez y comienzo",desc:"Padres, padrinos, damas. La música aquí es suave y prepara para lo que viene.",duracion:"2–4 min"},
  {id:"novio",icono:"🤵",nombre:"Entrada del novio",emocion:"Solidez y emoción contenida",desc:"Muchos novios no saben qué hacer en este momento. La música correcta los sostiene y le dice a todos: esto ya empezó.",duracion:"1–2 min"},
  {id:"novia",icono:"👰",nombre:"Entrada de la novia ★",emocion:"El momento más recordado de toda la boda",desc:"La canción elegida para este momento es la que van a escuchar el resto de su vida y volver a ese instante. No puede ser genérica.",duracion:"1.5–3 min"},
  {id:"votos",icono:"💍",nombre:"Durante la ceremonia / votos",emocion:"Contemplación y profundidad",desc:"La música no puede competir con la palabra. Tiene que sostenerla sin robarle protagonismo. Preferentemente instrumental.",duracion:"Según la ceremonia"},
  {id:"alianzas",icono:"💞",nombre:"Intercambio de anillos",emocion:"Romance y promesa",desc:"Es breve pero cargado de peso emocional: se intercambian los anillos y llega el primer beso. La música eleva ese 'ya está, somos uno'.",duracion:"~1 min"},
  {id:"salida",icono:"🎊",nombre:"Salida de los novios",emocion:"Primera celebración juntos",desc:"Acaban de decirse que sí. Puede subir la energía para arrancar la fiesta o ser un momento íntimo de transición.",duracion:"2–3 min"},
  {id:"fotos",icono:"📸",nombre:"Fotos después de la ceremonia",emocion:"Cambio de tono — alegría y celebración",desc:"Termina la ceremonia oficial y las vibras cambian totalmente: ya están casados, ahora es para celebrar. Música enérgica mientras se sacan las fotos.",duracion:"5–10 min"},
  {id:"primer_baile",icono:"💃",nombre:"Primer baile",emocion:"Su historia, su momento",desc:"El primer baile como casados. Muchas parejas eligen su 'canción especial' — la que significa algo solo para ellos. Es el momento más personal de toda la boda.",duracion:"3–5 min"},
];

const MOMENTOS_CATOLICA = [
  {id:"llegada",icono:"🕯️",nombre:"Llegada de invitados",emocion:"Recogimiento y anticipación",desc:"En una iglesia católica, la atmósfera es distinta. La música debe crear un ambiente sagrado y respetuoso.",duracion:"20–40 min antes"},
  {id:"cortejo",icono:"🌸",nombre:"Entrada del cortejo / familiares",emocion:"Procesión solemne",desc:"Familiares y padrinos entran. Música suave, respetuosa con el espacio litúrgico.",duracion:"2–4 min"},
  {id:"novio",icono:"🤵",nombre:"Entrada del novio",emocion:"Solemnidad y presencia",desc:"El novio entra al espacio sagrado. La música lo acompaña con dignidad.",duracion:"1–2 min"},
  {id:"novia",icono:"👰",nombre:"Entrada de la novia ★",emocion:"El momento más recordado — sagrado y emotivo",desc:"En la iglesia, la entrada de la novia tiene un peso especial. La música debe respetar el espacio pero también honrar la emoción.",duracion:"1.5–3 min"},
  {id:"aleluya",icono:"✨",nombre:"Aleluya / antes del Evangelio",emocion:"Celebración litúrgica",desc:"⚠️ Momento litúrgico obligatorio. Debe ser el Aleluya u otro himno aprobado por la iglesia. No se puede reemplazar por música secular.",duracion:"1–2 min",obligatorio:true},
  {id:"ofertorio",icono:"🙏",nombre:"Ofertorio",emocion:"Ofrenda y recogimiento",desc:"Durante la preparación del altar. Música sacra, suave, que acompaña sin distraer.",duracion:"3–5 min"},
  {id:"comunion",icono:"🕊️",nombre:"Comunión",emocion:"Paz y profundidad espiritual",desc:"Momento de mayor recogimiento de la misa. La música debe ser sacra o en algunos casos se permite música más suave y contemplativa.",duracion:"5–10 min"},
  {id:"alianzas",icono:"💞",nombre:"Intercambio de anillos",emocion:"Romance y promesa",desc:"Es breve pero cargado de peso emocional: se intercambian los anillos y llega el primer beso de casados. La música eleva ese 'ya está, somos uno'.",duracion:"~1 min"},
  {id:"firmas",icono:"📜",nombre:"Firma de las actas",emocion:"Intimidad y detalle",desc:"Mientras los novios firman. Elegí 1 canción por cada 3 testigos — si hay 6 testigos, necesitás al menos 2 canciones de 3 minutos cada una. Un momento íntimo que puede llenarse con música suave.",duracion:"3–8 min (según testigos)"},
  {id:"salida",icono:"🎊",nombre:"Salida de los novios",emocion:"Alegría y celebración",desc:"La iglesia permite más libertad en la salida. Es el primer momento de alegría compartida.",duracion:"2–3 min"},
  {id:"fotos",icono:"📸",nombre:"Fotos en el altar",emocion:"Cambio de tono — alegría y celebración",desc:"Termina la ceremonia oficial y las vibras cambian totalmente: ya están casados, ahora es para celebrar. Música enérgica mientras se sacan las fotos.",duracion:"5–10 min"},
  {id:"primer_baile",icono:"💃",nombre:"Primer baile",emocion:"Su historia, su momento",desc:"El primer baile como casados. Muchas parejas eligen su 'canción especial' — la que significa algo solo para ellos. Es el momento más personal de toda la boda.",duracion:"3–5 min"},
];

const ESTILOS=["Romántica","Elegante","Íntima","Alegre","Moderna","Clásica","Bohemia","Luxury","Vintage","Emotiva","Festiva","Cinematográfica"];
const GENEROS=["Pop","Rock","Clásica","Jazz","Bossa Nova","Soul/R&B","Indie","Latina/Flamenco","Bandas de película","Folk","Tango","Ópera"];
const FORMATOS=["DJ","Violín en vivo","Banda","Cuarteto cuerdas","Piano","Cantante","Solo grabada","No sé aún"];
const OBJETIVOS=[
  {e:"😢",l:"Que todos lloren de emoción"},{e:"🎬",l:"Que parezca una película"},
  {e:"✨",l:"Moderno y diferente"},{e:"🕊️",l:"Íntimo y suave"},
  {e:"🎉",l:"Festivo desde el inicio"},{e:"💎",l:"Clásico y atemporal"}
];

const CHECKLIST_BASE={
  planner:["Compartir el guion musical con al menos 3 semanas de anticipación","Alinear el timing musical con el timeline fotográfico","Confirmar posición del fotógrafo para la entrada de la novia","Definir señales de comunicación entre coordinador y músicos","Tener un plan B para cortes de luz o problemas técnicos"],
  dj:["Enviar nombre exacto de canción, artista y versión específica para cada momento","Indicar el segundo exacto de inicio — no siempre desde el principio de la canción","Confirmar quién da la señal de inicio para cada momento","Pedir confirmación de que tiene todas las canciones antes del evento","Acordar playlist de backup para imprevistos","Confirmar equipo de sonido y potencia en el lugar"],
  musicos:["Enviar la lista con al menos 2 semanas de anticipación","Confirmar que conocen cada pieza — pedir grabación si es músico nuevo","Confirmar si toca con partitura o de memoria","Acordar vestimenta, hora de llegada y espacio en el lugar","Hacer prueba de sonido antes de que lleguen los invitados"],
  iglesia:["Reunirse con el sacerdote para confirmar qué canciones están permitidas","Confirmar qué momentos litúrgicos requieren música específica (Aleluya, Comunión)","Verificar si el órgano o piano de la iglesia está disponible","Confirmar si músico externo puede tocar — algunas iglesias no lo permiten","Consultar si hay ensayo disponible en el recinto"],
  pareja:["Escuchar la canción de entrada 10 veces y confirmar que genera la emoción buscada","Verificar que la duración de cada canción se ajusta al momento real","Compartir este guion con todos los proveedores antes de fin de mes","Crear playlist de Spotify como respaldo con todas las canciones en orden","No cambiar canciones en los últimos 7 días — confiar en lo que eligieron","El día del evento: llegar con tiempo para confirmar que todo suena bien"],
};

const CLAUDE_MODEL = "claude-sonnet-4-6";
const LOCAL_API_URL = (() => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    return isLocal ? "http://127.0.0.1:3001/api/generate" : "/api/generate";
  }
  return "/api/generate";
})();


const extractJsonObject = (value) => {
  const txt = String(value || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude no devolvió JSON válido.");
  }

  return txt.slice(start, end + 1);
};

const parseJsonStrict = (text) => JSON.parse(extractJsonObject(text));

const callClaudeRaw = async (prompt, maxTokens = 2000) => {
  if(!supabase) throw new Error("No pudimos verificar tu acceso.");
  const { data: { session } } = await supabase.auth.getSession();
  if(!session?.access_token) throw new Error("Necesitás iniciar sesión con el email de compra.");
  const r = await fetch(LOCAL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const raw = await r.text();

  if (!raw) {
    throw new Error("No pudimos conectar con el servidor. Intentá de nuevo.");
  }

  let d;
  try {
    d = JSON.parse(raw);
  } catch (err) {
    console.error("Respuesta no válida del servidor:", raw);
    throw new Error("Hubo un problema al generar el guion. Tocá \"Crear mi guion\" de nuevo.");
  }

  if (!r.ok) {
    throw new Error(d?.error?.message || "Error llamando a Claude.");
  }

  if (d.error) {
    throw new Error(d.error.message || "Error de Claude.");
  }

  const textBlocks = Array.isArray(d.content)
    ? d.content.filter(block => block?.type === "text" && block?.text)
    : [];

  const txt = textBlocks.map(block => block.text).join("\n").trim();

  if (!txt) {
    console.error("Respuesta completa de Claude:", d);
    throw new Error("Claude respondió vacío.");
  }

  return txt;
};

const callAI = async (prompt, maxTokens = 2000) => {
  const strictPrompt = `
Respondé únicamente con JSON válido y parseable con JSON.parse().
No uses markdown.
No uses explicaciones.
No uses comentarios.
No agregues texto antes ni después del JSON.
Usá solamente comillas dobles válidas.
No uses comillas internas dentro de los textos. Si necesitás énfasis, usá guiones o paréntesis.
No cortes el JSON.
Devolvé un solo objeto JSON.

PROMPT:
${prompt}
`;

  const txt = await callClaudeRaw(strictPrompt, maxTokens);

  try {
    return parseJsonStrict(txt);
  } catch (firstError) {
    console.warn("Primer JSON inválido. Intentando reparar con Claude...");
    console.error("JSON inválido recibido:", txt);

    const repairPrompt = `
Convertí este contenido en un objeto JSON válido y parseable con JSON.parse().
Respondé únicamente el JSON.
No uses markdown.
No expliques nada.
No agregues texto fuera del JSON.
Mantené la misma estructura y los mismos datos cuando sea posible.
Si un texto tiene comillas internas, reemplazalas por apóstrofes o eliminá esas comillas internas.

CONTENIDO A REPARAR:
${txt}
`;

    const repaired = await callClaudeRaw(repairPrompt, Math.max(maxTokens, 2500));

    try {
      return parseJsonStrict(repaired);
    } catch (secondError) {
      console.error("JSON reparado inválido:", repaired);
      throw new Error("El resultado no llegó completo. Tocá \"Crear mi guion\" de nuevo.");
    }
  }
};

const callAIWithRetry = async (prompt, maxTokens=2000) => {
  try {
    return await callAI(prompt, maxTokens);
  } catch (e) {
    console.warn("Primer intento fallido, reintentando...", e.message);
    await new Promise(r => setTimeout(r, 1500));
    return await callAI(prompt, maxTokens);
  }
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

function Tag({label,selected,onClick}){return <span className={`tag${selected?" sel":""}`} onClick={onClick}>{label}</span>}
function Pill({label,emoji,selected,onClick}){return <div className={`pill${selected?" sel":""}`} onClick={onClick}>{emoji&&<span>{emoji}</span>}{label}</div>}
function FL({children}){return <div className="fl">{children}</div>}
function SL({n,l,sub}){return <div style={{marginBottom:24}}><div className="sl-n">Paso {n} de 6</div><h2 className="sl-t">{l}</h2>{sub&&<p className="sl-s">{sub}</p>}</div>}

function Progress({step}){
  return <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:34}}>
    {Array.from({length:6}).map((_,i)=>(<div key={i} style={{width:i===step-1?24:6,height:5,borderRadius:3,background:i<step?G:"rgba(74,94,58,.08)",transition:"all .35s"}}/>))}
  </div>;
}

function downloadBrowserFile(url, filename){
  if(typeof document === "undefined") return;
  const link=document.createElement("a");
  link.href=url;
  link.download=filename||"";
  link.rel="noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function GuideLeadModal({open,onClose}){
  const [email,setEmail]=useState("");
  const [consent,setConsent]=useState(false);
  const [loading,setLoading]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");
  const submittedRef=useRef(false);
  const completedRef=useRef(false);
  const frameNameRef=useRef(`hotmart-send-${Math.random().toString(36).slice(2)}`);

  useEffect(()=>{
    if(!open) return;
    setError("");
    trackProductEvent("free_guide_modal_opened", {source:"landing"});
  },[open]);

  if(!open) return null;

  const finish=()=>{
    if(completedRef.current) return;
    completedRef.current=true;
    setLoading(false);
    setSent(true);
    trackProductEvent("free_guide_requested", {form_id:HOTMART_SEND_FORM_ID});
    downloadBrowserFile(FREE_GUIDE_URL,"Nos-comprometimos-y-ahora-que-GUIA-GRATUITA.pdf");
  };

  const submit=(event)=>{
    setError("");
    const cleanEmail=email.toLowerCase().trim();
    if(!cleanEmail || !cleanEmail.includes("@")){
      event.preventDefault();
      return setError("Escribí un email válido para recibir la guía.");
    }
    if(!consent){
      event.preventDefault();
      return setError("Necesitamos tu autorización para enviarte la guía por email.");
    }
    submittedRef.current=true;
    completedRef.current=false;
    setLoading(true);

    // El formulario se envía directamente a Hotmart Send sin captcha.
    // La descarga se habilita cuando el iframe recibe la respuesta de Hotmart.
    window.setTimeout(()=>{
      if(!completedRef.current){
        setLoading(false);
        setError("Hotmart está tardando más de lo esperado. Volvé a intentarlo con otro email.");
      }
    },12000);
  };

  const actionUrl=(()=>{
    try{
      const url=new URL(HOTMART_SEND_ACTION);
      const params=captureMarketingParams();
      MARKETING_PARAM_NAMES.forEach(name=>{ if(params[name]) url.searchParams.set(name,params[name]); });
      return url.toString();
    }catch(e){ return HOTMART_SEND_ACTION; }
  })();

  return <div onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)onClose();}} style={{position:"fixed",inset:0,zIndex:10060,background:"rgba(18,18,14,.68)",backdropFilter:"blur(7px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <iframe title="Confirmación de guía" name={frameNameRef.current} onLoad={()=>{if(submittedRef.current)finish();}} style={{display:"none"}}/>
    <div className="fu" style={{width:"100%",maxWidth:760,maxHeight:"calc(100dvh - 32px)",overflowY:"auto",background:"#FBF7EF",borderRadius:24,boxShadow:"0 30px 90px rgba(0,0,0,.38)",position:"relative",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))"}}>
      <button type="button" aria-label="Cerrar" disabled={loading} onClick={onClose} style={{position:"absolute",right:14,top:12,zIndex:2,width:40,height:40,borderRadius:999,border:"1px solid rgba(26,26,20,.13)",background:"rgba(251,247,239,.95)",cursor:"pointer",fontSize:"1.25rem"}}>×</button>

      <div style={{background:"#173F49",padding:"clamp(22px,4vw,34px)",display:"flex",alignItems:"center",justifyContent:"center",minHeight:360}}>
        <img src="/guias/portada-guia-gratuita.png" alt="Portada de la guía gratuita Nos comprometimos, ¿y ahora qué?" style={{width:"100%",maxWidth:270,height:"auto",borderRadius:4,boxShadow:"0 18px 45px rgba(0,0,0,.28)"}}/>
      </div>

      <div style={{padding:"clamp(28px,5vw,44px)",alignSelf:"center"}}>
        {!sent?<>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(239,82,67,.1)",border:"1px solid rgba(239,82,67,.25)",borderRadius:999,padding:"7px 12px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"#B5443A",marginBottom:14}}>PDF gratuito · 12 páginas</div>
          <h2 className="brand-title" style={{fontSize:"clamp(1.75rem,5vw,2.45rem)",lineHeight:1.08,margin:"0 0 12px"}}>Los primeros pasos que nadie te explica después del “sí”</h2>
          <p className="brand-copy" style={{fontSize:".98rem",lineHeight:1.62,margin:"0 0 16px"}}>Una guía express para saber qué hacer primero, qué puede esperar y qué conversaciones conviene tener antes de empezar a reservar.</p>
          <div style={{display:"grid",gap:8,marginBottom:18,fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.7)"}}>
            <span>✓ Qué hacer durante las primeras semanas</span>
            <span>✓ Cómo definir prioridades en pareja</span>
            <span>✓ Detalles que suelen olvidarse</span>
          </div>

          <form klicksend-form-id={HOTMART_SEND_FORM_ID} autoComplete="off" method="post" action={actionUrl} target={frameNameRef.current} onSubmit={submit}>
            <label htmlFor="guide-email" style={{display:"block",fontFamily:"'Lora',serif",fontSize:".82rem",fontWeight:700,color:"#4A5E3A",marginBottom:4}}>¿Dónde te enviamos la guía?</label>
            <input id="guide-email" type="email" autoComplete="email" name="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required style={{marginBottom:4}}/>
            <div className="guide-consent-row">
              <input type="checkbox" autoComplete="off" name="gdpr" id="guide-gdpr" value="Acepto recibir la guía y los emails" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>
              <label htmlFor="guide-gdpr" style={{fontFamily:"'Lora',serif",fontSize:".74rem",lineHeight:1.48,color:"rgba(26,26,20,.56)"}}>Acepto recibir por email la guía gratuita “Nos comprometimos, ¿y ahora qué?”, consejos y novedades de El Violín de Ceci. Puedo darme de baja cuando quiera.</label>
            </div>
            <div style={{position:"absolute",left:-5000}} aria-hidden="true"><input type="text" autoComplete="new-password" name={`b_${HOTMART_SEND_FORM_ID}`} tabIndex="-1" defaultValue=""/></div>
            {error&&<p role="alert" style={{fontFamily:"'Lora',serif",fontSize:".84rem",color:"#B5443A",lineHeight:1.45,margin:"0 0 12px"}}>{error}</p>}
            <button klicksend-form-submit-id={HOTMART_SEND_FORM_ID} className="pbtn" disabled={loading} type="submit" style={{width:"100%",whiteSpace:"normal",background:"#E95A4E",boxShadow:"0 10px 26px rgba(233,90,78,.24)"}}>{loading?"Registrando tu email...":"Enviar y descargar mi guía gratis →"}</button>
          </form>
          <p style={{fontFamily:"'Lora',serif",fontSize:".72rem",color:"rgba(26,26,20,.42)",lineHeight:1.45,textAlign:"center",margin:"11px 0 0"}}>Sin costo. Sin tarjeta. Recibirás la guía y contenidos relacionados con la organización de tu boda.</p>
        </>:<div style={{textAlign:"center"}}>
          <div style={{fontSize:"2.8rem",marginBottom:12}}>💌</div>
          <h2 className="brand-title" style={{fontSize:"clamp(1.8rem,5vw,2.35rem)",margin:"0 0 10px"}}>Tu guía ya está lista</h2>
          <p className="brand-copy" style={{fontSize:"1rem",margin:"0 0 20px"}}>La descarga comenzó y también te la enviaremos por email para que puedas volver a encontrarla.</p>
          <button type="button" className="pbtn" onClick={()=>downloadBrowserFile(FREE_GUIDE_URL,"Nos-comprometimos-y-ahora-que-GUIA-GRATUITA.pdf")} style={{width:"100%",marginBottom:10}}>Descargar nuevamente</button>
          <button type="button" className="gbtn" onClick={onClose} style={{width:"100%"}}>Seguir conociendo la app</button>
        </div>}
      </div>
    </div>
  </div>;
}

async function openFullGuideDownload(source="unknown"){
  let newTab=null;
  try{
    if(typeof window!=="undefined"){
      newTab=window.open("about:blank","_blank");
      if(newTab) newTab.opener=null;
    }
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("Tu sesión venció. Volvé a ingresar para descargar la guía.");
    const response=await fetch(FULL_GUIDE_ENDPOINT,{headers:{Authorization:`Bearer ${session.access_token}`}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok || !payload?.url) throw new Error(payload?.error||"No pudimos preparar la descarga.");
    trackProductEvent("full_guide_downloaded",{source});
    if(newTab) newTab.location.href=payload.url;
    else window.location.href=payload.url;
    return true;
  }catch(e){
    try{ if(newTab&&!newTab.closed) newTab.close(); }catch(_e){}
    throw e;
  }
}

function FullGuideDownloadCard({source="guide_module"}){
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

function FullGuideLockedCard({onRequestPurchase}){
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


async function getExcelTemplateDownloadPayload(templateId){
  const template=EXCEL_TEMPLATES[templateId];
  if(!template) throw new Error("La plantilla solicitada no existe.");

  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token) throw new Error("Tu sesión venció. Volvé a ingresar para descargar el Excel.");

  const response=await fetch(`${EXCEL_DOWNLOAD_ENDPOINT}?file=${encodeURIComponent(templateId)}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok || !payload?.url) throw new Error(payload?.error||"No pudimos preparar el archivo Excel.");
  return payload;
}

async function openExcelTemplateDownload(templateId, source="unknown"){
  let newTab=null;
  try{
    if(typeof window!=="undefined"){
      newTab=window.open("about:blank","_blank");
      if(newTab) newTab.opener=null;
    }

    const payload=await getExcelTemplateDownloadPayload(templateId);
    trackProductEvent("excel_template_downloaded",{source,template:templateId});

    if(newTab) newTab.location.href=payload.url;
    else window.location.href=payload.url;
    return true;
  }catch(e){
    try{ if(newTab&&!newTab.closed) newTab.close(); }catch(_e){}
    throw e;
  }
}

async function loadPrivateExcelTemplateWorkbook(templateId, XL){
  const payload=await getExcelTemplateDownloadPayload(templateId);
  const response=await fetch(payload.url,{cache:"no-store"});
  if(!response.ok) throw new Error("No pudimos leer la plantilla privada.");
  const buffer=await response.arrayBuffer();
  return XL.read(buffer,{type:"array",cellStyles:true,cellDates:true});
}

function replaceTemplateTableRows(XL,workbook,sheetName,rows,options={}){
  let worksheet=workbook.Sheets[sheetName];
  if(!worksheet){
    worksheet=XL.utils.aoa_to_sheet([]);
    workbook.SheetNames.unshift(sheetName);
    workbook.Sheets[sheetName]=worksheet;
  }

  const columns=options.columns||8;
  const minimumRows=Math.max(options.minimumRows||60,rows.length,2);
  let existingEndRow=minimumRows-1;

  try{
    if(worksheet["!ref"]){
      const decoded=XL.utils.decode_range(worksheet["!ref"]);
      existingEndRow=Math.max(existingEndRow,decoded.e.r);
    }
  }catch(e){}

  const finalRows=Math.max(minimumRows,existingEndRow+1);

  for(let rowIndex=0;rowIndex<finalRows;rowIndex++){
    for(let columnIndex=0;columnIndex<columns;columnIndex++){
      const address=XL.utils.encode_cell({r:rowIndex,c:columnIndex});
      const previous=worksheet[address]||{};
      const value=rows[rowIndex]?.[columnIndex]??"";
      const next={...previous};

      delete next.f;
      delete next.F;
      delete next.w;

      if(value===null || value===""){
        next.t="s";
        next.v="";
      }else if(typeof value==="number" && Number.isFinite(value)){
        next.t="n";
        next.v=value;
      }else if(typeof value==="boolean"){
        next.t="b";
        next.v=value;
      }else{
        next.t="s";
        next.v=String(value);
      }

      worksheet[address]=next;
    }
  }

  worksheet["!ref"]=`A1:${XL.utils.encode_col(columns-1)}${finalRows}`;
  worksheet["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
  worksheet["!autofilter"]={ref:`A1:${XL.utils.encode_col(columns-1)}${Math.max(rows.length,2)}`};

  if(Array.isArray(worksheet["!tables"])){
    worksheet["!tables"]=worksheet["!tables"].map((table,index)=>({
      ...table,
      name:table.name||options.tableName||`Tabla${sheetName.replace(/\W/g,"")}${index+1}`,
      displayName:table.displayName||options.tableName||`Tabla${sheetName.replace(/\W/g,"")}${index+1}`,
      ref:`A1:${XL.utils.encode_col(columns-1)}${finalRows}`
    }));
  }

  return worksheet;
}

function ensureExcelHowToSheet(XL,workbook,type){
  if(workbook.SheetNames.includes("Cómo usar")) return;

  const isGuests=type==="guests";
  const rows=isGuests
    ? [
        ["El Violín de Ceci"],
        ["Lista de invitados"],
        [""],
        ["Cómo usar este archivo"],
        ["1. Completá o editá la hoja «Invitados» sin cambiar los encabezados."],
        ["2. La única columna obligatoria es «Nombre»."],
        ["3. Guardá el archivo como .xlsx y volvé a importarlo desde Invitados."],
        ["4. También podés exportar desde la app y volver a importar ese mismo archivo."],
        [""],
        ["Columnas: Nombre | Personas | Mesa | Lado | Parentesco | Confirmacion | Restriccion | Notas"]
      ]
    : [
        ["El Violín de Ceci"],
        ["Lista de proveedores"],
        [""],
        ["Cómo usar este archivo"],
        ["1. Completá o editá la hoja «Proveedores» sin cambiar los encabezados."],
        ["2. La única columna obligatoria es «Nombre»."],
        ["3. Guardá el archivo como .xlsx y volvé a importarlo desde Proveedores."],
        ["4. También podés exportar desde la app y volver a importar ese mismo archivo."],
        [""],
        ["Columnas: Categoria | Nombre | Contacto | Precio | Moneda | Estado | Link | Notas"]
      ];

  const guide=XL.utils.aoa_to_sheet(rows);
  guide["!cols"]=[{wch:100}];
  XL.utils.book_append_sheet(workbook,guide,"Cómo usar");
}

function ExcelAccessPanel({templateIds=[],isDemo=false,onRequestPurchase,source="unknown",withNav=true}){
  const [activeDownload,setActiveDownload]=useState("");
  const [error,setError]=useState("");
  const teaserKey=`tbo_excel_teaser_closed:${source}`;
  const paidTeaserKey="tbo_excel_paid_teaser_closed";
  const [demoTeaserOpen,setDemoTeaserOpen]=useState(()=>{
    if(!isDemo || typeof window==="undefined") return true;
    try{return sessionStorage.getItem(teaserKey)!=="1";}catch(e){return true;}
  });
  const [paidTeaserOpen,setPaidTeaserOpen]=useState(()=>{
    if(isDemo || typeof window==="undefined") return true;
    try{return sessionStorage.getItem(paidTeaserKey)!=="1";}catch(e){return true;}
  });
  const [paidExpanded,setPaidExpanded]=useState(false);
  const templates=templateIds.map(id=>({id,...EXCEL_TEMPLATES[id]})).filter(item=>item.title);

  if(!templates.length) return null;

  const download=async(id)=>{
    setError("");
    setActiveDownload(id);
    try{ await openExcelTemplateDownload(id,source); }
    catch(e){ setError(e.message||"No pudimos preparar el archivo Excel."); }
    finally{ setActiveDownload(""); }
  };

  const closeDemoTeaser=()=>{
    try{sessionStorage.setItem(teaserKey,"1");}catch(e){}
    setDemoTeaserOpen(false);
    trackProductEvent("excel_demo_teaser_closed",{source});
  };

  const reopenDemoTeaser=()=>{
    try{sessionStorage.removeItem(teaserKey);}catch(e){}
    setDemoTeaserOpen(true);
    trackProductEvent("excel_demo_teaser_reopened",{source});
  };

  const openExcelPurchase=()=>{
    trackProductEvent("excel_demo_purchase_opened",{source,templates:templates.map(item=>item.id).join(",")});
    onRequestPurchase?.();
  };

  const closePaidTeaser=()=>{
    try{sessionStorage.setItem(paidTeaserKey,"1");}catch(e){}
    setPaidTeaserOpen(false);
    setPaidExpanded(false);
    trackProductEvent("excel_paid_teaser_closed",{source});
  };

  const reopenPaidTeaser=()=>{
    setPaidTeaserOpen(true);
    setPaidExpanded(false);
    trackProductEvent("excel_paid_teaser_reopened",{source});
  };

  if(isDemo){
    const singular=templates.length===1;

    if(!demoTeaserOpen){
      return <div className="no-print" style={{width:"min(calc(100% - 24px),960px)",margin:"8px auto 14px",textAlign:"center"}}>
        <button
          type="button"
          onClick={reopenDemoTeaser}
          style={{border:0,background:"transparent",padding:"5px 8px",fontFamily:"'Lora',serif",fontSize:".72rem",lineHeight:1.35,color:"rgba(74,94,58,.78)",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"}}
        >
          ¿Preferís organizarte en Excel?
        </button>
      </div>;
    }

    return <aside className="no-print" aria-label="Plantillas Excel incluidas con la compra" style={{position:"relative",width:"min(calc(100% - 24px),420px)",margin:"10px auto 14px",padding:"13px 42px 12px 14px",background:"rgba(255,253,248,.97)",border:"1px solid rgba(201,169,110,.42)",borderRadius:16,boxShadow:"0 10px 28px rgba(63,50,31,.11)"}}>
      <button
        type="button"
        aria-label="Cerrar aviso sobre plantillas Excel"
        onClick={closeDemoTeaser}
        style={{position:"absolute",right:8,top:8,width:28,height:28,display:"grid",placeItems:"center",border:"1px solid rgba(74,94,58,.16)",borderRadius:999,background:"rgba(255,253,248,.92)",color:"rgba(26,26,20,.58)",fontSize:"1rem",lineHeight:1,cursor:"pointer"}}
      >
        ×
      </button>

      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div aria-hidden="true" style={{width:34,height:34,flex:"0 0 auto",display:"grid",placeItems:"center",borderRadius:11,background:"rgba(74,94,58,.09)",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".78rem",fontWeight:850}}>XLS</div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:".98rem",lineHeight:1.2,fontWeight:700,color:"#1A1A14",marginBottom:4}}>¿Preferís trabajar en Excel?</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".74rem",lineHeight:1.48,color:"rgba(26,26,20,.58)"}}>
            Con la compra recibís {singular?"una plantilla XLSX vacía":"plantillas XLSX vacías"} para completar en Excel y después importar en la app.
          </div>
          <button
            type="button"
            onClick={openExcelPurchase}
            style={{border:0,background:"transparent",padding:"7px 0 0",fontFamily:"'Lora',serif",fontSize:".72rem",fontWeight:750,color:"#4A5E3A",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"}}
          >
            Ver app + plantillas para importar →
          </button>
        </div>
      </div>
    </aside>;
  }

  const paidBottom=withNav?78:12;

  if(!paidTeaserOpen){
    return <>
      <div aria-hidden="true" style={{height:52}}/>
      <button
        type="button"
        className="no-print"
        onClick={reopenPaidTeaser}
        aria-label="Abrir plantillas Excel"
        style={{position:"fixed",left:"50%",bottom:paidBottom,zIndex:96,transform:"translateX(-50%)",border:"1px solid rgba(74,94,58,.24)",borderRadius:999,background:"rgba(255,253,248,.97)",boxShadow:"0 7px 20px rgba(26,20,14,.13)",padding:"8px 13px",fontFamily:"'Lora',serif",fontSize:".72rem",fontWeight:750,color:"#4A5E3A",cursor:"pointer",whiteSpace:"nowrap"}}
      >
        XLS · Ver plantillas
      </button>
    </>;
  }

  return <>
    <div aria-hidden="true" style={{height:paidExpanded?292:154}}/>
    <aside
      className="no-print"
      aria-label="Plantillas Excel disponibles"
      style={{position:"fixed",left:"50%",bottom:paidBottom,zIndex:96,transform:"translateX(-50%)",width:"min(calc(100% - 20px),440px)",maxHeight:"min(54dvh,430px)",overflowY:"auto",padding:"14px 42px 13px 14px",background:"rgba(255,253,248,.98)",border:"1px solid rgba(201,169,110,.48)",borderRadius:17,boxShadow:"0 15px 42px rgba(26,20,14,.2)",backdropFilter:"blur(13px)",WebkitBackdropFilter:"blur(13px)"}}
    >
      <button
        type="button"
        aria-label="Cerrar opciones de Excel"
        onClick={closePaidTeaser}
        style={{position:"absolute",right:8,top:8,width:29,height:29,display:"grid",placeItems:"center",border:"1px solid rgba(74,94,58,.16)",borderRadius:999,background:"#FFFDF8",color:"rgba(26,26,20,.58)",fontSize:"1rem",lineHeight:1,cursor:"pointer"}}
      >
        ×
      </button>

      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div aria-hidden="true" style={{width:36,height:36,flex:"0 0 auto",display:"grid",placeItems:"center",borderRadius:11,background:"rgba(74,94,58,.1)",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:850}}>XLS</div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",lineHeight:1.18,fontWeight:700,color:"#1A1A14",marginBottom:4}}>¿Preferís trabajar en Excel?</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".74rem",lineHeight:1.45,color:"rgba(26,26,20,.58)"}}>
            Podés descargar una plantilla XLSX vacía, completarla en Excel y después importarla en este módulo. También podés exportar a Excel los datos que ya cargaste en la app.
          </div>
          <div role="note" style={{marginTop:8,padding:"8px 10px",borderRadius:10,background:"rgba(201,169,110,.12)",border:"1px solid rgba(201,169,110,.28)",fontFamily:"'Lora',serif",fontSize:".68rem",lineHeight:1.42,color:"rgba(26,26,20,.68)"}}>
            Importante: los Excel no se sincronizan automáticamente con la app. Para pasar cambios del Excel a Tu Boda Organizada tenés que importarlo; para llevarte los cambios de la app, usá Exportar XLSX.
          </div>

          <button
            type="button"
            onClick={()=>{setPaidExpanded(value=>!value);trackProductEvent("excel_paid_teaser_toggled",{source,expanded:!paidExpanded});}}
            style={{border:0,background:"transparent",padding:"7px 0 0",fontFamily:"'Lora',serif",fontSize:".72rem",fontWeight:800,color:"#4A5E3A",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer"}}
          >
            {paidExpanded?"Ocultar plantillas ↑":`Ver ${templates.length===1?"plantilla":"plantillas"} disponibles →`}
          </button>
        </div>
      </div>

      {paidExpanded&&<div style={{display:"grid",gap:8,marginTop:11,paddingTop:10,borderTop:"1px solid rgba(74,94,58,.12)"}}>
        {templates.map(item=><div key={item.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"9px 9px 9px 11px",background:"rgba(221,229,214,.38)",border:"1px solid rgba(74,94,58,.12)",borderRadius:12}}>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:800,color:"#4A5E3A",lineHeight:1.25}}>{item.title}</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".66rem",color:"rgba(26,26,20,.5)",lineHeight:1.3,marginTop:2}}>{item.description}</div>
          </div>
          <button
            type="button"
            onClick={()=>download(item.id)}
            disabled={!!activeDownload}
            style={{minHeight:38,border:0,borderRadius:999,padding:"8px 11px",background:"#4A5E3A",color:"#FFF8E8",fontFamily:"'Lora',serif",fontSize:".68rem",fontWeight:850,cursor:activeDownload?"wait":"pointer",whiteSpace:"nowrap",opacity:activeDownload&&activeDownload!==item.id?0.72:1}}
          >
            {activeDownload===item.id?"Preparando...":"Descargar"}
          </button>
        </div>)}
        {error&&<p role="alert" style={{fontFamily:"'Lora',serif",fontSize:".72rem",color:"#B5443A",lineHeight:1.4,margin:"2px 0 0"}}>{error}</p>}
      </div>}
    </aside>
  </>;
}

function FullGuideWelcomeModal({open,onClose,onGoGuide}){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!open) return;
    setError("");
    trackProductEvent("full_guide_welcome_shown",{});
  },[open]);

  if(!open) return null;

  const download=async()=>{
    setError("");
    setLoading(true);
    try{
      await openFullGuideDownload("purchase_welcome");
      onClose("downloaded");
    }catch(e){ setError(e.message||"No pudimos preparar la descarga."); }
    finally{ setLoading(false); }
  };

  return <div onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)onClose("backdrop");}} style={{position:"fixed",inset:0,zIndex:10070,background:"rgba(18,18,14,.72)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div role="dialog" aria-modal="true" aria-labelledby="full-guide-welcome-title" className="fu" style={{width:"100%",maxWidth:820,maxHeight:"calc(100dvh - 32px)",overflowY:"auto",background:"#FBF7EF",borderRadius:26,boxShadow:"0 34px 100px rgba(0,0,0,.42)",position:"relative",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))"}}>
      <button type="button" aria-label="Cerrar bienvenida" disabled={loading} onClick={()=>onClose("close")} style={{position:"absolute",right:14,top:12,zIndex:3,width:40,height:40,borderRadius:999,border:"1px solid rgba(26,26,20,.13)",background:"rgba(251,247,239,.96)",cursor:"pointer",fontSize:"1.25rem"}}>×</button>

      <div style={{background:"#173F49",padding:"clamp(24px,5vw,42px)",display:"flex",alignItems:"center",justifyContent:"center",minHeight:330}}>
        <img src="/guias/portada-guia-completa.png" alt="Portada de la guía completa Nos comprometimos, ¿y ahora qué?" style={{width:"100%",maxWidth:275,height:"auto",borderRadius:5,boxShadow:"0 20px 52px rgba(0,0,0,.32)"}}/>
      </div>

      <div style={{padding:"clamp(28px,5vw,46px)",alignSelf:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(74,94,58,.1)",border:"1px solid rgba(74,94,58,.22)",borderRadius:999,padding:"7px 12px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"#4A5E3A",fontWeight:800,marginBottom:14}}>Bienvenida · acceso validado ✓</div>

        <h2 id="full-guide-welcome-title" className="brand-title" style={{fontSize:"clamp(1.9rem,5vw,2.6rem)",lineHeight:1.08,margin:"0 0 12px"}}>Qué alegría tenerte acá</h2>

        <p className="brand-copy" style={{fontSize:"1rem",lineHeight:1.62,margin:"0 0 16px"}}>Tu compra ya está activa. Desde ahora tenés un lugar para ordenar decisiones, avances y pendientes sin sentir que tenés que resolver toda la boda de una sola vez.</p>

        <div style={{padding:"14px 15px",marginBottom:16,background:"rgba(201,169,110,.13)",border:"1px solid rgba(201,169,110,.34)",borderRadius:15}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"#A97922",fontWeight:800,marginBottom:6}}>Tu bono de bienvenida</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.08rem",lineHeight:1.3,fontWeight:700,color:"#1A1A14",marginBottom:5}}>La guía completa “Nos comprometimos, ¿y ahora qué?”</div>
          <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",lineHeight:1.52,color:"rgba(26,26,20,.66)",margin:0}}>Preparé esta guía para acompañarlos en las primeras decisiones y ayudarlos a empezar con claridad, sin presión y a su propio ritmo.</p>
        </div>

        <div style={{display:"grid",gap:8,marginBottom:17,fontFamily:"'Lora',serif",fontSize:".82rem",lineHeight:1.45,color:"rgba(26,26,20,.68)"}}>
          <span><strong style={{color:"#4A5E3A"}}>1.</strong> Descargá tu guía completa para tenerla siempre a mano.</span>
          <span><strong style={{color:"#4A5E3A"}}>2.</strong> Entrá a la app y contanos en qué etapa están.</span>
          <span><strong style={{color:"#4A5E3A"}}>3.</strong> Elegí un solo próximo paso. Lo demás puede esperar.</span>
        </div>

        <div style={{fontFamily:"'Lora',serif",fontSize:".84rem",lineHeight:1.5,color:"rgba(26,26,20,.72)",margin:"0 0 18px"}}>
          Estoy feliz de acompañarlos en este proceso.<br/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontStyle:"italic",color:"#4A5E3A",fontWeight:700}}>Con cariño, Ceci</span>
        </div>

        {error&&<p role="alert" style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"#B5443A",lineHeight:1.45,margin:"0 0 12px"}}>{error}</p>}

        <button type="button" className="pbtn" onClick={download} disabled={loading} style={{width:"100%",whiteSpace:"normal",marginBottom:10}}>{loading?"Preparando tu guía...":"Descargar mi guía completa →"}</button>
        <button type="button" className="gbtn" onClick={()=>onClose("enter_app")} disabled={loading} style={{width:"100%",marginBottom:9}}>Entrar y comenzar mi plan</button>
        <button type="button" onClick={onGoGuide} disabled={loading} style={{width:"100%",border:"none",background:"transparent",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".82rem",fontWeight:700,cursor:"pointer",padding:"8px"}}>Prefiero leer la guía dentro de la app</button>
      </div>
    </div>
  </div>;
}

function Landing({onTry,onLogin,onBuy,onGuide,onOpenDemoModule}){
  const [showMobileBar,setShowMobileBar] = useState(false);
  const tools = [
    {id:"checklist-boda",icon:"✓",title:"Plan y checklist",copy:"Qué hacer ahora, después y qué ya resolvieron."},
    {id:"budget",icon:"$",title:"Presupuesto",copy:"Categorías, pagos y control de lo comprometido."},
    {id:"guests",icon:"◎",title:"Invitados",copy:"Lista, confirmaciones, grupos y necesidades."},
    {id:"salon-design",icon:"⌂",title:"Salón y mesas",copy:"Medidas, mobiliario, circulación y distribución."},
    {id:"vendors",icon:"↔",title:"Proveedores",copy:"Propuestas, contactos, acuerdos y pendientes."},
    {id:"guia",icon:"♫",title:"Música",copy:"Momentos, canciones y guion musical personalizado."}
  ];

  const tryDemo = () => { trackProductEvent("demo_cta_clicked", {source:"landing"}); onTry(); };
  const buy = () => { trackProductEvent("buy_cta_clicked", {source:"landing"}); onBuy(); };
  const guide = () => { trackProductEvent("free_guide_cta_clicked", {source:"landing"}); onGuide(); };

  useEffect(()=>{
    const update = () => setShowMobileBar(window.scrollY > Math.min(560, window.innerHeight * .72));
    update();
    window.addEventListener("scroll", update, {passive:true});
    return()=>window.removeEventListener("scroll", update);
  },[]);

  return <div className="landing-v9">
    <header className="landing-v9-header">
      <div className="responsive-shell" style={{minHeight:70,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
        <div>
          <div className="brand-logo">El Violín de Ceci</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.48)",marginTop:3}}>Tu Boda Organizada</div>
        </div>
        <button type="button" onClick={onLogin} style={{background:"transparent",border:"none",padding:"10px 2px",cursor:"pointer",fontFamily:"'Lora',serif",color:"#4A5E3A",fontSize:"clamp(.78rem,2vw,.95rem)",fontWeight:750,textDecoration:"underline",textUnderlineOffset:4}}>
          Ya compré: ingresar
        </button>
      </div>
    </header>

    <main>
      <section className="responsive-shell" style={{paddingTop:"clamp(18px,4vw,44px)"}}>
        <div className="landing-v9-hero fu">
          <div className="landing-v9-hero-inner">
            <div>
              <div className="landing-v9-kicker">✦ Un sistema para toda la boda</div>
              <h1 className="landing-v9-title">Ordená la boda.<br/><em>Disfrutá el proceso.</em></h1>
              <p className="landing-v9-copy">Presupuesto, invitados, proveedores, salón, checklist, cronograma y música conectados en un solo lugar. Para saber qué hacer ahora sin depender de planillas, chats y memoria.</p>
              <div className="landing-v9-actions">
                <button type="button" className="landing-v9-primary" onClick={buy}>Comprar acceso completo →</button>
                <button type="button" className="landing-v9-secondary" onClick={tryDemo}>Probar la demo gratis</button>
              </div>
              <div className="landing-v9-proof">
                <span>✓ Pago único</span>
                <span>✓ Acceso inmediato</span>
                <span>✓ Planificador Excel incluido</span>
                <span>✓ Guía completa de regalo</span>
              </div>
            </div>

            <div className="landing-v9-preview fu2">
              <div className="landing-v9-preview-card">
                <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".16em",textTransform:"uppercase",color:"#D9B86F"}}>Tu próximo paso</div>
                <h2>No necesitás organizar todo hoy.</h2>
                <p>Contanos en qué etapa están y qué les preocupa. El sistema les recomienda una acción concreta para avanzar.</p>
                <div className="landing-v9-progress">
                  {[
                    "Elegí la etapa actual de la boda.",
                    "Marcá qué les preocupa más hoy.",
                    "Recibí una ruta para empezar."
                  ].map((item,index)=><div className="landing-v9-progress-row" key={item}>
                    <span style={{width:22,height:22,borderRadius:999,display:"grid",placeItems:"center",background:"rgba(217,184,111,.18)",color:"#D9B86F",fontWeight:800}}>{index+1}</span>
                    <span>{item}</span>
                  </div>)}
                </div>
                <button type="button" onClick={tryDemo} style={{marginTop:20,width:"100%",minHeight:50,border:"1px solid rgba(217,184,111,.5)",borderRadius:100,background:"transparent",color:"#FFF8E8",fontFamily:"'Lora',serif",fontWeight:750,cursor:"pointer"}}>Ver cómo funciona →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="responsive-shell landing-v9-section">
        <div className="landing-v9-guide">
          <img className="landing-v9-guide-cover" src="/guias/portada-guia-gratuita.png" alt="Guía gratuita Nos comprometimos, ¿y ahora qué?"/>
          <div>
            <span className="landing-v9-guide-tag">Guía gratuita · 12 páginas</span>
            <h2>¿Se comprometieron y no saben por dónde empezar?</h2>
            <p>Recibí una guía express para ordenar las primeras conversaciones, definir prioridades y avanzar sin abrumarte.</p>
            <div className="landing-v9-guide-list">
              {["Primeras semanas","Conversaciones en pareja","5 prioridades","Lo que suele olvidarse"].map(item=><div key={item}>✓ {item}</div>)}
            </div>
            <button type="button" className="landing-v9-guide-action" onClick={guide} style={{minHeight:54,border:0,borderRadius:100,background:"#E95A4E",color:"white",padding:"14px 24px",fontFamily:"'Lora',serif",fontWeight:800,cursor:"pointer",boxShadow:"0 10px 24px rgba(233,90,78,.2)"}}>Quiero recibir la guía gratis →</button>
            <div style={{marginTop:9,fontFamily:"'Lora',serif",fontSize:".72rem",color:"rgba(26,26,20,.42)"}}>La recibís por email · No necesitás tarjeta</div>
          </div>
        </div>
      </section>

      <section className="landing-v9-tools">
        <div className="responsive-shell landing-v9-section">
          <div className="landing-v9-tools-header">
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#D9B86F"}}>Todo conectado</div>
            <h2>Una sola boda. Un solo lugar para decidir.</h2>
            <p>No son ocho herramientas separadas. Cada decisión puede acompañar a la siguiente para que la información no quede repartida.</p>
          </div>
          <div className="landing-v9-tools-grid">
            {tools.map(tool=><button
              type="button"
              className="landing-v9-tool"
              key={tool.title}
              onClick={()=>{
                trackProductEvent("landing_module_demo_clicked",{module:tool.id});
                onOpenDemoModule?.(tool.id);
              }}
              aria-label={`Probar ${tool.title} en la demo`}
            >
              <div className="landing-v9-tool-icon">{tool.icon}</div>
              <strong>{tool.title}</strong>
              <span>{tool.copy}</span>
              <span className="landing-v9-tool-arrow">Probar este módulo →</span>
            </button>)}
          </div>
        </div>
      </section>

      <section className="responsive-shell landing-v9-section">
        <div className="landing-v9-final">
          <div>
            <div className="brand-logo" style={{fontSize:THEME.text.label,marginBottom:8}}>Empezá a tu manera</div>
            <h2>Probá primero o guardá toda la organización desde hoy.</h2>
            <p>La demo no pide registro. El acceso completo permite guardar avances y continuar desde cualquier dispositivo.</p>
          </div>
          <div style={{display:"grid",gap:10,minWidth:"min(100%,270px)"}}>
            <button type="button" className="landing-v9-primary" onClick={buy}>Comprar acceso completo</button>
            <button type="button" className="landing-v9-secondary" onClick={tryDemo}>Probar demo gratis</button>
            <button type="button" onClick={onLogin} style={{background:"transparent",border:0,color:"#4A5E3A",fontFamily:"'Lora',serif",fontWeight:700,textDecoration:"underline",textUnderlineOffset:4,cursor:"pointer"}}>Ya compré: ingresar</button>
          </div>
        </div>
      </section>
    </main>

    <div className="mobile-buy-bar" style={{display:showMobileBar?undefined:"none"}}>
      <button type="button" onClick={buy} style={{border:"none",background:"#4A5E3A",color:"#F5EFE0",fontFamily:"'Lora',serif",fontWeight:850}}>Comprar ahora</button>
      <button type="button" onClick={tryDemo} style={{border:"none",background:"transparent",color:"#4A5E3A",fontFamily:"'Lora',serif",fontWeight:750}}>Probar demo</button>
    </div>
  </div>;
}

function WeddingStartPlanner({onOpenModule,onSeeAll,onBack,isDemo=false}){
  const previous = readStartProfile();
  const [stage,setStage] = useState(previous?.stage || "");
  const [concern,setConcern] = useState(previous?.concern || "");
  const [complete,setComplete] = useState(!!previous?.stage && !!previous?.concern);

  const stages = [
    {id:"starting",emoji:"🌱",title:"Recién estamos empezando",copy:"Tenemos ideas, pero todavía no un plan claro."},
    {id:"foundations",emoji:"📍",title:"Ya tenemos fecha o salón",copy:"Ahora necesitamos ordenar presupuesto y decisiones."},
    {id:"execution",emoji:"🤝",title:"Ya contratamos varias cosas",copy:"Hay información repartida y pendientes por controlar."},
    {id:"final",emoji:"✨",title:"Estamos cerrando detalles",copy:"Faltan pocos meses y necesitamos coordinar todo."}
  ];
  const concerns = [
    {id:"overwhelm",emoji:"🧭",title:"No sé por dónde seguir"},
    {id:"budget",emoji:"💰",title:"Que el presupuesto se nos vaya"},
    {id:"guests",emoji:"👥",title:"Invitados y mesas"},
    {id:"salon",emoji:"🏛️",title:"Cómo va a quedar el salón"},
    {id:"vendors",emoji:"🏢",title:"Comparar y controlar proveedores"},
    {id:"timeline",emoji:"⏰",title:"Tiempos y pendientes"},
    {id:"music",emoji:"🎵",title:"Música y momentos especiales"}
  ];

  const finish = () => {
    if(!stage || !concern) return;
    const profile = {stage,concern,created_at:new Date().toISOString()};
    try { localStorage.setItem(START_PROFILE_KEY, JSON.stringify(profile)); } catch(e) {}
    trackProductEvent("start_plan_completed", {stage,concern,is_demo:isDemo});
    setComplete(true);
  };

  const recommendation = getWeddingRecommendation({stage,concern});
  const stageLabel = stages.find(x=>x.id===stage)?.title || "Tu etapa";
  const concernLabel = concerns.find(x=>x.id===concern)?.title || "lo que necesitan resolver";
  const plan = recommendation.steps || [recommendation.why,"Completá una primera versión, aunque todavía no sea perfecta.","Usá ese resultado para decidir el siguiente paso."];

  if(complete) return <div className="home-floral-bg" style={{minHeight:"100svh",padding:"clamp(18px,4vw,50px)",display:"grid",placeItems:"center"}}>
    <div className="fu" style={{width:"100%",maxWidth:720,background:"rgba(251,247,239,.97)",border:"0.5px solid rgba(201,169,110,.35)",borderRadius:26,padding:"clamp(24px,5vw,46px)",boxShadow:"0 24px 70px rgba(49,39,25,.14)"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.08)",borderRadius:999,padding:"8px 13px",fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".1em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:18}}>✓ Tu punto de partida</div>
      <h1 className="brand-title" style={{fontSize:"clamp(2rem,6vw,3.25rem)",lineHeight:1.08,margin:"0 0 12px"}}>Tu próximo paso no es hacer todo.</h1>
      <p className="brand-copy" style={{fontSize:"1.05rem",margin:"0 0 24px"}}>Según lo que nos contaste —<strong>{stageLabel.toLowerCase()}</strong> y hoy te preocupa <strong>{concernLabel.toLowerCase()}</strong>— conviene empezar por una acción concreta que ordene las siguientes.</p>
      <div style={{background:"#4A5E3A",borderRadius:22,padding:"clamp(22px,5vw,34px)",color:"#F5EFE0",marginBottom:20}}>
        <div style={{fontSize:"2rem",marginBottom:10}}>{recommendation.emoji}</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".14em",textTransform:"uppercase",color:"#D9B86F",marginBottom:8}}>Empezá por acá</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.55rem,5vw,2.2rem)",margin:"0 0 9px"}}>{recommendation.title}</h2>
        <p style={{fontFamily:"'Lora',serif",fontSize:".98rem",lineHeight:1.6,color:"rgba(245,239,224,.72)",margin:"0 0 20px"}}>{recommendation.why}</p>
        <button className="pbtn" onClick={()=>{trackProductEvent("recommended_module_opened",{module:recommendation.module});onOpenModule(recommendation.module);}} style={{background:"#D9B86F",color:"#1A1A14"}}>{recommendation.cta} →</button>
      </div>
      <div style={{border:"0.5px solid rgba(201,169,110,.28)",borderRadius:18,padding:"18px",marginBottom:20}}>
        <div className="brand-logo" style={{fontSize:THEME.text.label,marginBottom:12}}>Tu plan de esta etapa</div>
        {plan.map((item,i)=><div key={item} style={{display:"grid",gridTemplateColumns:"30px 1fr",gap:10,padding:"9px 0",fontFamily:"'Lora',serif",fontSize:".9rem",lineHeight:1.5,color:"rgba(26,26,20,.68)"}}><span style={{width:26,height:26,borderRadius:999,display:"grid",placeItems:"center",background:"rgba(74,94,58,.08)",color:"#4A5E3A",fontWeight:800}}>{i+1}</span><span>{item}</span></div>)}
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="gbtn" onClick={onSeeAll}>Ver todas las herramientas</button>
        <button className="gbtn" onClick={()=>setComplete(false)}>Cambiar mis respuestas</button>
      </div>
    </div>
  </div>;

  return <div className="home-floral-bg" style={{minHeight:"100svh",padding:"clamp(18px,4vw,50px)",display:"grid",placeItems:"center"}}>
    <div className="fu" style={{width:"100%",maxWidth:760,background:"rgba(251,247,239,.97)",border:"0.5px solid rgba(201,169,110,.35)",borderRadius:26,padding:"clamp(22px,5vw,42px)",boxShadow:"0 24px 70px rgba(49,39,25,.14)"}}>
      <button onClick={onBack} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:"rgba(74,94,58,.7)",cursor:"pointer",padding:"4px 0",marginBottom:18}}>← Volver</button>
      <div className="brand-logo" style={{marginBottom:10}}>Tu plan de inicio</div>
      <h1 className="brand-title" style={{fontSize:"clamp(2rem,6vw,3.15rem)",lineHeight:1.08,margin:"0 0 10px"}}>¿En qué momento está tu boda?</h1>
      <p className="brand-copy" style={{fontSize:"1rem",margin:"0 0 24px"}}>No queremos mostrarte ocho herramientas sin contexto. Primero encontremos el problema que conviene resolver ahora.</p>

      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".13em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:10}}>1. Elegí tu etapa</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(235px,100%),1fr))",gap:10,marginBottom:26}}>
        {stages.map(item=><button key={item.id} type="button" onClick={()=>{setStage(item.id);setComplete(false);}} style={{background:stage===item.id?"rgba(74,94,58,.1)":"#FBF7EF",border:`1px solid ${stage===item.id?"#4A5E3A":"rgba(201,169,110,.3)"}`,borderRadius:16,padding:"17px 15px",textAlign:"left",cursor:"pointer"}}>
          <div style={{fontSize:"1.4rem",marginBottom:7}}>{item.emoji}</div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"1rem",marginBottom:5}}>{item.title}</div><div style={{fontFamily:"'Lora',serif",fontSize:".8rem",lineHeight:1.45,color:"rgba(26,26,20,.52)"}}>{item.copy}</div>
        </button>)}
      </div>

      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".13em",textTransform:"uppercase",color:stage?"#4A5E3A":"rgba(26,26,20,.28)",marginBottom:10}}>2. ¿Qué te preocupa más hoy?</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(205px,100%),1fr))",gap:9,opacity:stage?1:.5,pointerEvents:stage?"auto":"none",marginBottom:24}}>
        {concerns.map(item=><button key={item.id} type="button" onClick={()=>setConcern(item.id)} style={{display:"flex",alignItems:"center",gap:10,background:concern===item.id?"rgba(74,94,58,.1)":"#FBF7EF",border:`1px solid ${concern===item.id?"#4A5E3A":"rgba(201,169,110,.28)"}`,borderRadius:14,padding:"13px",textAlign:"left",cursor:"pointer",fontFamily:"'Lora',serif",fontWeight:concern===item.id?700:500,color:"#1A1A14"}}><span style={{fontSize:"1.2rem"}}>{item.emoji}</span><span>{item.title}</span></button>)}
      </div>
      <button className="pbtn" onClick={finish} disabled={!stage||!concern} style={{width:"100%",opacity:stage&&concern?1:.45,cursor:stage&&concern?"pointer":"not-allowed"}}>Crear mi próximo paso →</button>
      <p style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.42)",textAlign:"center",margin:"12px 0 0"}}>No es un test genérico: sirve para ordenar la experiencia que vas a probar.</p>
    </div>
  </div>;
}

function EmailCapture({form,setForm,onContinue,onRecover}){
  const [email,setEmail]=useState("");
  const [recovering,setRecovering]=useState(false);
  const [notFound,setNotFound]=useState(false);
  const ok=email.includes("@")&&email.includes(".");

  const handleRecover=async()=>{
    if(!ok) return;
    setRecovering(true);setNotFound(false);
    const session=await cargarSesion(email);
    if(session) onRecover(session,email);
    else setNotFound(true);
    setRecovering(false);
  };

  return <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(245,239,224,.88)",padding:"clamp(16px,3vw,32px) clamp(12px,2.5vw,24px)"}}>
    <div style={{maxWidth:440,width:"100%",textAlign:"center"}} className="fu">
      <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",letterSpacing:".2em",textTransform:"uppercase",color:G,marginBottom:18}}>El Violín de Ceci</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.85rem",fontWeight:700,color:C,margin:"0 0 12px"}}>Tu guion musical está listo.</h2>
      <p style={{fontFamily:"'Lora',serif",fontSize:"1.05rem",color:DIM,lineHeight:1.7,margin:"0 0 10px"}}>Dejá tu email para guardar tu resultado y poder acceder desde cualquier dispositivo.</p>
      <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(201,169,110,.5)",fontStyle:"italic",margin:"0 0 28px"}}>📧 Tu resultado queda guardado en tu cuenta y podés volver a verlo cuando quieras.</p>
      <input name="app-field-2072" type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setNotFound(false);}} style={{textAlign:"center",fontSize:"1.15rem",marginBottom:16}}/>
      {notFound&&<p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(201,169,110,.7)",margin:"0 0 12px",fontStyle:"italic"}}>No encontramos ese email. Continuá para crear tu guion nuevo.</p>}
      <button className="pbtn" disabled={!ok} onClick={()=>{setForm(f=>({...f,email}));onContinue();}} style={{width:"100%",marginBottom:12}}>
        Ver mi resultado →
      </button>
      <div style={{borderTop:"1px solid rgba(201,169,110,.1)",paddingTop:16,marginTop:4}}>
        <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:"rgba(26,26,20,.28)",margin:"0 0 10px"}}>¿Ya completaste el test antes?</p>
        <button className="gbtn" disabled={!ok||recovering} onClick={handleRecover} style={{width:"100%"}}>
          {recovering?"Buscando tu guion...":"Recuperar mi guion anterior →"}
        </button>
      </div>
      <p style={{marginTop:14,fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.28)"}}>Sin spam. Solo tu guion y novedades de Ceci.</p>
    </div>
  </div>;
}


function Form({step,setStep,form,setForm,onSubmit,error,onGoHome,isDemo=false}){
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const tog=(k,v)=>setForm(f=>{const a=f[k];return{...f,[k]:a.includes(v)?a.filter(x=>x!==v):[...a,v]};});
  const ok=()=>{
    if(step===1) return form.nombre1.trim()&&form.nombre2.trim();
    if(step===2) return form.tipoCeremonia.length>0;
    if(step===3) return form.palabrasEstilo.length>0&&!!form.objetivoEmocional;
    if(step===4) return form.generos.length>0;
    if(step===5) return form.momentosSeleccionados.length>0;
    return !!form.recuerdo.trim();
  };
  const isCatolica=(form.tipoCeremonia.includes("Religiosa")&&form.denominacionReligiosa==="Católica")||form.tipoCeremonia.includes("Religiosa católica");
  const momentosDisponibles=isCatolica?MOMENTOS_CATOLICA:MOMENTOS_CIVIL_SIMBOLICA;
  const wrap=ch=><div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",background:"rgba(245,239,224,.88)",padding:"clamp(14px,2.5vw,24px) clamp(10px,2vw,22px)",maxWidth:"min(820px,calc(100vw - 32px))",margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <button onClick={onGoHome} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(74,94,58,.6)",cursor:"pointer",padding:"4px 0",display:"flex",alignItems:"center",gap:5}}>🏠 Menú principal</button>
      <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(26,26,20,.3)"}}>Paso {step} de 6</span>
    </div>
    <Progress step={step}/>
    <div style={{flex:1}} className="fu">{ch}</div>
    <div style={{display:"flex",gap:10,paddingTop:28,paddingBottom:8}}>
      {step>1&&<button className="gbtn" onClick={()=>setStep(s=>s-1)}>← Volver</button>}
      {step<6
        ?<button className="pbtn" disabled={!ok()} style={{marginLeft:"auto"}} onClick={()=>setStep(s=>s+1)}>Continuar →</button>
        :<button className="pbtn" disabled={!ok()} style={{marginLeft:"auto"}} onClick={onSubmit}>{isDemo?"🔒 Desbloquear mi guion":"✨ Crear mi guion"}</button>
      }
    </div>
    {error&&<p style={{color:"#ff8080",fontFamily:"'Lora',serif",textAlign:"center",fontSize:".95rem",marginTop:8,lineHeight:1.5}}>{error}</p>}
  </div>;

  if(step===1) return wrap(<>
    <SL n={1} l="Cuéntenme sobre la pareja"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div><FL>Nombre 1</FL><input name="app-field-2122" placeholder="Tu nombre" value={form.nombre1} onChange={e=>set("nombre1",e.target.value)}/></div>
      <div><FL>Nombre 2</FL><input name="app-field-2123" placeholder="Su nombre" value={form.nombre2} onChange={e=>set("nombre2",e.target.value)}/></div>
    </div>
    <FL>Fecha de la boda</FL>
    <input name="app-field-2126" type="date" value={form.fechaBoda} onChange={e=>set("fechaBoda",e.target.value)}/>
    <FL>Ciudad / país</FL>
    <input name="app-field-2128" placeholder="ej: Asunción, Paraguay" value={form.ciudad} onChange={e=>set("ciudad",e.target.value)}/>
    <FL>Cantidad de invitados</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {["Menos de 30","30–80","80–150","150–250","Más de 250"].map(v=><Tag key={v} label={v} selected={form.invitados===v} onClick={()=>set("invitados",v)}/>)}
    </div>
  </>);

  const tieneReligiosa=form.tipoCeremonia.includes("Religiosa");
  const lugarGuia={
    "Iglesia / templo":"La acústica suele ser muy buena para música en vivo. Consultá con anticipación qué instrumentos y repertorio están permitidos.",
    "Salón de fiestas":"Buenas condiciones acústicas. El DJ o músico puede amplificar sin problema. Temperatura controlada.",
    "Al aire libre":"⚠️ El viento y el ruido ambiente pueden afectar la música. Se necesita amplificación con potencia extra. Probá el equipo antes.",
    "Hacienda / estancia":"Espacios amplios y naturales. La acústica varía mucho según el sector. Siempre hacé prueba de sonido.",
    "Hotel":"Salones con buena acústica generalmente. Consultá restricciones de decibeles y horario.",
    "Espacio íntimo":"La música puede quedar perfecta sin amplificación o con un equipo pequeño. Ideal para músico acústico."
  };

  if(step===2) return wrap(<>
    <SL n={2} l="La ceremonia" sub="Podés combinar más de una. Por ejemplo, en Paraguay se estila celebrar dos ceremonias el mismo día."/>
    <FL>Tipo de ceremonia</FL>
    {["Religiosa","Civil","Simbólica","Otra"].map(v=>(
      <Pill key={v} label={v} selected={form.tipoCeremonia.includes(v)} onClick={()=>tog("tipoCeremonia",v)}/>
    ))}
    {tieneReligiosa&&<div className="info-box" style={{marginTop:8}}>
      <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:G,marginBottom:8}}>Denominación religiosa</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {["Católica","Cristiana","Ortodoxa","Otra religión"].map(v=><Tag key={v} label={v} selected={(form.denominacionReligiosa||"")===v} onClick={()=>set("denominacionReligiosa",v)}/>)}
      </div>
      {(form.denominacionReligiosa==="Católica")&&<p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:"12px 0 0",lineHeight:1.6}}>
        ⚠️ La misa católica tiene momentos litúrgicos con música obligatoria (Aleluya, Comunión, Ofertorio). Muchas iglesias solo permiten música sacra. Siempre consultá con el sacerdote antes de definir el repertorio.
      </p>}
      <FL>¿Hay restricciones musicales específicas?</FL>
      <input name="app-field-2160" placeholder="ej: Solo música sacra, el sacerdote eligió el Aleluya..." value={form.restriccionIglesia||""} onChange={e=>set("restriccionIglesia",e.target.value)}/>

      <FL>¿Dónde será la ceremonia religiosa?</FL>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
        {["Iglesia / templo","Salón de fiestas","Al aire libre","Hotel","Otro"].map(v=><Tag key={v} label={v} selected={form.lugarCeremoniaReligiosa===v} onClick={()=>set("lugarCeremoniaReligiosa",v)}/>)}
      </div>
      {form.lugarCeremoniaReligiosa&&lugarGuia[form.lugarCeremoniaReligiosa]&&<div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.14)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
        <p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>{lugarGuia[form.lugarCeremoniaReligiosa]}</p>
      </div>}
    </div>}
    {tieneReligiosa&&form.tipoCeremonia.includes("Civil")&&<div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.12)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>
        💡 Como van a tener ceremonia religiosa y civil, es común que sean en lugares distintos — por ejemplo, primero la iglesia y después el salón. Más abajo van a poder indicar dónde será la parte civil.
      </p>
    </div>}
    {(form.tipoCeremonia.includes("Civil")||form.tipoCeremonia.includes("Simbólica")||form.tipoCeremonia.includes("Otra")||(tieneReligiosa&&form.denominacionReligiosa&&form.denominacionReligiosa!=="Católica"&&!form.tipoCeremonia.includes("Civil")))&&<>
      <FL>{tieneReligiosa?"¿Dónde será la ceremonia civil?":"¿Dónde será la ceremonia?"}</FL>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
        {["Salón de fiestas","Al aire libre","Hacienda / estancia","Hotel","Espacio íntimo","Otro"].map(v=><Tag key={v} label={v} selected={form.lugarCeremonia===v} onClick={()=>set("lugarCeremonia",v)}/>)}
      </div>
      {form.lugarCeremonia&&lugarGuia[form.lugarCeremonia]&&<div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.14)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
        <p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>{lugarGuia[form.lugarCeremonia]}</p>
      </div>}
    </>}
    <FL>Duración estimada</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {["Menos de 20 min","20–40 min","40–60 min","Más de 1 hora"].map(v=><Tag key={v} label={v} selected={form.duracion===v} onClick={()=>set("duracion",v)}/>)}
    </div>
    <FL>Música en vivo disponible</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {FORMATOS.map(v=><Tag key={v} label={v} selected={form.formatoMusical.includes(v)} onClick={()=>tog("formatoMusical",v)}/>)}
    </div>
  </>);

  if(step===3) return wrap(<>
    <SL n={3} l="El espíritu de su boda" sub="Estas respuestas van a revelar su arquetipo musical como pareja."/>
    <FL>Palabras que describen su boda (hasta 3)</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {ESTILOS.map(v=><Tag key={v} label={v} selected={form.palabrasEstilo.includes(v)} onClick={()=>{if(form.palabrasEstilo.includes(v))tog("palabrasEstilo",v);else if(form.palabrasEstilo.length<3)tog("palabrasEstilo",v);}}/>)}
    </div>
    <FL>¿Qué emoción quieren crear?</FL>
    <div style={{marginTop:6}}>
      {OBJETIVOS.map(v=><Pill key={v.l} label={v.l} emoji={v.e} selected={form.objetivoEmocional===v.l} onClick={()=>set("objetivoEmocional",v.l)}/>)}
    </div>
    <FL>Si tuvieras que describir su boda en una frase...</FL>
    <div style={{marginTop:6}}>
      {[{l:"Una película que la gente recuerde para siempre",e:"🎬"},{l:"La más íntima y especial de su vida",e:"🌿"},{l:"Una fiesta que arranca desde la ceremonia",e:"🎊"},{l:"Elegante y clásica — exactamente como la imaginaron",e:"💐"},{l:"Diferente a todo lo que vieron antes",e:"⚡"},{l:"Una experiencia de lujo, cada detalle pensado",e:"👑"}].map(v=><Pill key={v.l} label={v.l} emoji={v.e} selected={form.personalidad===v.l} onClick={()=>set("personalidad",v.l)}/>)}
    </div>
  </>);

  if(step===4) return wrap(<>
    <SL n={4} l="Su universo musical"/>
    <FL>Géneros favoritos (hasta 4)</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {GENEROS.map(v=><Tag key={v} label={v} selected={form.generos.includes(v)} onClick={()=>{if(form.generos.includes(v))tog("generos",v);else if(form.generos.length<4)tog("generos",v);}}/>)}
    </div>
    <FL>3 artistas o canciones que los representen como pareja</FL>
    <input name="app-field-2217" placeholder="ej: Coldplay, La Oreja de Van Gogh, Hans Zimmer" value={form.artistas} onChange={e=>set("artistas",e.target.value)}/>
    <FL>¿Alguna canción que definitivamente NO quieren en su boda?</FL>
    <div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.12)",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:DIM,margin:"0 0 6px",lineHeight:1.6}}>
        Esto es más común de lo que parece — y es muy útil para nosotras.
      </p>
      <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.35)",margin:0,lineHeight:1.6,fontStyle:"italic"}}>
        Puede ser una canción muy repetida en bodas, una que los recuerde de algo que no quieren traer, o simplemente una que no los representa. El guion no va a incluirla ni versiones de ella.
      </p>
    </div>
    <input name="app-field-2227" placeholder="ej: La Bamba, Despacito, la canción del ex — anotá todo lo que se les ocurra" value={form.cancionesProhibidas} onChange={e=>set("cancionesProhibidas",e.target.value)}/>
    <FL>Idioma preferido</FL>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
      {["Castellano","Inglés","Mezcla","No importa"].map(v=><Tag key={v} label={v} selected={form.idioma===v} onClick={()=>set("idioma",v)}/>)}
    </div>
  </>);

  // Auto-pre-selección de momentos esenciales al llegar al paso 5
  useEffect(()=>{
    if(step===5 && form.momentosSeleccionados.length===0){
      const esenciales = isCatolica
        ? ["llegada","novio","novia","aleluya","salida"]
        : ["llegada","novio","novia","salida"];
      setForm(f=>({...f,momentosSeleccionados:esenciales}));
    }
  },[step]);

  if(step===5) return wrap(<>
    <SL n={5} l="Los momentos de tu ceremonia"/>
    <div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.14)",borderRadius:14,padding:"14px 16px",marginBottom:20}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:C,margin:"0 0 6px",lineHeight:1.6}}>
        No necesitás saber qué se musicaliza en una boda — te guiamos momento a momento.
      </p>
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:DIM,margin:0,lineHeight:1.55}}>
        Ya pre-seleccionamos los momentos esenciales. Podés agregar o quitar según tu ceremonia.
      </p>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <span style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(74,94,58,.1)",color:G,border:"1px solid rgba(201,169,110,.25)"}}>★ Esencial</span>
      <span style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(26,26,20,.04)",color:DIM,border:"0.5px solid rgba(74,94,58,.18)"}}>○ Opcional</span>
      {isCatolica&&<span style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(74,94,58,.08)",color:G,border:"1px solid rgba(201,169,110,.2)"}}>⛪ Litúrgico</span>}
    </div>
    <div style={{marginTop:4}}>
      {momentosDisponibles.map((m,i)=>{
        const sel=form.momentosSeleccionados.includes(m.id);
        const esEsencial = isCatolica
          ? ["llegada","novio","novia","aleluya","salida"].includes(m.id)
          : ["llegada","novio","novia","salida"].includes(m.id);
        return <div key={m.id} className={`moment-card${sel?" sel":""}`} onClick={()=>!m.obligatorio&&tog("momentosSeleccionados",m.id)} style={{cursor:m.obligatorio?"default":"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1.2rem"}}>{m.icono}</span>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",color:sel?G:C,lineHeight:1.2}}>{m.nombre}</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:esEsencial?G:DIM,marginTop:2}}>
                  {m.obligatorio?"⛪ Litúrgico obligatorio":esEsencial?"★ Esencial":"○ Opcional"}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
              {m.obligatorio
                ? <span style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(201,169,110,.6)",border:"1px solid rgba(201,169,110,.25)",borderRadius:100,padding:"2px 8px"}}>siempre incluido</span>
                : <div style={{width:22,height:22,borderRadius:4,border:`1px solid ${sel?G:"rgba(74,94,58,.3)"}`,background:sel?"rgba(201,169,110,.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                    {sel&&<span style={{color:G,fontSize:THEME.text.label,fontWeight:700}}>✓</span>}
                  </div>
              }
            </div>
          </div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(201,169,110,.6)",marginBottom:5,fontStyle:"italic"}}>{m.emocion} · {m.duracion}</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:"rgba(26,26,20,.58)",lineHeight:1.58}}>{m.desc}</div>
        </div>;
      })}
    </div>
    {isCatolica&&<div style={{marginTop:12,background:"rgba(201,169,110,.05)",border:"1px solid rgba(74,94,58,.14)",borderRadius:10,padding:"12px 14px"}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:DIM,margin:0,lineHeight:1.6}}>
        ⚠️ Los momentos litúrgicos deben tener música aprobada por la iglesia. Consultá con el sacerdote antes de confirmar el repertorio.
      </p>
    </div>}
    <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.28)",marginTop:12,fontStyle:"italic",lineHeight:1.5}}>
      No hay respuesta correcta única. La idea es construir una banda sonora que se sienta como ustedes.
    </p>
  </>);

  return wrap(<>
    <SL n={6} l="Lo que hace especial a su boda"/>
    <FL>¿Tienen una canción que los une como pareja?</FL>
    <textarea name="app-field-2303" rows={2} placeholder="ej: una canción que escucharon juntos en un viaje, o que sonaba cuando se conocieron..." value={form.cancionPersonal} onChange={e=>set("cancionPersonal",e.target.value)} style={{resize:"none"}}/>
    <FL>¿Qué querés que la gente sienta o recuerde musicalmente? *</FL>
    <textarea name="app-field-2305" rows={3} placeholder="Contanos con tus palabras, sin filtros — esto es lo que más importa..." value={form.recuerdo} onChange={e=>set("recuerdo",e.target.value)} style={{resize:"none"}}/>
    <p style={{marginTop:24,fontFamily:"'Lora',serif",fontSize:".92rem",color:"rgba(26,26,20,.22)",lineHeight:1.65,fontStyle:"italic"}}>Con estas respuestas, Ceci crea un guion que no podría aplicarse a ninguna otra boda.</p>
  </>);
}

const PHASE_MSGS=[
  [
    "Estamos leyendo sus respuestas con calma…",
    "No cerrés esta ventana. Tu guion se está creando ahora.",
    "Ceci está entendiendo el estilo de su boda antes de elegir canciones.",
    "Este paso puede tardar un poco porque el resultado no es genérico."
  ],
  [
    "Estamos buscando canciones que tengan sentido para cada momento…",
    "La entrada, los votos y la salida necesitan energías distintas.",
    "Estamos cuidando que la música acompañe la emoción, no que la tape.",
    "Ya casi está la parte más importante: el guion musical."
  ],
  [
    "Estamos ordenando todo para que sea fácil de compartir con tus proveedores…",
    "Ahora armamos el checklist para DJ, planner y músicos.",
    "Un momento más. Estamos dejando tu resultado claro y listo para usar.",
    "Gracias por esperar. Este último paso suele tardar unos segundos más."
  ]
];
const PHASE_TITLES=[
  "Entendiendo su estilo",
  "Diseñando el guion musical",
  "Preparando el resultado final"
];
const CALMING_NOTES=[
  "No hace falta volver atrás ni recargar la página.",
  "Si tarda, es porque estamos creando un resultado personalizado.",
  "Tu información ya fue tomada. Solo estamos terminando el guion."
];
function Generating({names,phase}){
  const [i,setI]=useState(0);
  const [seconds,setSeconds]=useState(0);
  const pool=PHASE_MSGS[phase]||PHASE_MSGS[0];
  useEffect(()=>{setI(0);},[phase]);
  useEffect(()=>{const t=setInterval(()=>setI(x=>(x+1)%pool.length),2600);return()=>clearInterval(t);},[pool.length]);
  useEffect(()=>{const t=setInterval(()=>setSeconds(x=>x+1),1000);return()=>clearInterval(t);},[]);
  const progress=Math.min(92,18+(phase*27)+(i*6));
  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(16px,3vw,32px) clamp(12px,2vw,20px)",textAlign:"center"}}>
    <div style={{width:"100%",maxWidth:720,background:"linear-gradient(135deg,#FBF7EF,#F5EFE0)",border:"1px solid rgba(201,169,110,.18)",borderRadius:28,padding:"clamp(30px,6vw,54px)",boxShadow:"0 24px 80px rgba(0,0,0,.22)"}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".24em",textTransform:"uppercase",color:G,marginBottom:20}}>El Violín de Ceci</div>
      <div style={{position:"relative",width:92,height:92,margin:"0 auto 28px"}}>
        <div style={{position:"absolute",inset:0,border:"1px solid rgba(74,94,58,.1)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:0,border:"2px solid transparent",borderTopColor:G,borderRightColor:"rgba(74,94,58,.32)",borderRadius:"50%",animation:"spin 1.5s linear infinite"}}/>
        <div style={{position:"absolute",inset:13,border:"1px solid rgba(74,94,58,.14)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:G,fontSize:"1.6rem"}}>♪</div>
      </div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.8rem,4vw,2.7rem)",fontWeight:400,color:C,margin:"0 0 8px",lineHeight:1.15}}>Creando la banda sonora de {names}</h2>
      <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(1.05rem,2.2vw,1.25rem)",color:"rgba(26,26,20,.58)",fontStyle:"italic",margin:"0 0 28px",lineHeight:1.55}}>Respirá tranquila. Este proceso puede tardar un poco porque estamos creando un guion único, no una respuesta automática.</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10}}>
        <span style={{fontFamily:"'Lora',serif",fontSize:".92rem",letterSpacing:".12em",textTransform:"uppercase",color:G}}>{PHASE_TITLES[phase]||PHASE_TITLES[0]}</span>
        <span style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.52)"}}>Paso {phase+1} de 3 · {seconds}s</span>
      </div>
      <div style={{height:6,background:"rgba(74,94,58,.1)",borderRadius:999,overflow:"hidden",marginBottom:24}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#4A5E3A,#7B8C6E)",borderRadius:999,transition:"width .55s ease"}}/>
      </div>
      <div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.14)",borderRadius:18,padding:"18px 20px",marginBottom:18,minHeight:96,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(1.15rem,2.3vw,1.38rem)",color:C,animation:"pulse 2.4s ease infinite",fontStyle:"italic",margin:0,lineHeight:1.55}}>{pool[i]}</p>
      </div>
      <div className="generating-notes" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(160px,45vw),1fr))",gap:10,marginTop:10}}>
        {CALMING_NOTES.map((note,idx)=><div key={idx} style={{background:"rgba(26,26,20,.03)",border:"0.5px solid rgba(74,94,58,.14)",borderRadius:14,padding:"12px 10px",fontFamily:"'Lora',serif",fontSize:".95rem",color:"rgba(26,26,20,.58)",lineHeight:1.45}}>
          {note}
        </div>)}
      </div>
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:"rgba(26,26,20,.28)",margin:"22px 0 0",lineHeight:1.5}}>Dejá esta pestaña abierta hasta que aparezca tu resultado.</p>
    </div>
  </div>;
}

// ─── ELEMENTOS DECORATIVOS BOTÁNICOS ─────────────────────────────────────────
function BotanicalDivider({label}){
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

function WaxSeal({initials, color="#4A5E3A"}){
  const isGold = color === "gold";
  const fill = isGold ? "#C9A96E" : color;
  const inner = isGold ? "#B89658" : "#3A4E2C";
  const text = isGold ? "#F5EFE0" : "#C9A96E";
  return <svg viewBox="0 0 70 70" width="54" height="54">
    <path d="M35,5 L38,13 L46,10 L44,18 L53,18 L49,25 L57,28 L51,35 L58,40 L51,44 L55,53 L46,52 L46,61 L37,57 L35,65 L33,57 L24,61 L24,52 L15,53 L19,44 L12,40 L19,35 L13,28 L21,25 L17,18 L26,18 L24,10 L32,13 Z" fill={fill} opacity="0.85"/>
    <circle cx="35" cy="35" r="16" fill={inner} opacity="0.9"/>
    <circle cx="35" cy="35" r="12" fill="none" stroke="#F5EFE0" strokeWidth="0.6" opacity="0.35"/>
    <text x="35" y="40" textAnchor="middle" fontSize="11" fill={text} opacity="0.9" fontFamily="'Cinzel',serif" fontWeight="500">{initials||"♪"}</text>
  </svg>;
}


// ─── ACORDEÓN ─────────────────────────────────────────────────────────────────
function AccordionBlock({id,icon,title,subtitle,isOpen,onToggle,children,defaultTag}){
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

function SongCardStar({item}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}${item.version?" "+item.version:""}`);
  return <div style={{background:"linear-gradient(135deg,#EAE4D2,#F5EFE0)",border:"1px solid rgba(201,169,110,.3)",borderRadius:14,padding:"20px",marginBottom:10,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:"radial-gradient(circle,rgba(74,94,58,.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",letterSpacing:".12em",textTransform:"uppercase",color:"#4A5E3A"}}>{item.momento}</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",color:"rgba(74,94,58,.35)",fontStyle:"italic"}}>El momento más recordado</div>
      </div>
      <span style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.28)",flexShrink:0,marginLeft:8}}>{item.duracion}</span>
    </div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.3rem,3vw,1.55rem)",color:C,marginBottom:3,lineHeight:1.2}}>{item.cancion}</div>
    <div style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:DIM,marginBottom:item.razon?12:0}}>{item.artista}{item.version&&<em style={{color:"rgba(26,26,20,.28)",fontStyle:"italic"}}> · {item.version}</em>}</div>
    {item.razon&&<p style={{fontFamily:"'Lora',serif",fontSize:".97rem",color:"rgba(26,26,20,.58)",lineHeight:1.65,margin:"0 0 12px",fontStyle:"italic",borderLeft:"2px solid rgba(201,169,110,.25)",paddingLeft:12}}>{item.razon}</p>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {item.alt&&<span style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.28)"}}>Alt: {item.alt}</span>}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <AudioButton cancion={item.cancion} artista={item.artista} version={item.version} alt={item.alt}/>
        <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".82rem",padding:"6px 12px"}}>YT</a>
      </div>
    </div>
  </div>;
}

function SongCard({item,idx}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}${item.version?" "+item.version:""}`);
  const isNovia=item.momento?.toLowerCase().includes("novia");
  if(isNovia) return <SongCardStar item={item}/>;
  return <div style={{background:"#FBF7EF",border:"1px solid rgba(201,169,110,.09)",borderRadius:12,padding:"14px 16px",marginBottom:9,display:"flex",gap:12,alignItems:"flex-start"}}>
    <div style={{flexShrink:0,marginTop:2,textAlign:"center"}}>
      <div style={{fontSize:"1.2rem"}}>{item.icono}</div>
      <div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(74,94,58,.35)"}}>{String(idx+1).padStart(2,"0")}</div>
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontFamily:"'Lora',serif",fontSize:".76rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,169,110,.55)",marginBottom:3}}>{item.momento}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:C,marginBottom:2,lineHeight:1.2}}>{item.cancion}</div>
      <div style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,marginBottom:item.razon?6:0}}>{item.artista}{item.version&&<em style={{color:"rgba(26,26,20,.28)",fontStyle:"italic"}}> · {item.version}</em>}{item.duracion&&<span style={{color:"rgba(26,26,20,.22)",marginLeft:8}}>{item.duracion}</span>}</div>
      {item.razon&&<p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.48)",lineHeight:1.55,margin:"0 0 8px",fontStyle:"italic"}}>{item.razon}</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {item.alt&&<span style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.32)"}}>Alt: {item.alt}</span>}
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <AudioButton cancion={item.cancion} artista={item.artista} version={item.version} alt={item.alt}/>
          <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".82rem",padding:"6px 10px"}}>YT</a>
        </div>
      </div>
    </div>
  </div>;
}

function PlaylistRow({item,num}){
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
  return <div className="ci" onClick={onToggle}>
    <div className={`cb${done?" ck":""}`} style={{borderColor:important&&!done?"rgba(201,169,110,.5)":undefined}}>
      {done&&<span style={{color:G,fontSize:THEME.text.label,fontWeight:700}}>✓</span>}
    </div>
    <span style={{fontFamily:"'Lora',serif",fontSize:"1rem",color:done?"rgba(26,26,20,.22)":C,textDecoration:done?"line-through":"none",lineHeight:1.55,transition:"all .2s"}}>{label}</span>
  </div>;
}

// ─── REPRODUCTOR DE AUDIO (iTunes preview 30s) ────────────────────────────────
function AudioButton({cancion, artista, version, alt}){
  const [state, setState] = useState("idle"); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0);
  const [nowPlaying, setNowPlaying] = useState(null); // { title, artist } | null — solo se setea cuando difiere de lo mostrado en la card
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const cleanup = () => {
    clearInterval(intervalRef.current);
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  };

  useEffect(() => () => cleanup(), []);

  // Separa "Título - Artista" en sus dos partes para poder mostrarlo claramente
  const parseAlt = (str) => {
    if(!str) return { title: str, artist: "" };
    const parts = str.split(" - ");
    if(parts.length >= 2) return { title: parts[0].trim(), artist: parts.slice(1).join(" - ").trim() };
    return { title: str.trim(), artist: "" };
  };

  // Busca un preview probando varias consultas en orden de especificidad,
  // priorizando lo que SÍ existe en el catálogo y descartando lo que no.
  const buscarPreview = async () => {
    const queries = [];
    if(version && !/^original$/i.test(version.trim())) queries.push({ q:`${cancion} ${artista} ${version}`, isAlt:false });
    queries.push({ q:`${cancion} ${artista}`, isAlt:false });
    queries.push({ q:`${cancion}`, isAlt:false });
    if(alt && alt.trim().length > 2) queries.push({ q:alt, isAlt:true });
    queries.push({ q:`${artista}`, isAlt:true });

    for(const item of queries){
      try{
        const q = encodeURIComponent(item.q);
        const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=10&entity=song&country=US`);
        const data = await res.json();
        const found = data?.results?.find(r => r.previewUrl);
        if(found) return { preview: found.previewUrl, isAlt: item.isAlt, trackName: found.trackName, artistName: found.artistName };
      }catch(e){ /* probar siguiente consulta */ }
    }
    return null;
  };

  const toggle = async () => {
    // Si ya hay audio reproduciéndose → pausar
    if(state === "playing"){
      audioRef.current?.pause();
      clearInterval(intervalRef.current);
      setState("paused");
      return;
    }
    // Si estaba pausado → reanudar
    if(state === "paused"){
      audioRef.current?.play();
      intervalRef.current = setInterval(() => {
        const a = audioRef.current;
        if(!a) return;
        setProgress(a.currentTime / (a.duration || 30) * 100);
        if(a.ended){ setState("idle"); setProgress(0); clearInterval(intervalRef.current); }
      }, 250);
      setState("playing");
      return;
    }
    // Primer play → buscar en iTunes, priorizando resultados con preview disponible
    setState("loading");
    try {
      const result = await buscarPreview();
      if(!result) throw new Error("sin preview disponible");

      const audio = new Audio(result.preview);
      audioRef.current = audio;
      await audio.play();
      // Si el resultado vino de la búsqueda alternativa, mostrar EXACTAMENTE qué está sonando
      // (usamos los metadatos reales que devuelve iTunes, no solo el texto del campo alt)
      setNowPlaying(result.isAlt ? { title: result.trackName || parseAlt(alt).title, artist: result.artistName || parseAlt(alt).artist } : null);
      setState("playing");
      intervalRef.current = setInterval(() => {
        setProgress(audio.currentTime / (audio.duration || 30) * 100);
        if(audio.ended){ setState("idle"); setProgress(0); clearInterval(intervalRef.current); }
      }, 250);
    } catch(e) {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  };

  const icons = { idle:"▶", loading:"·", playing:"⏸", paused:"▶", error:"✕" };
  const labels = { idle:"Preview", loading:"Buscando...", playing:"Pausar", paused:"Reanudar", error:"No disponible" };
  const isActive = state === "playing" || state === "paused";

  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={toggle} style={{
        display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",
        border:`1px solid ${state==="error"?"rgba(255,139,139,.35)":isActive?"rgba(201,169,110,.6)":"rgba(74,94,58,.3)"}`,
        borderRadius:100,background:isActive?"rgba(74,94,58,.08)":"transparent",
        color:state==="error"?"#FF8B8B":"#C9A96E",
        fontFamily:"'Lora',serif",fontWeight:600,fontSize:".88rem",cursor:"pointer",
        transition:"all .2s",minWidth:110,justifyContent:"center",
        opacity:state==="loading"?.7:1
      }}>
        <span style={{fontSize:".8rem",animation:state==="loading"?"pulse 1s infinite":undefined}}>{icons[state]}</span>
        {labels[state]}
      </button>
      {isActive&&<div style={{flex:1,height:3,background:"rgba(74,94,58,.1)",borderRadius:2,overflow:"hidden",minWidth:60}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(to right,#D9B86F,#E6C76A)",transition:"width .25s linear",borderRadius:2}}/>
      </div>}
    </div>
    {isActive&&nowPlaying&&<div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:2}}>
      <span style={{fontSize:THEME.text.label}}>🔊</span>
      <span style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.42)",fontStyle:"italic",lineHeight:1.3}}>
        Sonando: {nowPlaying.title}{nowPlaying.artist?` – ${nowPlaying.artist}`:""} <span style={{color:"rgba(201,169,110,.55)"}}>(no es la versión exacta sugerida)</span>
      </span>
    </div>}
  </div>;
}


// ─── CARRUSEL HORIZONTAL DE MOMENTOS ──────────────────────────────────────────
function GuionCarousel({items}){
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


function Results({results,form,checked,setChecked,arquetipo,resultToken,onRestart,onLogout,onGoHome}){
  const tog=k=>setChecked(c=>({...c,[k]:!c[k]}));
  const [open,setOpen]=useState({resumen:true,arquetipo:false,guion:true,playlists:false,checklist:false,compartir:false,exportar:false});
  const toggle=k=>setOpen(o=>({...o,[k]:!o[k]}));

  if(!results) return null;

  const fecha=form.fechaBoda?new Date(form.fechaBoda+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}):"";
  const arch=ARQUETIPOS[arquetipo];
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


function PurchaseGateModal({open,onClose,initialEmail=""}){
  const [name,setName]=useState("");
  const [email,setEmail]=useState(initialEmail||"");
  const [phone,setPhone]=useState("");
  const [country,setCountry]=useState("PY");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{ if(open){ if(initialEmail) setEmail(initialEmail); trackProductEvent("purchase_modal_opened",{}); } },[open,initialEmail]);
  if(!open) return null;

  const submit=async()=>{
    setError("");
    const cleanEmail=email.toLowerCase().trim();
    if(!cleanEmail.includes("@")) return setError("Escribí un email válido.");
    if(!phone || !isValidPhoneNumber(phone)) return setError("Elegí el país y escribí un celular válido.");
    setLoading(true);
    try{
      const response=await fetch("/api/leads",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:name.trim(),email:cleanEmail,phone,country,calling_code:country?getCountryCallingCode(country):"",demo_key:localStorage.getItem(DEMO_USER_KEY)||null})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data?.error||"No pudimos continuar al pago.");
      try{ localStorage.setItem("ceci_purchase_email",cleanEmail); }catch(e){}
      trackProductEvent("checkout_started", {email_domain:(cleanEmail.split("@")[1]||"")});
      window.location.href=buildHotmartCheckoutUrl(data.checkout_url||HOTMART_CHECKOUT_URL);
    }catch(e){ setError(e.message||"No pudimos continuar al pago."); setLoading(false); }
  };

  return <div data-purchase-gate="true" onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)onClose();}} style={{position:"fixed",inset:0,zIndex:10050,background:"rgba(18,18,14,.62)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
    <div className="fu" style={{width:"100%",maxWidth:480,background:"#FBF7EF",borderRadius:24,padding:"clamp(24px,5vw,38px)",boxShadow:"0 30px 90px rgba(0,0,0,.35)",position:"relative"}}>
      <button aria-label="Cerrar" disabled={loading} onClick={onClose} style={{position:"absolute",right:16,top:14,width:38,height:38,borderRadius:999,border:"1px solid rgba(26,26,20,.12)",background:"white",cursor:"pointer",fontSize:"1.2rem"}}>×</button>
      <div className="brand-logo" style={{marginBottom:12}}>El Violín de Ceci</div>
      <h2 className="brand-title" style={{fontSize:"clamp(1.65rem,5vw,2.15rem)",margin:"0 0 10px"}}>Convertí este avance en tu boda organizada</h2>
      <p className="brand-copy" style={{fontSize:"1rem",margin:"0 0 12px"}}>Ya comprobaste cómo se siente tener decisiones, invitados, presupuesto y proveedores en un solo recorrido. En la prueba los cambios son temporales.</p>
      <div style={{display:"grid",gap:8,margin:"0 0 20px",padding:"13px 14px",background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.15)",borderRadius:14,fontFamily:"'Lora',serif",fontSize:".84rem",lineHeight:1.45,color:"rgba(26,26,20,.68)"}}>
        <span>✓ Guardás tu planificación y continuás desde cualquier dispositivo.</span>
        <span>✓ Descargás el planificador maestro y plantillas por módulo en Excel.</span>
        <span>✓ Accedés a la guía completa de 55 páginas.</span>
      </div>
      <input name="app-field-3007" value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" style={{marginBottom:12}}/>
      <input name="app-field-3008" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={{marginBottom:12}}/>
      <PhoneInput
        id="purchase-phone"
        name="purchase_phone"
        international
        countryCallingCodeEditable={false}
        defaultCountry="PY"
        value={phone}
        onChange={setPhone}
        onCountryChange={c=>c&&setCountry(c)}
        countrySelectProps={{
          id:"purchase-phone-country",
          name:"purchase_phone_country",
          "aria-label":"País del número de celular"
        }}
        placeholder="Celular"
        autoComplete="tel"
      />
      {error&&<p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:"#b64343",lineHeight:1.45,margin:"8px 0 12px"}}>{error}</p>}
      <button className="pbtn" disabled={loading} onClick={submit} style={{width:"100%",marginTop:8}}>{loading?"Preparando pago...":"Ir al pago seguro →"}</button>
      <p style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:DIMSOFT,lineHeight:1.45,textAlign:"center",margin:"14px 0 0"}}>El pago se procesa en Hotmart. Usá el mismo email para comprar y para crear tu acceso.</p>
    </div>
  </div>;
}

function LockedAccessScreen({email,onBuy,onLogout,onCreateAccess}){
  return <div style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(18px,4vw,42px)"}}>
    <div className="fu auth-card" style={{textAlign:"center"}}>
      <div className="brand-logo" style={{marginBottom:14}}>El Violín de Ceci</div>
      <h1 className="brand-title" style={{fontSize:"clamp(1.8rem,6vw,2.35rem)",margin:"0 0 10px"}}>Tu cuenta todavía no está habilitada</h1>
      <p className="brand-copy" style={{fontSize:"1rem",margin:"0 0 22px"}}>No encontramos una compra aprobada para <strong>{email}</strong>. Si acabás de pagar, esperá la confirmación de Hotmart y volvé a entrar con el mismo email.</p>
      <button className="pbtn" onClick={onBuy} style={{width:"100%",marginBottom:10}}>Comprar el acceso →</button>
      <button className="gbtn" onClick={onCreateAccess} style={{width:"100%",marginBottom:10}}>Usar otro email</button>
      <button onClick={onLogout} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:DIM,textDecoration:"underline",cursor:"pointer",padding:8}}>Cerrar sesión</button>
    </div>
  </div>;
}

function AuthScreen({ initialMode="login", initialError="", initialEmail="", onPasswordUpdated, onTryFree, onBuy, onBack }={}){
  const [mode,setMode]=useState(initialMode);
  const [email,setEmail]=useState(initialEmail||"");
  const [password,setPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState(initialError || "");

  useEffect(()=>{
    setMode(initialMode || "login");
    if(initialEmail) setEmail(initialEmail);
    setErr(initialError || "");
    setMsg("");
  },[initialMode, initialError, initialEmail]);

  useEffect(()=>{
    if(!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event)=>{
      if(event === "PASSWORD_RECOVERY") setMode("update");
    });
    return()=>subscription.unsubscribe();
  },[]);

  const clean=()=>{setMsg("");setErr("");};

  const signUp=async()=>{
    clean();
    if(!supabase) return setErr("No está configurada la conexión con Supabase.");
    if(!email || !password) return setErr("Completá email y contraseña.");
    if(password.length<6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const redirectUrl = `${window.location.origin}/?modo=ingresar`;
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options:{ emailRedirectTo: redirectUrl }
    });
    setLoading(false);
    if(error){
      console.error("Supabase signUp error:", error);
      const errorText = error.message?.toLowerCase() || "";
      if(errorText.includes("already") || errorText.includes("registered")) return setErr("Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.");
      if(errorText.includes("redirect") || errorText.includes("url")) return setErr("El dominio de la app no está autorizado en Supabase. Agregá https://tu-boda-organizada.vercel.app/** en Auth → URL Configuration → Redirect URLs.");
      if(errorText.includes("signup") || errorText.includes("disabled")) return setErr("La activación está deshabilitada en Supabase. Revisá Auth → Providers → Email.");
      return setErr(error.message || "No pudimos activar el acceso. Revisá los datos e intentá de nuevo.");
    }
    if(data?.session){
      setMsg("Acceso activado. Estamos verificando tu compra.");
      return;
    }
    setMsg("Revisá tu email para confirmar la cuenta. Después vas a poder ingresar con tu contraseña.");
    setMode("login");
  };

  const signIn=async()=>{
    clean();
    if(!email || !password) return setErr("Completá email y contraseña.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({email:email.toLowerCase().trim(),password});
    setLoading(false);
    if(error) return setErr("El email o la contraseña no coinciden. Podés volver a intentar o recuperar tu contraseña.");
  };

  const forgot=async()=>{
    clean();
    if(!email) return setErr("Escribí tu email para recuperar la contraseña.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {redirectTo:`${window.location.origin}/?auth=recovery`});
    setLoading(false);
    if(error) return setErr("No pudimos enviar el email. Revisá la dirección e intentá nuevamente.");
    setMsg("Revisá tu correo. Si existe una cuenta asociada, vas a recibir un enlace para crear una nueva contraseña.");
  };

  const updatePassword=async()=>{
    clean();
    if(!newPassword || newPassword.length<6) return setErr("La nueva contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password:newPassword });
    setLoading(false);
    if(error) return setErr(error.message);
    try { localStorage.removeItem("bsb_session"); localStorage.removeItem("bsb_form"); localStorage.removeItem("bsb_step"); } catch(e) {}
    setMsg("Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.");
    try { await supabase.auth.signOut(); } catch(e) {}
    setMode("login");
    if(onPasswordUpdated) onPasswordUpdated();
  };

  const submitCurrent=()=>{
    if(loading) return;
    if(mode==="login") return signIn();
    if(mode==="signup") return signUp();
    if(mode==="forgot") return forgot();
    if(mode==="update") return updatePassword();
  };

  const title = mode==="signup" ? "Activar mi acceso" : mode==="forgot" ? "Recuperar contraseña" : mode==="update" ? "Crear nueva contraseña" : "Ingresá a tu compra";
  const subtitle = mode==="signup" ? "Creá tu contraseña con el mismo email que utilizaste al comprar en Hotmart." : mode==="forgot" ? "Te enviaremos un enlace para que puedas volver a ingresar." : mode==="update" ? "Definí una nueva contraseña para recuperar tu cuenta." : "Usá el mismo email y la contraseña que elegiste al activar tu acceso.";

  return <div className="auth-floral-bg" style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(18px,4vw,42px)"}}>
    <div className="fu auth-card" onKeyDown={e=>{if(e.key==="Enter"&&e.target?.tagName!=="BUTTON")submitCurrent();}} style={{textAlign:"center",position:"relative",zIndex:1}}>
      {onBack&&mode!=="update"&&<button type="button" onClick={onBack} style={{position:"absolute",left:16,top:14,background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.55)",cursor:"pointer"}}>← Inicio</button>}
      <div className="brand-logo" style={{marginBottom:14}}>El Violín de Ceci</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.85rem,6vw,2.35rem)",fontWeight:600,color:"#1A1A14",margin:"0 0 8px",lineHeight:1.15}}>{title}</h1>
      <p className="brand-copy" style={{fontSize:"clamp(.96rem,3vw,1.08rem)",margin:"0 0 22px"}}>{subtitle}</p>

      {mode!=="update"&&<>
        <label htmlFor="auth-email" style={{display:"block",textAlign:"left",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:700,color:"#4A5E3A"}}>Email</label>
        <input id="auth-email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={{textAlign:"left",marginBottom:12}} />
        {mode!=="forgot"&&<div style={{position:"relative",marginBottom:18}}>
          <label htmlFor="auth-password" style={{display:"block",textAlign:"left",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:700,color:"#4A5E3A"}}>Contraseña</label>
          <input id="auth-password" type={showPassword?"text":"password"} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder={mode==="signup"?"Mínimo 6 caracteres":"Tu contraseña"} value={password} onChange={e=>setPassword(e.target.value)} style={{textAlign:"left",paddingRight:74}} />
          <button type="button" aria-label={showPassword?"Ocultar contraseña":"Mostrar contraseña"} onClick={()=>setShowPassword(v=>!v)} style={{position:"absolute",right:2,bottom:9,background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:700,color:"#4A5E3A",cursor:"pointer",padding:6}}>{showPassword?"Ocultar":"Ver"}</button>
        </div>}
      </>}

      {mode==="update"&&<div style={{position:"relative",marginBottom:18}}>
        <label htmlFor="auth-new-password" style={{display:"block",textAlign:"left",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:700,color:"#4A5E3A"}}>Nueva contraseña</label>
        <input id="auth-new-password" type={showPassword?"text":"password"} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{textAlign:"left",paddingRight:74}} />
        <button type="button" onClick={()=>setShowPassword(v=>!v)} style={{position:"absolute",right:2,bottom:9,background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".76rem",fontWeight:700,color:"#4A5E3A",cursor:"pointer",padding:6}}>{showPassword?"Ocultar":"Ver"}</button>
      </div>}

      {err&&<p role="alert" style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"#B5443A",background:"rgba(181,68,58,.07)",borderRadius:10,padding:"10px 12px",lineHeight:1.5,margin:"0 0 12px"}}>{err}</p>}
      {msg&&<p role="status" style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"#31512C",background:"rgba(74,94,58,.08)",borderRadius:10,padding:"10px 12px",lineHeight:1.5,margin:"0 0 12px"}}>{msg}</p>}

      {mode==="login"&&<button className="pbtn" disabled={loading} onClick={signIn} style={{width:"100%"}}>{loading?"Ingresando...":"Ingresar a mi cuenta →"}</button>}
      {mode==="signup"&&<button className="pbtn" disabled={loading} onClick={signUp} style={{width:"100%"}}>{loading?"Activando...":"Activar mi acceso →"}</button>}
      {mode==="forgot"&&<button className="pbtn" disabled={loading} onClick={forgot} style={{width:"100%"}}>{loading?"Enviando...":"Enviar enlace de recuperación →"}</button>}
      {mode==="update"&&<button className="pbtn" disabled={loading} onClick={updatePassword} style={{width:"100%"}}>{loading?"Guardando...":"Guardar nueva contraseña →"}</button>}

      {mode==="login"&&<button type="button" onClick={()=>{clean();setMode("forgot");}} style={{background:"transparent",border:"none",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".9rem",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3,marginTop:14}}>Olvidé mi contraseña</button>}

      <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid rgba(201,169,110,.18)",display:"flex",flexDirection:"column",gap:9}}>
        {mode==="login"&&<button type="button" onClick={()=>{clean();setMode("signup");}} style={{width:"100%",minHeight:52,border:"1.5px solid rgba(74,94,58,.48)",borderRadius:999,background:"rgba(74,94,58,.06)",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".94rem",fontWeight:800,cursor:"pointer"}}>Es mi primera vez: activar acceso →</button>}
        {mode==="signup"&&<button className="gbtn" onClick={()=>{clean();setMode("login");}} style={{width:"100%"}}>Ya activé mi acceso</button>}
        {mode==="forgot"&&<><button className="gbtn" onClick={()=>{clean();setMode("login");}} style={{width:"100%"}}>Volver a ingresar</button><button type="button" onClick={()=>{clean();setEmail("");}} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:"rgba(26,26,20,.55)",textDecoration:"underline",cursor:"pointer",padding:6}}>Usar otro email</button></>}
      </div>

      {mode==="login"&&onTryFree&&<div style={{marginTop:22,padding:"17px",background:"rgba(217,184,111,.12)",border:"1px solid rgba(201,169,110,.34)",borderRadius:16,textAlign:"center"}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",lineHeight:1.5,color:"rgba(26,26,20,.62)",marginBottom:10}}>¿Todavía no compraste? Podés conocer las herramientas antes de decidir.</div>
        <button type="button" className="gbtn" onClick={onTryFree} style={{width:"100%"}}>Probar la demo sin registro</button>
        {onBuy&&<button type="button" onClick={onBuy} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:"#4A5E3A",textDecoration:"underline",cursor:"pointer",padding:"13px 8px 0"}}>Comprar acceso completo</button>}
      </div>}

      {mode==="signup"&&<p style={{fontFamily:"'Lora',serif",fontSize:".74rem",lineHeight:1.45,color:"rgba(26,26,20,.45)",margin:"14px 0 0"}}>La app verificará automáticamente que exista una compra aprobada para este email.</p>}
    </div>
  </div>;
}



const START_STAGE_META = {
  starting:{label:"Recién empezando",short:"Primeros pasos",icon:"spark"},
  foundations:{label:"Definiendo las bases",short:"Bases de la boda",icon:"plan"},
  execution:{label:"Organización en marcha",short:"En plena organización",icon:"vendors"},
  final:{label:"Cerrando detalles",short:"Últimas semanas",icon:"timeline"}
};

const getDaysUntilWedding = (dateValue) => {
  if(!dateValue) return null;
  const target = new Date(`${dateValue}T12:00:00`);
  if(Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0);
  return Math.ceil((target.getTime()-today.getTime())/86400000);
};

const getWeddingTimingLabel = (days) => {
  if(days===null) return "Fecha todavía no definida";
  if(days<0) return "La fecha de la boda ya pasó";
  if(days===0) return "Hoy es el gran día";
  if(days===1) return "Falta 1 día";
  if(days<30) return `Faltan ${days} días`;
  const months = Math.max(1,Math.round(days/30.4));
  return months===1 ? "Falta cerca de 1 mes" : `Faltan cerca de ${months} meses`;
};

function ProductIcon({name,size=24,color="currentColor",strokeWidth=1.8}){
  let content = null;
  switch(name){
    case "home": content=<><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>; break;
    case "grid": content=<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>; break;
    case "plan": content=<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="m8 10 1.5 1.5L12 9"/><path d="M13.5 10h3"/><path d="m8 15 1.5 1.5L12 14"/><path d="M13.5 15h3"/></>; break;
    case "budget": content=<><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.8-1.9-1.2-3.2-1.2-1.8 0-3 .9-3 2.2 0 1.5 1.3 2 3.2 2.4 1.9.4 3.2.9 3.2 2.5 0 1.5-1.4 2.5-3.5 2.5-1.5 0-2.8-.5-3.7-1.4"/><path d="M12 5.7v12.6"/></>; break;
    case "guests": content=<><circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6"/><path d="M14 15c3.4.2 5.3 1.8 5.8 5"/></>; break;
    case "salon": content=<><path d="M3 9h18"/><path d="M5 9v10M9 9v10M15 9v10M19 9v10"/><path d="M2.5 19h19"/><path d="m12 3 9 5H3l9-5Z"/></>; break;
    case "vendors": content=<><rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2"/><path d="M10 21v-3h4v3"/></>; break;
    case "timeline": content=<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="M7 2 4 5M17 2l3 3"/></>; break;
    case "music": content=<><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></>; break;
    case "guide": content=<><path d="M4 5.5C6.5 4.5 9 5 12 7v13c-3-2-5.5-2.5-8-1.5v-13Z"/><path d="M20 5.5C17.5 4.5 15 5 12 7v13c3-2 5.5-2.5 8-1.5v-13Z"/></>; break;
    case "account": content=<><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.6-4.8 3.2-7 7.5-7s6.9 2.2 7.5 7"/></>; break;
    case "compass": content=<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></>; break;
    case "spark": content=<><path d="M12 2.8c.5 4.2 2.8 6.5 7 7-4.2.5-6.5 2.8-7 7-.5-4.2-2.8-6.5-7-7 4.2-.5 6.5-2.8 7-7Z"/><path d="M19 16.5c.2 1.4 1 2.2 2.4 2.4-1.4.2-2.2 1-2.4 2.4-.2-1.4-1-2.2-2.4-2.4 1.4-.2 2.2-1 2.4-2.4Z"/></>; break;
    default: content=<circle cx="12" cy="12" r="8"/>;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{content}</svg>;
}

function GlobalProgress({ user, hasResults }){
  const [pct, setPct] = useState(0);
  const [breakdown, setBreakdown] = useState([]);

  useEffect(()=>{
    if(!user) return;
    let cancelled = false;
    const compute = async () => {
      const scores = [];

      // 1. Banda Sonora (test IA completado)
      scores.push({ label:"Banda sonora", done: !!hasResults });

      // Cargamos todo de wedding_data en una sola consulta
      let row = null;
      try {
        const { data } = await dataClient(user)
          .from("wedding_data")
          .select("budget,vendors,guests,checklist_general,checklist_custom")
          .eq("user_id", user.id)
          .maybeSingle();
        row = data;
      } catch(e){}

      // 2. Presupuesto: total > 0 y al menos 8 categorías con estimado > 0
      const budget = row?.budget;
      const catsConMonto = (budget?.categorias||[]).filter(c=>(c.estimado||0)>0).length;
      scores.push({ label:"Presupuesto", done: (budget?.total||0)>0 && catsConMonto>=8 });

      // 3. Proveedores: mín 3 contratados o pagados
      const vendors = Array.isArray(row?.vendors) ? row.vendors : [];
      const contratados = vendors.filter(v=>v.estado==="contratado"||v.estado==="pagado").length;
      scores.push({ label:"Proveedores", done: contratados>=3 });

      // 4. Checklist: todas las tareas default marcadas como true
      const chkGen = row?.checklist_general || {};
      const chkCustom = row?.checklist_custom || {};
      const totalChk = Object.keys(chkGen).length + Object.keys(chkCustom).length;
      const doneChk = Object.values(chkGen).filter(Boolean).length + Object.values(chkCustom).filter(v=>v===true||v?.done===true).length;
      scores.push({ label:"Checklist", done: totalChk>0 && doneChk===totalChk });

      // 5. Invitados: 5+ y 80%+ con confirmacion resuelta
      const guests = Array.isArray(row?.guests) ? row.guests : [];
      const totalGuests = guests.length;
      const resueltos = guests.filter(g=>g.confirmacion==="confirmado"||g.confirmacion==="no_va").length;
      scores.push({ label:"Invitados", done: totalGuests>=5 && totalGuests>0 && (resueltos/totalGuests)>=0.8 });

      // 6. Cronograma aprobado por ambos novios
      let cronoAprobado = false;
      try {
        const { data: trow } = await dataClient(user).from("wedding_data").select("timeline_aprobacion").eq("user_id", user.id).maybeSingle();
        cronoAprobado = !!(trow?.timeline_aprobacion?.n1 && trow?.timeline_aprobacion?.n2);
      } catch(e){}
      scores.push({ label:"Cronograma", done: cronoAprobado });

      if(!cancelled){
        const doneCnt = scores.filter(s=>s.done).length;
        setPct(Math.round((doneCnt/scores.length)*100));
        setBreakdown(scores);
      }
    };
    compute();
    return ()=>{ cancelled=true; };
  },[user, hasResults]);

  if(!user) return null;
  const clr = pct>=80?"#4A5E3A":pct>=40?"#C9A96E":"rgba(74,94,58,.45)";

  return <div style={{background:"rgba(74,94,58,.05)",border:"0.5px solid rgba(74,94,58,.18)",borderRadius:14,padding:"14px 16px",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
      <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A"}}>Progreso de tu boda</span>
      <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"1.1rem",color:clr}}>{pct}%</span>
    </div>
    <div style={{background:"rgba(201,169,110,.15)",borderRadius:100,height:6,overflow:"hidden",marginBottom:10}}>
      <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#4A5E3A,#7A9A5A)",borderRadius:100,transition:"width .6s ease"}}/>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px"}}>
      {breakdown.map(({label,done})=>(
        <span key={label} style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:done?"#4A5E3A":"rgba(26,26,20,.38)",display:"flex",alignItems:"center",gap:3}}>
          <span style={{fontSize:THEME.text.label}}>{done?"✓":"○"}</span>{label}
        </span>
      ))}
    </div>
  </div>;
}

function HomeScreen({ user, hasResults, form, resultToken, onViewResults, onStartNew, onLogout, onGoModule, isDemo=false, onRequestPurchase, onOpenStart }){
  const pareja = [form?.nombre1, form?.nombre2].filter(Boolean).join(" & ");
  const profile = readStartProfile();
  const recommendation = getWeddingRecommendation(profile || {});
  const stageMeta = START_STAGE_META[profile?.stage] || START_STAGE_META.starting;
  const daysUntilWedding = getDaysUntilWedding(form?.fechaBoda);
  const timingLabel = getWeddingTimingLabel(daysUntilWedding);
  const finalWeeks = profile?.stage==="final" || (daysUntilWedding!==null && daysUntilWedding>=0 && daysUntilWedding<=45);
  const [demoHasChanges,setDemoHasChanges] = useState(()=>Object.keys(readDemoWeddingData() || {}).length > 0);

  useEffect(()=>{
    if(!isDemo) return;
    const markChanged=()=>setDemoHasChanges(true);
    window.addEventListener("ceci-demo-change",markChanged);
    return()=>window.removeEventListener("ceci-demo-change",markChanged);
  },[isDemo]);

  const openModule = (id) => {
    trackProductEvent("module_opened", {module:id,is_demo:isDemo,source:"home_v10"});
    onGoModule(id);
  };

  const modules = [
    {id:"checklist-boda",icon:"plan",label:"Plan y checklist",desc:"Qué hacer, en qué orden y qué falta."},
    {id:"budget",icon:"budget",label:"Presupuesto",desc:"Categorías, pagos y control del total."},
    {id:"guests",icon:"guests",label:"Invitados",desc:"Lista, etiquetas y distribución."},
    {id:"salon-design",icon:"salon",label:"Diseño del salón",desc:"Medidas, mesas, muebles y circulación."},
    {id:"vendors",icon:"vendors",label:"Proveedores",desc:"Propuestas, contactos y decisiones."},
    {id:"timeline",icon:"timeline",label:"Cronograma",desc:"Secuencia y responsables del gran día."},
    {id:"guia",icon:"music",label:"Música",desc:hasResults?"Tu guion musical personalizado.":"Test y planificación musical."},
    {id:"guia-novios",icon:"guide",label:"Guía para novios",desc:"Protocolo, ceremonia y consejos."}
  ];

  return <div style={{minHeight:"100svh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"clamp(16px,4vw,42px) clamp(12px,4vw,42px) 112px",background:"#F5EFE0"}}>
    <div className="fu" style={{width:"100%",maxWidth:920}}>
      {isDemo&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:"#FFFDF8",border:"1px solid rgba(74,94,58,.16)",borderRadius:16,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",lineHeight:1.45,color:"rgba(26,26,20,.62)"}}><strong style={{color:"#4A5E3A"}}>Modo prueba.</strong> Podés avanzar y experimentar resultados. Los datos se borran al recargar o salir.</div>
        <button className="lbtn" onClick={onRequestPurchase} style={{fontSize:".78rem"}}>Conservar mi planificación</button>
      </div>}

      <header style={{textAlign:"center",padding:"clamp(24px,5vw,40px) 18px 22px"}}>
        <div className="brand-logo" style={{marginBottom:10}}>Tu Boda Organizada</div>
        <h1 className="brand-title" style={{fontSize:"clamp(2rem,6vw,3.25rem)",margin:"0 0 10px",lineHeight:1.04}}>{pareja?`Hola, ${pareja}`:"Un paso claro a la vez"}</h1>
        <p className="brand-copy" style={{fontSize:"clamp(.95rem,2vw,1.06rem)",margin:"0 auto",maxWidth:620,lineHeight:1.62}}>No necesitás resolver todo hoy. Te mostramos qué conviene priorizar según el momento de tu boda.</p>
        <div className="home-v10-summary">
          <span className="home-v10-chip"><ProductIcon name={stageMeta.icon} size={17}/>{profile?stageMeta.label:"Etapa todavía no definida"}</span>
          <span className="home-v10-chip"><ProductIcon name="timeline" size={17}/>{timingLabel}</span>
        </div>
      </header>

      <section style={{background:"#4A5E3A",borderRadius:24,padding:"clamp(22px,5vw,34px)",color:"#F5EFE0",marginBottom:16,boxShadow:"0 16px 38px rgba(74,94,58,.16)"}}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:18}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
            <div className="product-icon-wrap gold"><ProductIcon name={profile?recommendation.module==="budget"?"budget":recommendation.module==="guests"?"guests":recommendation.module==="salon-design"?"salon":recommendation.module==="vendors"?"vendors":recommendation.module==="timeline"?"timeline":recommendation.module==="guia"?"music":"plan":"compass"} size={24}/></div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".15em",textTransform:"uppercase",color:"#D9B86F",marginBottom:8}}>{profile?"Tu próximo paso":"Empecemos por ubicarte"}</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.55rem,4vw,2.15rem)",margin:"0 0 8px",lineHeight:1.08}}>{profile?recommendation.title:"Decinos en qué etapa está tu boda"}</h2>
              <p style={{fontFamily:"'Lora',serif",fontSize:".94rem",lineHeight:1.58,color:"rgba(245,239,224,.74)",margin:0}}>{profile?recommendation.why:"Respondé dos preguntas y convertimos un menú de herramientas en un próximo paso concreto."}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            {profile&&<button type="button" onClick={()=>openModule(recommendation.module)} style={{background:"#D9B86F",color:"#1A1A14",border:"none",borderRadius:999,padding:"13px 20px",fontFamily:"'Lora',serif",fontWeight:800,cursor:"pointer"}}>{recommendation.cta} →</button>}
            <button type="button" onClick={onOpenStart} style={{background:profile?"transparent":"#D9B86F",color:profile?"#F5EFE0":"#1A1A14",border:profile?"1px solid rgba(245,239,224,.4)":"none",borderRadius:999,padding:"12px 18px",fontFamily:"'Lora',serif",fontWeight:700,cursor:"pointer"}}>{profile?"Actualizar mi etapa":"Crear mi plan →"}</button>
          </div>
        </div>
      </section>

      {profile&&<div className="home-v10-focus">
        <section className="home-v10-steps">
          <div className="brand-logo" style={{fontSize:THEME.text.label,marginBottom:7}}>Tu foco de esta etapa</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.35rem",margin:"0 0 8px"}}>Tres acciones para avanzar sin dispersarte</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.5)",lineHeight:1.5,margin:"0 0 8px"}}>No es una lista completa. Es un orden sugerido para comenzar.</p>
          {(recommendation.steps||[]).map((stepText,index)=><div className="home-v10-step" key={stepText}>
            <span className="home-v10-step-num">{index+1}</span>
            <span style={{fontFamily:"'Lora',serif",fontSize:".88rem",lineHeight:1.5,color:"rgba(26,26,20,.68)"}}>{stepText}</span>
          </div>)}
        </section>

        {finalWeeks?<aside className="home-v10-final">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><ProductIcon name="timeline" size={22} color="#4A5E3A"/><div className="brand-logo" style={{fontSize:THEME.text.label}}>Modo últimas semanas</div></div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.32rem",margin:"0 0 7px"}}>Ahora importa confirmar y delegar</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",lineHeight:1.5,color:"rgba(26,26,20,.58)",margin:0}}>Priorizá solamente lo que puede afectar el gran día.</p>
          <div className="home-v10-final-actions">
            <button onClick={()=>openModule("checklist-boda")}><span>Revisar pendientes críticos</span><span>→</span></button>
            <button onClick={()=>openModule("timeline")}><span>Cerrar cronograma</span><span>→</span></button>
            <button onClick={()=>openModule("vendors")}><span>Confirmar proveedores</span><span>→</span></button>
          </div>
        </aside>:<aside className="home-v10-final" style={{background:"#EEF0E7",borderColor:"rgba(74,94,58,.18)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><ProductIcon name="spark" size={22} color="#4A5E3A"/><div className="brand-logo" style={{fontSize:THEME.text.label}}>Recordatorio</div></div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.32rem",margin:"0 0 7px"}}>No hace falta completar todo</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".84rem",lineHeight:1.55,color:"rgba(26,26,20,.58)",margin:"0 0 14px"}}>Usá una herramienta, cerrá una decisión y después volvé por el siguiente paso.</p>
          <button className="gbtn" onClick={onOpenStart} style={{width:"100%",background:"rgba(255,253,248,.7)"}}>Revisar mi recorrido</button>
        </aside>}
      </div>}

      {isDemo&&demoHasChanges&&<div style={{background:"#FFFDF8",border:"1px solid rgba(201,169,110,.34)",borderRadius:17,padding:"15px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:".84rem",color:"rgba(26,26,20,.62)",lineHeight:1.45}}>Ya empezaste a ordenar tu boda. El acceso completo conserva y conecta estos avances.</div>
        <button className="pbtn" onClick={onRequestPurchase} style={{padding:"11px 20px",minHeight:44}}>Guardar mi avance →</button>
      </div>}

      {!isDemo&&<GlobalProgress user={user} hasResults={hasResults}/>}

      <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12,margin:"22px 0 13px"}}>
        <div><div className="brand-logo" style={{fontSize:THEME.text.label,marginBottom:4}}>Tus herramientas</div><div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.45)"}}>Entrá directamente cuando ya sabés qué necesitás resolver.</div></div>
      </div>
      <div className="modules-card-grid modules-card-grid-wide" style={{marginBottom:24}}>
        {modules.map(item=><button key={item.id} className="module-card module-card-v10" type="button" onClick={()=>item.id==="guia"?(hasResults?onViewResults():onStartNew()):openModule(item.id)} style={{background:item.id===recommendation.module&&profile?"#EEF0E7":"#FFFDF8",border:`1px solid ${item.id===recommendation.module&&profile?"rgba(74,94,58,.35)":"rgba(201,169,110,.24)"}`,borderRadius:18,padding:"16px 13px",textAlign:"left",cursor:"pointer",minHeight:150,boxShadow:"0 6px 18px rgba(63,50,31,.045)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:11}}><span className="product-icon-wrap"><ProductIcon name={item.icon} size={23}/></span>{item.id===recommendation.module&&profile&&<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"#4A5E3A",fontWeight:800}}>Recomendado</span>}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"1rem",marginBottom:6}}>{item.label}</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",lineHeight:1.45,color:"rgba(26,26,20,.48)"}}>{item.desc}</div>
        </button>)}
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center",flexWrap:"wrap",paddingTop:16,borderTop:"1px solid rgba(201,169,110,.16)"}}>
        <button className="gbtn" onClick={onOpenStart} style={{fontSize:".84rem",padding:"9px 17px"}}>Actualizar mi etapa</button>
        <button className="gbtn" onClick={onLogout} style={{fontSize:".84rem",padding:"9px 17px"}}>{isDemo?"Salir de la prueba":"Cerrar sesión"}</button>
      </div>
    </div>
  </div>;
}

const EMPTY_FORM={
  nombre1:"",nombre2:"",fechaBoda:"",ciudad:"",invitados:"",
  tipoCeremonia:[],lugarCeremonia:"",duracion:"",restriccionIglesia:"",
  palabrasEstilo:[],objetivoEmocional:"",personalidad:"",
  generos:[],artistas:"",cancionesProhibidas:"",idioma:"",
  momentosSeleccionados:[],formatoMusical:[],
  cancionPersonal:"",recuerdo:"",email:"",denominacionReligiosa:"",lugarCeremoniaReligiosa:""
};




const CURRENCIES = [
  // América Latina (primero por ser el mercado principal)
  {code:"PYG", symbol:"₲",  label:"Guaraní paraguayo"},
  {code:"ARS", symbol:"$",  label:"Peso argentino"},
  {code:"BRL", symbol:"R$", label:"Real brasileño"},
  {code:"UYU", symbol:"$U", label:"Peso uruguayo"},
  {code:"BOB", symbol:"Bs", label:"Boliviano"},
  {code:"CLP", symbol:"$",  label:"Peso chileno"},
  {code:"COP", symbol:"$",  label:"Peso colombiano"},
  {code:"PEN", symbol:"S/", label:"Sol peruano"},
  {code:"VES", symbol:"Bs",  label:"Bolívar venezolano"},
  {code:"CRC", symbol:"₡",  label:"Colón costarricense"},
  {code:"GTQ", symbol:"Q",  label:"Quetzal guatemalteco"},
  {code:"HNL", symbol:"L",  label:"Lempira hondureño"},
  {code:"NIO", symbol:"C$", label:"Córdoba nicaragüense"},
  {code:"PAB", symbol:"B/", label:"Balboa panameño"},
  {code:"DOP", symbol:"RD$",label:"Peso dominicano"},
  {code:"CUP", symbol:"$",  label:"Peso cubano"},
  {code:"HTG", symbol:"G",  label:"Gourde haitiano"},
  {code:"JMD", symbol:"J$", label:"Dólar jamaicano"},
  {code:"TTD", symbol:"TT$",label:"Dólar de Trinidad"},
  {code:"BBD", symbol:"$",  label:"Dólar de Barbados"},
  {code:"BMD", symbol:"$",  label:"Dólar de Bermudas"},
  {code:"XCD", symbol:"$",  label:"Dólar caribeño oriental"},
  // Norteamérica
  {code:"USD", symbol:"$",  label:"Dólar estadounidense"},
  {code:"CAD", symbol:"$",  label:"Dólar canadiense"},
  {code:"MXN", symbol:"$",  label:"Peso mexicano"},
  // Europa
  {code:"EUR", symbol:"€",  label:"Euro"},
  {code:"GBP", symbol:"£",  label:"Libra esterlina"},
  {code:"CHF", symbol:"Fr", label:"Franco suizo"},
  {code:"SEK", symbol:"kr", label:"Corona sueca"},
  {code:"NOK", symbol:"kr", label:"Corona noruega"},
  {code:"DKK", symbol:"kr", label:"Corona danesa"},
  {code:"PLN", symbol:"zł", label:"Esloti polaco"},
  {code:"CZK", symbol:"Kč", label:"Corona checa"},
  {code:"HUF", symbol:"Ft", label:"Forinto húngaro"},
  {code:"RON", symbol:"lei",label:"Leu rumano"},
  {code:"BGN", symbol:"лв", label:"Lev búlgaro"},
  {code:"HRK", symbol:"kn", label:"Kuna croata"},
  {code:"RSD", symbol:"din",label:"Dinar serbio"},
  {code:"ISK", symbol:"kr", label:"Corona islandesa"},
  {code:"UAH", symbol:"₴",  label:"Grivna ucraniana"},
  {code:"RUB", symbol:"₽",  label:"Rublo ruso"},
  {code:"TRY", symbol:"₺",  label:"Lira turca"},
  {code:"GEL", symbol:"₾",  label:"Lari georgiano"},
  {code:"AMD", symbol:"֏",  label:"Dram armenio"},
  // Asia-Pacífico
  {code:"JPY", symbol:"¥",  label:"Yen japonés"},
  {code:"CNY", symbol:"¥",  label:"Yuan chino"},
  {code:"KRW", symbol:"₩",  label:"Won surcoreano"},
  {code:"INR", symbol:"₹",  label:"Rupia india"},
  {code:"AUD", symbol:"$",  label:"Dólar australiano"},
  {code:"NZD", symbol:"$",  label:"Dólar neozelandés"},
  {code:"SGD", symbol:"$",  label:"Dólar singapurense"},
  {code:"HKD", symbol:"$",  label:"Dólar de Hong Kong"},
  {code:"TWD", symbol:"$",  label:"Nuevo dólar taiwanés"},
  {code:"THB", symbol:"฿",  label:"Baht tailandés"},
  {code:"MYR", symbol:"RM", label:"Ringgit malayo"},
  {code:"IDR", symbol:"Rp", label:"Rupia indonesia"},
  {code:"PHP", symbol:"₱",  label:"Peso filipino"},
  {code:"VND", symbol:"₫",  label:"Dong vietnamita"},
  {code:"PKR", symbol:"₨",  label:"Rupia pakistaní"},
  {code:"BDT", symbol:"৳",  label:"Taka bangladesí"},
  {code:"LKR", symbol:"₨",  label:"Rupia de Sri Lanka"},
  {code:"NPR", symbol:"₨",  label:"Rupia nepalesa"},
  {code:"MMK", symbol:"K",  label:"Kyat birmano"},
  {code:"KHR", symbol:"៛",  label:"Riel camboyano"},
  {code:"LAK", symbol:"₭",  label:"Kip laosiano"},
  {code:"MNT", symbol:"₮",  label:"Tugrik mongol"},
  {code:"KZT", symbol:"₸",  label:"Tenge kazajo"},
  {code:"UZS", symbol:"сум",label:"Som uzbeko"},
  // Medio Oriente y África
  {code:"AED", symbol:"د.إ",label:"Dírham emiratí"},
  {code:"SAR", symbol:"﷼",  label:"Riyal saudí"},
  {code:"QAR", symbol:"﷼",  label:"Riyal catarí"},
  {code:"KWD", symbol:"د.ك",label:"Dinar kuwaití"},
  {code:"BHD", symbol:"BD", label:"Dinar bareiní"},
  {code:"OMR", symbol:"﷼",  label:"Riyal omaní"},
  {code:"JOD", symbol:"JD", label:"Dinar jordano"},
  {code:"ILS", symbol:"₪",  label:"Nuevo séquel israelí"},
  {code:"EGP", symbol:"£",  label:"Libra egipcia"},
  {code:"MAD", symbol:"MAD",label:"Dírham marroquí"},
  {code:"TND", symbol:"د.ت",label:"Dinar tunecino"},
  {code:"DZD", symbol:"دج", label:"Dinar argelino"},
  {code:"LYD", symbol:"LD", label:"Dinar libio"},
  {code:"NGN", symbol:"₦",  label:"Naira nigeriana"},
  {code:"ZAR", symbol:"R",  label:"Rand sudafricano"},
  {code:"KES", symbol:"KSh",label:"Chelín keniano"},
  {code:"GHS", symbol:"GH₵",label:"Cedi ghanés"},
  {code:"ETB", symbol:"Br", label:"Birr etíope"},
  {code:"TZS", symbol:"TSh",label:"Chelín tanzano"},
  {code:"UGX", symbol:"USh",label:"Chelín ugandés"},
  {code:"RWF", symbol:"FRw",label:"Franco ruandés"},
  {code:"XOF", symbol:"CFA",label:"Franco CFA Oeste"},
  {code:"XAF", symbol:"CFA",label:"Franco CFA Central"},
];
const getCurrencySymbol = (code) => CURRENCIES.find(c=>c.code===code)?.symbol || code;

// Unidades aproximadas de cada moneda equivalentes a USD 1.
// Se usan solo para sugerir el tipo de cambio inicial; el usuario puede editarlo.
const FX_UNITS_PER_USD = {
  USD:1, CAD:1.35, EUR:0.92, GBP:0.79, CHF:0.89,
  PYG:7500, ARS:900, BRL:5, UYU:40, BOB:6.9, CLP:920, COP:4000, PEN:3.8,
  MXN:17, CRC:520, GTQ:7.8, HNL:24.7, NIO:36.6, PAB:1, DOP:59,
  SEK:10.5, NOK:10.6, DKK:6.85, PLN:4, CZK:23, HUF:360, RON:4.6,
  JPY:150, CNY:7.2, KRW:1330, INR:83, AUD:1.53, NZD:1.63,
  SGD:1.34, HKD:7.8, TWD:32, THB:36, MYR:4.7, IDR:16000, PHP:57, VND:25000,
  AED:3.67, SAR:3.75, QAR:3.64, BHD:0.376, KWD:0.31, OMR:0.385, JOD:0.71, ILS:3.7,
  ZAR:18.6, EGP:48, MAD:10, NGN:1500, KES:130, GHS:15,
};

// Devuelve cuántas unidades de la moneda del proveedor equivalen a 1 unidad
// de la moneda principal del presupuesto. Ej.: presupuesto USD + proveedor PYG = 7500.
function getSuggestedExchangeRate(budgetCurrency="USD", vendorCurrency="USD"){
  if(budgetCurrency===vendorCurrency) return 1;
  const budgetRate = FX_UNITS_PER_USD[budgetCurrency] || 1;
  const vendorRate = FX_UNITS_PER_USD[vendorCurrency] || 1;
  return vendorRate / budgetRate;
}

function formatExchangeRate(rate){
  const value = Number(rate||0);
  if(!Number.isFinite(value) || value<=0) return "1";
  return String(Number(value.toFixed(value>=100 ? 2 : value>=1 ? 4 : 6)));
}

function getVendorExchangeRateForBudget(vendor, budgetCurrency="USD"){
  const vendorCurrency = vendor?.currency || budgetCurrency;
  if(vendorCurrency===budgetCurrency) return 1;
  const storedRate = parseFloat(vendor?.exchangeRate||0);
  if(!storedRate || storedRate<=0) return getSuggestedExchangeRate(budgetCurrency,vendorCurrency);
  const storedBaseCurrency = vendor?.exchangeRateBaseCurrency || budgetCurrency;
  if(storedBaseCurrency===budgetCurrency) return storedRate;
  // Conserva el tipo de cambio manual aunque luego cambie la moneda del presupuesto.
  return storedRate * getSuggestedExchangeRate(budgetCurrency,storedBaseCurrency);
}

function vendorAmountInBudgetCurrency(vendor, budgetCurrency="USD"){
  const price = parseFloat(vendor?.precio||0) || 0;
  const vendorCurrency = vendor?.currency || budgetCurrency;
  if(vendorCurrency===budgetCurrency) return price;
  const exchangeRate = getVendorExchangeRateForBudget(vendor,budgetCurrency);
  return exchangeRate>0 ? price/exchangeRate : 0;
}

// Normaliza nombres para vincular categorías equivalentes aunque hayan sido
// creadas manualmente. Ej.: "Otro" y "Otros" deben corresponder a vendor.cat="otro".
function normalizeBudgetCategoryName(value=""){
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function vendorMatchesBudgetCategory(vendor, category, canonicalOtherCategoryId=null){
  if(!vendor || !category) return false;
  if(vendor.cat === category.id) return true;

  // Los proveedores guardados como "otro" se asignan a una sola categoría
  // Otro/Otros del presupuesto para evitar duplicar importes.
  return vendor.cat === "otro" && canonicalOtherCategoryId === category.id;
}

function getBudgetCategoryMetaForVendor(vendor){
  if(!vendor?.cat) return null;
  if(vendor.cat === "otro") return {id:"otro", emoji:"📌", nombre:"Otros"};
  const defaultCategory = CATEGORIAS_DEFAULT.find(category => category.id === vendor.cat);
  if(defaultCategory) return {id:defaultCategory.id, emoji:defaultCategory.emoji, nombre:defaultCategory.nombre};
  return {
    id:vendor.cat,
    emoji:vendor.categoryEmoji || "📌",
    nombre:vendor.categoryName || "Categoría personalizada"
  };
}

// Garantiza que toda categoría usada por un proveedor también exista en Presupuesto.
// Esto recupera datos anteriores y evita que un proveedor quede sin categoría visible.
function ensureBudgetCategoriesForVendors(budgetData, vendorsList=[]){
  const baseBudget = budgetData || {total:0, categorias:[]};
  const categories = Array.isArray(baseBudget.categorias)
    ? baseBudget.categorias.map(category => ({...category}))
    : [];

  const hasOther = () => categories.some(category =>
    category.id === "otro" || ["otro","otros"].includes(normalizeBudgetCategoryName(category.nombre))
  );

  (vendorsList || []).forEach(vendor => {
    if(!vendor?.cat) return;
    if(vendor.cat === "otro" && hasOther()) return;
    if(categories.some(category => category.id === vendor.cat)) return;
    const meta = getBudgetCategoryMetaForVendor(vendor);
    if(!meta) return;
    categories.push({...meta, estimado:0, cotizado:0, pagado:0, notas:""});
  });

  return {...baseBudget, categorias:categories};
}

function budgetCategoriesToVendorOptions(categories=[]){
  const seen = new Set();
  return (categories || []).filter(category => {
    if(!category?.id || seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  }).map(category => ({
    id:category.id,
    emoji:category.emoji || "📌",
    label:category.nombre || "Sin nombre"
  }));
}

// ─── SYNC: calcula cotizado+pagado del budget a partir de vendors ─────────────
function calcBudgetFromVendors(budgetData, vendorsList, budgetCurrency="USD"){
  if(!budgetData || !vendorsList) return budgetData;
  const preparedBudget = ensureBudgetCategoriesForVendors(budgetData, vendorsList);
  const categories = preparedBudget.categorias || [];
  const canonicalOtherCategory =
    categories.find(cat => cat.id === "otro") ||
    categories.find(cat => ["otro","otros"].includes(normalizeBudgetCategoryName(cat.nombre)));
  const canonicalOtherCategoryId = canonicalOtherCategory?.id || null;

  const next = {
    ...preparedBudget,
    categorias: categories.map(cat => {
      const catVendors = vendorsList.filter(v => vendorMatchesBudgetCategory(v,cat,canonicalOtherCategoryId) && v.estado !== "descartado");
      const cotizado = catVendors.reduce((s,v) => s + vendorAmountInBudgetCurrency(v,budgetCurrency), 0);
      const pagado   = catVendors.filter(v => v.estado === "pagado")
                                 .reduce((s,v) => s + vendorAmountInBudgetCurrency(v,budgetCurrency), 0);
      return {...cat, cotizado, pagado};
    })
  };
  return next;
}


// ─── SISTEMA DE TOAST ────────────────────────────────────────────────────────

// Helper toast global (sin context, para compatibilidad)
const _toastListeners = [];
function showToast(msg, type="info"){
  _toastListeners.forEach(fn=>fn(msg,type));
}
const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type="info", duration=3000) => {
    const id = Date.now();
    setToasts(t => [...t, {id, msg, type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  };
  useEffect(()=>{
    _toastListeners.push(add);
    return ()=>{ const i=_toastListeners.indexOf(add); if(i>=0)_toastListeners.splice(i,1); };
  },[]);
  const COLORS = {
    success: {bg:"#4A5E3A", icon:"✓"},
    error:   {bg:"rgba(200,60,60,.9)", icon:"✗"},
    info:    {bg:"rgba(26,26,20,.85)", icon:"ℹ"},
    warning: {bg:"rgba(201,169,110,.9)", icon:"⚠️"},
  };
  return <ToastContext.Provider value={add}>
    {children}
    <div style={{position:"fixed",bottom:"max(24px,env(safe-area-inset-bottom))",left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:8,alignItems:"center",pointerEvents:"none"}}>
      {toasts.map(t => {
        const s = COLORS[t.type]||COLORS.info;
        return <div key={t.id} style={{background:s.bg,color:"#FFF",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"10px 20px",borderRadius:100,display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 16px rgba(0,0,0,.25)",animation:"toastIn .2s ease",maxWidth:"calc(100vw - 32px)",textAlign:"center",pointerEvents:"none"}}>
          <span>{s.icon}</span>
          <span>{t.msg}</span>
        </div>;
      })}
    </div>
    <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </ToastContext.Provider>;
}
const useToast = () => useContext(ToastContext);

// ─── MODAL DE CONFIRMACIÓN ────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel, danger=true }) {
  return <div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
    onClick={onCancel}>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
    <div style={{position:"relative",background:"#FBF7EF",borderRadius:16,padding:"24px 20px",maxWidth:320,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}
      onClick={e=>e.stopPropagation()}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"#1A1A14",margin:"0 0 20px",textAlign:"center",lineHeight:1.5}}>{msg}</p>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={{flex:1,background:"transparent",border:"1px solid rgba(74,94,58,.2)",borderRadius:100,padding:"10px",fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.5)",cursor:"pointer"}}>Cancelar</button>
        <button onClick={onConfirm} style={{flex:1,background:danger?"rgba(200,60,60,.9)":"#4A5E3A",border:"none",borderRadius:100,padding:"10px",fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:700,color:"#FFF",cursor:"pointer"}}>Confirmar</button>
      </div>
    </div>
  </div>;
}

function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (msg) => new Promise(resolve => {
    setState({msg, resolve});
  });
  const modal = state ? <ConfirmModal
    msg={state.msg}
    danger={true}
    onConfirm={()=>{state.resolve(true); setState(null);}}
    onCancel={()=>{state.resolve(false); setState(null);}}/> : null;
  return [confirm, modal];
}

// ─── MÓDULO PRESUPUESTO ────────────────────────────────────────────────────────
// ── Hook responsive + BottomSheet reutilizable (mobile) ─────────────────────
function useIsMobile(bp=640){
  const [m,setM]=useState(()=>typeof window!=="undefined"&&window.matchMedia(`(max-width:${bp}px)`).matches);
  useEffect(()=>{
    const mq=window.matchMedia(`(max-width:${bp}px)`);
    const h=e=>setM(e.matches);
    if(mq.addEventListener) mq.addEventListener("change",h); else mq.addListener(h);
    return ()=>{ if(mq.removeEventListener) mq.removeEventListener("change",h); else mq.removeListener(h); };
  },[bp]);
  return m;
}

function BottomSheet({title,onClose,children}){
  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=prev;};
  },[]);
  return <div className="sheet-overlay" onClick={onClose} onMouseDown={e=>e.stopPropagation()}
    style={{position:"fixed",inset:0,zIndex:THEME.z.sheet,background:"rgba(26,26,20,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div className="sheet-panel" onClick={e=>e.stopPropagation()}
      style={{width:"100%",maxWidth:520,background:THEME.color.cream2,borderRadius:"20px 20px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,.25)",maxHeight:"82vh",overflowY:"auto",padding:"10px 16px",paddingBottom:"calc(20px + env(safe-area-inset-bottom))"}}>
      <div style={{width:40,height:4,borderRadius:4,background:"rgba(26,26,20,.15)",margin:"4px auto 12px"}}/>
      {title&&<div style={{fontFamily:THEME.font.display,fontSize:"1.1rem",fontWeight:600,color:THEME.color.ink,marginBottom:10,textAlign:"center"}}>{title}</div>}
      {children}
    </div>
  </div>;
}


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

function GuiaNupcial({abierta, seccionInicial="mesas", onClose}){
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
function GuiaModule({onBack,isDemo=false,onRequestPurchase}){
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
        ? <FullGuideLockedCard onRequestPurchase={onRequestPurchase}/>
        : <FullGuideDownloadCard source="guide_module"/>
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

const CATEGORIAS_DEFAULT = [
  {id:"salon",    emoji:"🏛️", nombre:"Salón / Venue",              estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"catering", emoji:"🍽️", nombre:"Catering y bebidas",         estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"musica",   emoji:"🎵", nombre:"Música y entretenimiento",   estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"flores",   emoji:"🌸", nombre:"Flores y decoración",        estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"vestuario",emoji:"👗", nombre:"Vestuario",                  estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"foto",     emoji:"📸", nombre:"Fotografía",                 estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"video",    emoji:"🎬", nombre:"Video / Cinematografía",     estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"torta",    emoji:"🎂", nombre:"Torta",                      estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"papel",    emoji:"💌", nombre:"Papelería e invitaciones",   estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"transport",emoji:"🚗", nombre:"Transporte",                 estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"beauty",   emoji:"💄", nombre:"Maquillaje y peluquería",    estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"luna",     emoji:"🌴", nombre:"Luna de miel",               estimado:0,cotizado:0,pagado:0,notas:""},
  {id:"imprev",   emoji:"⚡", nombre:"Imprevistos (10%)",          estimado:0,cotizado:0,pagado:0,notas:""},
];

function fmt(n){ return Number(n||0).toLocaleString("es-PY",{minimumFractionDigits:0,maximumFractionDigits:0}); }
function num(v){ return parseFloat(String(v).replace(/[^0-9.]/g,""))||0; }

function BudgetModule({ user, onBack }){
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [vendors, setVendors] = useState([]);
  const [invitados, setInvitados] = useState("");
  const [invitadosReales, setInvitadosReales] = useState(0);
  const [tieneMusica, setTieneMusica] = useState("si");
  const [estiloDecoracion, setEstiloDecoracion] = useState("estandar");
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);

  // Load from Supabase
  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await dataClient(user).from("wedding_data").select("budget,currency,vendors,guests").eq("user_id",user.id).maybeSingle();
        const loadedVendors = Array.isArray(row?.vendors) ? row.vendors : [];
        const budgetCurrency = row?.currency || "USD";
        let budget = (row?.budget && row.budget.categorias?.length > 0)
          ? row.budget
          : {total:0, categorias:CATEGORIAS_DEFAULT.map(c=>({...c}))};
        // Auto-sync cotizado + pagado y crea categorías faltantes usadas por proveedores.
        const originalBudgetJson = JSON.stringify(budget);
        budget = calcBudgetFromVendors(budget, loadedVendors, budgetCurrency);
        setVendors(loadedVendors);
        setData(budget);
        setCurrency(budgetCurrency);
        // Persiste la reparación automática para que "Otros" y categorías personalizadas
        // sigan visibles al volver a abrir la aplicación.
        if(JSON.stringify(budget) !== originalBudgetJson){
          await dataClient(user).from("wedding_data").upsert({
            user_id:user.id,
            budget,
            updated_at:new Date().toISOString()
          },{onConflict:"user_id"});
        }
        // Total real de personas confirmadas/pendientes en lista de invitados
        if(Array.isArray(row?.guests) && row.guests.length>0){
          const totalPersonasReal = row.guests.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
          setInvitadosReales(totalPersonasReal);
        }
        // Prellenar campo invitados del presupuesto
        if(row?.budget?.invitados) setInvitados(row.budget.invitados);
        else if(Array.isArray(row?.guests) && row.guests.length>0){
          const totalPersonas = row.guests.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
          setInvitados(String(totalPersonas));
        }
      }catch(e){
        setData({total:0, categorias:CATEGORIAS_DEFAULT.map(c=>({...c}))});
      }
    };
    load();
  },[user]);

  const save = async(newData, newCurrency)=>{
    setSaving(true);
    try{
      const targetCurrency = newCurrency || currency;
      const syncedBudget = calcBudgetFromVendors(newData || data, vendors, targetCurrency);
      setData(syncedBudget);
      await dataClient(user).from("wedding_data").upsert({
        user_id: user.id,
        budget: syncedBudget,
        currency: targetCurrency,
        updated_at: new Date().toISOString()
      },{onConflict:"user_id"});
      setSaved(true);
      setTimeout(()=>setSaved(false), 2000);
    }catch(e){ console.error(e); }
    setSaving(false);
  };

  const calcularDistribucion = () => {
    const total = num(data.total);
    const inv = parseInt(invitados) || 100;
    if(!total) return;

    // Factor de conversión aproximado respecto a USD
    // Permite que los topes fijos tengan sentido en cualquier moneda
    const FX_VS_USD = {
      USD:1, CAD:1.35, EUR:0.92, GBP:0.79,
      PYG:7500, ARS:900, BRL:5, UYU:40,
      BOB:6.9, CLP:920, COP:4000, PEN:3.8,
      MXN:17, CRC:520, GTQ:7.8,
      CHF:0.89, SEK:10.5, NOK:10.6,
      JPY:150, CNY:7.2, KRW:1330,
      INR:83, AUD:1.53, NZD:1.63,
      SGD:1.34, HKD:7.8, AED:3.67,
      SAR:3.75, BHD:0.376, KWD:0.31,
      ZAR:18.6, EGP:30.9,
    };
    const fx = FX_VS_USD[currency] || 1;

    // Helpers: convertir topes USD a moneda local
    const cap = (usd) => Math.round(usd * fx);
    const ppUSD = (total / fx) / inv; // presupuesto por persona en USD equivalente

    // Costos fijos según estilo (en USD, luego convertidos)
    const decorMinUSD = estiloDecoracion==="simple"?800:estiloDecoracion==="estandar"?2000:4000;
    const decorMaxUSD = estiloDecoracion==="simple"?2000:estiloDecoracion==="estandar"?5000:10000;
    const decorBaseUSD = (decorMinUSD+decorMaxUSD)/2;

    const musicaBaseUSD = tieneMusica==="si" ? 3000 : 1000;

    const fijos = {
      foto:     Math.min(Math.round(total*0.08), cap(2500)),
      video:    Math.min(Math.round(total*0.06), cap(2000)),
      musica:   Math.min(Math.round(total*0.06), cap(musicaBaseUSD)),
      vestuario:Math.min(Math.round(total*0.06), cap(3000)),
      beauty:   Math.min(Math.round(total*0.025), cap(800)),
      flores:   Math.min(cap(decorBaseUSD), Math.round(total*0.10)),
      papel:    Math.min(Math.round(inv * cap(3)), Math.round(total*0.02)),
      luna:     0,
    };

    // Catering: precio por persona en USD equivalente → convertir
    const pxpUSD = ppUSD < 60 ? 25 : ppUSD < 120 ? 40 : ppUSD < 200 ? 65 : 90;
    fijos.catering = Math.round(pxpUSD * fx * inv);

    // Torta: $4–8 USD por persona
    const tppUSD = ppUSD < 100 ? 4 : ppUSD < 200 ? 6 : 8;
    fijos.torta = Math.round(tppUSD * fx * inv);

    // Transporte
    fijos.transport = Math.min(Math.round(total*0.015), cap(600));

    // Salón: lo que queda (menos imprevistos 10%)
    const sinSalon = Object.values(fijos).reduce((s,v)=>s+v,0);
    const disponibleSalon = Math.round((total * 0.90) - sinSalon);
    fijos.salon = Math.max(disponibleSalon, Math.round(total*0.08));

    // Imprevistos: 10% fijo
    fijos.imprev = Math.round(total * 0.10);

    // Aplicar a categorías
    const next = {...data, invitados: String(inv), categorias: data.categorias.map(c => ({
      ...c,
      estimado: fijos[c.id] !== undefined ? fijos[c.id] : c.estimado
    }))};
    setData(next);
    save(next);
    setMostrarCalculadora(false);
  };

  const updateTotal = (v)=>{
    const valor = num(v);
    if(valor===0){
      // Si el total va a 0, resetear todos los estimados
      const next = {...data, total:0, categorias:data.categorias.map(c=>({...c,estimado:0}))};
      setData(next);
      save(next);
    } else {
      const next = {...data, total:valor};
      setData(next);
    }
  };

  const updateCat = (id, field, value)=>{
    const next = {...data, categorias: data.categorias.map(c=> c.id===id ? {...c,[field]:field==="notas"?value:num(value)} : c)};
    setData(next);
  };

  const addCategoria = ()=>{
    const categoryName = newCatName.trim();
    if(!categoryName) return;

    const normalizedName = normalizeBudgetCategoryName(categoryName);
    const isOtherCategory = normalizedName === "otro" || normalizedName === "otros";
    const alreadyHasOther = data.categorias.some(c =>
      c.id === "otro" || ["otro","otros"].includes(normalizeBudgetCategoryName(c.nombre))
    );

    if(isOtherCategory && alreadyHasOther){
      showToast("La categoría Otros ya existe en el presupuesto.", "info");
      return;
    }

    // Usar el mismo ID que Proveedores para que los importes se sincronicen.
    const categoryId = isOtherCategory ? "otro" : "c_"+Date.now();
    const next = {...data, categorias:[...data.categorias, {id:categoryId,emoji:"📌",nombre:categoryName,estimado:0,cotizado:0,pagado:0,notas:""}]};
    setData(next);
    setNewCatName("");
    setAddingCat(false);
    save(next);
  };

  const removeCategoria = (id)=>{
    const linkedVendors = vendors.filter(vendor => vendor.cat === id || (id === "otro" && vendor.cat === "otro"));
    if(linkedVendors.length > 0){
      showToast(`Esta categoría tiene ${linkedVendors.length} proveedor${linkedVendors.length===1?"":"es"}. Reasigná o eliminá esos proveedores antes de quitarla.`, "warning");
      return;
    }
    const next = {...data, categorias: data.categorias.filter(c=>c.id!==id)};
    setData(next);
    save(next);
  };

  if(!data) return <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <p style={{fontFamily:"'Lora',serif",color:"#4A5E3A"}}>Cargando presupuesto...</p>
  </div>;

  const cats = data.categorias || [];
  const totalEstimado = cats.reduce((s,c)=>s+num(c.estimado),0);
  const totalCotizado = cats.reduce((s,c)=>s+num(c.cotizado),0);
  const totalPagado   = cats.reduce((s,c)=>s+num(c.pagado),0);
  const totalBudget   = num(data.total);
  const pctPagado     = totalBudget>0 ? Math.min(100,Math.round(totalPagado/totalBudget*100)) : 0;
  const pctCotizado   = totalBudget>0 ? Math.min(100,Math.round(totalCotizado/totalBudget*100)) : 0;
  const restante      = totalBudget - totalPagado;
  const SYM = getCurrencySymbol(currency) + " ";

  const CatRow = ({c})=>{
    const isEdit = editId===c.id;
    const pctCat = num(c.estimado)>0 ? Math.min(100,Math.round(num(c.pagado)/num(c.estimado)*100)) : 0;
    const overBudget = num(c.cotizado) > num(c.estimado) && num(c.estimado)>0;
    const [localEst, setLocalEst] = useState(c.estimado||"");
    const [localCot, setLocalCot] = useState(c.cotizado||"");
    const [localPag, setLocalPag] = useState(c.pagado||"");
    const [localNota, setLocalNota] = useState(c.notas||"");

    const commitRow = ()=>{
      setTimeout(()=>{
        setData(prev=>{
          const next = {...prev, categorias: prev.categorias.map(x=> x.id===c.id ? {...x,estimado:num(localEst),notas:localNota} : x)};
          save(next);
          return next;
        });
      },50);
      setEditId(null);
    };

    return <div style={{background:"#FBF7EF",border:`0.5px solid ${overBudget?"rgba(200,80,60,.35)":"rgba(201,169,110,.22)"}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:isEdit?12:8}}>
        <span style={{fontSize:"1.3rem",flexShrink:0}}>{c.emoji}</span>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"1rem",color:"#1A1A14",flex:1}}>{c.nombre}</span>
        {overBudget&&<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".1em",color:"rgba(200,80,60,.8)",background:"rgba(200,80,60,.08)",padding:"2px 8px",borderRadius:100}}>SOBRE PRES.</span>}
        {!overBudget && num(c.estimado)>0 && num(c.cotizado)===0 && <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",color:"rgba(200,140,0,.75)",background:"rgba(255,200,0,.08)",padding:"2px 8px",borderRadius:100}}>SIN COTIZAR</span>}
        {num(c.estimado)===0 && num(c.cotizado)>0 && <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",color:"rgba(74,94,58,.6)",background:"rgba(74,94,58,.08)",padding:"2px 8px",borderRadius:100}}>SIN ESTIMADO</span>}
        {num(c.pagado)>0 && num(c.pagado)>=num(c.cotizado) && num(c.cotizado)>0 && <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",color:"rgba(74,94,58,.85)",background:"rgba(74,94,58,.12)",padding:"2px 8px",borderRadius:100}}>✓ PAGADO</span>}
        <button onClick={()=>isEdit?commitRow():setEditId(c.id)} style={{background:isEdit?"#4A5E3A":"transparent",color:isEdit?"#F5EFE0":"rgba(26,26,20,.4)",border:`1px solid ${isEdit?"#4A5E3A":"rgba(74,94,58,.25)"}`,borderRadius:100,padding:"4px 12px",fontFamily:"'Lora',serif",fontSize:".78rem",cursor:"pointer"}}>
          {isEdit?"✓ Guardar":"Editar"}
        </button>
        <button onClick={()=>removeCategoria(c.id)} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.25)",fontSize:"1.1rem",cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
      </div>

      {/* Progress bar */}
      <div style={{height:6,background:"rgba(74,94,58,.1)",borderRadius:6,marginBottom:10,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pctCat}%`,background:pctCat>=100?"#4A5E3A":"rgba(74,94,58,.55)",borderRadius:6,transition:"width .4s"}}/>
      </div>

      {/* Amount columns */}
      {!isEdit ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{label:"Presupuestado",val:c.estimado,color:"rgba(26,26,20,.55)"},
          {label:"Cotizado",val:c.cotizado,color:overBudget?"rgba(200,80,60,.8)":"rgba(201,169,110,.85)"},
          {label:"Pagado",val:c.pagado,color:"#4A5E3A"}].map(({label,val,color})=>
          <div key={label} style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(26,26,20,.4)",marginBottom:3}}>{label}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",fontWeight:600,color}}>{SYM}{fmt(val)}</div>
          </div>
        )}
      </div>
      : <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          {[{label:"Presupuestado",key:"est",val:localEst,set:setLocalEst,editable:true}].map(({label,key,val,set})=>
            <div key={key}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(26,26,20,.4)",marginBottom:4}}>{label}</div>
              <input name="app-field-4219" type="number" value={val} onChange={e=>set(e.target.value)} placeholder="0"
                style={{width:"100%",fontFamily:"'Lora',serif",fontSize:"1rem",fontWeight:600,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.3)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
            </div>
          )}
          {[{label:"Cotizado",val:num(c.cotizado)},{label:"Pagado",val:num(c.pagado)}].map(({label,val})=>
            <div key={label} onClick={()=>showToast("💡 Este valor se calcula desde el módulo de Proveedores","info",4000)} style={{cursor:"help"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(26,26,20,.28)",marginBottom:4}}>{label} 🔗</div>
              <div style={{fontFamily:"'Lora',serif",fontSize:"1rem",fontWeight:600,padding:"8px 10px",borderRadius:8,border:"1px dashed rgba(74,94,58,.2)",background:"rgba(74,94,58,.04)",color:"rgba(26,26,20,.4)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>{SYM}{fmt(val)}</span>
                <span style={{fontSize:THEME.text.label,color:"rgba(74,94,58,.35)"}}>desde proveedores ℹ️</span>
              </div>
            </div>
          )}
        </div>
        <input name="app-field-4233" type="text" value={localNota} onChange={e=>setLocalNota(e.target.value)} placeholder="Notas (proveedor, fecha de pago, etc.)"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"rgba(26,26,20,.7)",boxSizing:"border-box"}}/>
      </div>}

      {c.notas&&!isEdit&&<p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.45)",fontStyle:"italic",margin:"8px 0 0"}}>{c.notas}</p>}
    </div>;
  };

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:80}}>
    {/* Header */}
    <div style={{background:"#4A5E3A",padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:0,lineHeight:1.1}}>💰 Presupuesto</h1>
            <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(245,239,224,.45)",marginTop:6}}>🔗 Cotizado y pagado se convierten automáticamente desde la moneda de cada proveedor</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"flex-start"}}>
            <select name="app-field-4253" value={currency} onChange={e=>{setCurrency(e.target.value);save(data,e.target.value);}} style={{fontFamily:"'Lora',serif",fontSize:".85rem",padding:"8px 12px",borderRadius:100,border:"1px solid rgba(201,169,110,.4)",background:"rgba(245,239,224,.9)",color:"#1A1A14",cursor:"pointer",maxWidth:"min(220px,60vw)"}}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
            <button onClick={()=>save()} style={{background:"#C9A96E",color:"#1A1A14",border:"none",padding:"9px 20px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".9rem",borderRadius:100,cursor:"pointer",minWidth:90}}>
              {saving?"Guardando...":saved?"¡Guardado ✓":"Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>

      {/* Budget total input */}
      <div style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.3)",borderRadius:18,padding:"clamp(18px,3vw,28px)",marginBottom:24}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:14}}>Presupuesto total de la boda</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",color:"rgba(26,26,20,.4)"}}>{SYM}</span>
            <input name="app-field-4272" type="number" value={data.total||""} onChange={e=>updateTotal(e.target.value)}
              onBlur={()=>save()} placeholder="0"
              style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.8rem,4vw,2.4rem)",fontWeight:700,color:"#1A1A14",border:"none",borderBottom:"2px solid #4A5E3A",background:"transparent",padding:"4px 0",width:"100%",outline:"none"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.45)"}}>👥</span>
            <input name="app-field-4278" type="number" value={invitados} onChange={e=>setInvitados(e.target.value)}
              onBlur={()=>{ const next={...data,invitados}; setData(next); save(next); }}
              placeholder="Invitados" min="1"
              style={{fontFamily:"'Lora',serif",fontSize:"1rem",fontWeight:600,color:"#1A1A14",border:"none",borderBottom:"1.5px solid rgba(74,94,58,.3)",background:"transparent",padding:"4px 0",width:90,outline:"none"}}/>
          </div>
        </div>
        {/* Botón calculadora */}
        {num(data.total)>0&&<div style={{marginBottom:20}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setMostrarCalculadora(m=>!m)} style={{
              display:"inline-flex",alignItems:"center",gap:7,
              background:"transparent",border:"1px solid rgba(74,94,58,.3)",borderRadius:100,
              padding:"8px 16px",fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:600,
              color:"#4A5E3A",cursor:"pointer"
            }}>
              ✨ {mostrarCalculadora?"Cerrar calculadora":cats.some(c=>num(c.estimado)>0)?"Recalcular distribución":"Sugerir distribución por categoría"}
            </button>
            {cats.some(c=>num(c.estimado)>0)&&<button onClick={()=>{
              const next={...data,categorias:data.categorias.map(c=>({...c,estimado:0}))};
              setData(next);save(next);
            }} style={{
              display:"inline-flex",alignItems:"center",gap:7,
              background:"transparent",border:"1px solid rgba(200,80,60,.3)",borderRadius:100,
              padding:"8px 16px",fontFamily:"'Lora',serif",fontSize:".88rem",fontWeight:600,
              color:"rgba(200,80,60,.7)",cursor:"pointer"
            }}>
              🗑 Limpiar estimados
            </button>}
          </div>
          {mostrarCalculadora&&<div style={{marginTop:12,background:"rgba(74,94,58,.05)",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".16em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:12}}>Calculadora de distribución</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(130px,45vw),1fr))",gap:10,marginBottom:12}}>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(26,26,20,.45)",marginBottom:6}}>🎵 Música en vivo</div>
                <div style={{display:"flex",gap:6}}>
                  {[{v:"si",l:"Sí"},{v:"no",l:"Solo DJ"}].map(({v,l})=>
                    <button key={v} onClick={()=>setTieneMusica(v)} style={{
                      flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${tieneMusica===v?"#4A5E3A":"rgba(74,94,58,.2)"}`,
                      background:tieneMusica===v?"#4A5E3A":"transparent",
                      color:tieneMusica===v?"#F5EFE0":"rgba(26,26,20,.55)",
                      fontFamily:"'Lora',serif",fontSize:".82rem",cursor:"pointer"
                    }}>{l}</button>
                  )}
                </div>
              </div>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(26,26,20,.45)",marginBottom:6}}>🌸 Decoración</div>
                <div style={{display:"flex",gap:4}}>
                  {[{v:"simple",l:"Simple"},{v:"estandar",l:"Estándar"},{v:"elaborada",l:"Elab."}].map(({v,l})=>
                    <button key={v} onClick={()=>setEstiloDecoracion(v)} style={{
                      flex:1,padding:"7px 2px",borderRadius:8,border:`1px solid ${estiloDecoracion===v?"#4A5E3A":"rgba(74,94,58,.2)"}`,
                      background:estiloDecoracion===v?"#4A5E3A":"transparent",
                      color:estiloDecoracion===v?"#F5EFE0":"rgba(26,26,20,.55)",
                      fontFamily:"'Lora',serif",fontSize:".75rem",cursor:"pointer"
                    }}>{l}</button>
                  )}
                </div>
              </div>
            </div>
            {!invitados&&<p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(200,120,0,.8)",margin:"0 0 10px",fontStyle:"italic"}}>⚠️ Ingresá la cantidad de invitados arriba para un cálculo más preciso.</p>}
            <div style={{background:"rgba(201,169,110,.08)",border:"0.5px solid rgba(201,169,110,.3)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
              <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.55)",margin:"0 0 4px",lineHeight:1.55}}>
                📊 Los valores son <strong>estimativos</strong> basados en datos de bodas de la región (Paraguay, Argentina, Brasil).
              </p>
              <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.4)",margin:0,lineHeight:1.55,fontStyle:"italic"}}>
                Son una sugerencia de punto de partida — ajustá cada categoría según tus cotizaciones reales.
              </p>
            </div>
            <button onClick={calcularDistribucion} style={{
              background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,
              padding:"10px 22px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".9rem",cursor:"pointer"
            }}>Aplicar distribución sugerida</button>
          </div>}
        </div>}

        {/* ── ESTADO GENERAL ── */}
        {totalBudget>0&&(()=>{
          const ahorroTotal = cats.filter(c=>num(c.cotizado)>0).reduce((s,c)=>s+(num(c.estimado)-num(c.cotizado)),0);
          const pctUsado = totalEstimado>0?Math.round(totalEstimado/totalBudget*100):0;
          const estadoColor = pctUsado>100?"rgba(200,60,60,.85)":pctUsado>85?"rgba(200,120,0,.85)":"#4A5E3A";
          const estadoLabel = pctUsado>100?"⚠️ Superaste el presupuesto":pctUsado>85?"⚡ Casi al límite":"✓ Vas bien";
          return <div style={{background:pctUsado>100?"rgba(200,60,60,.06)":pctUsado>85?"rgba(255,200,0,.06)":"rgba(74,94,58,.06)",border:`0.5px solid ${pctUsado>100?"rgba(200,60,60,.25)":pctUsado>85?"rgba(200,120,0,.2)":"rgba(74,94,58,.2)"}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Lora',serif",fontSize:".9rem",fontWeight:600,color:estadoColor}}>{estadoLabel}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".1em",color:estadoColor}}>{pctUsado}% del presupuesto distribuido</span>
          </div>;
        })()}

        {/* ── TRES DATOS CLAVE ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {label:"Lo que planeé",val:totalEstimado,color:"rgba(26,26,20,.6)",sub:totalBudget>0&&totalEstimado>0?`${Math.round(totalEstimado/totalBudget*100)}% del total`:null},
            {label:"Lo que cotizé",val:totalCotizado,color:"rgba(201,169,110,.9)",sub:totalCotizado>0&&totalEstimado>0?(totalCotizado<=totalEstimado?`▼ ${fmt(totalEstimado-totalCotizado)} menos`:`▲ ${fmt(totalCotizado-totalEstimado)} más`):null,subColor:totalCotizado>totalEstimado?"rgba(200,60,60,.7)":"rgba(74,94,58,.6)"},
            {label:"Lo que pagué",val:totalPagado,color:"#4A5E3A",sub:totalPagado>0&&totalCotizado>0?`${Math.round(totalPagado/totalCotizado*100)}% de lo cotizado`:null},
          ].map(({label,val,color,sub,subColor})=>
            <div key={label} style={{background:"rgba(245,239,224,.7)",borderRadius:12,padding:"clamp(10px,2vw,14px) clamp(8px,2vw,12px)",textAlign:"center"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(.58rem,.7vw,.72rem)",letterSpacing:".08em",textTransform:"uppercase",color:"rgba(26,26,20,.38)",marginBottom:5,lineHeight:1.3}}>{label}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1rem,2.5vw,1.2rem)",fontWeight:700,color}}>{SYM}{fmt(val)}</div>
              {sub&&<div style={{fontFamily:"'Lora',serif",fontSize:"clamp(.7rem,.9vw,.82rem)",color:subColor||"rgba(26,26,20,.35)",marginTop:3,lineHeight:1.2}}>{sub}</div>}
            </div>
          )}
        </div>

        {/* ── BARRA PROGRESO PAGO ── */}
        {totalEstimado>0&&<div style={{marginBottom:16}}>
          <div style={{height:8,background:"rgba(74,94,58,.08)",borderRadius:8,overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",height:"100%",width:`${Math.min(100,pctCotizado)}%`,background:"rgba(201,169,110,.35)",borderRadius:8,transition:"width .4s"}}/>
            <div style={{position:"absolute",height:"100%",width:`${Math.min(100,pctPagado)}%`,background:"#4A5E3A",borderRadius:8,transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.35)",marginTop:5}}>
            <span>🟢 Pagado {pctPagado}%</span>
            <span>🟡 Cotizado {pctCotizado}%</span>
          </div>
        </div>}

        {/* ── INSIGHTS ── */}
        {(invitados&&parseInt(invitados)>0||totalCotizado>0)&&<div style={{display:"flex",gap:10,flexWrap:"wrap",paddingTop:12,borderTop:"0.5px solid rgba(201,169,110,.15)"}}>
          {invitados&&parseInt(invitados)>0&&totalEstimado>0&&<div style={{flex:1,minWidth:"calc(50% - 5px)",background:"rgba(74,94,58,.06)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.38)",marginBottom:4}}>💡 Por invitado</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",fontWeight:700,color:"#4A5E3A"}}>{SYM}{fmt(Math.round(totalEstimado/parseInt(invitados)))}</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.35)",marginTop:2}}>Basado en presupuestado</div>
          </div>}
          {totalCotizado>0&&(()=>{
            const ahorro = cats.filter(c=>num(c.cotizado)>0).reduce((s,c)=>s+(num(c.estimado)-num(c.cotizado)),0);
            const pos = ahorro>=0;
            return <div style={{flex:1,minWidth:130,background:pos?"rgba(74,94,58,.06)":"rgba(200,60,60,.06)",borderRadius:10,padding:"10px 12px",border:`0.5px solid ${pos?"rgba(74,94,58,.15)":"rgba(200,60,60,.2)"}`}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.38)",marginBottom:4}}>{pos?"🟢 Ahorro total":"🔴 Exceso total"}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",fontWeight:700,color:pos?"#4A5E3A":"rgba(200,60,60,.8)"}}>
                {pos?"▼ ":"▲ "}{SYM}{fmt(Math.abs(ahorro))}
              </div>
              <div style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:pos?"rgba(74,94,58,.5)":"rgba(200,60,60,.55)",marginTop:2}}>
                {pos?"Por debajo del estimado":"Por encima del estimado"}
              </div>
            </div>;
          })()}
        </div>}

        {/* Warning invitados reales vs presupuestados */}
        {invitadosReales>0 && parseInt(invitados)>0 && invitadosReales > parseInt(invitados) && <div style={{marginTop:12,background:"rgba(200,80,60,.06)",border:"0.5px solid rgba(200,80,60,.3)",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{flexShrink:0,fontSize:"1rem"}}>⚠️</span>
          <div>
            <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(200,60,60,.85)",margin:"0 0 3px",fontWeight:600}}>
              Tenés más invitados de los presupuestados
            </p>
            <p style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(200,60,60,.7)",margin:0,lineHeight:1.5}}>
              Tu lista tiene <strong>{invitadosReales} personas</strong> pero el presupuesto está calculado para <strong>{invitados}</strong>. El gasto real por invitado sería {SYM}{fmt(Math.round(totalEstimado/invitadosReales))} — revisá el catering y la torta.
            </p>
          </div>
        </div>}
      </div>

      {/* ══ ALERTAS ══ */}
      {(()=>{
        const sinProveedor = cats.filter(c => num(c.estimado)>0 && num(c.cotizado)===0 && num(c.pagado)===0);
        const sobrePresup  = cats.filter(c => num(c.cotizado)>num(c.estimado) && num(c.estimado)>0);
        const sinEstimado  = cats.filter(c => num(c.estimado)===0 && num(c.cotizado)>0);
        const alerts = [];
        if(sinProveedor.length>0) alerts.push({
          icon:"⚠️", color:"rgba(200,140,0,.8)", bg:"rgba(255,200,0,.06)", border:"rgba(200,140,0,.25)",
          msg:`${sinProveedor.length} categoría${sinProveedor.length>1?"s":""} con presupuesto estimado sin proveedores cotizados: ${sinProveedor.map(c=>c.nombre).join(", ")}.`
        });
        if(sobrePresup.length>0) alerts.push({
          icon:"🔴", color:"rgba(200,60,60,.8)", bg:"rgba(200,60,60,.05)", border:"rgba(200,60,60,.25)",
          msg:`${sobrePresup.length} categoría${sobrePresup.length>1?"s sobrepasan":"sobre pasa"} el presupuesto estimado: ${sobrePresup.map(c=>c.nombre).join(", ")}.`
        });
        if(sinEstimado.length>0) alerts.push({
          icon:"💡", color:"rgba(74,94,58,.7)", bg:"rgba(74,94,58,.05)", border:"rgba(74,94,58,.2)",
          msg:`${sinEstimado.length} categoría${sinEstimado.length>1?"s tienen":"tiene"} proveedores cotizados pero sin presupuesto estimado. Editá el estimado para comparar.`
        });
        if(totalBudget===0) alerts.push({
          icon:"📝", color:"rgba(26,26,20,.45)", bg:"rgba(26,26,20,.03)", border:"rgba(26,26,20,.1)",
          msg:"Definí primero el presupuesto total de la boda arriba para ver el análisis completo."
        });
        if(alerts.length===0) return null;
        return <div style={{marginBottom:20}}>
          {alerts.map((a,i)=><div key={i} style={{background:a.bg,border:`0.5px solid ${a.border}`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{flexShrink:0,marginTop:1}}>{a.icon}</span>
            <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:a.color,margin:0,lineHeight:1.55}}>{a.msg}</p>
          </div>)}
        </div>;
      })()}

      {/* Categories */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"#4A5E3A"}}>Por categoría</div>
        <button onClick={()=>setAddingCat(true)} style={{background:"transparent",border:"1px solid rgba(74,94,58,.3)",borderRadius:100,padding:"6px 14px",fontFamily:"'Lora',serif",fontSize:".85rem",color:"#4A5E3A",cursor:"pointer"}}>+ Agregar categoría</button>
      </div>

      {addingCat&&<div style={{background:"#FBF7EF",border:"1px solid rgba(74,94,58,.3)",borderRadius:14,padding:"14px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
        <input name="app-field-4466" autoFocus type="text" value={newCatName} onChange={e=>setNewCatName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addCategoria()}
          placeholder="Nombre de la categoría (ej: Cohetes, Sweets table...)"
          style={{flex:1,fontFamily:"'Lora',serif",fontSize:"1rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.3)",background:"#F5EFE0",color:"#1A1A14"}}/>
        <button onClick={addCategoria} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"9px 16px",fontFamily:"'Lora',serif",fontSize:".9rem",cursor:"pointer"}}>Agregar</button>
        <button onClick={()=>{setAddingCat(false);setNewCatName("");}} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.4)",fontSize:"1.2rem",cursor:"pointer"}}>×</button>
      </div>}

      {cats.map(c=><CatRow key={c.id} c={c}/>)}

      {/* Footer tip */}
      <div style={{background:"rgba(74,94,58,.06)",border:"0.5px solid rgba(74,94,58,.15)",borderRadius:12,padding:"14px 18px",marginTop:24,display:"flex",gap:10}}>
        <span style={{flexShrink:0}}>💡</span>
        <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,margin:0}}>
          <strong>Tip:</strong> Completá primero el presupuesto total y el estimado de cada categoría, luego actualizá el cotizado cuando tengas propuestas de proveedores, y finalmente el pagado cuando confirmes. Los presupuestos de boda en Paraguay suelen exceder el estimado inicial en un 15-20% — dejá siempre un margen de imprevistos.
        </p>
      </div>
      <BackToHome onBack={onBack}/>
    </div>
  </div>;
}


// ─── MÓDULO PROVEEDORES ───────────────────────────────────────────────────────
const VENDOR_CATS = [
  {id:"salon",    emoji:"🏛️", label:"Salón / Venue"},
  {id:"catering", emoji:"🍽️", label:"Catering"},
  {id:"musica",   emoji:"🎵", label:"Música"},
  {id:"foto",     emoji:"📸", label:"Fotografía"},
  {id:"video",    emoji:"🎬", label:"Video"},
  {id:"flores",   emoji:"🌸", label:"Flores / Decoración"},
  {id:"vestuario",emoji:"👗", label:"Vestuario"},
  {id:"torta",    emoji:"🎂", label:"Torta"},
  {id:"beauty",   emoji:"💄", label:"Maquillaje / Peinado"},
  {id:"transport",emoji:"🚗", label:"Transporte"},
  {id:"papel",    emoji:"💌", label:"Papelería"},
  {id:"otro",     emoji:"📌", label:"Otros"},
];
const VENDOR_ESTADOS = [
  {id:"evaluando", label:"Evaluando",  color:"rgba(201,169,110,.8)",  bg:"rgba(201,169,110,.1)"},
  {id:"contratado",label:"Contratado", color:"rgba(74,94,58,.8)",     bg:"rgba(74,94,58,.1)"},
  {id:"pagado",    label:"Pagado",     color:"#4A5E3A",               bg:"rgba(74,94,58,.15)"},
  {id:"descartado",label:"Descartado", color:"rgba(26,26,20,.35)",    bg:"rgba(26,26,20,.05)"},
];

const VENDOR_CATEGORY_EXPORT_LABELS = Object.freeze({
  salon:"Salón / Venue",
  catering:"Catering y bebidas",
  musica:"Música y entretenimiento",
  flores:"Flores y decoración",
  vestuario:"Vestuario",
  foto:"Fotografía",
  video:"Video / Cinematografía",
  torta:"Torta",
  papel:"Papelería e invitaciones",
  transport:"Transporte",
  beauty:"Maquillaje y peluquería",
  luna:"Luna de miel",
  otro:"Otros"
});

function normalizeSpreadsheetKey(value=""){
  return String(value??"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toLowerCase()
    .replace(/\s+/g," ");
}

const VENDOR_CATEGORY_IMPORT_IDS = Object.freeze({
  "salon / venue":"salon",
  "salon":"salon",
  "catering y bebidas":"catering",
  "catering":"catering",
  "musica y entretenimiento":"musica",
  "musica":"musica",
  "flores y decoracion":"flores",
  "flores / decoracion":"flores",
  "vestuario":"vestuario",
  "fotografia":"foto",
  "video / cinematografia":"video",
  "video":"video",
  "torta":"torta",
  "papeleria e invitaciones":"papel",
  "papeleria":"papel",
  "transporte":"transport",
  "maquillaje y peluqueria":"beauty",
  "maquillaje / peinado":"beauty",
  "luna de miel":"luna",
  "otros":"otro",
  "otro":"otro"
});

const VENDOR_STATE_IMPORT_IDS = Object.freeze({
  evaluando:"evaluando",
  contratado:"contratado",
  pagado:"pagado",
  descartado:"descartado"
});

function parseSpreadsheetNumber(value){
  if(typeof value==="number") return Number.isFinite(value)?Math.max(0,value):0;
  let raw=String(value??"").trim();
  if(!raw) return 0;

  raw=raw.replace(/\s/g,"").replace(/[^0-9,.-]/g,"");
  const lastComma=raw.lastIndexOf(",");
  const lastDot=raw.lastIndexOf(".");

  if(lastComma>=0 && lastDot>=0){
    const decimalSeparator=lastComma>lastDot?",":".";
    const thousandsSeparator=decimalSeparator===","?".":",";
    raw=raw.split(thousandsSeparator).join("");
    raw=raw.replace(decimalSeparator,".");
  }else if(lastComma>=0){
    const decimals=raw.length-lastComma-1;
    raw=decimals>0&&decimals<=2 ? raw.replace(",",".") : raw.replace(/,/g,"");
  }else if(lastDot>=0){
    const parts=raw.split(".");
    if(parts.length>2 || (parts.length===2 && parts[1].length===3)) raw=parts.join("");
  }

  const parsed=Number(raw);
  return Number.isFinite(parsed)?Math.max(0,parsed):0;
}

async function loadSheetJS(){
  if(window.XLSX) return window.XLSX;
  await new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload=resolve;
    script.onerror=reject;
    document.head.appendChild(script);
  });
  if(!window.XLSX) throw new Error("No se pudo cargar el lector de Excel.");
  return window.XLSX;
}

async function spreadsheetFileToRows(file){
  const lowerName=String(file?.name||"").toLowerCase();
  if(lowerName.endsWith(".xlsx")||lowerName.endsWith(".xls")){
    const XL=await loadSheetJS();
    const data=await file.arrayBuffer();
    const workbook=XL.read(data);
    const worksheet=workbook.Sheets[workbook.SheetNames[0]];
    return XL.utils.sheet_to_json(worksheet,{header:1,defval:""});
  }

  if(lowerName.endsWith(".csv")){
    const text=await file.text();
    return text.split(/\r?\n/).map(line=>{
      const cells=[];
      let current="";
      let quoted=false;
      for(let index=0;index<line.length;index++){
        const char=line[index];
        if(char==='"' && quoted && line[index+1]==='"'){
          current+='"';
          index++;
        }else if(char==='"'){
          quoted=!quoted;
        }else if(char===","&&!quoted){
          cells.push(current.trim());
          current="";
        }else{
          current+=char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  }

  throw new Error("Elegí un archivo .xlsx, .xls o .csv.");
}

function VendorForm({vendor, onSave, onCancel, budgetCurrency="USD", categories=[]}){
  const categoryOptions = categories.length ? categories : VENDOR_CATS;
  const initialCategory = vendor?.cat || categoryOptions[0]?.id || "salon";
  const initialCurrency = vendor?.currency || budgetCurrency;
  const initialRate = vendor ? getVendorExchangeRateForBudget(vendor,budgetCurrency) : getSuggestedExchangeRate(budgetCurrency,initialCurrency);
  const [v, setV] = useState(vendor
    ? {...vendor,cat:initialCategory,currency:initialCurrency,exchangeRate:formatExchangeRate(initialRate),exchangeRateBaseCurrency:budgetCurrency}
    : {id:Date.now()+"",cat:initialCategory,nombre:"",contacto:"",precio:"",currency:budgetCurrency,exchangeRate:"1",exchangeRateBaseCurrency:budgetCurrency,estado:"evaluando",link:"",notas:""}
  );
  const set = (k,val) => setV(x=>({...x,[k]:val}));
  const vendorCurrency = v.currency || budgetCurrency;
  const currencySymbol = getCurrencySymbol(vendorCurrency);
  const exchangeRate = parseFloat(v.exchangeRate||0) || 1;
  const equivalent = vendorAmountInBudgetCurrency(v,budgetCurrency);
  const changeVendorCurrency = (nextCurrency) => {
    setV(x=>({...x,
      currency:nextCurrency,
      exchangeRate:formatExchangeRate(getSuggestedExchangeRate(budgetCurrency,nextCurrency)),
      exchangeRateBaseCurrency:budgetCurrency
    }));
  };
  const saveVendor = () => {
    const selectedCategory = categoryOptions.find(category => category.id === v.cat);
    onSave({...v,
      categoryName:selectedCategory?.label || v.categoryName || "Otros",
      categoryEmoji:selectedCategory?.emoji || v.categoryEmoji || "📌",
      currency:vendorCurrency,
      exchangeRate:vendorCurrency===budgetCurrency ? "1" : formatExchangeRate(exchangeRate),
      exchangeRateBaseCurrency:budgetCurrency
    });
  };

  return <div data-focus-form="true" style={{background:"#FBF7EF",border:"1px solid rgba(74,94,58,.25)",borderRadius:16,padding:"20px",marginBottom:12,boxShadow:"0 14px 36px rgba(49,39,25,.08)"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Categoría</div>
        <select name="app-field-4547" value={v.cat} onChange={e=>set("cat",e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
          {categoryOptions.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Estado</div>
        <select name="app-field-4553" value={v.estado} onChange={e=>set("estado",e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
          {VENDOR_ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Nombre / Empresa</div>
        <input name="app-field-4561" type="text" value={v.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="ej: Salón Los Pinos"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Contacto</div>
        <input name="app-field-4566" type="text" value={v.contacto} onChange={e=>set("contacto",e.target.value)} placeholder="Tel / email / Instagram"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Precio cotizado</div>
        <div style={{display:"flex",alignItems:"center",gap:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",borderRadius:8,paddingLeft:10}}>
          <span style={{fontFamily:"'Lora',serif",fontSize:".9rem",fontWeight:700,color:"rgba(26,26,20,.45)",flexShrink:0}}>{currencySymbol}</span>
          <input name="app-field-4575" type="number" value={v.precio} onChange={e=>set("precio",e.target.value)} placeholder="0" min="0" step="any"
            style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px 9px 0",border:"none",outline:"none",background:"transparent",color:"#1A1A14",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Moneda del proveedor</div>
        <select name="app-field-4581" value={vendorCurrency} onChange={e=>changeVendorCurrency(e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".92rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
          {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
        </select>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Tipo de cambio</div>
        <input name="app-field-4587" type="number" value={v.exchangeRate} disabled={vendorCurrency===budgetCurrency} onChange={e=>set("exchangeRate",e.target.value)} min="0.000001" step="any"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".92rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:vendorCurrency===budgetCurrency?"rgba(74,94,58,.06)":"#F5EFE0",color:"#1A1A14",boxSizing:"border-box",opacity:vendorCurrency===budgetCurrency ? .65 : 1}}/>
        <div style={{fontFamily:"'Lora',serif",fontSize:".72rem",color:"rgba(26,26,20,.45)",marginTop:5,lineHeight:1.35}}>
          1 {budgetCurrency} = {vendorCurrency===budgetCurrency?"1":formatExchangeRate(exchangeRate)} {vendorCurrency}
        </div>
      </div>
    </div>
    {vendorCurrency!==budgetCurrency && num(v.precio)>0 && <div style={{background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.12)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontFamily:"'Lora',serif",fontSize:".86rem",color:"#4A5E3A"}}>
      Equivalente en el presupuesto: <strong>{getCurrencySymbol(budgetCurrency)} {fmt(equivalent)} {budgetCurrency}</strong>
    </div>}
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Link (web / Instagram)</div>
      <input name="app-field-4599" type="text" value={v.link} onChange={e=>set("link",e.target.value)} placeholder="https://..."
        style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Notas</div>
      <textarea name="app-field-4604" value={v.notas} onChange={e=>set("notas",e.target.value)} rows={2} placeholder="Incluye vajilla, requiere depósito del 30%, etc."
        style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",resize:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{display:"flex",gap:10,position:"sticky",bottom:0,zIndex:20,background:"#FBF7EF",padding:"12px 0 2px",borderTop:"1px solid rgba(201,169,110,.2)"}}>
      <button onClick={onCancel} style={{flex:1,background:"transparent",border:"1px solid rgba(74,94,58,.28)",borderRadius:100,padding:"11px 16px",fontFamily:"'Lora',serif",fontSize:".9rem",fontWeight:700,color:"#4A5E3A",cursor:"pointer"}}>Cancelar</button>
      <button onClick={saveVendor} style={{flex:1.25,background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"11px 18px",fontFamily:"'Lora',serif",fontWeight:800,fontSize:".9rem",cursor:"pointer"}}>Guardar proveedor →</button>
    </div>
  </div>;
}

function VendorsModule({user, onBack}){
  const [vendors, setVendors] = useState(null);
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [budgetCategories, setBudgetCategories] = useState(CATEGORIAS_DEFAULT.map(category=>({...category})));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [filterEst, setFilterEst] = useState("all");
  const [searchVendor, setSearchVendor] = useState("");
  const [showVendorMenu, setShowVendorMenu] = useState(false);
  const isMobile = useIsMobile();
  const isDemo = isDemoUser(user);

  useEffect(()=>{
    const closeMenu=()=>setShowVendorMenu(false);
    document.addEventListener("mousedown",closeMenu);
    return ()=>document.removeEventListener("mousedown",closeMenu);
  },[]);

  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await dataClient(user).from("wedding_data").select("vendors,currency,budget").eq("user_id",user.id).maybeSingle();
        const loadedVendors = Array.isArray(row?.vendors) ? row.vendors : [];
        const currentCurrency = row?.currency || "USD";
        const currentBudget = (row?.budget && Array.isArray(row.budget.categorias) && row.budget.categorias.length)
          ? row.budget
          : {total:0, categorias:CATEGORIAS_DEFAULT.map(category=>({...category}))};
        const syncedBudget = calcBudgetFromVendors(currentBudget, loadedVendors, currentCurrency);
        setVendors(loadedVendors);
        setBudgetCurrency(currentCurrency);
        setBudgetCategories(syncedBudget.categorias || []);
        if(JSON.stringify(syncedBudget) !== JSON.stringify(currentBudget)){
          await dataClient(user).from("wedding_data").upsert({
            user_id:user.id,
            budget:syncedBudget,
            updated_at:new Date().toISOString()
          },{onConflict:"user_id"});
        }
      }catch(e){ setVendors([]); }
    };
    load();
  },[user]);

  const save = async(list) => {
    setSaving(true);
    try{
      const vendorList = list || vendors;
      // La moneda principal vive en Presupuesto. Cada proveedor conserva la suya.
      const {data:row} = await dataClient(user).from("wedding_data").select("budget,currency").eq("user_id",user.id).maybeSingle();
      const currentBudget = row?.budget || {total:0, categorias:CATEGORIAS_DEFAULT.map(c=>({...c}))};
      const currentBudgetCurrency = row?.currency || budgetCurrency || "USD";
      setBudgetCurrency(currentBudgetCurrency);
      const updatedBudget = calcBudgetFromVendors(currentBudget, vendorList, currentBudgetCurrency);
      setBudgetCategories(updatedBudget.categorias || []);
      await dataClient(user).from("wedding_data").upsert({
        user_id:user.id,
        vendors:vendorList,
        budget:updatedBudget,
        updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      setSaved(true); setTimeout(()=>setSaved(false),2000);
    }catch(e){ console.error(e); }
    setSaving(false);
  };

  const saveVendor = (v) => {
    const next = editId==="new" ? [...(vendors||[]),v] : (vendors||[]).map(x=>x.id===v.id?v:x);
    setVendors(next); setEditId(null); setAdding(false); save(next);
  };
  const removeVendor = (id) => { const next=(vendors||[]).filter(x=>x.id!==id); setVendors(next); save(next); };

  if(vendors===null) return <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'Lora',serif",color:"#4A5E3A"}}>Cargando proveedores...</p></div>;

  const vendorCategoryOptions = budgetCategoriesToVendorOptions(budgetCategories);
  const catMap = Object.fromEntries(vendorCategoryOptions.map(c=>[c.id,c]));
  const estMap = Object.fromEntries(VENDOR_ESTADOS.map(e=>[e.id,e]));
  const filtered = vendors.filter(v=>{
    if(filterCat!=="all"&&v.cat!==filterCat) return false;
    if(filterEst!=="all"&&v.estado!==filterEst) return false;
    if(searchVendor.trim()){
      const q=searchVendor.trim().toLowerCase();
      if(!v.nombre?.toLowerCase().includes(q)&&!v.notas?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const contratados = vendors.filter(v=>v.estado==="contratado"||v.estado==="pagado").length;
  const totalCotizado = vendors.filter(v=>v.estado!=="descartado").reduce((s,v)=>s+vendorAmountInBudgetCurrency(v,budgetCurrency),0);
  const budgetCurrencySymbol = getCurrencySymbol(budgetCurrency);

  const importVendorsFromFile = async(event) => {
    const file=event.target.files?.[0];
    if(!file) return;
    event.target.value="";

    try{
      const rows=await spreadsheetFileToRows(file);
      const expectedHeaders=["categoria","nombre","contacto","precio","moneda","estado","link","notas"];
      let headerIndex=-1;

      for(let index=0;index<rows.length;index++){
        const normalizedRow=(rows[index]||[]).map(normalizeSpreadsheetKey);
        const recognized=normalizedRow.filter(value=>expectedHeaders.includes(value)).length;
        if(normalizedRow.includes("nombre")&&recognized>=2){
          headerIndex=index;
          break;
        }
      }

      if(headerIndex<0){
        showToast("No se encontró la fila de encabezados de proveedores","error");
        return;
      }

      const headers=(rows[headerIndex]||[]).map(normalizeSpreadsheetKey);
      const column=name=>headers.indexOf(name);
      const indexes={
        categoria:column("categoria"),
        nombre:column("nombre"),
        contacto:column("contacto"),
        precio:column("precio"),
        moneda:column("moneda"),
        estado:column("estado"),
        link:column("link"),
        notas:column("notas")
      };

      if(indexes.nombre<0){
        showToast("Falta la columna Nombre en el archivo","error");
        return;
      }

      const validCurrencies=new Set(CURRENCIES.map(currency=>currency.code));
      const imported=[];
      let fallbackCategories=0;
      let fallbackCurrencies=0;
      let fallbackStates=0;
      const timestamp=Date.now();

      for(let rowIndex=headerIndex+1;rowIndex<rows.length;rowIndex++){
        const row=rows[rowIndex]||[];
        if(row.every(cell=>String(cell??"").trim()==="")) continue;

        const nombre=String(row[indexes.nombre]??"").trim();
        if(!nombre) continue;

        const categoryRaw=indexes.categoria>=0?normalizeSpreadsheetKey(row[indexes.categoria]):"";
        const categoryId=VENDOR_CATEGORY_IMPORT_IDS[categoryRaw]||"otro";
        if(categoryRaw&&!VENDOR_CATEGORY_IMPORT_IDS[categoryRaw]) fallbackCategories++;

        const stateRaw=indexes.estado>=0?normalizeSpreadsheetKey(row[indexes.estado]):"";
        const estado=stateRaw?(VENDOR_STATE_IMPORT_IDS[stateRaw]||"evaluando"):"evaluando";
        if(stateRaw&&!VENDOR_STATE_IMPORT_IDS[stateRaw]) fallbackStates++;

        const currencyRaw=indexes.moneda>=0?String(row[indexes.moneda]??"").trim().toUpperCase():"";
        const currency=currencyRaw&&validCurrencies.has(currencyRaw)?currencyRaw:budgetCurrency;
        if(currencyRaw&&!validCurrencies.has(currencyRaw)) fallbackCurrencies++;

        imported.push({
          id:`${timestamp}-${rowIndex}`,
          cat:categoryId,
          nombre,
          contacto:indexes.contacto>=0?String(row[indexes.contacto]??"").trim():"",
          precio:indexes.precio>=0?parseSpreadsheetNumber(row[indexes.precio]):0,
          currency,
          exchangeRate:formatExchangeRate(getSuggestedExchangeRate(budgetCurrency,currency)),
          exchangeRateBaseCurrency:budgetCurrency,
          estado,
          link:indexes.link>=0?String(row[indexes.link]??"").trim():"",
          notas:indexes.notas>=0?String(row[indexes.notas]??"").trim():""
        });
      }

      if(imported.length===0){
        showToast("No se encontraron proveedores válidos en el archivo","error");
        return;
      }

      const next=[...(vendors||[]),...imported];
      setVendors(next);
      await save(next);

      const warnings=[];
      if(fallbackCategories) warnings.push(`${fallbackCategories} categorías se guardaron como Otros`);
      if(fallbackCurrencies) warnings.push(`${fallbackCurrencies} monedas usaron ${budgetCurrency}`);
      if(fallbackStates) warnings.push(`${fallbackStates} estados se guardaron como Evaluando`);
      showToast(`✓ ${imported.length} proveedores importados${warnings.length?`. ${warnings.join(". ")}`:""}`,"success");
    }catch(error){
      console.error("Error importando proveedores:",error);
      showToast(error?.message||"No pudimos importar el archivo de proveedores","error");
    }
  };

  const exportVendorsToExcel = async() => {
    if(!vendors?.length){
      showToast("Todavía no hay proveedores para exportar","info");
      return;
    }

    try{
      const XL=await loadSheetJS();
      let workbook;

      try{
        workbook=await loadPrivateExcelTemplateWorkbook("vendorImportTemplate",XL);
      }catch(templateError){
        console.warn("No se pudo usar la plantilla privada para exportar proveedores:",templateError);
        workbook=XL.utils.book_new();
      }

      const rows=[
        ["Categoria","Nombre","Contacto","Precio","Moneda","Estado","Link","Notas"],
        ...vendors.map(vendor=>[
          VENDOR_CATEGORY_EXPORT_LABELS[vendor.cat]||catMap[vendor.cat]?.label||"Otros",
          vendor.nombre||"",
          vendor.contacto||"",
          parseSpreadsheetNumber(vendor.precio),
          vendor.currency||budgetCurrency,
          estMap[vendor.estado]?.label||"Evaluando",
          vendor.link||"",
          vendor.notas||""
        ])
      ];

      const worksheet=replaceTemplateTableRows(XL,workbook,"Proveedores",rows,{
        columns:8,
        minimumRows:Math.max(60,rows.length),
        tableName:"tblProveedores"
      });
      worksheet["!cols"]=[{wch:28},{wch:28},{wch:24},{wch:14},{wch:11},{wch:14},{wch:32},{wch:34}];
      worksheet["!dataValidation"]=[
        {sqref:`A2:A${Math.max(60,rows.length)}`,type:"list",formula1:'"Salón / Venue,Catering y bebidas,Música y entretenimiento,Flores y decoración,Vestuario,Fotografía,Video / Cinematografía,Torta,Papelería e invitaciones,Transporte,Maquillaje y peluquería,Luna de miel,Otros"',allowBlank:true},
        {sqref:`E2:E${Math.max(60,rows.length)}`,type:"list",formula1:`"${CURRENCIES.map(currency=>currency.code).join(",")}"`,allowBlank:true},
        {sqref:`F2:F${Math.max(60,rows.length)}`,type:"list",formula1:'"Evaluando,Contratado,Pagado,Descartado"',allowBlank:true}
      ];

      ensureExcelHowToSheet(XL,workbook,"vendors");
      XL.writeFile(workbook,"proveedores_boda.xlsx");
      showToast("✓ Proveedores exportados en el mismo formato de importación","success");
    }catch(error){
      console.error("Error exportando proveedores:",error);
      showToast(error?.message||"No pudimos generar el Excel de proveedores","error");
    }
  };

  const downloadVendorTemplate = async() => {
    try{
      await openExcelTemplateDownload("vendorImportTemplate","vendors_import_template");
    }catch(error){
      showToast(error?.message||"No pudimos descargar la plantilla de proveedores","error");
    }
  };

  return <div style={{minHeight:"100dvh",background:"#F5EFE0",paddingBottom:96}}>
    {/* Header */}
    <div style={{background:"#4A5E3A",padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:0,lineHeight:1.1}}>🏢 Proveedores</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end",marginTop:8}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"8px 12px",borderRadius:100,border:"1px solid rgba(201,169,110,.45)",color:"rgba(245,239,224,.88)"}}>Moneda principal: <strong>{budgetCurrency}</strong></div>
            <button onClick={()=>{setAdding(true);setEditId("new");}} style={{background:"#D9B86F",color:"#1A1A14",border:"none",padding:"10px 20px",fontFamily:"'Lora',serif",fontWeight:800,fontSize:".9rem",borderRadius:100,cursor:"pointer"}}>+ Agregar</button>
          </div>
        </div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(245,239,224,.82)",marginTop:10,lineHeight:1.5}}>Cargá cada proveedor en la moneda en la que te cotizó. También te mostramos el equivalente en {budgetCurrency} para que puedas comparar.</div>
        {/* Summary pills */}
        <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
          {[{label:`${vendors.length} en total`,color:"rgba(245,239,224,.9)"},{label:`${contratados} contratados`,color:"#D9B86F"},{label:`Total cotizado: ${budgetCurrency} ${fmt(totalCotizado)}`,color:"rgba(245,239,224,.86)"},{label:saving?"Guardando…":saved?"Cambios guardados ✓":"",color:"#D9B86F"}].filter(p=>p.label).map(p=>
            <div key={p.label} style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:p.color}}>{p.label}</div>
          )}
        </div>
      </div>
    </div>

    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>
      <section aria-label="Importar y exportar proveedores en Excel" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:"#FBF7EF",border:"1px solid rgba(74,94,58,.16)",borderRadius:16,padding:"12px 14px",marginBottom:16,boxShadow:"0 5px 18px rgba(63,50,31,.045)"}}>
        <div style={{minWidth:150}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"#4A5E3A",fontWeight:800}}>Archivo Excel</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:".75rem",lineHeight:1.4,color:"rgba(26,26,20,.52)",marginTop:3}}>Descargá la plantilla vacía, completala e importala. También podés exportar los datos actuales.</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",width:isMobile?"100%":"auto"}}>
          <label style={{flex:isMobile?"1 1 135px":"0 0 auto",display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:42,padding:"9px 14px",border:"1px solid rgba(74,94,58,.3)",borderRadius:100,background:"#FFFDF8",fontFamily:"'Lora',serif",fontSize:".8rem",fontWeight:750,color:"#4A5E3A",cursor:"pointer",boxSizing:"border-box",whiteSpace:"nowrap"}}>
            ↑ Importar archivo
            <input name="vendor-import-file-visible" type="file" accept=".xlsx,.xls,.csv" onChange={importVendorsFromFile} style={{display:"none"}}/>
          </label>
          {!isDemo&&<button type="button" onClick={exportVendorsToExcel} disabled={!vendors.length} style={{flex:isMobile?"1 1 135px":"0 0 auto",minHeight:42,padding:"9px 14px",border:"none",borderRadius:100,background:vendors.length?"#4A5E3A":"rgba(74,94,58,.28)",fontFamily:"'Lora',serif",fontSize:".8rem",fontWeight:800,color:"#FBF7EF",cursor:vendors.length?"pointer":"not-allowed",whiteSpace:"nowrap"}}>↓ Exportar datos</button>}
          {!isDemo&&<button type="button" onClick={downloadVendorTemplate} style={{flex:isMobile?"1 1 160px":"0 0 auto",minHeight:42,padding:"9px 14px",border:"1px solid rgba(201,169,110,.52)",borderRadius:100,background:"rgba(201,169,110,.12)",fontFamily:"'Lora',serif",fontSize:".8rem",fontWeight:750,color:"#4A5E3A",cursor:"pointer",whiteSpace:"nowrap"}}>Descargar plantilla</button>}
        </div>
      </section>
      {/* Add form */}
      {adding && editId==="new" && <VendorForm budgetCurrency={budgetCurrency} categories={vendorCategoryOptions} onSave={saveVendor} onCancel={()=>{setAdding(false);setEditId(null);}}/>}

      {/* Filters */}
      <div style={{display:"grid",gap:9,marginBottom:16,width:"100%"}}>
        <div style={{position:"relative",width:"100%"}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:".9rem",pointerEvents:"none",opacity:.45}}>⌕</span>
          <input name="app-field-4732" value={searchVendor} onChange={e=>setSearchVendor(e.target.value)} placeholder="Buscar por nombre o nota"
            style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"10px 38px 10px 38px",borderRadius:100,border:"1px solid rgba(74,94,58,.22)",background:"#FBF7EF",color:"#1A1A14",boxSizing:"border-box",outline:"none"}}/>
          {searchVendor&&<button onClick={()=>setSearchVendor("")} aria-label="Limpiar búsqueda" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(26,26,20,.5)",fontSize:"1.1rem"}}>×</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
          <select name="app-field-4737" aria-label="Filtrar por categoría" value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".84rem",padding:"9px 30px 9px 12px",borderRadius:100,border:"1px solid rgba(74,94,58,.24)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
            <option value="all">Todas las categorías</option>
            {vendorCategoryOptions.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <select name="app-field-4741" aria-label="Filtrar por estado" value={filterEst} onChange={e=>setFilterEst(e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".84rem",padding:"9px 30px 9px 12px",borderRadius:100,border:"1px solid rgba(74,94,58,.24)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
            <option value="all">Todos los estados</option>
            {VENDOR_ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        {(filterCat!=="all"||filterEst!=="all")&&<button onClick={()=>{setFilterCat("all");setFilterEst("all");}} style={{justifySelf:"start",background:"transparent",border:"none",color:"#4A5E3A",fontFamily:"'Lora',serif",fontSize:".82rem",fontWeight:700,cursor:"pointer",padding:"2px 4px"}}>Limpiar filtros</button>}
      </div>

      {filtered.length===0 && !adding && <div style={{textAlign:"center",padding:"clamp(20px,4vw,48px) clamp(12px,2vw,20px)",background:"#FBF7EF",borderRadius:18,border:"0.5px solid rgba(201,169,110,.2)"}}>
        <div style={{fontSize:"2.5rem",marginBottom:12}}>🏢</div>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",color:"#1A1A14",marginBottom:8}}>Aún no hay proveedores</p>
        <p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"rgba(26,26,20,.62)",margin:"0 auto 20px",maxWidth:470,lineHeight:1.55}}>Empezá cargando uno de los proveedores que ya consultaste o contrataste. Después vas a poder comparar propuestas, pagos y pendientes.</p>
        <button onClick={()=>{setAdding(true);setEditId("new");}} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"12px 24px",fontFamily:"'Lora',serif",fontWeight:700,cursor:"pointer"}}>+ Agregar proveedor</button>
      </div>}

      {filtered.map(v=>{
        const cat = catMap[v.cat]||{emoji:"📌",label:"Otro"};
        const est = estMap[v.estado]||VENDOR_ESTADOS[0];
        if(editId===v.id) return <VendorForm key={v.id} vendor={v} budgetCurrency={budgetCurrency} categories={vendorCategoryOptions} onSave={saveVendor} onCancel={()=>setEditId(null)}/>;
        return <div key={v.id} style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.22)",borderRadius:14,padding:"16px 18px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{fontSize:"1.5rem",flexShrink:0,marginTop:2}}>{cat.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"1.05rem",color:"#1A1A14"}}>{v.nombre||"Sin nombre"}</div>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",padding:"3px 8px",borderRadius:100,background:est.bg,color:est.color}}>{est.label}</span>
              </div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:6}}>{cat.label}</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                {v.contacto&&<div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.55)"}}>📞 {v.contacto}</div>}
                {v.precio&&<div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.65)",fontWeight:600}}>
                  {getCurrencySymbol(v.currency||budgetCurrency)} {fmt(v.precio)} <span style={{fontSize:".72rem",fontWeight:400,color:"rgba(26,26,20,.38)"}}>{v.currency||budgetCurrency}</span>
                  {(v.currency||budgetCurrency)!==budgetCurrency&&<span style={{fontSize:".76rem",fontWeight:500,color:"#4A5E3A",marginLeft:8}}>≈ {budgetCurrencySymbol} {fmt(vendorAmountInBudgetCurrency(v,budgetCurrency))} {budgetCurrency}</span>}
                </div>}
                {v.link&&<a href={v.link.startsWith("http")?v.link:`https://${v.link}`} target="_blank" rel="noopener noreferrer" style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"#4A5E3A",textDecoration:"none"}}>🔗 Ver</a>}
              </div>
              {v.notas&&<p style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.45)",fontStyle:"italic",margin:"6px 0 0",lineHeight:1.5}}>{v.notas}</p>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>setEditId(v.id)} style={{background:"transparent",border:"0.5px solid rgba(74,94,58,.25)",borderRadius:100,padding:"5px 12px",fontFamily:"'Lora',serif",fontSize:".8rem",color:"#4A5E3A",cursor:"pointer"}}>Editar</button>
              <button onClick={()=>removeVendor(v.id)} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.2)",fontSize:"1.1rem",cursor:"pointer",padding:"4px"}}>×</button>
            </div>
          </div>
        </div>;
      })}
      <BackToHome onBack={onBack}/>
    </div>
  </div>;
}


// ─── WEATHER WIDGET ───────────────────────────────────────────────────────────
const WMO_ICONS = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"🌨️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",
  95:"⛈️",96:"⛈️",99:"⛈️"
};
const WMO_DESC = {
  0:"Despejado",1:"Mayormente despejado",2:"Parcialmente nublado",3:"Nublado",
  45:"Neblina",51:"Llovizna",53:"Llovizna moderada",55:"Llovizna intensa",
  61:"Lluvia leve",63:"Lluvia moderada",65:"Lluvia intensa",71:"Nieve leve",
  75:"Nieve intensa",80:"Chubascos",81:"Chubascos moderados",82:"Chubascos fuertes",
  95:"Tormenta",99:"Tormenta fuerte"
};

function WeatherWidget({fechaBoda, ciudad}){
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(()=>{
    if(!fechaBoda || !ciudad) return;
    const fetch_wx = async()=>{
      setLoading(true); setErr(null);
      try{
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`);
        const geoData = await geo.json();
        if(!geoData.results?.length) throw new Error("Ciudad no encontrada");
        const {latitude:lat, longitude:lon, name, country} = geoData.results[0];
        const weddingDate = new Date(fechaBoda+"T12:00:00");
        const today = new Date();
        const diffDays = Math.round((weddingDate-today)/(1000*60*60*24));
        if(diffDays >= 0 && diffDays <= 16){
          const fc = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=16`);
          const fcData = await fc.json();
          const idx = fcData.daily.time.indexOf(fechaBoda);
          if(idx>=0) setWx({type:"forecast",name,country,diffDays,tmax:fcData.daily.temperature_2m_max[idx],tmin:fcData.daily.temperature_2m_min[idx],rain:fcData.daily.precipitation_sum[idx],code:fcData.daily.weather_code[idx]});
        } else if(diffDays > 16){
          const year = weddingDate.getFullYear()-1;
          const mm = String(weddingDate.getMonth()+1).padStart(2,"0");
          const hist = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${year}-${mm}-01&end_date=${year}-${mm}-28&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
          const hd = await hist.json();
          const avgMax = (hd.daily.temperature_2m_max.reduce((a,b)=>a+(b||0),0)/hd.daily.temperature_2m_max.length).toFixed(1);
          const avgMin = (hd.daily.temperature_2m_min.reduce((a,b)=>a+(b||0),0)/hd.daily.temperature_2m_min.length).toFixed(1);
          const rainDays = hd.daily.precipitation_sum.filter(v=>v>1).length;
          setWx({type:"historic",name,country,diffDays,avgMax,avgMin,rainDays,month:weddingDate.toLocaleString("es",{month:"long"})});
        }
      }catch(e){ setErr(e.message); }
      setLoading(false);
    };
    fetch_wx();
  },[fechaBoda,ciudad]);

  if(!fechaBoda || !ciudad) return null;
  if(loading) return <div style={{background:"rgba(74,94,58,.06)",border:"0.5px solid rgba(74,94,58,.15)",borderRadius:12,padding:"12px 16px",marginBottom:16}}><p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.45)",margin:0,fontStyle:"italic"}}>🔍 Consultando clima para {ciudad}...</p></div>;
  if(err) return <div style={{background:"rgba(200,80,60,.05)",border:"0.5px solid rgba(200,80,60,.2)",borderRadius:12,padding:"12px 16px",marginBottom:16}}><p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(200,80,60,.7)",margin:0}}>⚠️ Clima: {err}</p></div>;
  if(!wx) return null;

  const icon = WMO_ICONS[wx.code]||"🌡️";
  const desc = WMO_DESC[wx.code]||"";

  return <div style={{background:"rgba(74,94,58,.06)",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
    <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:10}}>🌤️ Clima para tu boda — {wx.name}, {wx.country}</div>
    {wx.type==="forecast"&&<div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div style={{fontSize:"2.5rem",lineHeight:1}}>{icon}</div>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700,color:"#1A1A14"}}>{desc}</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.6)",marginTop:4}}>🌡️ {wx.tmin}° – {wx.tmax}°C &nbsp;·&nbsp; {wx.rain>0?`🌧️ ${wx.rain}mm esperados`:"☀️ Sin lluvia esperada"}</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(74,94,58,.7)",marginTop:4,fontStyle:"italic"}}>{wx.diffDays===0?"¡Es hoy!":wx.diffDays===1?"¡Es mañana!":`Faltan ${wx.diffDays} días`} — pronóstico actualizado</div>
      </div>
    </div>}
    {wx.type==="historic"&&<div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1A1A14",marginBottom:4}}>Clima típico para {wx.month} en {wx.name}</div>
      <div style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.6)"}}>🌡️ {wx.avgMin}° – {wx.avgMax}°C &nbsp;·&nbsp; {wx.rainDays} días de lluvia (promedio histórico)</div>
      <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.38)",marginTop:6,fontStyle:"italic"}}>Faltan {wx.diffDays} días — el pronóstico exacto estará disponible 16 días antes.</div>
    </div>}
    {wx.type==="forecast"&&wx.rain>2&&<div style={{marginTop:10,background:"rgba(200,80,60,.06)",border:"0.5px solid rgba(200,80,60,.2)",borderRadius:8,padding:"10px 12px"}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(200,80,60,.75)",margin:0}}>⚠️ Se esperan lluvias. Si tenés eventos al aire libre, confirmá el plan B con el venue.</p>
    </div>}
  </div>;
}

// ─── MÓDULO INVITADOS ─────────────────────────────────────────────────────────
const RESTRICCIONES = ["Ninguna","Vegetariano","Vegano","Sin gluten","Sin lactosa","Kosher","Halal","Alergia (notar)","Otra"];
// Grupos de parentesco (protocolo bodas.net): base de la distribución recomendada
const PARENTESCOS = ["Familia directa","Familia","Amigos","Trabajo","Niños","Otro"];
const CONFIRMACIONES = [
  {id:"pendiente",  label:"Pendiente",  color:"rgba(201,169,110,.8)", bg:"rgba(201,169,110,.1)"},
  {id:"confirmado", label:"Confirmado", color:"rgba(74,94,58,.85)",   bg:"rgba(74,94,58,.1)"},
  {id:"no_va",      label:"No va",      color:"rgba(26,26,20,.35)",   bg:"rgba(26,26,20,.05)"},
];
const PARENTESCO_HUMANO = {
  "Familia directa":"familia directa",
  "Familia":"familia",
  "Amigos":"amigos",
  "Trabajo":"compañeros de trabajo",
  "Niños":"niños",
  "Otro":"invitados afines"
};
const PARENTESCO_MESA_IDEAL = {
  "Familia directa":"mesa familiar cercana a los novios",
  "Familia":"mesa familiar",
  "Amigos":"mesa de amigos o mesa cerca de la pista",
  "Trabajo":"mesa de compañeros de trabajo",
  "Niños":"mesa infantil o cerca de sus padres",
  "Otro":"mesa con invitados compatibles"
};
const getConfirmacionStyle = (id) => CONFIRMACIONES.find(c=>c.id===id) || CONFIRMACIONES[0];
const getGuestSoftStatusStyle = (id) => {
  const c=getConfirmacionStyle(id);
  return {
    background:c.bg,
    border:`1px solid ${c.color}`,
    boxShadow:id==="confirmado"?"inset 3px 0 0 rgba(74,94,58,.45)":id==="pendiente"?"inset 3px 0 0 rgba(201,169,110,.55)":"inset 3px 0 0 rgba(26,26,20,.18)",
  };
};
const LADOS = ["Novio","Novia","Ambos"];
const ROUND_TABLE_CAPACITIES = [8,10,12];
const normalizeRoundTableCapacity = (value, fallback=8) => {
  const parsed = parseInt(value);
  return ROUND_TABLE_CAPACITIES.includes(parsed) ? parsed : fallback;
};


function GuestImportReviewModal({review,onAuto,onBank,onCancel}){
  if(!review) return null;
  const s=review.summary||{};
  const realMissing=Math.max(0,parseInt(s.mesasNuevasAuto)||0);
  return <div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onCancel}>
    <div style={{position:"absolute",inset:0,background:"rgba(26,26,20,.56)",backdropFilter:"blur(4px)"}}/>
    <div role="dialog" aria-modal="true" aria-label="Revisar importación de invitados" onClick={e=>e.stopPropagation()} style={{position:"relative",width:"min(100%,560px)",maxHeight:"min(90dvh,760px)",overflowY:"auto",background:THEME.color.cream2,border:"1px solid rgba(201,169,110,.42)",borderRadius:22,padding:"22px 20px",boxShadow:"0 24px 70px rgba(26,20,14,.32)"}}>
      <button type="button" aria-label="Cerrar" onClick={onCancel} style={{position:"absolute",right:12,top:12,width:34,height:34,borderRadius:999,border:"1px solid rgba(74,94,58,.16)",background:"#FFFDF8",color:"rgba(26,26,20,.52)",fontSize:"1.15rem",cursor:"pointer"}}>×</button>
      <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".16em",textTransform:"uppercase",color:THEME.color.sage,marginBottom:7}}>Revisar antes de importar</div>
      <h3 style={{fontFamily:THEME.font.display,fontSize:"clamp(1.35rem,5vw,1.9rem)",lineHeight:1.08,color:THEME.color.ink,margin:"0 38px 8px 0"}}>Encontramos {s.totalInvitaciones||0} invitaciones</h3>
      <p style={{fontFamily:THEME.font.body,fontSize:".88rem",lineHeight:1.55,color:"rgba(26,26,20,.58)",margin:"0 0 14px"}}>La app mantiene cada invitación o familia junta. Nadie se divide entre mesas y ninguna mesa supera la capacidad definida.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:12}}>
        {[
          [s.totalPersonas||0,"Personas en el archivo"],
          [s.invitacionesSinMesa||0,"Invitaciones sin mesa"],
          [s.mesasConExceso||0,"Mesas del archivo con exceso"],
          [s.invitacionesReubicadas||0,"Invitaciones a reubicar"],
        ].map(([value,label])=><div key={label} style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.12)",borderRadius:13,padding:"11px 10px"}}><div style={{fontFamily:THEME.font.display,fontSize:"1.25rem",fontWeight:700,color:THEME.color.sage}}>{value}</div><div style={{fontFamily:THEME.font.body,fontSize:".72rem",lineHeight:1.3,color:"rgba(26,26,20,.5)",marginTop:2}}>{label}</div></div>)}
      </div>
      <div style={{background:realMissing>0?"rgba(201,169,110,.11)":"rgba(74,94,58,.06)",border:`1px solid ${realMissing>0?"rgba(201,169,110,.34)":"rgba(74,94,58,.15)"}`,borderRadius:13,padding:"11px 12px",marginBottom:12,fontFamily:THEME.font.body,fontSize:".78rem",lineHeight:1.5,color:"rgba(26,26,20,.65)"}}>
        <strong style={{display:"block",fontFamily:THEME.font.display,fontSize:".98rem",color:THEME.color.ink,marginBottom:3}}>{realMissing>0?`Faltan aproximadamente ${realMissing} mesas de 8`:`La capacidad actual alcanza`}</strong>
        Tus {s.mesasActuales||0} mesas actuales ofrecen {s.capacidadActual||0} lugares. {s.lugaresFaltantes>0?`Para ubicar a todas las personas faltan ${s.lugaresFaltantes} lugares.`:"No faltan lugares por capacidad total; igual puede haber familias que necesiten otra mesa para permanecer juntas."}
      </div>
      {s.gruposDemasiadoGrandes>0&&<div style={{background:"rgba(200,80,60,.07)",border:"1px solid rgba(200,80,60,.2)",borderRadius:12,padding:"10px 12px",fontFamily:THEME.font.body,fontSize:".78rem",lineHeight:1.45,color:"rgba(150,48,42,.85)",marginBottom:12}}>⚠️ {s.gruposDemasiadoGrandes} {s.gruposDemasiadoGrandes===1?"invitación supera":"invitaciones superan"} la capacidad máxima disponible y quedará en el Banco de espera.</div>}
      <div style={{display:"grid",gap:9}}>
        <button type="button" onClick={onAuto} style={{border:0,borderRadius:14,padding:"13px 14px",background:THEME.color.sage,color:THEME.color.cream,textAlign:"left",cursor:"pointer",boxShadow:"0 8px 22px rgba(74,94,58,.18)"}}>
          <span style={{display:"inline-flex",fontFamily:THEME.font.label,fontSize:".6rem",letterSpacing:".1em",textTransform:"uppercase",background:"rgba(251,247,239,.18)",borderRadius:999,padding:"3px 7px",marginBottom:6}}>Recomendado</span><strong style={{display:"block",fontFamily:THEME.font.body,fontSize:".9rem"}}>Reorganizar respetando capacidades</strong>
          <span style={{display:"block",fontFamily:THEME.font.body,fontSize:".73rem",lineHeight:1.45,opacity:.78,marginTop:3}}>Completa primero las mesas con lugar, mantiene cada familia junta y propone mesas nuevas cuando hace falta. Después decidís cuándo agregarlas al canvas.</span>
        </button>
        <button type="button" onClick={onBank} style={{border:"1px solid rgba(201,169,110,.42)",borderRadius:14,padding:"12px 14px",background:"rgba(201,169,110,.07)",color:THEME.color.ink,textAlign:"left",cursor:"pointer"}}>
          <strong style={{display:"block",fontFamily:THEME.font.body,fontSize:".86rem"}}>Mantener solo asignaciones válidas</strong>
          <span style={{display:"block",fontFamily:THEME.font.body,fontSize:".73rem",lineHeight:1.45,color:"rgba(26,26,20,.55)",marginTop:3}}>Deja sin mesa a las invitaciones que no entren completas para que las ubiques después desde el Banco de espera.</span>
        </button>
        <button type="button" onClick={onCancel} style={{border:0,background:"transparent",padding:"10px",fontFamily:THEME.font.body,fontSize:".8rem",color:"rgba(26,26,20,.48)",cursor:"pointer"}}>Cancelar importación</button>
      </div>
    </div>
  </div>;
}

function ClearGuestsModal({count,onExport,onConfirm,onCancel}){
  return <div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onCancel}>
    <div style={{position:"absolute",inset:0,background:"rgba(26,26,20,.5)",backdropFilter:"blur(3px)"}}/>
    <div role="dialog" aria-modal="true" aria-label="Limpiar lista de invitados" onClick={e=>e.stopPropagation()} style={{position:"relative",width:"min(100%,430px)",background:THEME.color.cream2,border:"1px solid rgba(200,80,60,.22)",borderRadius:20,padding:"22px 20px",boxShadow:"0 20px 60px rgba(26,20,14,.3)"}}>
      <div style={{width:42,height:42,borderRadius:14,display:"grid",placeItems:"center",background:"rgba(200,80,60,.09)",fontSize:"1.2rem",marginBottom:12}}>🗑️</div>
      <h3 style={{fontFamily:THEME.font.display,fontSize:"1.45rem",lineHeight:1.12,color:THEME.color.ink,margin:"0 0 8px"}}>¿Querés eliminar {count} {count===1?"invitación":"invitaciones"}?</h3>
      <p style={{fontFamily:THEME.font.body,fontSize:".84rem",lineHeight:1.55,color:"rgba(26,26,20,.58)",margin:"0 0 16px"}}>Se borrarán los invitados y sus asignaciones. Las mesas y el diseño del salón se conservarán.</p>
      <div style={{display:"grid",gap:8}}>
        <button type="button" onClick={onExport} style={{border:"1px solid rgba(74,94,58,.25)",borderRadius:999,padding:"11px 14px",background:"#FFFDF8",fontFamily:THEME.font.body,fontSize:".82rem",fontWeight:750,color:THEME.color.sage,cursor:"pointer"}}>Exportar copia antes de limpiar</button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button type="button" onClick={onCancel} style={{border:"1px solid rgba(74,94,58,.18)",borderRadius:999,padding:"11px",background:"transparent",fontFamily:THEME.font.body,fontSize:".82rem",color:"rgba(26,26,20,.55)",cursor:"pointer"}}>Cancelar</button>
          <button type="button" onClick={onConfirm} style={{border:0,borderRadius:999,padding:"11px",background:"rgba(190,55,48,.92)",fontFamily:THEME.font.body,fontSize:".82rem",fontWeight:800,color:"white",cursor:"pointer"}}>Eliminar todo</button>
        </div>
      </div>
    </div>
  </div>;
}

function GuestsModule({user, onBack, onGoDesigner, isDemo=false}){
  const [guests, setGuests]     = useState(null);
  const [tableSize, setTableSize] = useState(8);
  const [viewMode, setViewMode] = useState(()=>{
    if(typeof window==="undefined") return "lista";
    try{
      const saved=sessionStorage.getItem(`ceci_guests_view_mode:${user?.id||"anon"}`);
      return ["lista","mesas","salon"].includes(saved)?saved:"lista";
    }catch(error){
      return "lista";
    }
  });
  const [filter, setFilter]     = useState({lado:"",conf:"",mesa:""});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [newGuest, setNewGuest] = useState({nombre:"",lado:"Ambos",parentesco:"Amigos",confirmacion:"pendiente",restriccion:"Ninguna",mesa:"",cantidadInvitados:1,notas:""});
  const [addMode, setAddMode]   = useState(false);
  const [autoMesaLoading, setAutoMesaLoading] = useState(false);
  const [search, setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [budgetInvitados, setBudgetInvitados] = useState(0);
  const [showGuestMenu, setShowGuestMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [pendingGuestImport, setPendingGuestImport] = useState(null);
  const [movingGuest, setMovingGuest]     = useState(null); // vista Mesas: invitado en movimiento
  const [selectedGuestTable, setSelectedGuestTable] = useState(null);
  const [openGuestTableMenu, setOpenGuestTableMenu] = useState(null);
  const [deletedGuestTable, setDeletedGuestTable] = useState(null);
  const [guia, setGuia]                   = useState(null); // sección de la guía abierta (o null)
  const isMobile = useIsMobile();

  useEffect(()=>{
    if(typeof window==="undefined") return;
    try{
      sessionStorage.setItem(`ceci_guests_view_mode:${user?.id||"anon"}`,viewMode);
    }catch(error){}
  },[viewMode,user?.id]);

  useEffect(()=>{
    if(isMobile&&viewMode!=="lista") setViewMode("lista");
    if(!isMobile&&viewMode==="salon") setViewMode("mesas");
  },[isMobile]);

  useEffect(()=>{
    const h=()=>{setShowGuestMenu(false);setOpenGuestTableMenu(null);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    if(!deletedGuestTable) return;
    const timeout=window.setTimeout(()=>setDeletedGuestTable(null),10000);
    return ()=>window.clearTimeout(timeout);
  },[deletedGuestTable]);

  useEffect(()=>{
    if(!user) return;
    dataClient(user).from("wedding_data").select("guests,table_size,budget").eq("user_id",user.id).maybeSingle()
      .then(({data:row})=>{
        setGuests(Array.isArray(row?.guests)?row.guests:[]);
        if(row?.table_size) setTableSize(normalizeRoundTableCapacity(row.table_size,8));
        // Leer invitados del presupuesto
        const bi = parseInt(row?.budget?.invitados||0);
        if(bi>0) setBudgetInvitados(bi);
      }).catch(()=>setGuests([]));
  },[user]);

  const save = async(list, ts) => {
    setSaving(true);
    try{
      const gList = list||guests;
      const tSize = ts||tableSize;
      // Calcular total de personas para sync con presupuesto
      const totalPersonas = gList.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
      // Leer budget actual para no perder datos
      let budgetUpdate = null;
      try{
        const {data:brow} = await dataClient(user).from("wedding_data").select("budget").eq("user_id",user.id).maybeSingle();
        if(brow?.budget) budgetUpdate = {...brow.budget, invitados: String(totalPersonas)};
      }catch(e){}
      const upsertData = {user_id:user.id,guests:gList,table_size:tSize,updated_at:new Date().toISOString()};
      if(budgetUpdate) upsertData.budget = budgetUpdate;
      await dataClient(user).from("wedding_data").upsert(upsertData,{onConflict:"user_id"});
      setSaved(true); setTimeout(()=>setSaved(false),1500);
    }catch(e){}
    setSaving(false);
  };

  const exportToExcel = async() => {
    if(!guests || guests.length===0){
      showToast("Todavía no hay invitados para exportar","info");
      return;
    }

    try{
      const XL=await loadSheetJS();
      let workbook;

      try{
        workbook=await loadPrivateExcelTemplateWorkbook("guestImportTemplate",XL);
      }catch(templateError){
        console.warn("No se pudo usar la plantilla privada para exportar invitados:",templateError);
        workbook=XL.utils.book_new();
      }

      const confLabel=confirmation=>confirmation==="confirmado"?"Confirmado":confirmation==="no_va"?"No va":"Pendiente";
      const rows=[
        ["Nombre","Personas","Mesa","Lado","Parentesco","Confirmacion","Restriccion","Notas"],
        ...guests.map(guest=>[
          guest.nombre||"",
          parseInt(guest.cantidadInvitados||1),
          guest.mesa?parseInt(guest.mesa)||guest.mesa:"",
          guest.lado||"Ambos",
          guest.parentesco||"Otro",
          confLabel(guest.confirmacion),
          guest.restriccion||"Ninguna",
          guest.notas||""
        ])
      ];

      const worksheet=replaceTemplateTableRows(XL,workbook,"Invitados",rows,{
        columns:8,
        minimumRows:Math.max(60,rows.length),
        tableName:"tblInvitados"
      });
      worksheet["!cols"]=[{wch:30},{wch:10},{wch:8},{wch:12},{wch:18},{wch:16},{wch:18},{wch:30}];
      worksheet["!dataValidation"]=[
        {sqref:`D2:D${Math.max(60,rows.length)}`,type:"list",formula1:'"Novio,Novia,Ambos"',allowBlank:true},
        {sqref:`E2:E${Math.max(60,rows.length)}`,type:"list",formula1:'"Familia directa,Familia,Amigos,Trabajo,Ninos,Otro"',allowBlank:true},
        {sqref:`F2:F${Math.max(60,rows.length)}`,type:"list",formula1:'"Pendiente,Confirmado,No va"',allowBlank:true},
        {sqref:`G2:G${Math.max(60,rows.length)}`,type:"list",formula1:'"Ninguna,Vegetariano,Vegano,Sin gluten,Sin lactosa,Kosher,Halal,Alergia,Otra"',allowBlank:true}
      ];

      ensureExcelHowToSheet(XL,workbook,"guests");
      XL.writeFile(workbook,"invitados_boda.xlsx");
      showToast("✓ Invitados exportados en el mismo formato de importación","success");
    }catch(error){
      console.error("Error exportando invitados:",error);
      showToast(error?.message||"No pudimos generar el Excel de invitados","error");
    }
  };

  // ── Descargar plantilla XLSX privada ──
  const downloadTemplate = async() => {
    try{
      await openExcelTemplateDownload("guestImportTemplate","guests_import_template");
    }catch(error){
      showToast(error?.message||"No pudimos descargar la plantilla de invitados","error");
    }
  };

  const buildGuestImportReview = (newGuests, warningText="") => {
    const environmentTables=Array.isArray(salonLayoutRef.current?.ambientes)
      ? salonLayoutRef.current.ambientes.flatMap(ambiente=>Array.isArray(ambiente.mesas)?ambiente.mesas:[])
      : [];
    const mesasCanvas = environmentTables.length
      ? environmentTables
      : Array.isArray(salonMesas)
        ? salonMesas
        : Array.isArray(salonLayoutRef.current?.mesas)
          ? salonLayoutRef.current.mesas
          : [];
    const idsCanvas = new Set(mesasCanvas.map(mesa=>parseInt(mesa.id)).filter(id=>Number.isFinite(id)&&id>0));
    const capacityFor = (mesaId) => {
      const mesa = mesasCanvas.find(item=>parseInt(item.id)===parseInt(mesaId));
      if(!mesa || (mesa.tipo||"round")==="round") return normalizeRoundTableCapacity(mesa?.cap,8);
      return Math.max(1,parseInt(mesa.cap)||8);
    };
    const baseOccupancy = new Map();
    (guests||[]).forEach(guest=>{
      const mesaId=parseInt(guest.mesa);
      if(!mesaId||guest.confirmacion==="no_va") return;
      baseOccupancy.set(mesaId,(baseOccupancy.get(mesaId)||0)+(parseInt(guest.cantidadInvitados||1)||1));
    });
    const requestedIds=newGuests.map(guest=>parseInt(guest.mesa)).filter(id=>Number.isFinite(id)&&id>0);
    const knownIds=new Set([...idsCanvas,...baseOccupancy.keys(),...requestedIds]);
    let maxKnown=Math.max(0,...knownIds);

    const overloadedIds=new Set();
    const requestedOccupancy=new Map(baseOccupancy);
    newGuests.forEach(guest=>{
      const mesaId=parseInt(guest.mesa);
      if(!mesaId||guest.confirmacion==="no_va") return;
      const quantity=parseInt(guest.cantidadInvitados||1)||1;
      const next=(requestedOccupancy.get(mesaId)||0)+quantity;
      requestedOccupancy.set(mesaId,next);
      if(next>capacityFor(mesaId)) overloadedIds.add(mesaId);
    });

    const makePlan = (autoReallocate) => {
      const occupancy=new Map(baseOccupancy);
      const dynamicIds=new Set(knownIds);
      let moved=0;
      let waiting=0;
      let tooLarge=0;
      const plan=newGuests.map(guest=>{
        if(guest.confirmacion==="no_va") return {...guest,mesa:""};
        const quantity=parseInt(guest.cantidadInvitados||1)||1;
        const intended=parseInt(guest.mesa);
        if(!intended) return {...guest,mesa:""};
        const used=occupancy.get(intended)||0;
        if(used+quantity<=capacityFor(intended)){
          occupancy.set(intended,used+quantity);
          return {...guest,mesa:String(intended)};
        }
        moved++;
        if(!autoReallocate){ waiting++; return {...guest,mesa:""}; }

        const candidates=[...dynamicIds]
          .filter(id=>id>intended)
          .sort((a,b)=>a-b);
        const candidate=candidates.find(id=>(occupancy.get(id)||0)+quantity<=capacityFor(id));
        if(candidate){
          occupancy.set(candidate,(occupancy.get(candidate)||0)+quantity);
          return {...guest,mesa:String(candidate)};
        }
        if(quantity>8){
          waiting++;
          tooLarge++;
          return {...guest,mesa:""};
        }
        maxKnown+=1;
        dynamicIds.add(maxKnown);
        occupancy.set(maxKnown,quantity);
        return {...guest,mesa:String(maxKnown)};
      });
      const requiredCanvasIds=new Set(
        plan.map(guest=>parseInt(guest.mesa)).filter(id=>Number.isFinite(id)&&id>0&&!idsCanvas.has(id))
      );
      return {plan,moved,waiting,tooLarge,requiredCanvasIds:[...requiredCanvasIds].sort((a,b)=>a-b)};
    };

    const auto=makePlan(true);
    const bank=makePlan(false);
    const activeIncomingPeople=newGuests
      .filter(guest=>guest.confirmacion!=="no_va")
      .reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0);
    const existingAssignedPeople=(guests||[])
      .filter(guest=>guest.confirmacion!=="no_va"&&parseInt(guest.mesa))
      .reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0);
    const currentCapacity=mesasCanvas.reduce((sum,mesa)=>sum+capacityFor(mesa.id),0);
    const missingSeats=Math.max(0,existingAssignedPeople+activeIncomingPeople-currentCapacity);
    const tablesByTotalCapacity=Math.ceil(missingSeats/8);
    const withoutTable=newGuests.filter(guest=>guest.confirmacion!=="no_va"&&!parseInt(guest.mesa));
    return {
      warningText,
      autoGuests:auto.plan,
      bankGuests:bank.plan,
      autoMeta:auto,
      bankMeta:bank,
      summary:{
        totalInvitaciones:newGuests.length,
        totalPersonas:newGuests.reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0),
        mesasConExceso:overloadedIds.size,
        invitacionesReubicadas:auto.moved,
        mesasNuevasAuto:Math.max(auto.requiredCanvasIds.length,tablesByTotalCapacity),
        gruposDemasiadoGrandes:auto.tooLarge,
        invitacionesSinMesa:withoutTable.length,
        personasSinMesa:withoutTable.reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0),
        mesasActuales:mesasCanvas.length,
        capacidadActual:currentCapacity,
        lugaresFaltantes:missingSeats,
      }
    };
  };

  const applyPendingGuestImport = async(mode="auto") => {
    if(!pendingGuestImport) return;
    const imported=mode==="bank"?pendingGuestImport.bankGuests:pendingGuestImport.autoGuests;
    const meta=mode==="bank"?pendingGuestImport.bankMeta:pendingGuestImport.autoMeta;
    const next=[...(guests||[]),...imported];
    setGuests(next);
    await save(next);
    setPendingGuestImport(null);
    const waiting=meta.waiting>0?` · ${meta.waiting} ${meta.waiting===1?"invitación quedó":"invitaciones quedaron"} en Banco de espera`:"";
    const missing=meta.requiredCanvasIds.length>0?` · faltan ${meta.requiredCanvasIds.length} ${meta.requiredCanvasIds.length===1?"mesa":"mesas"} por agregar al canvas`:"";
    const warning=pendingGuestImport.warningText?` · ${pendingGuestImport.warningText}`:"";
    showToast(`✓ ${imported.length} invitaciones importadas${waiting}${missing}${warning}`,"success",6500);
  };

  const importFromFile = async(e) => {
    const file=e.target.files?.[0];
    if(!file) return;
    e.target.value="";

    let rows=[];
    try{
      rows=await spreadsheetFileToRows(file);
    }catch(error){
      console.error("Error leyendo archivo de invitados:",error);
      showToast("No pudimos leer el archivo. Usá .xlsx, .xls o .csv.","error");
      return;
    }

    const expectedHeaders=["nombre","personas","mesa","lado","parentesco","confirmacion","restriccion","notas"];
    let headerIdx=-1;

    for(let index=0;index<rows.length;index++){
      const normalizedRow=(rows[index]||[]).map(normalizeSpreadsheetKey);
      const recognized=normalizedRow.filter(value=>expectedHeaders.includes(value)).length;
      if(normalizedRow.includes("nombre")&&recognized>=2){
        headerIdx=index;
        break;
      }
    }

    if(headerIdx<0){
      showToast("No se encontró la fila de encabezados de invitados","error");
      return;
    }

    const headers2=(rows[headerIdx]||[]).map(normalizeSpreadsheetKey);
    const col=name=>headers2.indexOf(name);
    const iN=col("nombre"),iP=col("personas"),iM=col("mesa");
    const iL=col("lado"),iC=col("confirmacion"),iR=col("restriccion"),iNt=col("notas"),iPar=col("parentesco");

    if(iN<0){
      showToast("Falta la columna Nombre en el archivo","error");
      return;
    }

    const LADOS=["novio","novia","ambos"];
    const CONFS=["pendiente","confirmado","no va"];
    const RESTRS=["ninguna","vegetariano","vegano","sin gluten","sin lactosa","kosher","halal","alergia","otra"];
    const SKIP=["instrucciones","lado:","confirmacion:","restriccion:","personas:","mesa:","──","--"];
    const newGuests = [];
    const errs = [];
    for(let i = headerIdx + 1; i < rows.length; i++){
      const row = rows[i];
      if(!row || row.every(function(c){ return !c; })) continue;
      const first=normalizeSpreadsheetKey(row[0]||"");
      if(SKIP.some(value=>first.indexOf(value)===0)) continue;
      const nombre=String(row[iN]||"").trim();
      if(!nombre) continue;
      const personas=parseInt(row[iP]||1)||1;
      const mesa=row[iM]?String(row[iM]).trim():"";
      const ladoRaw=normalizeSpreadsheetKey(row[iL]||"ambos");
      const confRaw=normalizeSpreadsheetKey(row[iC]||"pendiente");
      const restrRaw=normalizeSpreadsheetKey(row[iR]||"ninguna");
      const notas=String(row[iNt]||"").trim();
      const parRaw=iPar>=0?normalizeSpreadsheetKey(row[iPar]||""):"";
      const parentesco=parRaw?(PARENTESCOS.find(parentesco=>normalizeSpreadsheetKey(parentesco)===parRaw)||"Otro"):"Otro";
      const lado = LADOS.indexOf(ladoRaw) >= 0 ? ladoRaw.charAt(0).toUpperCase()+ladoRaw.slice(1) : "Ambos";
      const confirmacion = confRaw === "confirmado" ? "confirmado" : confRaw === "no va" ? "no_va" : "pendiente";
      const restriccion = RESTRS.indexOf(restrRaw) >= 0 ? restrRaw.charAt(0).toUpperCase()+restrRaw.slice(1) : "Ninguna";
      if(iL >= 0 && LADOS.indexOf(ladoRaw) < 0) errs.push("Fila "+(i+1)+": Lado '"+row[iL]+"' invalido, se uso Ambos");
      newGuests.push({id:Date.now()+"-"+i, nombre:nombre, cantidadInvitados:personas, mesa:mesa, lado:lado, parentesco:parentesco, confirmacion:confirmacion, restriccion:restriccion, notas:notas});
    }
    if(newGuests.length === 0){
      showToast("No se encontraron invitados válidos en el archivo","error");
      return;
    }
    const warn = errs.length > 0 ? errs.slice(0,3).join(". ") : "";
    const review=buildGuestImportReview(newGuests,warn);
    setPendingGuestImport(review);
  };



    const asignarMesasAuto = () => {
    if(!guests || guests.length === 0) return;
    setAutoMesaLoading(true);
    const mesasCanvas=Array.isArray(salonMesas)?salonMesas:[];
    const capacidadDe=(mesaId)=>{
      const mesa=mesasCanvas.find(item=>parseInt(item.id)===parseInt(mesaId));
      if(!mesa || (mesa.tipo||"round")==="round") return normalizeRoundTableCapacity(mesa?.cap,8);
      return Math.max(1,parseInt(mesa.cap)||8);
    };
    const ocupacion=new Map();
    let mesaActual=1;
    const next=guests.map(g=>{
      if(g.confirmacion==="no_va") return {...g,mesa:""};
      const cant=parseInt(g.cantidadInvitados||1)||1;
      let intentos=0;
      while(intentos<500){
        const usadas=ocupacion.get(mesaActual)||0;
        if(usadas+cant<=capacidadDe(mesaActual)) break;
        mesaActual++;
        intentos++;
      }
      if(intentos>=500 || cant>capacidadDe(mesaActual)) return {...g,mesa:""};
      ocupacion.set(mesaActual,(ocupacion.get(mesaActual)||0)+cant);
      return {...g,mesa:String(mesaActual)};
    });
    setGuests(next);
    save(next);
    setAutoMesaLoading(false);
    showToast("✓ Mesas asignadas respetando la capacidad de 8, 10 o 12 personas","success",3600);
  };

    const addGuest = () => {
    if(!newGuest.nombre.trim()) return;
    const next = [...(guests||[]), {...newGuest, id:Date.now()+""}];
    setGuests(next); save(next);
    setNewGuest({nombre:"",lado:"Ambos",parentesco:"Amigos",confirmacion:"pendiente",restriccion:"Ninguna",mesa:"",cantidadInvitados:1,notas:""});
    setAddMode(false);
  };
  const updateGuest = (id,field,val) => { const next=guests.map(g=>g.id===id?{...g,[field]:val}:g); setGuests(next); save(next); };
  const removeGuest = (id) => { const next=guests.filter(g=>g.id!==id); setGuests(next); save(next); };
  const clearAllGuests = async() => {
    const removed=(guests||[]).length;
    setGuests([]);
    setConfirmClearAll(false);
    await save([]);
    showToast(`✓ Se eliminaron ${removed} ${removed===1?"invitación":"invitaciones"}. El diseño del salón se conservó.`,"success",4200);
  };

  // ── Sugerencia de mesa por afinidad ─────────────────────────────
  // Recomienda la mesa donde ya hay invitados del mismo parentesco
  // (y lado compatible) con lugar; si no, la mesa con más espacio;
  // si todas están llenas, la siguiente mesa nueva.
  const sugerirMesa = (parentesco, lado, cant) => {
    const c = parseInt(cant||1)||1;
    const occ = {};
    (guests||[]).forEach(g=>{
      if(!g.mesa||g.confirmacion==="no_va") return;
      const m = parseInt(g.mesa); if(!m) return;
      if(!occ[m]) occ[m]={total:0,mismos:0};
      const n = parseInt(g.cantidadInvitados||1)||1;
      occ[m].total += n;
      const ladoOk = g.lado===lado||g.lado==="Ambos"||lado==="Ambos";
      if((g.parentesco||"Otro")===parentesco&&ladoOk) occ[m].mismos += n;
    });
    // Solo son candidatas las mesas donde YA hay afines (mismo parentesco,
    // lado compatible) con lugar suficiente. Nunca mezclar grupos distintos.
    const cand = Object.entries(occ)
      .filter(([,o])=>o.mismos>0&&o.total+c<=tableSize)
      .sort((a,b)=>b[1].mismos-a[1].mismos||a[1].total-b[1].total);
    if(cand.length)
      return {mesa:cand[0][0], motivo:`ya hay ${cand[0][1].mismos} de ${parentesco}`};
    const maxM = Math.max(0,...Object.keys(occ).map(Number));
    return {mesa:String(maxM+1), motivo:`mesa nueva para ${parentesco}`};
  };

  const guestsDeMesa = (mesa) => (guests||[]).filter(g=>String(g.mesa||"")===String(mesa||"") && g.confirmacion!=="no_va");
  const mesaAffinityInfo = (mesa) => {
    const list = guestsDeMesa(mesa);
    const counts = {};
    list.forEach(g=>{ const k=g.parentesco||"Otro"; counts[k]=(counts[k]||0)+(parseInt(g.cantidadInvitados||1)||1); });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    return {list, counts, top};
  };
  const getGuestSeatRecommendations = (g) => {
    if(!g) return [];
    const p = g.parentesco || "Otro";
    const c = parseInt(g.cantidadInvitados||1)||1;
    const tips = [];
    if(g.confirmacion==="no_va") tips.push("Este invitado figura como ‘No va’. Podés dejarlo sin mesa hasta que cambie su estado.");
    else if(g.confirmacion==="pendiente") tips.push("Está pendiente: mantenelo visible en color dorado y evitá cerrar el seating hasta confirmar.");
    else tips.push("Confirmado: ya podés ubicarlo en una mesa definitiva.");
    tips.push(`Por parentesco conviene ubicarlo en una ${PARENTESCO_MESA_IDEAL[p] || "mesa compatible"}.`);
    const s = sugerirMesa(p, g.lado, c);
    if(s?.mesa){
      const info = mesaAffinityInfo(s.mesa);
      const same = info.counts[p] || 0;
      if(same>0) tips.push(`Mesa ${s.mesa} recomendada: ahí ya hay ${same} ${PARENTESCO_HUMANO[p] || "invitados afines"}.`);
      else tips.push(`Mesa ${s.mesa} recomendada: ${s.motivo}.`);
    }
    if(g.mesa){
      const info = mesaAffinityInfo(g.mesa);
      const same = info.counts[p] || 0;
      if(same>c) tips.push(`En la mesa ${g.mesa} comparte grupo con ${same-c} ${PARENTESCO_HUMANO[p] || "invitados afines"}.`);
      const top = info.top;
      if(top && top[0]!==p) tips.push(`Ojo: la mesa ${g.mesa} hoy tiene mayoría de ${PARENTESCO_HUMANO[top[0]] || top[0]}; revisá si se conocen o conviene moverlo.`);
    }
    if(g.restriccion && g.restriccion!=="Ninguna") tips.push(`Avisá al catering: ${g.restriccion}. Conviene sentarlo donde el servicio lo identifique fácil.`);
    return tips.slice(0,4);
  };

  // ── Drag real (mouse y dedo) en la vista Mesas ──────────────────
  // Ghost flotante que sigue el puntero; el destino se detecta con
  // elementFromPoint sobre atributos data-mesa-drop. Funciona en touch,
  // donde el drag & drop HTML5 nativo no existe.
  const dragMGRef = useRef(null);
  const [dragMG, setDragMG] = useState(null);
  const beginDragMG = (e, g) => {
    if(!e.touches && e.cancelable) e.preventDefault();
    e.stopPropagation();
    const pt = e.touches ? e.touches[0] : e;
    const d = {id:g.id, nombre:g.nombre, x:pt.clientX, y:pt.clientY, over:null};
    dragMGRef.current = d; setDragMG(d);
    // Auto-scroll: con el dedo cerca del borde superior/inferior, la página
    // se desplaza sola para alcanzar mesas fuera de pantalla. Corre en un
    // loop de rAF porque si el dedo queda quieto no llegan más touchmove.
    let rafId = null;
    const scrollLoop = () => {
      const cur = dragMGRef.current;
      if(!cur){ rafId=null; return; }
      const EDGE=90, MAX=20, h=window.innerHeight;
      let dy=0;
      if(cur.y<EDGE) dy=-Math.ceil((EDGE-cur.y)/EDGE*MAX);
      else if(cur.y>h-EDGE) dy=Math.ceil((cur.y-(h-EDGE))/EDGE*MAX);
      if(dy){
        window.scrollBy(0,dy);
        // El destino bajo el dedo cambia al scrollear: re-evaluar
        const el=document.elementFromPoint(cur.x,cur.y);
        const drop=el?el.closest("[data-mesa-drop]"):null;
        const nd={...cur,over:drop?drop.getAttribute("data-mesa-drop"):null};
        dragMGRef.current=nd; setDragMG(nd);
      }
      rafId=requestAnimationFrame(scrollLoop);
    };
    rafId=requestAnimationFrame(scrollLoop);
    const move = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      if(ev.cancelable) ev.preventDefault();
      const el = document.elementFromPoint(p.clientX, p.clientY);
      const drop = el ? el.closest("[data-mesa-drop]") : null;
      const nd = {...dragMGRef.current, x:p.clientX, y:p.clientY, over:drop?drop.getAttribute("data-mesa-drop"):null};
      dragMGRef.current = nd; setDragMG(nd);
    };
    const up = () => {
      const d2 = dragMGRef.current;
      if(rafId) cancelAnimationFrame(rafId);
      if(d2 && d2.over !== null) updateGuest(d2.id, "mesa", d2.over);
      dragMGRef.current = null; setDragMG(null); setMovingGuest(null);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, {passive:false});
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
  };

  // ── Layout del salón compartido (mismo storage que SalonView) ──
  const salonLayoutRef = useRef(null);
  const [salonMesas, setSalonMesas] = useState(null);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      let L=null;
      if(!isDemoUser(user)){ try{ const s=localStorage.getItem(SALON_LS_KEY); L=s?JSON.parse(s):null; }catch(err){} }
      try{
        const {data:row}=await dataClient(user).from("wedding_data").select("salon_layout").eq("user_id",user.id).maybeSingle();
        if(row?.salon_layout) L=row.salon_layout;
      }catch(err){}
      if(!alive) return;
      salonLayoutRef.current = L;
      const activeId=String(L?.activeAmbienteId||L?.ambientes?.[0]?.id||"");
      const activeEnvironment=Array.isArray(L?.ambientes)?L.ambientes.find(ambiente=>String(ambiente.id)===activeId):null;
      setSalonMesas(Array.isArray(activeEnvironment?.mesas)?activeEnvironment.mesas:(Array.isArray(L?.mesas)?L.mesas:null));
    })();
    return ()=>{alive=false;};
  },[]);
  // Al entrar a la vista Mesas, releer el layout (SalonView pudo haberlo cambiado)
  useEffect(()=>{
    if(viewMode!=="mesas" || isDemoUser(user)) return;
    try{
      const s=localStorage.getItem(SALON_LS_KEY);
      if(s){
        const L=JSON.parse(s);
        salonLayoutRef.current=L;
        const activeId=String(L?.activeAmbienteId||L?.ambientes?.[0]?.id||"");
        const activeEnvironment=Array.isArray(L?.ambientes)?L.ambientes.find(ambiente=>String(ambiente.id)===activeId):null;
        if(Array.isArray(activeEnvironment?.mesas)) setSalonMesas(activeEnvironment.mesas);
        else if(Array.isArray(L.mesas)) setSalonMesas(L.mesas);
      }
    }catch(err){}
  },[viewMode]);

  const guardarSalonMesas = (nuevas) => {
    const base = salonLayoutRef.current || {salonW:20,salonH:15,salonShape:"cuadrado",estiloDistrib:"banquet",elementos:[
      {id:"novios-1",tipo:"novios",mx:8.5,my:1,ew:3,eh:0.9},
      {id:"pista-1",tipo:"pista",mx:6,my:8,ew:8,eh:6},
      {id:"entrada-1",tipo:"entrada",mx:8,my:13,ew:3,eh:0.8},
    ]};
    const activeId=String(base.activeAmbienteId||base.ambientes?.[0]?.id||"principal");
    const nextEnvironments=Array.isArray(base.ambientes)&&base.ambientes.length
      ? base.ambientes.map(ambiente=>String(ambiente.id)===activeId?{...ambiente,mesas:nuevas}:ambiente)
      : [{...base,id:activeId,nombre:"Salón principal",mesas:nuevas}];
    const layout = {...base, mesas:nuevas, ambientes:nextEnvironments, activeAmbienteId:activeId};
    salonLayoutRef.current = layout;
    setSalonMesas(nuevas);
    if(!isDemoUser(user)){ try{ localStorage.setItem(SALON_LS_KEY, JSON.stringify(layout)); }catch(err){} }
    dataClient(user).from("wedding_data")
      .upsert({user_id:user.id,salon_layout:layout,updated_at:new Date().toISOString()},{onConflict:"user_id"})
      .then((res)=>{if(res&&res.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
  };
  const guardarSalonLayoutCompletoVista = (layout) => {
    const activeId=String(layout?.activeAmbienteId||layout?.ambientes?.[0]?.id||"principal");
    const activeEnvironment=Array.isArray(layout?.ambientes)
      ? layout.ambientes.find(ambiente=>String(ambiente.id)===activeId)
      : null;
    const activeTables=Array.isArray(activeEnvironment?.mesas)
      ? activeEnvironment.mesas
      : (Array.isArray(layout?.mesas)?layout.mesas:[]);
    const normalized={...layout,mesas:activeTables,activeAmbienteId:activeId};
    salonLayoutRef.current=normalized;
    setSalonMesas(activeTables);
    if(!isDemoUser(user)){
      try{localStorage.setItem(SALON_LS_KEY,JSON.stringify(normalized));}catch(error){}
    }
    dataClient(user).from("wedding_data")
      .upsert({user_id:user.id,salon_layout:normalized,updated_at:new Date().toISOString()},{onConflict:"user_id"})
      .then((res)=>{if(res?.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
    return normalized;
  };

  const deleteGuestTableVista = async(tableNumber) => {
    const tableId=parseInt(tableNumber);
    if(!tableId) return;
    const assigned=(guests||[]).filter(guest=>parseInt(guest.mesa)===tableId);
    const assignedPeople=assigned.reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0);
    const base=salonLayoutRef.current||{};
    let removedMesa=null;
    let removedEnvironmentId=null;
    if(Array.isArray(base.ambientes)){
      for(const ambiente of base.ambientes){
        const found=(ambiente.mesas||[]).find(mesa=>parseInt(mesa.id)===tableId);
        if(found){removedMesa={...found};removedEnvironmentId=String(ambiente.id);break;}
      }
    }
    if(!removedMesa){
      const found=(base.mesas||salonMesas||[]).find(mesa=>parseInt(mesa.id)===tableId);
      if(found) removedMesa={...found};
    }
    const detail=assigned.length
      ? ` ${assigned.length} ${assigned.length===1?"invitación":"invitaciones"} (${assignedPeople} ${assignedPeople===1?"persona":"personas"}) volverán al Banco de espera.`
      : " La mesa está vacía.";
    if(typeof window!=="undefined"&&!window.confirm(`¿Eliminar la Mesa ${tableId}?${detail} También desaparecerá del Diseño del salón.`)) return;

    const nextGuests=(guests||[]).map(guest=>parseInt(guest.mesa)===tableId?{...guest,mesa:""}:guest);
    const nextEnvironments=Array.isArray(base.ambientes)
      ? base.ambientes.map(ambiente=>({...ambiente,mesas:(ambiente.mesas||[]).filter(mesa=>parseInt(mesa.id)!==tableId)}))
      : base.ambientes;
    const activeId=String(base.activeAmbienteId||nextEnvironments?.[0]?.id||"principal");
    const activeEnvironment=Array.isArray(nextEnvironments)
      ? nextEnvironments.find(ambiente=>String(ambiente.id)===activeId)
      : null;
    const nextRootTables=Array.isArray(activeEnvironment?.mesas)
      ? activeEnvironment.mesas
      : (base.mesas||salonMesas||[]).filter(mesa=>parseInt(mesa.id)!==tableId);
    const nextLayout={...base,ambientes:nextEnvironments,mesas:nextRootTables,activeAmbienteId:activeId};

    setGuests(nextGuests);
    await save(nextGuests);
    guardarSalonLayoutCompletoVista(nextLayout);
    setSelectedGuestTable(null);
    setOpenGuestTableMenu(null);
    setDeletedGuestTable({tableId,mesa:removedMesa,environmentId:removedEnvironmentId,guestIds:assigned.map(guest=>guest.id)});
    showToast(`✓ Mesa ${tableId} eliminada${assignedPeople?` · ${assignedPeople} personas volvieron al Banco de espera`:""}`,"success",4200);
  };

  const undoDeleteGuestTableVista = async() => {
    if(!deletedGuestTable) return;
    const {tableId,mesa,environmentId,guestIds}=deletedGuestTable;
    const guestIdSet=new Set(guestIds||[]);
    const restoredGuests=(guests||[]).map(guest=>guestIdSet.has(guest.id)?{...guest,mesa:String(tableId)}:guest);
    let restoredLayout=salonLayoutRef.current||{};
    if(mesa){
      if(Array.isArray(restoredLayout.ambientes)&&restoredLayout.ambientes.length){
        const targetId=environmentId||String(restoredLayout.activeAmbienteId||restoredLayout.ambientes[0].id);
        const ambientes=restoredLayout.ambientes.map(ambiente=>{
          if(String(ambiente.id)!==String(targetId)) return ambiente;
          const without=(ambiente.mesas||[]).filter(item=>parseInt(item.id)!==parseInt(tableId));
          return {...ambiente,mesas:[...without,mesa].sort((a,b)=>(parseInt(a.id)||0)-(parseInt(b.id)||0))};
        });
        const activeId=String(restoredLayout.activeAmbienteId||ambientes[0].id);
        const activeEnvironment=ambientes.find(ambiente=>String(ambiente.id)===activeId);
        restoredLayout={...restoredLayout,ambientes,mesas:activeEnvironment?.mesas||restoredLayout.mesas,activeAmbienteId:activeId};
      }else{
        const without=(restoredLayout.mesas||salonMesas||[]).filter(item=>parseInt(item.id)!==parseInt(tableId));
        restoredLayout={...restoredLayout,mesas:[...without,mesa].sort((a,b)=>(parseInt(a.id)||0)-(parseInt(b.id)||0))};
      }
    }
    setGuests(restoredGuests);
    await save(restoredGuests);
    guardarSalonLayoutCompletoVista(restoredLayout);
    setSelectedGuestTable(tableId);
    setDeletedGuestTable(null);
    showToast(`↩ Mesa ${tableId} restaurada`,"success",3000);
  };

  const getMesasPendientesVista = (mesasActuales=salonMesas||[]) => {
    const maxMesaAsignada = (guests||[]).reduce((maximo,invitado)=>Math.max(maximo,parseInt(invitado.mesa)||0),0);
    const idsExistentes = new Set(
      (mesasActuales||[])
        .map(mesa=>parseInt(mesa.id))
        .filter(id=>Number.isFinite(id)&&id>0)
    );
    return Array.from({length:maxMesaAsignada},(_,index)=>index+1)
      .filter(id=>!idsExistentes.has(id));
  };
  const getPosicionMesaLibreVista = (mesasActuales,totalObjetivo) => {
    const layout=salonLayoutRef.current||{};
    const salonW=Math.max(5,parseFloat(layout.salonW)||20);
    const salonH=Math.max(5,parseFloat(layout.salonH)||15);
    const margen=1.5;
    const separacion=2.8;
    const cols=Math.max(1,Math.floor((salonW-margen*2)/separacion)+1);
    const filas=Math.max(1,Math.floor((salonH-margen*2)/separacion)+1);
    const ocupada=(mx,my)=>(mesasActuales||[]).some(mesa=>Math.hypot((parseFloat(mesa.mx)||0)-mx,(parseFloat(mesa.my)||0)-my)<1.55);
    const maxSlots=Math.max(cols*filas,totalObjetivo||0,1);
    for(let slot=0;slot<maxSlots;slot++){
      const mx=margen+(slot%cols)*separacion;
      const my=margen+Math.floor(slot/cols)*separacion;
      if(my<=salonH-margen&&!ocupada(mx,my)) return {mx,my};
    }
    const slot=(mesasActuales||[]).length;
    return {
      mx:margen+(slot%cols)*separacion,
      my:margen+Math.floor(slot/cols)*separacion
    };
  };
  const agregarMesasPendientesVista = (cantidad=1) => {
    const ms=salonMesas||[];
    const pendientes=getMesasPendientesVista(ms);
    const idsAAgregar=pendientes.slice(0,Math.max(1,cantidad));
    if(idsAAgregar.length===0){
      showToast("No hay mesas pendientes para agregar al salón","info");
      return;
    }
    let nuevas=[...ms];
    const totalObjetivo=Math.max((guests||[]).reduce((maximo,invitado)=>Math.max(maximo,parseInt(invitado.mesa)||0),0),nuevas.length+idsAAgregar.length);
    idsAAgregar.forEach(id=>{
      const posicion=getPosicionMesaLibreVista(nuevas,totalObjetivo);
      nuevas.push({id,...posicion,tipo:"round",etiqueta:"",cap:tableSize});
    });
    nuevas.sort((a,b)=>(parseInt(a.id)||0)-(parseInt(b.id)||0));
    guardarSalonMesas(nuevas);
    const texto=idsAAgregar.length===1
      ? `✓ Se agregó la mesa ${idsAAgregar[0]} al salón`
      : `✓ Se agregaron ${idsAAgregar.length} mesas al salón`;
    showToast(texto,"success",3500);
  };
  const agregarMesaVista = () => {
    const ms=salonMesas||[];
    const pendientes=getMesasPendientesVista(ms);
    if(pendientes.length>0){
      agregarMesasPendientesVista(1);
      return;
    }
    const maxId=Math.max(0,...ms.map(mesa=>parseInt(mesa.id)||0),(guests||[]).reduce((maximo,invitado)=>Math.max(maximo,parseInt(invitado.mesa)||0),0));
    const id=maxId+1;
    const posicion=getPosicionMesaLibreVista(ms,id);
    guardarSalonMesas([...ms,{id,...posicion,tipo:"round",etiqueta:"",cap:tableSize}]);
    showToast(`✓ Se agregó la mesa ${id} al salón`,"success",3000);
  };
  const setCapMesaVista = (num, n) => {
    const cap = normalizeRoundTableCapacity(n,8);
    const ms = salonMesas||[];
    const cols = Math.ceil(Math.sqrt(num+1));
    const existe = ms.some(m=>m.id===num);
    guardarSalonMesas(existe
      ? ms.map(m=>m.id===num?{...m,cap}:m)
      : [...ms, {id:num, mx:3+((num-1)%cols)*3.5, my:3+Math.floor((num-1)/cols)*3.5, tipo:"round", etiqueta:"", cap}]);
  };

  if(guests===null) return <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:THEME.font.body,color:THEME.color.sage}}>Cargando invitados...</p></div>;

  const confMap = Object.fromEntries(CONFIRMACIONES.map(c=>[c.id,c]));
  const filtered = guests.filter(g=>{
    if(filter.lado&&g.lado!==filter.lado) return false;
    if(filter.conf&&g.confirmacion!==filter.conf) return false;
    if(filter.mesa&&String(g.mesa||"")!==String(filter.mesa)) return false;
    if(search.trim()){
      const q = search.trim().toLowerCase();
      if(!g.nombre?.toLowerCase().includes(q)&&
         !g.lado?.toLowerCase().includes(q)&&
         !(g.mesa&&String(g.mesa).includes(q))) return false;
    }
    return true;
  });
  const inv   = guests.length;
  const total = guests.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
  const conf  = guests.filter(g=>g.confirmacion==="confirmado").reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
  const noVa  = guests.filter(g=>g.confirmacion==="no_va").reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
  const pend  = total-conf-noVa;
  const restr = RESTRICCIONES.filter(r=>r!=="Ninguna").map(r=>({r,n:guests.filter(g=>g.restriccion===r).reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0)})).filter(x=>x.n>0);
  const maxMesa = guests.reduce((m,g)=>Math.max(m,parseInt(g.mesa)||0),0);
  const mesasDeTodosLosAmbientes=Array.isArray(salonLayoutRef.current?.ambientes)
    ? salonLayoutRef.current.ambientes.flatMap(ambiente=>Array.isArray(ambiente.mesas)?ambiente.mesas:[])
    : (salonMesas||[]);
  const idsMesasEnSalon = new Set(mesasDeTodosLosAmbientes.map(mesa=>parseInt(mesa.id)).filter(id=>Number.isFinite(id)&&id>0));
  const mesasPendientes = Array.from({length:maxMesa},(_,index)=>index+1).filter(id=>!idsMesasEnSalon.has(id));
  const mesasRequeridasCreadas = Math.max(0,maxMesa-mesasPendientes.length);
  const proximaMesaParaAgregar = mesasPendientes[0] || Math.max(maxMesa,...idsMesasEnSalon,0)+1;
  const tableIdsVista=[...new Set([
    ...(mesasDeTodosLosAmbientes||[]).map(mesa=>parseInt(mesa.id)),
    ...(guests||[]).map(guest=>parseInt(guest.mesa))
  ].filter(id=>Number.isFinite(id)&&id>0))].sort((a,b)=>a-b);
  const tables = tableIdsVista.map(tableId=>{
    const sm=(mesasDeTodosLosAmbientes||[]).find(mesa=>parseInt(mesa.id)===tableId);
    const gs=guests.filter(guest=>parseInt(guest.mesa)===tableId);
    return {num:tableId, cap:sm?.cap||tableSize, etiqueta:sm?.etiqueta||"", guests:gs,
      personas:gs.reduce((sum,guest)=>sum+parseInt(guest.cantidadInvitados||1),0)};
  });
  const selectedGuestTableData=tables.find(table=>table.num===selectedGuestTable)||null;
  const emptyGuestTable=(tableNumber)=>{
    const assigned=(guests||[]).filter(guest=>parseInt(guest.mesa)===parseInt(tableNumber));
    if(!assigned.length) return;
    if(typeof window!=="undefined"&&!window.confirm(`¿Vaciar la Mesa ${tableNumber}? ${assigned.length} invitaciones volverán al Banco de espera.`)) return;
    const next=(guests||[]).map(guest=>parseInt(guest.mesa)===parseInt(tableNumber)?{...guest,mesa:""}:guest);
    setGuests(next);
    save(next);
    showToast(`✓ Mesa ${tableNumber} vaciada. Las invitaciones quedaron en el Banco de espera.`,"success");
  };
  const sinMesa = guests.filter(g=>!g.mesa||g.mesa==="");
  const ubicadasPersonas = guests.filter(g=>g.mesa&&g.confirmacion!=="no_va").reduce((sum,g)=>sum+(parseInt(g.cantidadInvitados||1)||1),0);
  const esperaPersonas = guests.filter(g=>(!g.mesa||g.mesa==="")&&g.confirmacion!=="no_va").reduce((sum,g)=>sum+(parseInt(g.cantidadInvitados||1)||1),0);
  const activeFilterCount = [filter.conf,filter.lado,filter.mesa].filter(Boolean).length + (search.trim()?1:0);
  const mesaFilterOptions = Array.from(new Set((guests||[]).map(g=>parseInt(g.mesa)).filter(n=>Number.isFinite(n)&&n>0))).sort((a,b)=>a-b);


  // ── Menú Opciones: contenido compartido (dropdown desktop / bottom sheet mobile) ──
  const menuItemStyle = {display:"flex",alignItems:"center",gap:10,width:"100%",background:"transparent",border:"none",borderRadius:10,padding:"12px",minHeight:THEME.tap.comfortable,fontFamily:THEME.font.body,fontSize:"max(14px,.92rem)",color:THEME.color.ink,cursor:"pointer",textAlign:"left"};
  const guestMenuContent = <>
    <div style={{padding:"10px 12px",borderBottom:"0.5px solid rgba(74,94,58,.1)",marginBottom:6}}>
      <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:8}}>Personas por mesa</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[8,10,12].map(n=><button key={n} onClick={()=>{setTableSize(n);save(guests,n);}} style={{background:tableSize===n?THEME.color.sage:"transparent",color:tableSize===n?THEME.color.cream:"rgba(26,26,20,.6)",border:`1px solid ${tableSize===n?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"8px 14px",minHeight:THEME.tap.min,minWidth:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:tableSize===n?700:400,cursor:"pointer"}}>{n}</button>)}
      </div>
    </div>
    {guests&&guests.length>0&&guests.some(g=>!g.mesa||g.mesa==="")&&<button onClick={()=>{asignarMesasAuto();setShowGuestMenu(false);}} style={menuItemStyle}>🪑 Asignar mesas automáticamente</button>}
    <button onClick={()=>{setGuia("ceremonia");setShowGuestMenu(false);}} style={menuItemStyle}>📖 Guía nupcial (ceremonia, invitaciones...)</button>
  </>;

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    {showGuestMenu&&isMobile&&<BottomSheet title="Opciones de invitados" onClose={()=>setShowGuestMenu(false)}>{guestMenuContent}</BottomSheet>}
    <GuiaNupcial abierta={!!guia} seccionInicial={guia||"mesas"} onClose={()=>setGuia(null)}/>
    {confirmDelete&&<ConfirmModal
      msg={`¿Eliminar a ${guests.find(g=>g.id===confirmDelete)?.nombre}?`}
      onConfirm={()=>{removeGuest(confirmDelete);setConfirmDelete(null);}}
      onCancel={()=>setConfirmDelete(null)}/>}
    {confirmClearAll&&<ClearGuestsModal
      count={(guests||[]).length}
      onExport={exportToExcel}
      onConfirm={clearAllGuests}
      onCancel={()=>setConfirmClearAll(false)}/>}
    {pendingGuestImport&&<GuestImportReviewModal
      review={pendingGuestImport}
      onAuto={()=>applyPendingGuestImport("auto")}
      onBank={()=>applyPendingGuestImport("bank")}
      onCancel={()=>setPendingGuestImport(null)}/>}
    <div style={{background:THEME.color.sage,padding:isMobile?"10px 12px 12px":"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:1380,margin:"0 auto",transition:"max-width .25s ease"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:isMobile?"max(10px,.6rem)":THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:isMobile?3:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:THEME.font.display,fontSize:isMobile?"1.35rem":"clamp(1.8rem,4vw,2.6rem)",color:THEME.color.cream,margin:"0 0 4px",lineHeight:1.1}}>👥 Invitados</h1>
            <div style={{fontFamily:THEME.font.body,fontSize:isMobile?".72rem":".86rem",color:"rgba(245,239,224,.72)",lineHeight:1.45}}>{total} personas · {inv} invitaciones · <strong style={{color:"rgba(226,199,106,.96)"}}>{ubicadasPersonas} ubicadas</strong> · {esperaPersonas} en espera</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {/* Acción principal siempre visible */}
            <button onClick={()=>setAddMode(true)} style={{background:THEME.color.gold,color:THEME.color.ink,border:"none",padding:isMobile?"8px 14px":"11px 22px",minHeight:isMobile?40:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:700,fontSize:isMobile?"13px":"max(14px,.95rem)",borderRadius:THEME.radius.pill,cursor:"pointer",boxShadow:"0 2px 8px rgba(201,169,110,.4)",whiteSpace:"nowrap"}}>+ Agregar</button>
            {guests&&guests.length>0&&<button onClick={()=>setConfirmClearAll(true)} style={{background:"rgba(181,67,58,.12)",color:"#FFF8EE",border:"1px solid rgba(255,248,238,.32)",padding:isMobile?"8px 12px":"10px 16px",minHeight:isMobile?40:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:750,fontSize:isMobile?"12px":"max(13px,.84rem)",borderRadius:THEME.radius.pill,cursor:"pointer",whiteSpace:"nowrap"}}>🗑 Limpiar lista</button>}
            {/* Menú de opciones secundarias — dropdown en desktop, bottom sheet en mobile */}
            <div style={{position:"relative"}}>
              <button onClick={e=>{e.stopPropagation();setShowGuestMenu(s=>!s);}} style={{background:"rgba(245,239,224,.15)",color:THEME.color.cream,border:"1px solid rgba(245,239,224,.3)",padding:isMobile?"7px 12px":"10px 16px",minHeight:isMobile?40:THEME.tap.min,fontFamily:THEME.font.body,fontSize:isMobile?"12px":"max(13px,.85rem)",borderRadius:THEME.radius.pill,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                ⚙️ Opciones ▾
              </button>
              {showGuestMenu&&!isMobile&&<div onMouseDown={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.15)",borderRadius:THEME.radius.md,padding:8,zIndex:THEME.z.sheet,boxShadow:THEME.shadow.pop,minWidth:250}}>
                {guestMenuContent}
              </div>}
            </div>
          </div>
        </div>
        {/* Stats cards visuales */}
        <div style={isMobile
          ?{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginTop:8}
          :{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",rowGap:4}}>
          {[
            {v:inv,  l:"Invitaciones", icon:"✉️", bg:"rgba(245,239,224,.12)"},
            {v:total,l:"Personas",     icon:"👥", bg:"rgba(245,239,224,.12)"},
            {v:conf, l:"Confirmados",  icon:"✓",  bg:"rgba(74,94,58,.3)",  bold:true},
            {v:pend, l:"Pendientes",   icon:"⏳", bg:"rgba(201,169,110,.25)"},
            {v:noVa, l:"No van",       icon:"✗",  bg:"rgba(200,60,60,.2)"},
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:10,padding:isMobile?"6px 4px":"7px 10px",display:"flex",flexDirection:"column",alignItems:"center",...(isMobile?{width:"100%",boxSizing:"border-box"}:{minWidth:56,flex:"0 0 auto"})}}>
              <div style={{fontFamily:THEME.font.display,fontSize:isMobile?".95rem":"clamp(1rem,4vw,1.3rem)",fontWeight:700,color:THEME.color.cream,lineHeight:1}}>{s.v}</div>
              <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".06em",textTransform:"uppercase",color:"rgba(245,239,224,.55)",marginTop:3,whiteSpace:"nowrap"}}>{s.l}</div>
            </div>
          ))}
          {total>0&&<div style={{background:"rgba(245,239,224,.08)",borderRadius:10,padding:isMobile?"6px 4px":"8px 12px",display:"flex",flexDirection:"column",alignItems:"center",...(isMobile?{width:"100%",boxSizing:"border-box"}:{minWidth:64})}}>
            <div style={{fontFamily:THEME.font.display,fontSize:isMobile?".95rem":"1.3rem",fontWeight:700,color:"rgba(201,169,110,.8)",lineHeight:1}}>{Math.round(conf/total*100)}%</div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(245,239,224,.45)",marginTop:3}}>Confirmado</div>
          </div>}
        </div>
        {/* Barra de progreso confirmaciones */}
        {total>0&&<div style={{marginTop:10,height:6,background:"rgba(255,255,255,.12)",borderRadius:6,overflow:"hidden",display:"flex"}}>
          <div style={{width:`${Math.round(conf/total*100)}%`,background:"rgba(74,94,58,.8)",transition:"width .4s",borderRadius:"6px 0 0 6px"}}/>
          <div style={{width:`${Math.round(pend/total*100)}%`,background:"rgba(201,169,110,.6)",transition:"width .4s"}}/>
          <div style={{width:`${Math.round(noVa/total*100)}%`,background:"rgba(200,60,60,.4)",transition:"width .4s",borderRadius:"0 6px 6px 0"}}/>
        </div>}
        {restr.length>0&&<div style={{fontFamily:THEME.font.body,fontSize:".78rem",color:"rgba(201,169,110,.65)",marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
          {restr.map(x=><span key={x.r} style={{background:"rgba(201,169,110,.12)",borderRadius:100,padding:"2px 8px"}}>⚠️ {x.r}: {x.n}</span>)}
        </div>}
        {(saving||saved)&&<div style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(201,169,110,.7)",marginTop:6}}>{saving?"Guardando...":"✓ Guardado"}</div>}
      </div>
    </div>

    <div className="guests-v71-shell" style={{maxWidth:1380,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0",width:"100%",boxSizing:"border-box",transition:"max-width .25s ease"}}>
      <section className="guests-v71-excel" aria-label="Importar y exportar invitados en Excel" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.16)",borderRadius:16,padding:"12px 14px",marginBottom:14,boxShadow:"0 5px 18px rgba(63,50,31,.045)"}}>
        <div style={{minWidth:150}}>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:THEME.color.sage,fontWeight:800}}>Archivo Excel</div>
          <div style={{fontFamily:THEME.font.body,fontSize:".75rem",lineHeight:1.4,color:"rgba(26,26,20,.52)",marginTop:3}}>La plantilla, la importación y la exportación usan exactamente las mismas columnas.</div>
        </div>
        <div className="guests-v7-actions" style={{width:isMobile?"100%":"auto"}}>
          <label style={{flex:isMobile?"1 1 135px":"0 0 auto",display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:42,padding:"9px 14px",border:"1px solid rgba(74,94,58,.3)",borderRadius:THEME.radius.pill,background:"#FFFDF8",fontFamily:THEME.font.body,fontSize:".8rem",fontWeight:750,color:THEME.color.sage,cursor:"pointer",boxSizing:"border-box",whiteSpace:"nowrap"}}>
            ↑ Importar Excel
            <input name="guest-import-file-visible" type="file" accept=".xlsx,.xls,.csv" onChange={importFromFile} style={{display:"none"}}/>
          </label>
          {!isDemo&&<button type="button" onClick={exportToExcel} disabled={!guests.length} style={{flex:isMobile?"1 1 135px":"0 0 auto",minHeight:42,padding:"9px 14px",border:"none",borderRadius:THEME.radius.pill,background:guests.length?THEME.color.sage:"rgba(74,94,58,.28)",fontFamily:THEME.font.body,fontSize:".8rem",fontWeight:800,color:THEME.color.cream,cursor:guests.length?"pointer":"not-allowed",whiteSpace:"nowrap"}}>↓ Exportar Excel</button>}
          {!isDemo&&<button type="button" onClick={downloadTemplate} style={{flex:isMobile?"1 1 160px":"0 0 auto",minHeight:42,padding:"9px 14px",border:"1px solid rgba(201,169,110,.52)",borderRadius:THEME.radius.pill,background:"rgba(201,169,110,.12)",fontFamily:THEME.font.body,fontSize:".8rem",fontWeight:750,color:THEME.color.sage,cursor:"pointer",whiteSpace:"nowrap"}}>Plantilla XLSX</button>}
        </div>
      </section>
      {addMode&&<div style={{background:THEME.color.cream2,border:"1.5px solid rgba(74,94,58,.3)",borderRadius:16,padding:"clamp(14px,4vw,20px)",marginBottom:14,boxShadow:"0 4px 20px rgba(74,94,58,.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:THEME.font.display,fontSize:"1.05rem",fontWeight:700,color:THEME.color.ink}}>Nuevo invitado</div>
          <button onClick={()=>setAddMode(false)} style={{background:"transparent",border:"none",fontSize:"1.2rem",cursor:"pointer",color:"rgba(26,26,20,.3)",lineHeight:1}}>×</button>
        </div>
        {/* Nombre — campo principal, más grande */}
        <div style={{marginBottom:10}}>
          <input name="app-field-5531" autoFocus type="text" value={newGuest.nombre} onChange={e=>setNewGuest(x=>({...x,nombre:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addGuest()}
            placeholder="Nombre completo del invitado o familia..."
            style={{width:"100%",fontFamily:THEME.font.display,fontSize:"1.05rem",padding:"10px 14px",borderRadius:10,border:"1.5px solid rgba(74,94,58,.3)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",outline:"none"}}/>
        </div>
        {/* Fila secundaria */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8,marginBottom:10}}>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Personas</div>
            <input name="app-field-5540" type="number" value={newGuest.cantidadInvitados} onChange={e=>setNewGuest(x=>({...x,cantidadInvitados:e.target.value}))} min="1"
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Mesa Nº</div>
            <input name="app-field-5545" type="number" value={newGuest.mesa} onChange={e=>setNewGuest(x=>({...x,mesa:e.target.value}))} placeholder="—" min="1"
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Lado</div>
            <select name="app-field-5550" value={newGuest.lado} onChange={e=>setNewGuest(x=>({...x,lado:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {LADOS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Parentesco</div>
            <select name="app-field-5556" value={newGuest.parentesco} onChange={e=>setNewGuest(x=>({...x,parentesco:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {PARENTESCOS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Restricción</div>
            <select name="app-field-5562" value={newGuest.restriccion} onChange={e=>setNewGuest(x=>({...x,restriccion:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {RESTRICCIONES.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        {/* Sugerencia de mesa según parentesco */}
        {!newGuest.mesa&&guests&&guests.length>0&&(()=>{
          const s=sugerirMesa(newGuest.parentesco||"Otro",newGuest.lado,newGuest.cantidadInvitados);
          return <button onClick={()=>setNewGuest(x=>({...x,mesa:String(s.mesa)}))}
            style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(201,169,110,.1)",border:"1px dashed rgba(201,169,110,.5)",borderRadius:16,padding:"9px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(139,107,40,.95)",cursor:"pointer",marginBottom:10,textAlign:"left",maxWidth:"100%"}}>
            💡 Sugerida: <strong>Mesa {s.mesa}</strong> · {s.motivo}. Ideal para {PARENTESCO_HUMANO[newGuest.parentesco||"Otro"]||"invitados afines"} — tocá para usar
          </button>;
        })()}
        <div style={{display:"flex",gap:8}}>
          <button onClick={addGuest} disabled={!newGuest.nombre.trim()} style={{background:newGuest.nombre.trim()?THEME.color.sage:"rgba(74,94,58,.3)",color:THEME.color.cream,border:"none",borderRadius:100,padding:"10px 24px",fontFamily:THEME.font.body,fontWeight:700,fontSize:".9rem",cursor:newGuest.nombre.trim()?"pointer":"default",transition:"background .2s"}}>
            + Agregar
          </button>
          <button onClick={()=>setAddMode(false)} style={{background:"transparent",border:"1px solid rgba(74,94,58,.2)",borderRadius:100,padding:"10px 16px",fontFamily:THEME.font.body,fontSize:".88rem",color:"rgba(26,26,20,.4)",cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>}

      {/* Recorrido principal */}
      <div className="guests-v7-sticky-tabs" style={{marginBottom:12}}>
        <div className="guests-v72-step-nav">
          <button type="button" className={`guests-v72-step ${viewMode==="lista"?"is-active":""}`} onClick={()=>setViewMode("lista")}>
            <span className="guests-v72-step-number">1</span><span><strong>Lista de invitados</strong><small>Cargar, confirmar, buscar e importar.</small></span>
          </button>
          {!isMobile&&<button type="button" className={`guests-v72-step ${viewMode==="mesas"?"is-active":""}`} onClick={()=>setViewMode("mesas")}>
            <span className="guests-v72-step-number">2</span><span><strong>Distribuir en mesas</strong><small>Banco de espera, capacidades y grupos.</small></span>
          </button>}
          {!isMobile&&<button type="button" className="guests-v72-step" onClick={()=>{setViewMode("mesas");onGoDesigner?.();}}>
            <span className="guests-v72-step-number">3</span><span><strong>Diseñar el salón</strong><small>Presets, ambientes, medidas y canvas.</small></span>
          </button>}
        </div>
        {isMobile&&<div style={{marginTop:8,background:"rgba(201,169,110,.1)",border:"1px solid rgba(201,169,110,.28)",borderRadius:12,padding:"9px 11px",fontFamily:THEME.font.body,fontSize:".76rem",lineHeight:1.45,color:"rgba(26,26,20,.58)"}}>La distribución de mesas y el diseño del salón están disponibles en computadora o tablet en horizontal para trabajar con comodidad.</div>}
      </div>

      {!isMobile&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",background:"rgba(74,94,58,.055)",border:"0.5px solid rgba(74,94,58,.12)",borderRadius:12,padding:"9px 12px",marginBottom:12}}>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.58)",lineHeight:1.35}}>
          <strong style={{color:THEME.color.sage}}>Todo está conectado:</strong> las mesas que editás acá se reflejan en el plano completo del salón.
        </div>
        <button onClick={()=>{setViewMode("mesas");onGoDesigner?.();}} style={{background:"white",border:"1px solid rgba(74,94,58,.18)",borderRadius:THEME.radius.pill,padding:"8px 13px",minHeight:36,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:700,color:THEME.color.sage,cursor:"pointer",whiteSpace:"nowrap"}}>Abrir Diseño del salón →</button>
      </div>}

      {/* Barra búsqueda + filtros — solo en lista */}
      {viewMode==="lista"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:".9rem",pointerEvents:"none",opacity:.4}}>🔍</span>
          <input name="app-field-5604" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, lado o mesa..."
            style={{width:"100%",fontFamily:THEME.font.body,fontSize:".88rem",padding:"8px 10px 8px 34px",borderRadius:100,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream2,color:THEME.color.ink,boxSizing:"border-box",outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",fontSize:".9rem",cursor:"pointer",color:"rgba(26,26,20,.4)",lineHeight:1}}>×</button>}
        </div>
        <select name="app-field-5608" value={filter.conf} onChange={e=>setFilter(f=>({...f,conf:e.target.value}))} style={{fontFamily:THEME.font.body,fontSize:".82rem",padding:"7px 10px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:THEME.color.cream2,color:filter.conf?THEME.color.sage:"rgba(26,26,20,.5)",cursor:"pointer"}}>
          <option value="">Confirmación</option>{CONFIRMACIONES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select name="app-field-5611" value={filter.lado} onChange={e=>setFilter(f=>({...f,lado:e.target.value}))} style={{fontFamily:THEME.font.body,fontSize:".82rem",padding:"7px 10px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:THEME.color.cream2,color:filter.lado?THEME.color.sage:"rgba(26,26,20,.5)",cursor:"pointer"}}>
          <option value="">Lado</option>{LADOS.map(l=><option key={l}>{l}</option>)}
        </select>
        <select name="guest-filter-table" value={filter.mesa} onChange={e=>setFilter(f=>({...f,mesa:e.target.value}))} style={{fontFamily:THEME.font.body,fontSize:".82rem",padding:"7px 10px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:THEME.color.cream2,color:filter.mesa?THEME.color.sage:"rgba(26,26,20,.5)",cursor:"pointer"}}>
          <option value="">Todas las mesas</option>
          {mesaFilterOptions.map(n=><option key={n} value={String(n)}>Mesa {n}</option>)}
        </select>
        {activeFilterCount>0&&<button onClick={()=>{setSearch("");setFilter({lado:"",conf:"",mesa:""}); }} style={{background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.14)",borderRadius:999,padding:"7px 10px",fontFamily:THEME.font.body,fontSize:".78rem",color:"rgba(180,55,50,.7)",cursor:"pointer",whiteSpace:"nowrap"}}>✕ Limpiar {activeFilterCount} {activeFilterCount===1?"filtro":"filtros"}</button>}
      </div>}

      {viewMode==="lista"&&<div className="guests-v71-list-view">
        {filtered.length===0&&!addMode&&<div style={{textAlign:"center",padding:"clamp(16px,3.5vw,40px) clamp(10px,2vw,20px)",background:THEME.color.cream2,borderRadius:16,border:"0.5px solid rgba(201,169,110,.2)"}}>
          <div style={{fontSize:"2rem",marginBottom:10}}>👥</div>
          <p style={{fontFamily:THEME.font.display,fontSize:"1.05rem",color:THEME.color.ink,margin:"0 0 6px"}}>Aún no hay invitados</p>
          <p style={{fontFamily:THEME.font.body,fontSize:".88rem",color:"rgba(26,26,20,.45)",margin:"0 0 18px"}}>Podés agregarlos uno a uno o importar una lista desde Excel</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setAddMode(true)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:100,padding:"11px 22px",fontFamily:THEME.font.body,fontWeight:700,cursor:"pointer"}}>+ Agregar invitado</button>
          </div>
        </div>}
        {filtered.length===0&&search&&<div style={{textAlign:"center",padding:"clamp(16px,3vw,32px) clamp(12px,2vw,20px)",background:THEME.color.cream2,borderRadius:14,border:"0.5px solid rgba(201,169,110,.2)"}}>
          <div style={{fontSize:"1.8rem",marginBottom:8}}>🔍</div>
          <p style={{fontFamily:THEME.font.display,fontSize:"1rem",color:THEME.color.ink,margin:"0 0 4px"}}>Sin resultados para "{search}"</p>
          <p style={{fontFamily:THEME.font.body,fontSize:".85rem",color:"rgba(26,26,20,.4)",margin:0}}>Probá con otro nombre o limpiar los filtros</p>
        </div>}
        {!isMobile&&filtered.length>0&&<div className="guests-v7-table-head"><span></span><span>Invitación</span><span>Personas</span><span>Mesa</span><span>Confirmación</span><span></span></div>}
        {filtered.map(g=>{
          const c=confMap[g.confirmacion]||CONFIRMACIONES[0];
          const isExpanded=expandedId===g.id;
          const cant=parseInt(g.cantidadInvitados||1);
          return <div key={g.id} style={{background:THEME.color.cream2,border:`0.5px solid ${isExpanded?"rgba(74,94,58,.3)":"rgba(201,169,110,.18)"}`,borderRadius:14,marginBottom:6,overflow:"hidden",transition:"border-color .2s, box-shadow .2s",boxShadow:isExpanded?"0 8px 24px rgba(74,94,58,.08)":"none"}}>
            <>
                  {/* Fila principal — siempre visible */}
                  <div style={isMobile?{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",minHeight:56}:{display:"grid",gridTemplateColumns:"44px minmax(220px,1fr) 84px 100px 148px 28px",gap:10,alignItems:"center",padding:"11px 14px",cursor:"pointer",minHeight:58}}
                    onClick={()=>setExpandedId(isExpanded?null:g.id)}>
                    {/* Avatar inicial */}
                    <div style={{width:36,height:36,borderRadius:"50%",background:c.bg||"rgba(74,94,58,.1)",border:`1.5px solid ${c.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontFamily:THEME.font.display,fontSize:"1rem",fontWeight:700,color:c.color}}>{g.nombre?.charAt(0)?.toUpperCase()||"?"}</span>
                    </div>
                    {/* Info principal */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontFamily:THEME.font.display,fontSize:".95rem",fontWeight:600,color:THEME.color.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{g.nombre}</span>
                        {isMobile&&cant>1&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",background:"rgba(74,94,58,.1)",color:THEME.color.sage,borderRadius:100,padding:"2px 6px",flexShrink:0}}>×{cant}</span>}
                      </div>
                      <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontFamily:THEME.font.body,fontSize:".74rem",color:"rgba(26,26,20,.4)"}}>{g.lado}{g.parentesco&&g.parentesco!=="Otro"?` · ${g.parentesco}`:""}</span>
                        {isMobile&&g.mesa&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".06em",background:"rgba(201,169,110,.12)",color:"rgba(201,169,110,.8)",borderRadius:100,padding:"1px 6px"}}>Mesa {g.mesa}</span>}
                        {g.restriccion&&g.restriccion!=="Ninguna"&&<span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(200,130,0,.7)"}}>⚠️ {g.restriccion}</span>}
                      </div>
                    </div>
                    {!isMobile&&<div style={{fontFamily:THEME.font.body,fontSize:".88rem",fontWeight:700,color:THEME.color.ink}}>{cant}</div>}
                    {!isMobile&&<div style={{fontFamily:THEME.font.body,fontSize:".82rem",color:g.mesa?THEME.color.sage:"rgba(26,26,20,.38)",fontWeight:g.mesa?700:400}}>{g.mesa?`Mesa ${g.mesa}`:"En espera"}</div>}
                    {/* Chip de confirmación — clickable */}
                    <div style={{flexShrink:0}}>
                      <select name="app-field-5663" value={g.confirmacion} onChange={e=>{e.stopPropagation();updateGuest(g.id,"confirmacion",e.target.value);}} onClick={e=>e.stopPropagation()}
                        style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".06em",padding:"8px 10px",borderRadius:THEME.radius.pill,border:`1px solid ${c.color}`,background:c.bg,color:c.color,cursor:"pointer",textTransform:"uppercase"}}>
                        {CONFIRMACIONES.map(cc=><option key={cc.id} value={cc.id}>{cc.label}</option>)}
                      </select>
                    </div>
                    {/* Chevron */}
                    <span style={{color:"rgba(26,26,20,.25)",fontSize:".8rem",transition:"transform .2s",transform:isExpanded?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▾</span>
                  </div>

                  {/* Panel expandido */}
                  {isExpanded&&<div className="guest-expand" style={{borderTop:"0.5px solid rgba(74,94,58,.1)",padding:"12px 14px",background:"rgba(74,94,58,.03)"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:10}}>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Mesa Nº</div>
                        <input name="app-field-5677" type="number" key={`mesa-${g.id}-${g.mesa||""}`} defaultValue={g.mesa||""} onBlur={e=>updateGuest(g.id,"mesa",e.target.value)} placeholder="Sin asignar" min="1"
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
                        <button onClick={()=>{const s=sugerirMesa(g.parentesco||"Otro",g.lado,g.cantidadInvitados);updateGuest(g.id,"mesa",String(s.mesa));}}
                          style={{background:"transparent",border:"none",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(139,107,40,.85)",cursor:"pointer",padding:"6px 2px",textAlign:"left"}}>💡 Sugerir según parentesco</button>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Personas</div>
                        <input name="app-field-5684" type="number" defaultValue={g.cantidadInvitados||1} onBlur={e=>updateGuest(g.id,"cantidadInvitados",e.target.value)} min="1"
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Lado</div>
                        <select name="app-field-5689" defaultValue={g.lado} onBlur={e=>updateGuest(g.id,"lado",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {LADOS.map(l=><option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Parentesco</div>
                        <select name="app-field-5696" defaultValue={g.parentesco||"Otro"} onBlur={e=>updateGuest(g.id,"parentesco",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {PARENTESCOS.map(p=><option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Restricción</div>
                        <select name="app-field-5703" defaultValue={g.restriccion} onBlur={e=>updateGuest(g.id,"restriccion",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {RESTRICCIONES.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <RecommendationBox title="Recomendaciones de mesa" items={getGuestSeatRecommendations(g)}/>
                    {/* Notas */}
                    <input name="app-field-5711" type="text" defaultValue={g.notas||""} onBlur={e=>updateGuest(g.id,"notas",e.target.value)} placeholder="Notas (opcional)..."
                      style={{width:"100%",fontFamily:THEME.font.body,fontSize:".88rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",marginBottom:10}}/>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={()=>setExpandedId(null)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:THEME.radius.pill,padding:"11px 24px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:700,fontSize:"max(13px,.85rem)",cursor:"pointer"}}>✓ Guardar</button>
                      {!isMobile&&<button onClick={()=>{setViewMode("mesas");onGoDesigner?.();}} style={{background:"white",color:THEME.color.sage,border:"1px solid rgba(74,94,58,.2)",borderRadius:THEME.radius.pill,padding:"11px 16px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:700,fontSize:"max(13px,.82rem)",cursor:"pointer"}}>🏛️ Ver en salón</button>}
                      <button onClick={()=>setConfirmDelete(g.id)} style={{background:"transparent",border:"none",borderRadius:THEME.radius.sm,padding:"11px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(200,60,60,.65)",cursor:"pointer",marginLeft:"auto"}}>🗑 Eliminar</button>
                    </div>
                  </div>}
                </>
          </div>
        })}
      </div>}

      {viewMode==="mesas"&&<div className="guests-v71-mesas-view">
        {deletedGuestTable&&<div role="status" style={{position:"sticky",top:8,zIndex:55,display:"flex",alignItems:"center",gap:12,background:"#FFFDF8",border:"1px solid rgba(74,94,58,.25)",borderRadius:12,padding:"10px 12px",marginBottom:12,boxShadow:"0 10px 28px rgba(63,50,31,.12)"}}>
          <div style={{minWidth:0,flex:1,fontFamily:THEME.font.body,fontSize:".78rem",lineHeight:1.4,color:"rgba(26,26,20,.72)"}}>Mesa {deletedGuestTable.tableId} eliminada del plano. Las invitaciones quedaron en el Banco de espera.</div>
          <button type="button" onClick={undoDeleteGuestTableVista} style={{border:"1px solid rgba(74,94,58,.24)",borderRadius:999,background:"rgba(74,94,58,.08)",padding:"8px 12px",fontFamily:THEME.font.body,fontSize:".74rem",fontWeight:800,color:THEME.color.sage,cursor:"pointer",whiteSpace:"nowrap"}}>Deshacer</button>
          <button type="button" aria-label="Cerrar aviso" onClick={()=>setDeletedGuestTable(null)} style={{width:32,height:32,border:0,borderRadius:999,background:"transparent",fontSize:"1rem",color:"rgba(26,26,20,.45)",cursor:"pointer"}}>×</button>
        </div>}
        {mesasPendientes.length>0&&<div style={{background:"rgba(201,169,110,.10)",border:"1px solid rgba(201,169,110,.34)",borderRadius:14,padding:"13px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{minWidth:0,flex:"1 1 260px"}}>
            <div style={{fontFamily:THEME.font.display,fontSize:"1rem",fontWeight:700,color:THEME.color.ink}}>Faltan {mesasPendientes.length} {mesasPendientes.length===1?"mesa":"mesas"} en el salón</div>
            <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.58)",lineHeight:1.45,marginTop:3}}>
              Tus invitados usan mesas hasta la {maxMesa}. Ya creaste {mesasRequeridasCreadas} de {maxMesa}. Podés agregarlas de a una para acomodarlas con calma en el canvas.
            </div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={()=>agregarMesasPendientesVista(1)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:THEME.radius.pill,padding:"10px 14px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:800,cursor:"pointer"}}>+ Mesa {mesasPendientes[0]}</button>
            {mesasPendientes.length>1&&<button onClick={()=>agregarMesasPendientesVista(Math.min(5,mesasPendientes.length))} style={{background:"white",color:THEME.color.sage,border:"1px solid rgba(74,94,58,.22)",borderRadius:THEME.radius.pill,padding:"9px 13px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:750,cursor:"pointer"}}>Agregar {Math.min(5,mesasPendientes.length)}</button>}
            {mesasPendientes.length>5&&<button onClick={()=>agregarMesasPendientesVista(mesasPendientes.length)} style={{background:"transparent",color:"rgba(74,94,58,.78)",border:"1px solid rgba(74,94,58,.18)",borderRadius:THEME.radius.pill,padding:"9px 13px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.76rem)",fontWeight:700,cursor:"pointer"}}>Agregar todas</button>}
          </div>
        </div>}
        {/* Barra de movimiento activo */}
        {movingGuest&&(()=>{const mg=guests.find(g=>g.id===movingGuest);return mg?<div style={{position:"sticky",top:8,zIndex:50,display:"flex",alignItems:"center",gap:10,background:THEME.color.sage,color:THEME.color.cream,borderRadius:THEME.radius.pill,padding:"10px 16px",marginBottom:12,boxShadow:THEME.shadow.pop}}>
          <span style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",flex:1}}>Moviendo a <strong>{mg.nombre}</strong> — tocá la mesa destino</span>
          <button onClick={()=>setMovingGuest(null)} style={{background:"rgba(245,239,224,.2)",border:"none",borderRadius:THEME.radius.pill,padding:"8px 14px",minHeight:36,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:THEME.color.cream,cursor:"pointer"}}>✕ Cancelar</button>
        </div>:null;})()}
        {/* Zona Sin mesa — también es destino para desasignar */}
        {(sinMesa.length>0||movingGuest||dragMG)&&<div className="guests-v71-waiting-bank" data-mesa-drop=""
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("guestId");if(id){updateGuest(id,"mesa","");setMovingGuest(null);}}}
          onClick={()=>{if(movingGuest){updateGuest(movingGuest,"mesa","");setMovingGuest(null);}}}
          style={{background:dragMG?.over===""?"rgba(74,94,58,.12)":"rgba(201,169,110,.08)",border:`${(movingGuest||dragMG)?"1.5px dashed rgba(74,94,58,.5)":"0.5px solid rgba(201,169,110,.3)"}`,borderRadius:12,padding:"12px 16px",marginBottom:14,cursor:movingGuest?"pointer":"default",transition:"border .15s, background .15s"}}>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.65)",marginBottom:sinMesa.length>0?8:0}}>Banco de espera ({sinMesa.length}){movingGuest?" — tocá acá para quitar de la mesa":""}</div>
          <div className="guests-v71-waiting-list" style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {sinMesa.map(g=><div className="guests-v71-waiting-item" key={g.id} draggable
              onDragStart={e=>{e.dataTransfer.setData("guestId",g.id);setMovingGuest(g.id);}}
              onDragEnd={()=>setMovingGuest(null)}
              onClick={e=>{e.stopPropagation();setMovingGuest(movingGuest===g.id?null:g.id);}}
              style={{display:"flex",alignItems:"center",gap:4,background:movingGuest===g.id?"rgba(74,94,58,.12)":"rgba(255,255,255,.78)",border:movingGuest===g.id?"1px solid rgba(74,94,58,.5)":"1px solid rgba(201,169,110,.22)",borderRadius:100,padding:"5px 12px 5px 4px",minHeight:38,cursor:"grab",userSelect:"none"}}>
              <span onMouseDown={e=>beginDragMG(e,g)} onTouchStart={e=>beginDragMG(e,g)} onClick={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}
                style={{cursor:"grab",touchAction:"none",padding:"8px 6px",color:"rgba(26,26,20,.35)",fontSize:".85rem",lineHeight:1,flexShrink:0,userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}>⠿</span>
              <div style={{minWidth:0,flex:1}}><span style={{display:"block",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(26,26,20,.72)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.nombre}{parseInt(g.cantidadInvitados||1)>1?` ×${g.cantidadInvitados}`:""}</span><small style={{display:"block",fontFamily:THEME.font.body,fontSize:".66rem",lineHeight:1.3,color:"rgba(26,26,20,.4)",marginTop:2}}>Sin mesa o no entró completa · elegí una mesa con lugar</small></div>
            </div>)}
          </div>
        </div>}
        <div className="guests-v71-table-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(280px,100%),1fr))",gap:12}}>
          {tables.map(t=>{
            const pct=Math.round(t.personas/t.cap*100);
            const over=t.personas>t.cap;
            const esDestino=movingGuest&&!t.guests.some(g=>g.id===movingGuest);
            const hoverDrag=dragMG?.over===String(t.num);
            return <div key={t.num} className={`guests-v72-table-card ${selectedGuestTable===t.num?"is-selected":""}`} data-mesa-drop={String(t.num)}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("guestId");if(id){updateGuest(id,"mesa",String(t.num));setMovingGuest(null);}}}
              onClick={()=>{if(esDestino){updateGuest(movingGuest,"mesa",String(t.num));setMovingGuest(null);}else{setSelectedGuestTable(t.num);}}}
              style={{background:hoverDrag?"rgba(74,94,58,.08)":THEME.color.cream2,border:(esDestino||hoverDrag)?"1.5px dashed rgba(74,94,58,.55)":`0.5px solid ${over?"rgba(200,80,60,.4)":"rgba(201,169,110,.22)"}`,borderRadius:14,padding:"14px",cursor:esDestino?"pointer":"default",transition:"border .15s, transform .15s, background .15s",transform:(esDestino||hoverDrag)?"scale(1.01)":"none"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:8}}>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:THEME.font.display,fontWeight:700,fontSize:"1.05rem",color:THEME.color.ink}}>Mesa {t.num}</div>
                  {t.etiqueta&&<div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.6)"}}>{t.etiqueta}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,position:"relative"}} onClick={e=>e.stopPropagation()}>
                  <span style={{fontFamily:THEME.font.body,fontSize:".82rem",color:over?"rgba(200,80,60,.8)":pct>=80?"rgba(201,169,110,.8)":"rgba(74,94,58,.6)"}}>{t.personas}{over&&" ⚠️"} /</span>
                  <input name="app-field-5767" type="number" min="2" max="80" key={`cap-${t.num}-${t.cap}`} defaultValue={t.cap}
                    onBlur={e=>{const v=parseInt(e.target.value); if(v&&v!==t.cap) setCapMesaVista(t.num,v);}}
                    onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}
                    title="Personas por mesa"
                    style={{width:44,fontFamily:THEME.font.body,fontSize:".85rem",fontWeight:600,padding:"5px 3px",borderRadius:7,border:"1px solid rgba(74,94,58,.25)",background:THEME.color.cream,color:THEME.color.ink,textAlign:"center"}}/>
                  <button type="button" aria-label={`Opciones de Mesa ${t.num}`} title="Opciones de mesa" onClick={e=>{e.stopPropagation();setOpenGuestTableMenu(openGuestTableMenu===t.num?null:t.num);}} style={{width:34,height:34,border:"1px solid rgba(74,94,58,.14)",borderRadius:9,background:"rgba(255,255,255,.72)",fontFamily:THEME.font.body,fontSize:"1rem",fontWeight:800,color:"rgba(26,26,20,.55)",cursor:"pointer",lineHeight:1}}>···</button>
                  {openGuestTableMenu===t.num&&<div role="menu" onMouseDown={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:40,zIndex:80,width:190,background:"#FFFDF8",border:"1px solid rgba(74,94,58,.16)",borderRadius:12,padding:6,boxShadow:"0 14px 38px rgba(32,27,20,.18)"}}>
                    <button type="button" role="menuitem" onClick={()=>{setSelectedGuestTable(t.num);setOpenGuestTableMenu(null);}} style={{width:"100%",border:0,borderRadius:8,background:"transparent",padding:"9px 10px",textAlign:"left",fontFamily:THEME.font.body,fontSize:".76rem",color:THEME.color.ink,cursor:"pointer"}}>Ver detalle</button>
                    <button type="button" role="menuitem" disabled={!t.guests.length} onClick={()=>{setOpenGuestTableMenu(null);emptyGuestTable(t.num);}} style={{width:"100%",border:0,borderRadius:8,background:"transparent",padding:"9px 10px",textAlign:"left",fontFamily:THEME.font.body,fontSize:".76rem",color:"rgba(26,26,20,.68)",cursor:t.guests.length?"pointer":"default",opacity:t.guests.length?1:.42}}>Vaciar mesa</button>
                    <div style={{height:1,background:"rgba(74,94,58,.1)",margin:"4px 0"}}/>
                    <button type="button" role="menuitem" onClick={()=>deleteGuestTableVista(t.num)} style={{width:"100%",border:0,borderRadius:8,background:"rgba(181,67,58,.055)",padding:"9px 10px",textAlign:"left",fontFamily:THEME.font.body,fontSize:".76rem",fontWeight:750,color:"rgba(181,67,58,.82)",cursor:"pointer"}}>Eliminar mesa…</button>
                  </div>}
                </div>
              </div>
              <div style={{height:4,background:"rgba(74,94,58,.1)",borderRadius:4,overflow:"hidden",marginBottom:10}}>
                <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:over?"rgba(200,80,60,.5)":pct>=80?THEME.color.gold:THEME.color.sage,borderRadius:4,transition:"width .3s"}}/>
              </div>
              {(()=>{
                const counts={};
                t.guests.forEach(g=>{ const k=g.parentesco||"Otro"; counts[k]=(counts[k]||0)+(parseInt(g.cantidadInvitados||1)||1); });
                const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
                return top?<div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(74,94,58,.72)",background:"rgba(74,94,58,.06)",borderRadius:8,padding:"6px 8px",marginBottom:8}}>💡 Mesa {t.num}: mayoría de {PARENTESCO_HUMANO[top[0]]||top[0]} ({top[1]} pers.)</div>:null;
              })()}
              {t.guests.slice(0,3).map(g=>{
                const c=confMap[g.confirmacion]||CONFIRMACIONES[0];
                const enMov=movingGuest===g.id;
                return <div key={g.id} draggable
                  onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("guestId",g.id);setMovingGuest(g.id);}}
                  onDragEnd={()=>setMovingGuest(null)}
                  onClick={e=>{e.stopPropagation();setMovingGuest(enMov?null:g.id);}}
                  title="Arrastrá desde ⠿ (o tocá y elegí mesa)"
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 6px 8px 0",minHeight:THEME.tap.min,borderBottom:"0.5px solid rgba(74,94,58,.06)",borderRadius:8,background:enMov?"rgba(74,94,58,.12)":"transparent",border:`1px solid ${enMov?"rgba(74,94,58,.35)":"transparent"}`,cursor:"grab",userSelect:"none",transition:"background .15s,border .15s"}}>
                  <span onMouseDown={e=>beginDragMG(e,g)} onTouchStart={e=>beginDragMG(e,g)} onClick={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}
                    style={{cursor:"grab",touchAction:"none",padding:"10px 8px",color:"rgba(26,26,20,.3)",fontSize:".9rem",lineHeight:1,flexShrink:0,userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}>⠿</span>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontFamily:THEME.font.body,fontSize:".88rem",color:THEME.color.ink}}>{enMov?"↔ ":""}{g.nombre}</span>
                    {parseInt(g.cantidadInvitados||1)>1&&<span style={{fontSize:".75rem",color:"rgba(74,94,58,.5)",marginLeft:4}}>×{g.cantidadInvitados}</span>}
                    {g.restriccion&&g.restriccion!=="Ninguna"&&<div style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(200,140,0,.65)"}}>⚠️ {g.restriccion}</div>}
                  </div>
                  <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".06em",padding:"2px 6px",borderRadius:100,background:c.bg,color:c.color,whiteSpace:"nowrap",flexShrink:0}}>{c.label}</span>
                </div>;
              })}
              {t.guests.length>3&&<button type="button" onClick={e=>{e.stopPropagation();setSelectedGuestTable(t.num);}} style={{width:"100%",marginTop:7,border:"1px solid rgba(74,94,58,.14)",borderRadius:8,background:"rgba(74,94,58,.045)",padding:"7px 9px",fontFamily:THEME.font.body,fontSize:".74rem",fontWeight:750,color:THEME.color.sage,cursor:"pointer"}}>Ver {t.guests.length-3} invitaciones más →</button>}
              {t.personas<t.cap
                ? <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,background:"rgba(74,94,58,.06)",borderRadius:8,padding:"6px 10px"}}>
                    <span style={{fontSize:".85rem"}}>🪑</span>
                    <span style={{fontFamily:THEME.font.body,fontSize:".82rem",color:"rgba(74,94,58,.7)",fontWeight:600}}>
                      Faltan {t.cap-t.personas} {t.cap-t.personas===1?"persona":"personas"} para completar la mesa
                    </span>
                  </div>
                : <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,background:"rgba(74,94,58,.1)",borderRadius:8,padding:"6px 10px"}}>
                    <span style={{fontSize:".85rem"}}>✅</span>
                    <span style={{fontFamily:THEME.font.body,fontSize:".82rem",color:"rgba(74,94,58,.8)",fontWeight:600}}>Mesa completa</span>
                  </div>
              }
            </div>;
          })}
          {/* Card para agregar mesa */}
          <button onClick={agregarMesaVista}
            style={{background:"transparent",border:"1.5px dashed rgba(74,94,58,.35)",borderRadius:14,padding:"14px",minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontFamily:THEME.font.body,color:THEME.color.sage,transition:"background .15s"}}>
            <span style={{fontSize:"1.6rem",lineHeight:1}}>+</span>
            <span style={{fontSize:"max(13px,.85rem)",fontWeight:600}}>Agregar mesa</span>
            <span style={{fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.4)"}}>Mesa {proximaMesaParaAgregar} · {tableSize} personas</span>
          </button>
        </div>
        <aside className="guests-v72-table-inspector" aria-label="Detalle de mesa seleccionada">
          {selectedGuestTableData?<>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
              <div><div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.55)"}}>Mesa seleccionada</div><h3 style={{fontFamily:THEME.font.display,fontSize:"1.28rem",margin:"3px 0 0",color:THEME.color.ink}}>Mesa {selectedGuestTableData.num}</h3></div>
              <strong style={{fontFamily:THEME.font.display,fontSize:"1.05rem",color:selectedGuestTableData.personas>selectedGuestTableData.cap?"#B5443A":THEME.color.sage}}>{selectedGuestTableData.personas} / {selectedGuestTableData.cap}</strong>
            </div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.42)",marginBottom:6}}>Capacidad</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
              {[8,10,12].map(cap=><button key={cap} type="button" onClick={()=>setCapMesaVista(selectedGuestTableData.num,cap)} style={{border:`1px solid ${selectedGuestTableData.cap===cap?THEME.color.sage:"rgba(74,94,58,.18)"}`,borderRadius:999,padding:"8px",background:selectedGuestTableData.cap===cap?THEME.color.sage:THEME.color.cream,color:selectedGuestTableData.cap===cap?THEME.color.cream:"rgba(26,26,20,.58)",fontFamily:THEME.font.body,fontWeight:750,cursor:"pointer"}}>{cap}</button>)}
            </div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.42)",marginBottom:6}}>Invitaciones asignadas · {selectedGuestTableData.guests.length}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,overflowY:"auto",minHeight:0,maxHeight:"min(46vh,460px)",paddingRight:3}}>
              {selectedGuestTableData.guests.map(guest=><div key={guest.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.045)",border:"1px solid rgba(74,94,58,.09)",borderRadius:10,padding:"8px 9px"}}>
                <div style={{minWidth:0,flex:1}}><strong style={{display:"block",fontFamily:THEME.font.body,fontSize:".82rem",color:THEME.color.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{guest.nombre}</strong><small style={{fontFamily:THEME.font.body,fontSize:".68rem",color:"rgba(26,26,20,.45)"}}>{parseInt(guest.cantidadInvitados||1)} {parseInt(guest.cantidadInvitados||1)===1?"persona":"personas"}{guest.restriccion&&guest.restriccion!=="Ninguna"?` · ${guest.restriccion}`:""}</small></div>
                <button type="button" aria-label={`Mover ${guest.nombre} al Banco de espera`} title="Mover al Banco de espera" onClick={()=>updateGuest(guest.id,"mesa","")} style={{width:32,height:32,borderRadius:999,border:"1px solid rgba(181,67,58,.18)",background:"rgba(181,67,58,.06)",color:"rgba(181,67,58,.72)",cursor:"pointer"}}>×</button>
              </div>)}
              {!selectedGuestTableData.guests.length&&<div style={{fontFamily:THEME.font.body,fontSize:".78rem",lineHeight:1.5,color:"rgba(26,26,20,.42)",fontStyle:"italic",padding:"8px 0"}}>Esta mesa está vacía. Elegí una invitación del Banco de espera y después tocá esta mesa.</div>}
            </div>
            <div style={{display:"grid",gap:8,marginTop:12}}>
              <button type="button" disabled={!selectedGuestTableData.guests.length} onClick={()=>emptyGuestTable(selectedGuestTableData.num)} style={{width:"100%",border:"1px solid rgba(181,67,58,.22)",borderRadius:10,padding:"10px",background:"rgba(181,67,58,.06)",fontFamily:THEME.font.body,fontSize:".78rem",fontWeight:750,color:"rgba(181,67,58,.76)",cursor:selectedGuestTableData.guests.length?"pointer":"default",opacity:selectedGuestTableData.guests.length?1:.45}}>Vaciar esta mesa</button>
              <button type="button" onClick={()=>deleteGuestTableVista(selectedGuestTableData.num)} style={{width:"100%",border:"1px solid rgba(181,67,58,.32)",borderRadius:10,padding:"10px",background:"transparent",fontFamily:THEME.font.body,fontSize:".76rem",fontWeight:800,color:"rgba(181,67,58,.85)",cursor:"pointer"}}>Eliminar mesa del evento…</button>
              <small style={{fontFamily:THEME.font.body,fontSize:".65rem",lineHeight:1.4,color:"rgba(26,26,20,.42)"}}>También se elimina del Diseño del salón. Las invitaciones vuelven al Banco de espera.</small>
            </div>
          </>:<div style={{display:"grid",placeItems:"center",minHeight:260,textAlign:"center",padding:"20px 12px"}}><div><div style={{fontSize:"1.5rem",marginBottom:8}}>👆</div><strong style={{display:"block",fontFamily:THEME.font.display,fontSize:"1rem",color:THEME.color.ink}}>Elegí una mesa</strong><p style={{fontFamily:THEME.font.body,fontSize:".76rem",lineHeight:1.5,color:"rgba(26,26,20,.45)",margin:"6px 0 0"}}>Vas a ver todas sus invitaciones, cambiar la capacidad o vaciarla.</p></div></div>}
        </aside>
        {/* Ghost flotante durante el drag */}
        {dragMG&&<div style={{position:"fixed",left:dragMG.x-12,top:dragMG.y-42,zIndex:9999,pointerEvents:"none",background:THEME.color.sage,color:THEME.color.cream,borderRadius:THEME.radius.pill,padding:"9px 16px",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.35)",whiteSpace:"nowrap"}}>↔ {dragMG.nombre}</div>}
      </div>}
      {/* ── VISTA SALÓN ── */}
      {viewMode==="salon"&&<SalonView
        mode="guests"
        user={user}
        onOpenGuia={()=>setGuia("mesas")}
        onGoDesigner={onGoDesigner}
        guests={guests}
        tableSize={tableSize}
        budgetInvitados={budgetInvitados}
        onAssign={(guestId, mesa)=>{
          const next = guests.map(g=>g.id===guestId?{...g,mesa:String(mesa)}:g);
          setGuests(next); save(next);
        }}
        onAssignMany={(pairs)=>{
          const map=Object.fromEntries(pairs.map(p=>[String(p.guestId),String(p.mesa)]));
          const next = guests.map(g=>map[g.id]!==undefined?{...g,mesa:map[g.id]}:g);
          setGuests(next); save(next);
          showToast(`✓ Asignación de mesas actualizada (${pairs.length} invitaciones)`,"success");
        }}
        onRemove={(guestId)=>{
          const next = guests.map(g=>g.id===guestId?{...g,mesa:""}:g);
          setGuests(next); save(next);
        }}
        onAddMesas={(nuevas)=>{
          // Agregar mesas a la lista de invitados si no existen
        }}
      />}

      <BackToHome onBack={onBack}/>
    </div>
  </div>;
}



// ─── MÓDULO DISEÑO DEL SALÓN ──────────────────────────────────────────────────
function SalonDesignerModule({user, onBack, onGoGuests}){
  const [guests, setGuests] = useState(null);
  const [tableSize, setTableSize] = useState(8);
  const [budgetInvitados, setBudgetInvitados] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(()=>{
    let alive = true;
    if(!user){ setGuests([]); setLoading(false); return; }
    (async()=>{
      try{
        const {data:row} = await dataClient(user)
          .from("wedding_data")
          .select("guests,table_size,budget")
          .eq("user_id",user.id)
          .maybeSingle();
        if(!alive) return;
        const list = Array.isArray(row?.guests) ? row.guests : [];
        setGuests(list);
        if(row?.table_size) setTableSize(normalizeRoundTableCapacity(row.table_size,8));
        const bi = parseInt(row?.budget?.invitados||0);
        setBudgetInvitados(bi>0 ? bi : list.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0));
      }catch(err){
        if(alive) setGuests([]);
      }finally{
        if(alive) setLoading(false);
      }
    })();
    return ()=>{alive=false;};
  },[user]);

  const saveGuests = async(next, ts=tableSize)=>{
    setGuests(next);
    if(!user) return;
    try{
      const totalPersonas = next.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
      let budgetUpdate = null;
      try{
        const {data:brow} = await dataClient(user).from("wedding_data").select("budget").eq("user_id",user.id).maybeSingle();
        if(brow?.budget) budgetUpdate = {...brow.budget, invitados:String(totalPersonas)};
      }catch(err){}
      const upsertData = {user_id:user.id,guests:next,table_size:ts,updated_at:new Date().toISOString()};
      if(budgetUpdate) upsertData.budget = budgetUpdate;
      await dataClient(user).from("wedding_data").upsert(upsertData,{onConflict:"user_id"});
      setBudgetInvitados(totalPersonas);
    }catch(err){
      console.warn("⚠️ No se pudieron guardar los invitados desde Diseño del salón:", err?.message||err);
    }
  };

  if(loading){
    return <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:THEME.font.body,color:"rgba(26,26,20,.55)"}}>Cargando diseño del salón...</div>;
  }

  return <div style={{minHeight:"100vh",background:THEME.color.cream,padding:isMobile?"12px":"24px"}}>
    <div style={{maxWidth:1760,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".16em",textTransform:"uppercase",color:"rgba(74,94,58,.58)",marginBottom:4}}>Diseño del salón</div>
          <h1 style={{fontFamily:THEME.font.display,fontSize:"clamp(1.55rem,3vw,2.35rem)",lineHeight:1.05,margin:0,color:THEME.color.ink}}>Plano, decoración y circulación</h1>
          <p style={{fontFamily:THEME.font.body,fontSize:".9rem",color:"rgba(26,26,20,.52)",margin:"6px 0 0",maxWidth:720}}>Acá diseñás el salón completo. Las mesas se comparten con Invitados, pero la decoración queda fuera del canvas limpio de seating.</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {onGoGuests&&<button onClick={onGoGuests} style={{background:"white",border:"1px solid rgba(74,94,58,.18)",borderRadius:10,padding:"10px 14px",fontFamily:THEME.font.body,color:THEME.color.sage,cursor:"pointer"}}>← Volver a Distribuir en mesas</button>}
          {onBack&&<button onClick={onBack} style={{background:THEME.color.sage,border:"1px solid rgba(74,94,58,.18)",borderRadius:10,padding:"10px 14px",fontFamily:THEME.font.body,color:THEME.color.cream,cursor:"pointer"}}>Inicio</button>}
        </div>
      </div>
      <SalonView
        mode="designer"
        user={user}
        guests={guests||[]}
        tableSize={tableSize}
        budgetInvitados={budgetInvitados}
        onGoGuests={onGoGuests}
        onAssign={(guestId, mesa)=>{
          const next=(guests||[]).map(g=>g.id===guestId?{...g,mesa:String(mesa)}:g);
          saveGuests(next);
        }}
        onAssignMany={(pairs)=>{
          const map=Object.fromEntries(pairs.map(p=>[String(p.guestId),String(p.mesa)]));
          const next=(guests||[]).map(g=>map[g.id]!==undefined?{...g,mesa:map[g.id]}:g);
          saveGuests(next);
          if(typeof showToast==="function") showToast(`✓ Asignación de mesas actualizada (${pairs.length} invitaciones)`,"success");
        }}
        onRemove={(guestId)=>{
          const next=(guests||[]).map(g=>g.id===guestId?{...g,mesa:""}:g);
          saveGuests(next);
        }}
        onOpenGuia={()=>{}}
      />
    </div>
  </div>;
}

// ─── SALON VIEW ──────────────────────────────────────────────────────────────
const SALON_SHAPES = {
  cuadrado:   { label:"Cuadrado",   path:(w,h)=>`M0,0 L${w},0 L${w},${h} L0,${h} Z` },
  rectangulo: { label:"Rectángulo", path:(w,h)=>`M0,0 L${w},0 L${w},${h} L0,${h} Z` },
  L:   { label:"Forma L", path:(w,h)=>`M0,0 L${w},0 L${w},${h*0.5} L${w*0.5},${h*0.5} L${w*0.5},${h} L0,${h} Z` },
  U:   { label:"Forma U", path:(w,h)=>`M0,0 L${w*0.35},0 L${w*0.35},${h*0.6} L${w*0.65},${h*0.6} L${w*0.65},0 L${w},0 L${w},${h} L0,${h} Z` },
  oval:{ label:"Oval",    path:(w,h)=>`M${w*0.5},0 Q${w},0 ${w},${h*0.5} Q${w},${h} ${w*0.5},${h} Q0,${h} 0,${h*0.5} Q0,0 ${w*0.5},0 Z` },
};


// Configuración geométrica editable del salón.
// La forma ya no es solo un recorte visual: define zonas válidas reales.
const DEFAULT_SALON_SHAPE_CONFIG = {
  L: { orientation: "cutTopRight", cutW: 0.42, cutH: 0.46 },
  U: { orientation: "openTop", gapW: 0.36, gapD: 0.55 },
};

const L_SHAPE_OPTIONS = [
  { id:"cutTopRight", label:"L con recorte arriba derecha" },
  { id:"cutTopLeft", label:"L con recorte arriba izquierda" },
  { id:"cutBottomRight", label:"L con recorte abajo derecha" },
  { id:"cutBottomLeft", label:"L con recorte abajo izquierda" },
];

const U_SHAPE_OPTIONS = [
  { id:"openTop", label:"U abierta arriba" },
  { id:"openBottom", label:"U abierta abajo" },
  { id:"openLeft", label:"U abierta izquierda" },
  { id:"openRight", label:"U abierta derecha" },
];

const clamp01 = (v, min=0.22, max=0.68) => Math.max(min, Math.min(max, Number(v)||min));
const normalizeSalonShapeConfig = (shape, cfg={}) => {
  const base = cfg && typeof cfg === "object" ? cfg : {};
  const L0 = DEFAULT_SALON_SHAPE_CONFIG.L;
  const U0 = DEFAULT_SALON_SHAPE_CONFIG.U;
  return {
    ...DEFAULT_SALON_SHAPE_CONFIG,
    ...base,
    L: {
      orientation: base?.L?.orientation || L0.orientation,
      cutW: clamp01(base?.L?.cutW ?? L0.cutW, 0.25, 0.65),
      cutH: clamp01(base?.L?.cutH ?? L0.cutH, 0.25, 0.65),
    },
    U: {
      orientation: base?.U?.orientation || U0.orientation,
      gapW: clamp01(base?.U?.gapW ?? U0.gapW, 0.25, 0.58),
      gapD: clamp01(base?.U?.gapD ?? U0.gapD, 0.28, 0.68),
    },
  };
};

const salonShapePath = (shape, w, h, cfg={}) => {
  const C = normalizeSalonShapeConfig(shape, cfg);
  if(shape === "L"){
    const c = C.L;
    const cutW = w * c.cutW;
    const cutH = h * c.cutH;
    if(c.orientation === "cutTopLeft")
      return `M${cutW},0 L${w},0 L${w},${h} L0,${h} L0,${cutH} L${cutW},${cutH} Z`;
    if(c.orientation === "cutBottomLeft")
      return `M0,0 L${w},0 L${w},${h} L${cutW},${h} L${cutW},${h-cutH} L0,${h-cutH} Z`;
    if(c.orientation === "cutBottomRight")
      return `M0,0 L${w},0 L${w},${h-cutH} L${w-cutW},${h-cutH} L${w-cutW},${h} L0,${h} Z`;
    // cutTopRight
    return `M0,0 L${w-cutW},0 L${w-cutW},${cutH} L${w},${cutH} L${w},${h} L0,${h} Z`;
  }
  if(shape === "U"){
    const c = C.U;
    const gapW = w * c.gapW;
    const gapD = h * c.gapD;
    const gapH = h * c.gapW;
    const gapL = w * c.gapD;
    const x1=(w-gapW)/2, x2=(w+gapW)/2;
    const y1=(h-gapH)/2, y2=(h+gapH)/2;
    if(c.orientation === "openBottom")
      return `M0,0 L${w},0 L${w},${h} L${x2},${h} L${x2},${h-gapD} L${x1},${h-gapD} L${x1},${h} L0,${h} Z`;
    if(c.orientation === "openLeft")
      return `M0,0 L${w},0 L${w},${h} L0,${h} L0,${y2} L${gapL},${y2} L${gapL},${y1} L0,${y1} Z`;
    if(c.orientation === "openRight")
      return `M0,0 L${w},0 L${w},${y1} L${w-gapL},${y1} L${w-gapL},${y2} L${w},${y2} L${w},${h} L0,${h} Z`;
    // openTop
    return `M0,0 L${x1},0 L${x1},${gapD} L${x2},${gapD} L${x2},0 L${w},0 L${w},${h} L0,${h} Z`;
  }
  if(shape === "oval")
    return `M${w*0.5},0 Q${w},0 ${w},${h*0.5} Q${w},${h} ${w*0.5},${h} Q0,${h} 0,${h*0.5} Q0,0 ${w*0.5},0 Z`;
  return `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
};

const salonShapePointInside = (shape, x, y, W, H, cfg={}) => {
  const C = normalizeSalonShapeConfig(shape, cfg);
  if(x < 0 || y < 0 || x > W || y > H) return false;
  if(shape === "L"){
    const c=C.L, cutW=W*c.cutW, cutH=H*c.cutH;
    if(c.orientation === "cutTopRight") return !(x > W-cutW && y < cutH);
    if(c.orientation === "cutTopLeft") return !(x < cutW && y < cutH);
    if(c.orientation === "cutBottomRight") return !(x > W-cutW && y > H-cutH);
    if(c.orientation === "cutBottomLeft") return !(x < cutW && y > H-cutH);
  }
  if(shape === "U"){
    const c=C.U;
    const gapW=W*c.gapW, gapD=H*c.gapD, x1=(W-gapW)/2, x2=(W+gapW)/2;
    const gapH=H*c.gapW, y1=(H-gapH)/2, y2=(H+gapH)/2, gapL=W*c.gapD;
    if(c.orientation === "openTop") return !(x > x1 && x < x2 && y < gapD);
    if(c.orientation === "openBottom") return !(x > x1 && x < x2 && y > H-gapD);
    if(c.orientation === "openLeft") return !(x < gapL && y > y1 && y < y2);
    if(c.orientation === "openRight") return !(x > W-gapL && y > y1 && y < y2);
  }
  if(shape === "oval"){
    const cx=W/2, cy=H/2, rx=W/2, ry=H/2;
    return (((x-cx)*(x-cx))/(rx*rx)+((y-cy)*(y-cy))/(ry*ry)) <= .94;
  }
  return true;
};

const salonShapeRects = (shape, W, H, cfg={}) => {
  const C=normalizeSalonShapeConfig(shape,cfg);
  const clean = (r) => ({...r, area: Math.max(0,r.w)*Math.max(0,r.h)});
  if(shape === "L"){
    const c=C.L, cutW=W*c.cutW, cutH=H*c.cutH;
    if(c.orientation === "cutTopRight") return [clean({id:"vertical",x:0,y:0,w:W-cutW,h:H}), clean({id:"horizontal",x:W-cutW,y:cutH,w:cutW,h:H-cutH})];
    if(c.orientation === "cutTopLeft") return [clean({id:"vertical",x:cutW,y:0,w:W-cutW,h:H}), clean({id:"horizontal",x:0,y:cutH,w:cutW,h:H-cutH})];
    if(c.orientation === "cutBottomRight") return [clean({id:"vertical",x:0,y:0,w:W-cutW,h:H}), clean({id:"horizontal",x:W-cutW,y:0,w:cutW,h:H-cutH})];
    if(c.orientation === "cutBottomLeft") return [clean({id:"vertical",x:cutW,y:0,w:W-cutW,h:H}), clean({id:"horizontal",x:0,y:0,w:cutW,h:H-cutH})];
  }
  if(shape === "U"){
    const c=C.U;
    const gapW=W*c.gapW, gapD=H*c.gapD, side=(W-gapW)/2;
    const gapH=H*c.gapW, gapL=W*c.gapD, top=(H-gapH)/2;
    if(c.orientation === "openTop") return [clean({id:"leftArm",x:0,y:0,w:side,h:H}), clean({id:"rightArm",x:side+gapW,y:0,w:side,h:H}), clean({id:"base",x:0,y:gapD,w:W,h:H-gapD})];
    if(c.orientation === "openBottom") return [clean({id:"leftArm",x:0,y:0,w:side,h:H}), clean({id:"rightArm",x:side+gapW,y:0,w:side,h:H}), clean({id:"base",x:0,y:0,w:W,h:H-gapD})];
    if(c.orientation === "openLeft") return [clean({id:"topArm",x:0,y:0,w:W,h:top}), clean({id:"bottomArm",x:0,y:top+gapH,w:W,h:top}), clean({id:"base",x:gapL,y:0,w:W-gapL,h:H})];
    if(c.orientation === "openRight") return [clean({id:"topArm",x:0,y:0,w:W,h:top}), clean({id:"bottomArm",x:0,y:top+gapH,w:W,h:top}), clean({id:"base",x:0,y:0,w:W-gapL,h:H})];
  }
  return [clean({id:"main",x:0,y:0,w:W,h:H})];
};

const ELEMENTOS_FIJOS = [
  // Principales
  {id:"novios",       label:"Mesa novios",       emoji:"💍", color:"#4A5E3A", w:3.4, h:0.9},
  {id:"presidencial", label:"Presidencial",       emoji:"👑", color:"#4A5E3A", w:5.2, h:1.0},
  {id:"pista",        label:"Pista baile",        emoji:"💃", color:"#C9A96E", w:8,   h:6},
  {id:"escenario",    label:"DJ/Escenario",      emoji:"🎧", color:"#7B5E3A", w:5,   h:2.5},
  {id:"entrada",      label:"Entrada",           emoji:"🚪", color:"#8C7A5E", w:3,   h:0.8},

  // Comida y bebida
  {id:"torta",        label:"Mesa de torta",      emoji:"🎂", color:"#B9905A", w:2.6, h:1.5},
  {id:"postres",      label:"Mesa dulce",         emoji:"🧁", color:"#C59A6A", w:3.6, h:1.4},
  {id:"bar",          label:"Barra",              emoji:"🍹", color:"#5E7A8C", w:4,   h:2},
  {id:"cafeteria",    label:"Cafetería",          emoji:"☕", color:"#8C6B50", w:3,   h:1.5},
  {id:"buffet",       label:"Buffet",             emoji:"🍽️", color:"#7A6E5E", w:4.6, h:1.4},
  {id:"bebidas",      label:"Bebidas",            emoji:"🥂", color:"#6B8494", w:3.2, h:1.3},
  {id:"catering",     label:"Catering",           emoji:"👨‍🍳", color:"#7A6E5E", w:3.8, h:2},

  // Decoración y experiencia
  {id:"bienvenida",   label:"Bienvenida",         emoji:"🪧", color:"#8C7A5E", w:2.8, h:1.1},
  {id:"regalos",      label:"Mesa regalos",       emoji:"🎁", color:"#8B6F93", w:2.6, h:1.4},
  {id:"photobooth",   label:"Photobooth",         emoji:"📸", color:"#6E6A8C", w:3,   h:2},
  {id:"cabina360",    label:"Cabina 360",         emoji:"🎥", color:"#6E6A8C", w:2.6, h:2.6},
  {id:"activacion",    label:"Activación",         emoji:"✨", color:"#9A7B45", w:4.0, h:2.5},
  {id:"arco",         label:"Arco floral",        emoji:"🌸", color:"#8C5E7A", w:3.6, h:0.7},
  {id:"flores",       label:"Flores",             emoji:"💐", color:"#8C5E7A", w:1.3, h:1.3},
  {id:"centro_floral",label:"Centro floral",      emoji:"🌷", color:"#9A765E", w:1.6, h:1.6},
  {id:"backing",      label:"Backing fotos",      emoji:"✨", color:"#9A7B45", w:4.2, h:0.8},
  {id:"alfombra",     label:"Camino/alfombra",    emoji:"🟫", color:"#9B6D4D", w:1.2, h:7},
  {id:"living",       label:"Living lounge",      emoji:"🛋️", color:"#6E8C7A", w:3.8, h:2.2},
  {id:"sofa_2",       label:"Sofá 2 cuerpos",     emoji:"🛋️", color:"#8A7868", w:2.2, h:0.9},
  {id:"sofa_3",       label:"Sofá 3 cuerpos",     emoji:"🛋️", color:"#8A7868", w:3.2, h:1.0},
  {id:"mesita",       label:"Mesita lounge",      emoji:"◯",  color:"#B9905A", w:1.0, h:1.0},
  {id:"piano",        label:"Piano",              emoji:"🎹", color:"#2F2D2B", w:2.3, h:1.4},
  {id:"cello",        label:"Cello",              emoji:"🎻", color:"#7B4E2F", w:0.8, h:1.4},
  {id:"luces",        label:"Luces",              emoji:"💡", color:"#B9905A", w:4.0, h:0.6},
  {id:"columnas",     label:"Columnas",           emoji:"🏺", color:"#8C7A5E", w:1.2, h:1.2},

  // Servicios
  {id:"banios",       label:"Baños",              emoji:"🚻", color:"#6E8C7A", w:3,   h:2.5},
  {id:"cocina",       label:"Cocina",             emoji:"🍽️", color:"#7A6E5E", w:4,   h:3},
  {id:"guardarropa",  label:"Guardarropa",        emoji:"🧥", color:"#60707A", w:3,   h:1.6},
  {id:"proveedores",  label:"Proveedores",        emoji:"📦", color:"#7A6E5E", w:3.2, h:1.6},
  {id:"mozos",        label:"Mozos",              emoji:"🤵", color:"#60705D", w:2.8, h:1.4},
  {id:"salida",       label:"Salida",             emoji:"🚪", color:"#8C7A5E", w:3,   h:0.8},
  {id:"emergencia",   label:"Emergencia",         emoji:"🧯", color:"#A35A4A", w:2.6, h:1.0},

  // Ceremonia y zonas especiales
  {id:"altar",        label:"Altar",              emoji:"🌸", color:"#8C5E7A", w:5,   h:3.5},
  {id:"sillas_cer",   label:"Sillas ceremonia",   emoji:"🪑", color:"#8C7A5E", w:8,   h:4},
  {id:"camino",       label:"Camino central",     emoji:"🤍", color:"#B9905A", w:1.2, h:7},
  {id:"musicos",      label:"Músicos ceremonia",  emoji:"🎻", color:"#7B5E3A", w:3,   h:1.4},
  {id:"ninos",        label:"Sector niños",       emoji:"🧸", color:"#8C8A5E", w:3.5, h:2.2},
  {id:"fumadores",    label:"Área fumadores",     emoji:"🌿", color:"#5E8C66", w:3,   h:2},
  {id:"exterior",     label:"Zona exterior",      emoji:"🌳", color:"#5E8C66", w:5,   h:3},
];

const ELEMENTO_CATEGORIAS = [
  {label:"Principales", items:["novios","presidencial","pista","escenario","entrada"]},
  {label:"Comida y bebida", items:["torta","postres","bar","cafeteria","buffet","bebidas","catering"]},
  {label:"Decoración", items:["bienvenida","regalos","photobooth","cabina360","arco","flores","centro_floral","backing","alfombra","living","luces","columnas"]},
  {label:"Lounge y música", items:["sofa_2","sofa_3","mesita","piano","cello"]},
  {label:"Servicios", items:["banios","cocina","guardarropa","proveedores","mozos","salida","emergencia"]},
  {label:"Ceremonia / zonas", items:["altar","sillas_cer","camino","musicos","ninos","fumadores","exterior"]},
];

const DECOR_STYLES = [
  {id:"romantico_floral", label:"Romántico floral", desc:"Flores, torta y mesa dulce protagonistas"},
  {id:"elegante_clasico", label:"Elegante clásico", desc:"Distribución equilibrada y sobria"},
  {id:"boho_chic", label:"Boho chic", desc:"Alfombras, living y flores orgánicas"},
  {id:"minimalista", label:"Minimalista moderno", desc:"Pocos elementos y circulación clara"},
  {id:"rustico", label:"Rústico", desc:"Barra, buffet, madera y zona exterior"},
  {id:"glam_dorado", label:"Glam dorado", desc:"Backing, photobooth y pista protagonista"},
  {id:"jardin", label:"Jardín natural", desc:"Arcos, luces y zonas al aire libre"},
  {id:"fiesta_nocturna", label:"Fiesta nocturna", desc:"Barra, DJ y cabina 360 cerca de pista"},
];

// Tipos de mesa según bodas.net (redonda 8-12, cuadrada íntima, rectangular, imperial larga)
// Medidas coherentes con la capacidad: ~0.6 m de borde por cubierto.
// Cuadrada de 12 → 3 por lado → 2.0 m de lado. La capacidad se puede
// ajustar por mesa y las medidas se recalculan solas.
const MESA_TIPOS = [
  {v:"round",   l:"⭕", desc:"Redonda",  ew:undefined, eh:undefined, cap:8},
  {v:"square",  l:"◻",  desc:"Cuadrada", ew:2.0, eh:2.0, cap:10},
  {v:"rect_h",  l:"▬",  desc:"Rect. H",  ew:5.4, eh:0.9, cap:20},
  {v:"rect_v",  l:"▮",  desc:"Rect. V",  ew:0.9, eh:5.4, cap:20},
  {v:"imperial",l:"═",  desc:"Imperial", ew:8.4, eh:1.1, cap:30},
];

// Capacidades seleccionables por tipo de mesa
const CAP_OPCIONES = {
  round:    [8,10,12],
  square:   [8,10,12],
  rect_h:   [16,20,24,30],
  rect_v:   [16,20,24,30],
  imperial: [24,30,40],
};

const ESTILOS_DISTRIB = [
  // Estas opciones complementan a las Plantillas: solo reordenan MESAS.
  // La decoración, barra, DJ, torta, pista, entrada y servicios se conservan.
  {id:"banquet",      label:"Redondas clásicas",      desc:"Mesas redondas equilibradas para cena tradicional"},
  {id:"pista_centro", label:"Pista protagonista",     desc:"Mesas alrededor de una pista despejada"},
  {id:"cantine",      label:"Imperial elegante",     desc:"Mesas largas/imperiales para estética moderna"},
  {id:"cabaret",      label:"Cena show / escenario", desc:"Mesas orientadas hacia DJ, banda o escenario"},
];

// Compatibilidad con versiones anteriores: si algún salón quedó guardado con
// formatos más corporativos, lo llevamos a una opción útil para bodas.
const NORMALIZE_DISTRIB = (v) => ["u_shape","chevrons"].includes(v) ? "banquet" : (v || "banquet");

// ── Persistencia del layout del salón (localStorage) ────────────────────────
const SALON_LS_KEY = "ceci_salon_layout_v2_fiesta_latina";
const cargarSalon = () => {
  try { const s = localStorage.getItem(SALON_LS_KEY); return s ? JSON.parse(s) : null; }
  catch(err){ return null; }
};


// Reparación controlada de escala y proporción del canvas.
// La versión anterior trataba presets normalizados 100×100 como si fueran metros reales.
// Desde acá, el salón vuelve a trabajar en metros reales y el render usa una sola escala: metros → px.
const ROOM_SIZE_BY_GUESTS = [
  {max:100, w:18, h:14, danceW:5, danceH:4},
  {max:150, w:22, h:16, danceW:6, danceH:5},
  {max:200, w:24, h:18, danceW:7, danceH:6},
  {max:250, w:28, h:20, danceW:8, danceH:7},
  {max:300, w:30, h:20, danceW:9, danceH:8},
];
const getRoomSizeForGuests = (total=150) => {
  const n = Number(total)||150;
  return ROOM_SIZE_BY_GUESTS.find(r=>n<=r.max) || ROOM_SIZE_BY_GUESTS[ROOM_SIZE_BY_GUESTS.length-1];
};
const normToMetersX = (x, roomW) => +((Number(x)||0) * roomW / 100).toFixed(2);
const normToMetersY = (y, roomH) => +((Number(y)||0) * roomH / 100).toFixed(2);
const tableDiameterForGuests = (tableSize=8) => (Number(tableSize)||8) <= 8 ? 1.50 : 1.80;
const isNormalizedSalonLayout = (L) => !!L && ((Number(L.salonW)||0) >= 80 || (Number(L.salonH)||0) >= 80);
const convertNormalizedLayoutToMeters = (L, totalPeople=150, tableSize=8) => {
  if(!isNormalizedSalonLayout(L)) return L;
  const room = getRoomSizeForGuests(totalPeople);
  const W = room.w, H = room.h;
  const convertElem = (el={}) => {
    const tipo = el.tipo || el.key || "";
    const isPista = tipo === "pista" || tipo === "pista_baile" || el.presetKey === "pista_baile";
    const ew = isPista ? room.danceW : normToMetersX(el.ew ?? el.w ?? 3, W);
    const eh = isPista ? room.danceH : normToMetersY(el.eh ?? el.h ?? 2, H);
    const mx = normToMetersX(el.mx ?? el.x ?? 0, W);
    const my = normToMetersY(el.my ?? el.y ?? 0, H);
    return {...el, mx:+Math.max(0, Math.min(W-ew, mx)).toFixed(2), my:+Math.max(0, Math.min(H-eh, my)).toFixed(2), ew, eh};
  };
  const convertMesa = (m={}) => {
    const tipo = m.tipo || m.type || "round";
    const isRound = tipo === "round";
    const ew = isRound ? tableDiameterForGuests(tableSize) : normToMetersX(m.ew ?? m.w ?? 16, W);
    const eh = isRound ? ew : normToMetersY(m.eh ?? m.h ?? 6, H);
    return {...m, mx:normToMetersX(m.mx ?? m.x ?? 0, W), my:normToMetersY(m.my ?? m.y ?? 0, H), ew, eh};
  };
  return {
    ...L,
    salonW: W,
    salonH: H,
    salonShape: "rectangulo",
    mesas: Array.isArray(L.mesas) ? L.mesas.map(convertMesa) : [],
    elementos: Array.isArray(L.elementos) ? L.elementos.map(convertElem) : [],
  };
};

// Helpers para crear presets del salón. Cada preset devuelve un layout completo
// pero editable: mesas, pista, decoración, servicios y zonas del evento.
const elem = (id,tipo,mx,my,ew,eh,extra={}) => ({id,tipo,mx,my,ew,eh,...extra});
const mesa = (id,mx,my,tipo="round",extra={}) => ({id,mx,my,tipo,cap:extra.cap||10,etiqueta:extra.etiqueta||"",...extra});

const decorPack = (style, W, H) => {
  // Regla de layout: la decoración nunca debe caer sobre la pista de baile.
  // Los acentos decorativos se ubican en perímetro, entrada, mesa de novios,
  // mesa de torta/postres o zonas fotográficas para mantener circulación limpia.
  const packs = {
    romantico_floral: [
      elem("arco-1","arco",W/2-2.0,0.35,4.0,0.7),
      elem("flores-novios-izq","flores",W/2-5.4,1.05,1.3,1.3),
      elem("flores-novios-der","flores",W/2+4.1,1.05,1.3,1.3),
      elem("flores-entrada-izq","flores",W/2-4.2,H-2.0,1.2,1.2),
      elem("flores-entrada-der","flores",W/2+3.0,H-2.0,1.2,1.2),
    ],
    elegante_clasico: [
      elem("columnas-entrada-izq","columnas",W/2-4.6,H-2.0,1.2,1.2),
      elem("columnas-entrada-der","columnas",W/2+3.4,H-2.0,1.2,1.2),
      elem("backing-1","backing",W/2-2.1,0.55,4.2,0.8),
    ],
    boho_chic: [
      elem("alfombra-entrada","alfombra",W/2-0.6,H-8.3,1.2,6.6),
      elem("living-boho","living",W-5.2,H-4.0,3.8,2.2),
      elem("luces-perimetro","luces",W/2-4,H-1.15,8,0.6),
      elem("flores-lounge","flores",W-6.2,H-4.8,1.3,1.3),
    ],
    minimalista: [
      elem("backing-1","backing",W/2-2.1,0.55,4.2,0.8),
      elem("flores-minimal","flores",W-3.0,H-3.0,1.1,1.1),
    ],
    rustico: [
      elem("exterior-rustico","exterior",W-6,H-4.2,5,3),
      elem("luces-rusticas","luces",W/2-4,0.55,8,0.6),
      elem("living-rustico","living",1.2,H-4.0,3.8,2.2),
      elem("flores-living-rustico","flores",4.6,H-4.4,1.2,1.2),
    ],
    glam_dorado: [
      elem("backing-glam","backing",W/2-2.4,0.5,4.8,0.8),
      elem("luces-glam","luces",W/2-4,H-1.1,8,0.6),
      elem("columnas-glam-izq","columnas",W/2-4.0,1.55,1.2,1.2),
      elem("columnas-glam-der","columnas",W/2+2.8,1.55,1.2,1.2),
    ],
    jardin: [
      elem("arco-jardin","arco",W/2-2.0,0.35,4.0,0.7),
      elem("exterior-jardin","exterior",W-6.0,H-4.0,5,3),
      elem("luces-jardin","luces",W/2-5.0,H-1.15,10,0.6),
      elem("flores-jardin-izq","flores",1.4,2.0,1.3,1.3),
      elem("flores-jardin-der","flores",W-2.7,2.0,1.3,1.3),
    ],
    fiesta_nocturna: [
      elem("luces-fiesta","luces",W/2-5.0,H-1.15,10,0.6),
      elem("backing-fiesta","backing",W/2-2.4,0.55,4.8,0.8),
    ],
  };
  return packs[style] || packs.romantico_floral;
};

// Decoración segura para formas irregulares. A diferencia de decorPack(),
// esto no "recorta" un diseño rectangular: coloca los acentos en zonas reales
// del contorno elegido para que no queden fuera del salón ni sobre la pista.
const decorPackShape = (style, W, H, shape="rectangulo") => {
  if(shape==="L"){
    const topY=0.55, midY=H*0.50, leftX=W*0.23;
    const packs={
      romantico_floral:[
        elem("arco-l","arco",W*0.50-2,topY,4,0.7),
        elem("flores-l-novios-izq","flores",W*0.33,H*0.44,1.2,1.2),
        elem("flores-l-novios-der","flores",W*0.63,H*0.44,1.2,1.2),
        elem("flores-l-entrada","flores",leftX,H-2.0,1.2,1.2),
      ],
      elegante_clasico:[
        elem("backing-l","backing",W*0.50-2.1,topY,4.2,0.8),
        elem("columnas-l-1","columnas",W*0.13,H-2.1,1.1,1.1),
        elem("columnas-l-2","columnas",W*0.37,H-2.1,1.1,1.1),
      ],
      boho_chic:[
        elem("alfombra-l","alfombra",leftX-0.6,H-8.0,1.2,6.2),
        elem("living-l","living",W*0.04,H*0.55,3.8,2.2),
        elem("luces-l","luces",W*0.18,topY,8,0.6),
        elem("flores-l-lounge","flores",W*0.04,H*0.52,1.2,1.2),
      ],
      minimalista:[
        elem("backing-l-min","backing",W*0.50-2.1,topY,4.2,0.8),
      ],
      rustico:[
        elem("living-l-rustico","living",W*0.04,H*0.55,3.8,2.2),
        elem("luces-l-rusticas","luces",W*0.18,topY,8,0.6),
        elem("exterior-l-rustico","exterior",W*0.28,H*0.58,5,3),
      ],
      glam_dorado:[
        elem("backing-l-glam","backing",W*0.50-2.4,topY,4.8,0.8),
        elem("luces-l-glam","luces",W*0.48,H*0.49,8,0.6),
        elem("columnas-l-glam-1","columnas",W*0.34,H*0.44,1.1,1.1),
        elem("columnas-l-glam-2","columnas",W*0.64,H*0.44,1.1,1.1),
      ],
      jardin:[
        elem("arco-l-jardin","arco",W*0.50-2,topY,4,0.7),
        elem("exterior-l-jardin","exterior",W*0.02,H*0.56,5,3),
        elem("flores-l-jardin-1","flores",W*0.05,H*0.12,1.3,1.3),
        elem("flores-l-jardin-2","flores",W*0.88,H*0.12,1.3,1.3),
      ],
      fiesta_nocturna:[
        elem("luces-l-fiesta","luces",W*0.45,H*0.49,10,0.6),
        elem("backing-l-fiesta","backing",W*0.50-2.4,topY,4.8,0.8),
      ],
    };
    return packs[style]||packs.romantico_floral;
  }
  if(shape==="U"){
    const packs={
      romantico_floral:[elem("arco-u","arco",W/2-2,H*0.62,4,0.7),elem("flores-u-1","flores",W*0.12,H*0.22,1.2,1.2),elem("flores-u-2","flores",W*0.84,H*0.22,1.2,1.2)],
      elegante_clasico:[elem("backing-u","backing",W/2-2.1,H*0.62,4.2,0.8),elem("columnas-u-1","columnas",W*0.12,H-2,1.1,1.1),elem("columnas-u-2","columnas",W*0.84,H-2,1.1,1.1)],
      boho_chic:[elem("living-u","living",W*0.05,H*0.18,3.8,2.2),elem("alfombra-u","alfombra",W/2-0.6,H*0.66,1.2,5.5),elem("luces-u","luces",W/2-5,H-1.2,10,0.6)],
      minimalista:[elem("backing-u-min","backing",W/2-2.1,H*0.62,4.2,0.8)],
      rustico:[elem("living-u-rustico","living",W*0.05,H*0.18,3.8,2.2),elem("exterior-u-rustico","exterior",W*0.78,H*0.16,5,3),elem("luces-u-rusticas","luces",W/2-5,H-1.2,10,0.6)],
      glam_dorado:[elem("backing-u-glam","backing",W/2-2.4,H*0.62,4.8,0.8),elem("luces-u-glam","luces",W/2-5,H-1.2,10,0.6)],
      jardin:[elem("arco-u-jardin","arco",W/2-2,H*0.62,4,0.7),elem("flores-u-jardin-1","flores",W*0.1,H*0.12,1.2,1.2),elem("flores-u-jardin-2","flores",W*0.86,H*0.12,1.2,1.2)],
      fiesta_nocturna:[elem("luces-u-fiesta","luces",W/2-5,H-1.2,10,0.6),elem("backing-u-fiesta","backing",W/2-2.4,H*0.62,4.8,0.8)],
    };
    return packs[style]||packs.romantico_floral;
  }
  if(shape==="oval"){
    return decorPack(style,W,H).map(el=>{
      const cx=W/2, cy=H/2;
      let ex=(el.mx||0)+(el.ew||1)/2, ey=(el.my||0)+(el.eh||1)/2;
      const dx=ex-cx, dy=ey-cy;
      const norm=Math.sqrt((dx*dx)/(W*W*0.18)+(dy*dy)/(H*H*0.18)) || 1;
      if(norm>1){ ex=cx+dx/norm; ey=cy+dy/norm; }
      return {...el,mx:+Math.max(0.8,Math.min(W-(el.ew||1)-0.8,ex-(el.ew||1)/2)).toFixed(2),my:+Math.max(0.8,Math.min(H-(el.eh||1)-0.8,ey-(el.eh||1)/2)).toFixed(2)};
    });
  }
  return decorPack(style,W,H);
};

const mesasRedondas = (coords, offset=1) => coords.map(([mx,my],i)=>mesa(i+offset,mx,my,"round",{cap:8}));


// ── Presets reales de boda (canvas normalizado 100 x 100) ────────────────
// Regla de producto: los elementos fijos NO se recalculan ni se negocian.
// Entrada, baños, pista, DJ, mesa de novios, barras y buffet quedan exactamente
// en las coordenadas del preset. Lo único adaptable es cuántas mesas de invitados
// se muestran, según cantidad de personas y capacidad disponible del patrón.
const REFERENCE_WEDDING_PRESETS = [
  {
    "id": "jardin_romantico_central",
    "title": "Jardín Romántico Central",
    "rawTitle": "JARDÍN ROMÁNTICO CENTRAL",
    "types": [
      "rectangular",
      "jardín techado",
      "carpa blanca",
      "salón claro"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 10.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 5.0,
        "w": 28.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 23.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 28.0,
        "h": 22.0
      },
      {
        "key": "mesa_torta",
        "x": 75.0,
        "y": 15.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 20.0,
        "y": 22.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "barra_1",
        "x": 15.0,
        "y": 50.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 85.0,
        "y": 33.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 18.0,
        "y": 78.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 30.0,
        "y": 36.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2",
        "x": 42.0,
        "y": 32.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3",
        "x": 58.0,
        "y": 32.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4",
        "x": 70.0,
        "y": 36.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5",
        "x": 28.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6",
        "x": 42.0,
        "y": 68.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7",
        "x": 58.0,
        "y": 68.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8",
        "x": 72.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9",
        "x": 28.0,
        "y": 78.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10",
        "x": 42.0,
        "y": 82.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T11",
        "x": 58.0,
        "y": 82.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T12",
        "x": 72.0,
        "y": 78.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "luxury_ballroom_simetrico",
    "title": "Luxury Ballroom Simétrico",
    "rawTitle": "LUXURY BALLROOM SIMÉTRICO",
    "types": [
      "ballroom",
      "hotel",
      "salón premium rectangular"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 28.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 9.0,
        "w": 26.0,
        "h": 7.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 4.0,
        "w": 34.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 22.0,
        "w": 22.0,
        "h": 7.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 32.0,
        "h": 24.0
      },
      {
        "key": "mesa_torta",
        "x": 78.0,
        "y": 17.0,
        "w": 12.0,
        "h": 6.0
      },
      {
        "key": "barra_1",
        "x": 13.0,
        "y": 42.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 87.0,
        "y": 42.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 50.0,
        "y": 82.0,
        "w": 24.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 15.0,
        "y": 80.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "lounge",
        "x": 85.0,
        "y": 72.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 25.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2",
        "x": 38.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3",
        "x": 62.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4",
        "x": 75.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5",
        "x": 22.0,
        "y": 50.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6",
        "x": 78.0,
        "y": 50.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7",
        "x": 25.0,
        "y": 70.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8",
        "x": 38.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9",
        "x": 62.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10",
        "x": 75.0,
        "y": 70.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T11",
        "x": 15.0,
        "y": 60.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T12",
        "x": 85.0,
        "y": 60.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T13",
        "x": 15.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T14",
        "x": 85.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "boho_garden_asimetrico",
    "title": "Boho Garden Asimétrico",
    "rawTitle": "BOHO GARDEN ASIMÉTRICO",
    "types": [
      "jardín",
      "quinta",
      "exterior",
      "carpa relajada"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 35.0,
        "y": 13.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 35.0,
        "y": 7.0,
        "w": 26.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 68.0,
        "y": 20.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 58.0,
        "y": 52.0,
        "w": 28.0,
        "h": 22.0
      },
      {
        "key": "lounge",
        "x": 20.0,
        "y": 42.0,
        "w": 24.0,
        "h": 16.0
      },
      {
        "key": "barra_1",
        "x": 18.0,
        "y": 78.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 84.0,
        "y": 38.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 24.0,
        "y": 62.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 48.0,
        "y": 22.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1 redonda",
        "x": 42.0,
        "y": 36.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2 redonda",
        "x": 76.0,
        "y": 42.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3 redonda",
        "x": 78.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4 redonda",
        "x": 44.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5 rectangular",
        "x": 32.0,
        "y": 28.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T6 rectangular",
        "x": 72.0,
        "y": 75.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T7 rectangular",
        "x": 42.0,
        "y": 84.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T8 redonda",
        "x": 28.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9 redonda",
        "x": 84.0,
        "y": 25.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10 rectangular",
        "x": 55.0,
        "y": 32.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      }
    ]
  },
  {
    "id": "minimal_chic_blanco",
    "title": "Minimal Chic Blanco",
    "rawTitle": "MINIMAL CHIC BLANCO",
    "types": [
      "salón moderno",
      "loft blanco",
      "galería contemporánea"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 11.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 6.0,
        "w": 24.0,
        "h": 4.0
      },
      {
        "key": "dj_escenario",
        "x": 82.0,
        "y": 45.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 30.0,
        "h": 22.0
      },
      {
        "key": "barra_1",
        "x": 18.0,
        "y": 78.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 82.0,
        "y": 25.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "mesa_torta",
        "x": 68.0,
        "y": 16.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 28.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "photobooth",
        "x": 82.0,
        "y": 76.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 30.0,
        "y": 32.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T2",
        "x": 50.0,
        "y": 32.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T3",
        "x": 70.0,
        "y": 32.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T4",
        "x": 30.0,
        "y": 70.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T5",
        "x": 50.0,
        "y": 70.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T6",
        "x": 70.0,
        "y": 70.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T7",
        "x": 25.0,
        "y": 50.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T8",
        "x": 75.0,
        "y": 60.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      }
    ]
  },
  {
    "id": "mediterraneo_familiar",
    "title": "Mediterráneo Familiar",
    "rawTitle": "MEDITERRÁNEO FAMILIAR",
    "types": [
      "terraza",
      "patio",
      "jardín",
      "salón abierto"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios_imperial",
        "x": 50.0,
        "y": 14.0,
        "w": 26.0,
        "h": 7.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 8.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 78.0,
        "y": 48.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 68.0,
        "y": 58.0,
        "w": 26.0,
        "h": 22.0
      },
      {
        "key": "barra_1",
        "x": 16.0,
        "y": 62.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 84.0,
        "y": 25.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "mesa_torta",
        "x": 72.0,
        "y": 18.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 28.0,
        "w": 20.0,
        "h": 12.0
      },
      {
        "key": "photobooth",
        "x": 20.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 30.0,
        "y": 34.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T2",
        "x": 30.0,
        "y": 46.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T3",
        "x": 30.0,
        "y": 58.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T4",
        "x": 30.0,
        "y": 70.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T5",
        "x": 52.0,
        "y": 34.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T6",
        "x": 52.0,
        "y": 46.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T7",
        "x": 52.0,
        "y": 76.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T8",
        "x": 70.0,
        "y": 82.0,
        "w": 22.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      }
    ]
  },
  {
    "id": "glam_black_gold",
    "title": "Glam Black & Gold",
    "rawTitle": "GLAM BLACK & GOLD",
    "types": [
      "salón nocturno",
      "ballroom oscuro",
      "rooftop premium"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 9.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 4.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 22.0,
        "w": 22.0,
        "h": 8.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 52.0,
        "w": 34.0,
        "h": 26.0
      },
      {
        "key": "barra_1",
        "x": 12.0,
        "y": 48.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 88.0,
        "y": 48.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 20.0,
        "y": 78.0,
        "w": 22.0,
        "h": 14.0
      },
      {
        "key": "photobooth",
        "x": 76.0,
        "y": 76.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 75.0,
        "y": 16.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 84.0,
        "y": 30.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 25.0,
        "y": 32.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2",
        "x": 38.0,
        "y": 34.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3",
        "x": 62.0,
        "y": 34.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4",
        "x": 75.0,
        "y": 32.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5",
        "x": 22.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6",
        "x": 78.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7",
        "x": 35.0,
        "y": 78.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8",
        "x": 50.0,
        "y": 82.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9",
        "x": 65.0,
        "y": 78.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10",
        "x": 16.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T11",
        "x": 84.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "rustic_elegance",
    "title": "Rustic Elegance",
    "rawTitle": "RUSTIC ELEGANCE",
    "types": [
      "estancia",
      "quincho elegante",
      "granero chic",
      "salón de madera"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 12.0,
        "w": 22.0,
        "h": 7.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 6.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 82.0,
        "y": 50.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 52.0,
        "y": 56.0,
        "w": 28.0,
        "h": 22.0
      },
      {
        "key": "barra_1",
        "x": 16.0,
        "y": 50.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 82.0,
        "y": 25.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 20.0,
        "y": 78.0,
        "w": 20.0,
        "h": 12.0
      },
      {
        "key": "mesa_torta",
        "x": 68.0,
        "y": 18.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 78.0,
        "y": 78.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1 rectangular",
        "x": 30.0,
        "y": 34.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T2 rectangular",
        "x": 52.0,
        "y": 34.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T3 rectangular",
        "x": 30.0,
        "y": 72.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T4 rectangular",
        "x": 52.0,
        "y": 78.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T5 redonda",
        "x": 72.0,
        "y": 36.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6 redonda",
        "x": 26.0,
        "y": 60.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7 redonda",
        "x": 74.0,
        "y": 64.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8 redonda",
        "x": 40.0,
        "y": 86.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "cabaret_wedding",
    "title": "Cabaret Wedding",
    "rawTitle": "CABARET WEDDING",
    "types": [
      "salón íntimo",
      "teatro pequeño",
      "espacio cerrado con escenario"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 22.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 10.0,
        "w": 30.0,
        "h": 9.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 30.0,
        "w": 30.0,
        "h": 18.0
      },
      {
        "key": "mesa_novios",
        "x": 22.0,
        "y": 18.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 22.0,
        "y": 12.0,
        "w": 20.0,
        "h": 5.0
      },
      {
        "key": "barra_1",
        "x": 14.0,
        "y": 50.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 86.0,
        "y": 50.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 75.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "photobooth",
        "x": 38.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 78.0,
        "y": 20.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 82.0,
        "y": 72.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 28.0,
        "y": 42.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T2",
        "x": 42.0,
        "y": 48.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T3",
        "x": 58.0,
        "y": 48.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T4",
        "x": 72.0,
        "y": 42.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T5",
        "x": 28.0,
        "y": 62.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T6",
        "x": 42.0,
        "y": 68.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T7",
        "x": 58.0,
        "y": 68.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      },
      {
        "label": "T8",
        "x": 72.0,
        "y": 62.0,
        "w": 7.0,
        "h": 7.0,
        "type": "round",
        "cap": 8
      }
    ]
  },
  {
    "id": "cocktail_lounge_wedding",
    "title": "Cocktail Lounge Wedding",
    "rawTitle": "COCKTAIL LOUNGE WEDDING",
    "types": [
      "rooftop",
      "terraza",
      "salón moderno",
      "jardín urbano"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 18.0,
        "w": 20.0,
        "h": 7.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 48.0,
        "w": 32.0,
        "h": 24.0
      },
      {
        "key": "mesa_novios",
        "x": 22.0,
        "y": 18.0,
        "w": 14.0,
        "h": 6.0
      },
      {
        "key": "lounge_1",
        "x": 18.0,
        "y": 40.0,
        "w": 22.0,
        "h": 14.0
      },
      {
        "key": "lounge_2",
        "x": 78.0,
        "y": 72.0,
        "w": 22.0,
        "h": 14.0
      },
      {
        "key": "barra_1",
        "x": 20.0,
        "y": 82.0,
        "w": 22.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 84.0,
        "y": 42.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 78.0,
        "y": 22.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 42.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 66.0,
        "y": 18.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "H1",
        "x": 32.0,
        "y": 32.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      },
      {
        "label": "H2",
        "x": 68.0,
        "y": 34.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      },
      {
        "label": "H3",
        "x": 28.0,
        "y": 62.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      },
      {
        "label": "H4",
        "x": 72.0,
        "y": 58.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      },
      {
        "label": "H5",
        "x": 42.0,
        "y": 76.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      },
      {
        "label": "H6",
        "x": 58.0,
        "y": 76.0,
        "w": 6.0,
        "h": 6.0,
        "type": "square",
        "cap": 4
      }
    ]
  },
  {
    "id": "classic_family_reception",
    "title": "Classic Family Reception",
    "rawTitle": "CLASSIC FAMILY RECEPTION",
    "types": [
      "salón tradicional",
      "club",
      "hotel",
      "centro de eventos"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 10.0,
        "w": 22.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 5.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 78.0,
        "y": 23.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 28.0,
        "h": 22.0
      },
      {
        "key": "barra_1",
        "x": 16.0,
        "y": 58.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 84.0,
        "y": 58.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "mesa_torta",
        "x": 72.0,
        "y": 15.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 26.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "photobooth",
        "x": 24.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "familia_cercana_1",
        "x": 34.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "familia_cercana_2",
        "x": 50.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "familia_cercana_3",
        "x": 66.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "adultos_mayores_1",
        "x": 28.0,
        "y": 70.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "adultos_mayores_2",
        "x": 42.0,
        "y": 76.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "amigos_1",
        "x": 72.0,
        "y": 42.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "amigos_2",
        "x": 72.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "amigos_3",
        "x": 60.0,
        "y": 76.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "ninos",
        "x": 28.0,
        "y": 42.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "invitados_generales_1",
        "x": 18.0,
        "y": 48.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "invitados_generales_2",
        "x": 82.0,
        "y": 74.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "festival_outdoor_wedding",
    "title": "Festival Outdoor Wedding",
    "rawTitle": "FESTIVAL OUTDOOR WEDDING",
    "types": [
      "campo",
      "jardín amplio",
      "quinta",
      "espacio abierto"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 28.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 50.0,
        "y": 12.0,
        "w": 28.0,
        "h": 9.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 36.0,
        "w": 34.0,
        "h": 24.0
      },
      {
        "key": "mesa_novios",
        "x": 22.0,
        "y": 18.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 22.0,
        "y": 12.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "barra_1",
        "x": 16.0,
        "y": 56.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 84.0,
        "y": 56.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet_1",
        "x": 18.0,
        "y": 78.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet_2",
        "x": 82.0,
        "y": 78.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "lounge_1",
        "x": 20.0,
        "y": 38.0,
        "w": 20.0,
        "h": 12.0
      },
      {
        "key": "lounge_2",
        "x": 80.0,
        "y": 38.0,
        "w": 20.0,
        "h": 12.0
      },
      {
        "key": "photobooth",
        "x": 50.0,
        "y": 78.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 75.0,
        "y": 20.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1 rectangular",
        "x": 30.0,
        "y": 65.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T2 rectangular",
        "x": 50.0,
        "y": 68.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T3 rectangular",
        "x": 70.0,
        "y": 65.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T4 redonda",
        "x": 30.0,
        "y": 84.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5 redonda",
        "x": 70.0,
        "y": 84.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6 redonda",
        "x": 38.0,
        "y": 52.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7 redonda",
        "x": 62.0,
        "y": 52.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "garden_tent_formal",
    "title": "Garden Tent Formal",
    "rawTitle": "GARDEN TENT FORMAL",
    "types": [
      "carpa blanca",
      "carpa transparente",
      "jardín formal"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 10.0,
        "w": 22.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 5.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 78.0,
        "y": 24.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 30.0,
        "h": 24.0
      },
      {
        "key": "decoracion_aerea_pista",
        "x": 50.0,
        "y": 50.0,
        "w": 34.0,
        "h": 28.0
      },
      {
        "key": "barra_1",
        "x": 15.0,
        "y": 52.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 85.0,
        "y": 52.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 24.0,
        "w": 20.0,
        "h": 12.0
      },
      {
        "key": "mesa_torta",
        "x": 70.0,
        "y": 16.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 22.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 30.0,
        "y": 32.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2",
        "x": 44.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3",
        "x": 62.0,
        "y": 30.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4",
        "x": 74.0,
        "y": 36.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5",
        "x": 28.0,
        "y": 64.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6",
        "x": 42.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7",
        "x": 58.0,
        "y": 72.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8",
        "x": 72.0,
        "y": 64.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9",
        "x": 36.0,
        "y": 84.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10",
        "x": 64.0,
        "y": 84.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "urban_industrial",
    "title": "Urban Industrial",
    "rawTitle": "URBAN INDUSTRIAL",
    "types": [
      "galpón",
      "loft",
      "warehouse",
      "espacio industrial"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 26.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 32.0,
        "y": 13.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 32.0,
        "y": 7.0,
        "w": 26.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 68.0,
        "y": 18.0,
        "w": 20.0,
        "h": 7.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 50.0,
        "w": 32.0,
        "h": 24.0
      },
      {
        "key": "barra_1",
        "x": 14.0,
        "y": 52.0,
        "w": 22.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 86.0,
        "y": 30.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 82.0,
        "y": 68.0,
        "w": 22.0,
        "h": 14.0
      },
      {
        "key": "photobooth",
        "x": 24.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 50.0,
        "y": 24.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 28.0,
        "y": 34.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T2",
        "x": 50.0,
        "y": 34.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T3",
        "x": 72.0,
        "y": 38.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T4",
        "x": 28.0,
        "y": 68.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T5",
        "x": 50.0,
        "y": 74.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T6",
        "x": 70.0,
        "y": 82.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T7",
        "x": 22.0,
        "y": 22.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T8",
        "x": 78.0,
        "y": 52.0,
        "w": 16.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      }
    ]
  },
  {
    "id": "romantic_circular_flow",
    "title": "Romantic Circular Flow",
    "rawTitle": "ROMANTIC CIRCULAR FLOW",
    "types": [
      "salón cuadrado",
      "salón amplio",
      "espacio con buena centralidad"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 24.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 50.0,
        "y": 10.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 50.0,
        "y": 5.0,
        "w": 28.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 78.0,
        "y": 24.0,
        "w": 16.0,
        "h": 6.0
      },
      {
        "key": "pista_baile",
        "x": 50.0,
        "y": 52.0,
        "w": 28.0,
        "h": 28.0
      },
      {
        "key": "barra_1",
        "x": 15.0,
        "y": 52.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 85.0,
        "y": 52.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "lounge",
        "x": 18.0,
        "y": 24.0,
        "w": 18.0,
        "h": 12.0
      },
      {
        "key": "mesa_torta",
        "x": 70.0,
        "y": 16.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "photobooth",
        "x": 20.0,
        "y": 82.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "banos",
        "x": 90.0,
        "y": 88.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1",
        "x": 50.0,
        "y": 28.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2",
        "x": 35.0,
        "y": 34.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3",
        "x": 65.0,
        "y": 34.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4",
        "x": 30.0,
        "y": 50.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5",
        "x": 70.0,
        "y": 50.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6",
        "x": 35.0,
        "y": 68.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T7",
        "x": 65.0,
        "y": 68.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T8",
        "x": 50.0,
        "y": 76.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T9",
        "x": 25.0,
        "y": 76.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10",
        "x": 75.0,
        "y": 76.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  },
  {
    "id": "premium_experience_wedding",
    "title": "Premium Experience Wedding",
    "rawTitle": "PREMIUM EXPERIENCE WEDDING",
    "types": [
      "salón grande",
      "venue premium",
      "complejo con varias zonas",
      "boda de alta producción"
    ],
    "elements": [
      {
        "key": "entrada",
        "x": 50.0,
        "y": 96.0,
        "w": 30.0,
        "h": 5.0
      },
      {
        "key": "mesa_novios",
        "x": 28.0,
        "y": 14.0,
        "w": 22.0,
        "h": 7.0
      },
      {
        "key": "decoracion_principal_back_novios",
        "x": 28.0,
        "y": 8.0,
        "w": 28.0,
        "h": 5.0
      },
      {
        "key": "dj_escenario",
        "x": 62.0,
        "y": 14.0,
        "w": 24.0,
        "h": 8.0
      },
      {
        "key": "pista_baile",
        "x": 58.0,
        "y": 38.0,
        "w": 34.0,
        "h": 26.0
      },
      {
        "key": "barra_1",
        "x": 15.0,
        "y": 48.0,
        "w": 22.0,
        "h": 6.0
      },
      {
        "key": "barra_2",
        "x": 88.0,
        "y": 48.0,
        "w": 18.0,
        "h": 6.0
      },
      {
        "key": "buffet",
        "x": 86.0,
        "y": 25.0,
        "w": 20.0,
        "h": 6.0
      },
      {
        "key": "lounge_after",
        "x": 50.0,
        "y": 78.0,
        "w": 30.0,
        "h": 16.0
      },
      {
        "key": "photobooth",
        "x": 18.0,
        "y": 80.0,
        "w": 12.0,
        "h": 8.0
      },
      {
        "key": "mesa_torta",
        "x": 82.0,
        "y": 15.0,
        "w": 10.0,
        "h": 6.0
      },
      {
        "key": "activacion_experiencia",
        "x": 22.0,
        "y": 30.0,
        "w": 16.0,
        "h": 10.0
      },
      {
        "key": "banos",
        "x": 92.0,
        "y": 90.0,
        "w": 12.0,
        "h": 8.0
      }
    ],
    "tables": [
      {
        "label": "T1 redonda",
        "x": 32.0,
        "y": 42.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T2 redonda",
        "x": 32.0,
        "y": 60.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T3 redonda",
        "x": 48.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T4 redonda",
        "x": 70.0,
        "y": 62.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T5 redonda",
        "x": 78.0,
        "y": 38.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T6 rectangular",
        "x": 42.0,
        "y": 26.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T7 rectangular",
        "x": 70.0,
        "y": 76.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T8 rectangular",
        "x": 30.0,
        "y": 74.0,
        "w": 18.0,
        "h": 6.0,
        "type": "rect_h",
        "cap": 18
      },
      {
        "label": "T9 redonda",
        "x": 58.0,
        "y": 68.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      },
      {
        "label": "T10 redonda",
        "x": 82.0,
        "y": 70.0,
        "w": 8.0,
        "h": 8.0,
        "type": "round",
        "cap": 10
      }
    ]
  }
];

const PRESET_ELEMENT_TYPE_MAP = {
  entrada: "entrada",
  mesa_novios: "novios",
  mesa_novios_imperial: "novios",
  pista_baile: "pista",
  dj_escenario: "escenario",
  barra_1: "bar",
  barra_2: "bar",
  buffet: "buffet",
  buffet_1: "buffet",
  buffet_2: "buffet",
  banos: "banios",
  photobooth: "photobooth",
  lounge: "living",
  lounge_1: "living",
  lounge_2: "living",
  lounge_after: "living",
  mesa_torta: "torta",
  decoracion_principal_back_novios: "backing",
  decoracion_aerea_pista: "luces",
  activacion_experiencia: "activacion",
};

const humanizePresetKey = (key="") => String(key)
  .replace(/_/g," ")
  .replace(/\w/g, c => c.toUpperCase());

const presetElementToCanvas = (p, raw, room) => {
  const tipo = PRESET_ELEMENT_TYPE_MAP[raw.key] || PRESET_ELEMENT_TYPE_MAP[String(raw.key).replace(/_\d+$/," ")] || "backing";
  const W = room?.w || 22;
  const H = room?.h || 16;
  const isPista = raw.key === "pista_baile";
  const ew = isPista ? room.danceW : normToMetersX(raw.w, W);
  const eh = isPista ? room.danceH : normToMetersY(raw.h, H);
  const cx = normToMetersX(raw.x, W);
  const cy = normToMetersY(raw.y, H);
  return elem(
    `${p.id}-${raw.key}`,
    tipo,
    +(cx - ew/2).toFixed(2),
    +(cy - eh/2).toFixed(2),
    ew,
    eh,
    {
      locked: false,
      editable: true,
      presetFixed: true,
      presetKey: raw.key,
      labelOverride: humanizePresetKey(raw.key),
    }
  );
};

const presetTableToCanvas = (raw, index, tableSize=8, room={w:22,h:16}) => {
  const tipo = raw.type || "round";
  const round = tipo === "round";
  const cap = round ? tableSize : (raw.cap || tableSize);
  const visualD = tableDiameterForGuests(tableSize);
  const ew = round ? visualD : normToMetersX(raw.w || 16, room.w);
  const eh = round ? visualD : normToMetersY(raw.h || 6, room.h);
  return mesa(index + 1, normToMetersX(raw.x, room.w), normToMetersY(raw.y, room.h), tipo, {
    ew,
    eh,
    cap,
    etiqueta: raw.label && !/^T\d+/i.test(raw.label) && !/^H\d+/i.test(raw.label) ? raw.label.replace(/_/g," ") : "",
    presetKey: raw.label,
    presetOrder: index + 1,
    miraSide: tipo === "rect_h" || tipo === "imperial" ? "both" : undefined,
  });
};

const selectPresetTablesByGuests = (tablePattern=[], totalPeople=0, tableSize=8, room={w:22,h:16}) => {
  const normalized = tablePattern.map((t,i)=>presetTableToCanvas(t,i,tableSize,room));
  if(!totalPeople || totalPeople <= 0) return {tables: normalized, overflow:false, seats: normalized.reduce((s,m)=>s+(m.cap||tableSize),0)};
  let seats = 0;
  const selected = [];
  for(const t of normalized) {
    selected.push(t);
    seats += t.cap || tableSize;
    if(seats >= totalPeople) break;
  }
  const maxSeats = normalized.reduce((s,m)=>s+(m.cap||tableSize),0);
  return {tables: selected, overflow: totalPeople > maxSeats, seats: Math.min(seats, maxSeats), maxSeats};
};

const buildReferenceWeddingPreset = (presetId, totalPeople=150, tableSize=8) => {
  const p = REFERENCE_WEDDING_PRESETS.find(x=>x.id===presetId) || REFERENCE_WEDDING_PRESETS[0];
  const room = getRoomSizeForGuests(totalPeople || 150);
  const picked = selectPresetTablesByGuests(p.tables || [], totalPeople, tableSize || 8, room);
  return {
    salonW: room.w,
    salonH: room.h,
    salonShape: "rectangulo",
    salonShapeConfig: DEFAULT_SALON_SHAPE_CONFIG,
    estiloDistrib: p.id,
    estiloDecor: p.id,
    presetId: p.id,
    presetTitle: p.title,
    overflowTables: picked.overflow,
    maxPresetSeats: picked.maxSeats || picked.seats || 0,
    mesas: picked.tables,
    elementos: (p.elements || []).map(raw=>presetElementToCanvas(p, raw, room)),
  };
};

const PRESET_BUILDERS = Object.fromEntries(
  REFERENCE_WEDDING_PRESETS.map(p => [p.id, (_decor, totalPeople=0, tableSize=8) => buildReferenceWeddingPreset(p.id, totalPeople, tableSize)])
);
PRESET_BUILDERS.desde_cero = () => { const r=getRoomSizeForGuests(150); return {salonW:r.w,salonH:r.h,salonShape:"rectangulo",salonShapeConfig:DEFAULT_SALON_SHAPE_CONFIG,estiloDistrib:"desde_cero",estiloDecor:"desde_cero",mesas:[],elementos:[]}; };

const SALON_PRESETS = [
  ...REFERENCE_WEDDING_PRESETS.map((p,idx)=>({
    id:p.id,
    emoji:["🌿","🏛️","🌾","◻️","🍋","🖤","🪵","🎭","🍸","👨‍👩‍👧","🎪","🤍","🏙️","⭕","✨"][idx] || "✨",
    label:p.title,
    desc:(p.types||[]).slice(0,3).join(" · ") || "Preset real de boda",
  })),
  {id:"desde_cero", emoji:"＋", label:"Crear desde cero", desc:"Limpia el canvas y deja el salón vacío"},
];

// Default actual: preset clásico editable para no arrancar con un salón vacío.
const SALON_MODELO = () => generateWeddingLayout({presetId:"fiesta_latina", guestCount:150, roomSizeOption:"recommended", tableType:"auto"});


// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 · Motor de presets profesionales sin tocar escala del canvas
// Mantiene el canvas en metros reales. Los elementos se ubican en metros y el
// render existente los escala visualmente una sola vez con PX.
// ─────────────────────────────────────────────────────────────────────────────
const GUEST_COUNT_OPTIONS = [100,150,200,250,300];
const ROOM_SIZE_OPTIONS = {
  100: {
    compact: { W: 18, H: 13, area: 234, label: "Compacto 18 x 13 m" },
    recommended: { W: 22, H: 16, area: 352, label: "Recomendado 22 x 16 m" },
    spacious: { W: 26, H: 18, area: 468, label: "Amplio 26 x 18 m" },
    premium: { W: 30, H: 20, area: 600, label: "Premium 30 x 20 m" }
  },
  150: {
    compact: { W: 22, H: 15, area: 330, label: "Compacto 22 x 15 m" },
    recommended: { W: 26, H: 18, area: 468, label: "Recomendado 26 x 18 m" },
    spacious: { W: 30, H: 20, area: 600, label: "Amplio 30 x 20 m" },
    premium: { W: 34, H: 22, area: 748, label: "Premium 34 x 22 m" }
  },
  200: {
    compact: { W: 26, H: 17, area: 442, label: "Compacto 26 x 17 m" },
    recommended: { W: 30, H: 20, area: 600, label: "Recomendado 30 x 20 m" },
    spacious: { W: 34, H: 22, area: 748, label: "Amplio 34 x 22 m" },
    premium: { W: 38, H: 24, area: 912, label: "Premium 38 x 24 m" }
  },
  250: {
    compact: { W: 30, H: 19, area: 570, label: "Compacto 30 x 19 m" },
    recommended: { W: 34, H: 22, area: 748, label: "Recomendado 34 x 22 m" },
    spacious: { W: 38, H: 24, area: 912, label: "Amplio 38 x 24 m" },
    premium: { W: 42, H: 26, area: 1092, label: "Premium 42 x 26 m" }
  },
  300: {
    compact: { W: 34, H: 21, area: 714, label: "Compacto 34 x 21 m" },
    recommended: { W: 38, H: 23, area: 874, label: "Recomendado 38 x 23 m" },
    spacious: { W: 42, H: 26, area: 1092, label: "Amplio 42 x 26 m" },
    premium: { W: 46, H: 28, area: 1288, label: "Premium 46 x 28 m" }
  }
};
const ROOM_SIZE_OPTION_LABELS = {
  compact: "Compacto",
  recommended: "Recomendado",
  spacious: "Amplio",
  premium: "Premium / gran salón"
};
const TABLE_TYPES = {
  round_150_comfort: {
    label: "Redonda 1.50 m cómoda",
    realDiameter: 1.5,
    operationalWidth: 2.8,
    operationalHeight: 2.8,
    capacity: 8,
    shape: "circle"
  },
  round_150_compact: {
    label: "Redonda 1.50 m compacta",
    realDiameter: 1.5,
    operationalWidth: 2.8,
    operationalHeight: 2.8,
    capacity: 10,
    shape: "circle",
    warning: "Armado compacto: menor comodidad entre comensales."
  },
  round_180_comfort: {
    label: "Redonda 1.80 m cómoda",
    realDiameter: 1.8,
    operationalWidth: 3.2,
    operationalHeight: 3.2,
    capacity: 10,
    shape: "circle"
  },
  round_180_compact: {
    label: "Redonda 1.80 m compacta",
    realDiameter: 1.8,
    operationalWidth: 3.2,
    operationalHeight: 3.2,
    capacity: 12,
    shape: "circle",
    warning: "Armado compacto: útil para optimizar espacio, pero menos premium."
  },
  rectangular_12: {
    label: "Rectangular estándar",
    width: 4.0,
    height: 2.2,
    operationalWidth: 4.0,
    operationalHeight: 2.2,
    capacity: 12,
    shape: "rect"
  },
  high_cocktail: {
    label: "Mesa alta cocktail",
    width: 1.0,
    height: 1.0,
    operationalWidth: 1.8,
    operationalHeight: 1.8,
    capacity: 0,
    shape: "circle"
  }
};
const FIXED_ELEMENT_SIZES = {
  entrada: {w:4,h:1,tipo:"entrada"},
  mesa_novios_sweetheart: {w:4,h:1.8,tipo:"novios"},
  mesa_novios_familiar: {w:5,h:2,tipo:"novios"},
  mesa_imperial_novios: {w:8,h:2.4,tipo:"novios"},
  dj_chico: {w:4,h:1.8,tipo:"escenario"},
  escenario: {w:6,h:2.5,tipo:"escenario"},
  barra: {w:5,h:1.5,tipo:"bar"},
  buffet: {w:6,h:1.5,tipo:"buffet"},
  banos: {w:3,h:2,tipo:"banios"},
  photobooth: {w:3,h:2.5,tipo:"photobooth"},
  lounge_chico: {w:5,h:3,tipo:"living"},
  lounge_grande: {w:7,h:4,tipo:"living"},
  sofa_2: {w:2.2,h:.9,tipo:"sofa_2"},
  sofa_3: {w:3.2,h:1,tipo:"sofa_3"},
  mesita: {w:1,h:1,tipo:"mesita"},
  piano: {w:2.3,h:1.4,tipo:"piano"},
  cello: {w:.8,h:1.4,tipo:"cello"},
  mesa_torta: {w:2.5,h:1.8,tipo:"torta"},
  backing: {w:6,h:.6,tipo:"backing"},
  decoracion_aerea: {w:7,h:.4,tipo:"luces", nonPhysical:true},
  activacion: {w:4,h:2.5,tipo:"activacion"}
};
const nearestGuestOption = (n=150) => GUEST_COUNT_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,150);
const getRoomSize = (guestCount=150, roomSizeOption="recommended") => {
  const g = nearestGuestOption(Number(guestCount)||150);
  return ROOM_SIZE_OPTIONS[g]?.[roomSizeOption] || ROOM_SIZE_OPTIONS[g]?.recommended || ROOM_SIZE_OPTIONS[150].recommended;
};
const getDanceFloorSize = (guestCount=150) => {
  const g = nearestGuestOption(Number(guestCount)||150);
  return ({100:{w:5,h:4},150:{w:6,h:5},200:{w:7,h:6},250:{w:8,h:7},300:{w:9,h:8}})[g] || {w:6,h:5};
};
const getRequiredTables = (guestCount=150, tableType=TABLE_TYPES.round_180_comfort) => Math.ceil((Number(guestCount)||0) / Math.max(1, tableType.capacity||1));
const calculateSeatedCapacity = (tables=[]) => tables.reduce((s,t)=>s+(Number(t.cap)||0),0);
const centerFixedElement = (id, sizeKey, cx, cy, extra={}) => {
  const s = FIXED_ELEMENT_SIZES[sizeKey] || FIXED_ELEMENT_SIZES.entrada;
  return elem(id, s.tipo, +(cx - s.w/2).toFixed(2), +(cy - s.h/2).toFixed(2), s.w, s.h, {
    locked:false,
    editable:true,
    presetFixed:true,
    stage2Fixed:true,
    nonPhysical: !!s.nonPhysical,
    ...extra
  });
};

// ── Etapa 2B · motor fuerte de slots, simetría y colisiones ───────────────
// No toca escala/viewBox. Todo sigue en metros. La mesa redonda se dibuja con
// diámetro real, pero se valida con huella operativa.
const stage2ElementBox = (el={}) => ({x1:el.mx||0,y1:el.my||0,x2:(el.mx||0)+(el.ew||0),y2:(el.my||0)+(el.eh||0),w:el.ew||0,h:el.eh||0});

const stage2TableCollisionItem = (m={}) => {
  const ew = m.ew || m.realDiameter || 1;
  const eh = m.eh || m.realDiameter || 1;
  return {
    id: m.id,
    type: m.tipo || m.type || "table",
    // mx/my son esquina superior-izquierda; el motor de colisiones trabaja con
    // el centro, así que lo calculamos sumando media mesa.
    x: (Number(m.mx)||0) + ew/2,
    y: (Number(m.my)||0) + eh/2,
    width: m.operationalWidth || ew,
    height: m.operationalHeight || eh,
    operationalWidth: m.operationalWidth || ew,
    operationalHeight: m.operationalHeight || eh,
  };
};
const stage2FixedCollisionItem = (el={}) => ({
  id: el.id,
  type: el.tipo || el.type || "element",
  source: el.tipo || el.type || el.id,
  x: (Number(el.mx)||0) + (Number(el.ew)||0)/2,
  y: (Number(el.my)||0) + (Number(el.eh)||0)/2,
  width: Number(el.ew)||0,
  height: Number(el.eh)||0,
  operationalWidth: Number(el.ew)||0,
  operationalHeight: Number(el.eh)||0,
  nonPhysical: !!el.nonPhysical,
});
const stage2CollisionItemFromBox = (b={}) => ({
  id:b.id,
  source:b.source,
  type:b.type || b.source || "zone",
  x: ((Number(b.x1)||0)+(Number(b.x2)||0))/2,
  y: ((Number(b.y1)||0)+(Number(b.y2)||0))/2,
  width: Math.max(0,(Number(b.x2)||0)-(Number(b.x1)||0)),
  height: Math.max(0,(Number(b.y2)||0)-(Number(b.y1)||0)),
});
function getBounds(item={}) {
  if(item.left !== undefined && item.right !== undefined) return item;
  if(item.x1 !== undefined && item.x2 !== undefined) {
    return {left:item.x1,right:item.x2,top:item.y1,bottom:item.y2};
  }
  const width = item.operationalWidth || item.width || item.ew || item.realDiameter || 1;
  const height = item.operationalHeight || item.height || item.eh || item.realDiameter || 1;
  const x = item.x !== undefined ? item.x : ((item.mx||0) + (item.ew||0)/2);
  const y = item.y !== undefined ? item.y : ((item.my||0) + (item.eh||0)/2);
  return {left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};
}
function boxesOverlap(a,b,margin=0) {
  const A=getBounds(a), B=getBounds(b);
  return !(A.right + margin <= B.left || A.left - margin >= B.right || A.bottom + margin <= B.top || A.top - margin >= B.bottom);
}
function isInsideRoom(item,W,H) {
  const b=getBounds(item);
  return b.left >= 0 && b.right <= W && b.top >= 0 && b.bottom <= H;
}
function expandZone(element, margin=0) {
  const item = element.x1 !== undefined ? stage2CollisionItemFromBox(element) : (element.mx !== undefined ? stage2FixedCollisionItem(element) : element);
  const width = item.operationalWidth || item.width || item.realDiameter || 1;
  const height = item.operationalHeight || item.height || item.realDiameter || 1;
  return { id:`forbidden_${item.id||item.source||"zone"}`, type:"forbidden", source:item.source||item.type||item.id, x:item.x, y:item.y, width:width + margin*2, height:height + margin*2 };
}
const stage2MesaOperationalBox = (m={}) => {
  const b=getBounds(stage2TableCollisionItem(m));
  return {x1:b.left,y1:b.top,x2:b.right,y2:b.bottom,w:b.right-b.left,h:b.bottom-b.top};
};
const stage2ExpandBox = (b,g=0) => ({x1:b.x1-g,y1:b.y1-g,x2:b.x2+g,y2:b.y2+g,w:(b.w||((b.x2||0)-(b.x1||0)))+2*g,h:(b.h||((b.y2||0)-(b.y1||0)))+2*g,source:b.source,id:b.id});
const stage2BoxesHit = (a,b,margin=0) => boxesOverlap(a,b,margin);
const checkCollisionUsingOperationalFootprint = (a,b) => boxesOverlap(stage2TableCollisionItem(a), stage2TableCollisionItem(b), 0);
const clampStage2Box = (v,min,max) => Math.max(min,Math.min(max,v));
const stage2TableFromSlot = (slot, id, tableType, label="") => {
  const round = tableType.shape === "circle";
  const ew = round ? tableType.realDiameter : (tableType.width || 4);
  const eh = round ? tableType.realDiameter : (tableType.height || 2.2);
  // slot.x / slot.y son el CENTRO del hueco. mx/my se guardan como esquina
  // superior-izquierda (igual que los elementos fijos y el renderer), restando
  // media mesa. Antes se guardaba el centro como si fuera esquina, y las mesas
  // aparecían corridas media mesa respecto a su posición real.
  return mesa(id, +(slot.x - ew/2).toFixed(2), +(slot.y - eh/2).toFixed(2), round ? "round" : "rect_h", {
    cap: tableType.capacity || 0,
    ew,
    eh,
    operationalWidth: tableType.operationalWidth || ew,
    operationalHeight: tableType.operationalHeight || eh,
    tableTypeId: tableType.id,
    etiqueta: label,
    zoneId: slot.zoneId,
    slotPriority: slot.priority,
    miraSide: round ? undefined : "both"
  });
};


const TOPDOWN_PRESET_DEFAULT_ID = "fiesta_latina";

// ── Presets exactos basados en los JPG de referencia ─────────────────────
// Los JPG fueron diseñados en 1800×1200 px con un área útil de salón de
// 1660×970 px (x=70..1730, y=145..1115). Estos helpers convierten esa misma
// grilla visual a metros, manteniendo proporción, simetría y disposición.
const EXACT_REF = { x:70, y:145, w:1660, h:970 };
const EXACT_ASPECT = EXACT_REF.h / EXACT_REF.w;
const EXACT_ROOM_WIDTHS = { compact:26, recommended:30, spacious:34, premium:38 };
const getExactReferenceRoomSize = (guestCount=150, roomSizeOption="recommended") => {
  const baseW = EXACT_ROOM_WIDTHS[roomSizeOption] || EXACT_ROOM_WIDTHS.recommended;
  const guestBoost = (Number(guestCount)||150) >= 250 ? 4 : (Number(guestCount)||150) >= 200 ? 2 : 0;
  const W = +(baseW + guestBoost).toFixed(2);
  const H = +(W * EXACT_ASPECT).toFixed(2);
  return { W, H, area:+(W*H).toFixed(0), label:`Plano editable ${W} × ${H} m` };
};
const exX = (px,W) => +(((Number(px)-EXACT_REF.x) / EXACT_REF.w) * W).toFixed(2);
const exY = (py,H) => +(((Number(py)-EXACT_REF.y) / EXACT_REF.h) * H).toFixed(2);
const exW = (px,W) => +((Number(px) / EXACT_REF.w) * W).toFixed(2);
const exH = (py,H) => +((Number(py) / EXACT_REF.h) * H).toFixed(2);
const exClamp = (n,min,max) => Math.max(min, Math.min(max, n));
const exactElement = (W,H,raw={}) => {
  const [x1,y1,x2,y2] = raw.box || [0,0,0,0];
  const ew = Math.max(.25, exW(x2-x1,W));
  const eh = Math.max(.20, exH(y2-y1,H));
  const mx = exClamp(exX(x1,W),0,Math.max(0,W-ew));
  const my = exClamp(exY(y1,H),0,Math.max(0,H-eh));
  return elem(raw.id, raw.tipo, +mx.toFixed(2), +my.toFixed(2), +ew.toFixed(2), +eh.toFixed(2), {
    locked:false,
    editable:true,
    presetFixed:true,
    stage2Fixed:true,
    exactReference:true,
    nonPhysical:!!raw.nonPhysical,
    labelOverride:raw.label || undefined
  });
};
const exactElements = (W,H,items=[]) => items.map(raw=>exactElement(W,H,raw));
const exactTables = (W,H,items=[]) => items.map((raw,i)=>{
  let mx,my,ew,eh;
  if(raw.tipo === "round") {
    ew = Math.max(.90, exW((raw.r||50)*2,W));
    eh = ew;
    mx = exX(raw.cx,W);
    my = exY(raw.cy,H);
  } else {
    const [x1,y1,x2,y2] = raw.box || [0,0,0,0];
    ew = Math.max(.90, exW(x2-x1,W));
    eh = Math.max(.55, exH(y2-y1,H));
    mx = exX((x1+x2)/2,W);
    my = exY((y1+y2)/2,H);
  }
  const tipo = raw.tipo || "rect_h";
  const t = mesa(i+1, +mx.toFixed(2), +my.toFixed(2), tipo, {
    ew:+ew.toFixed(2),
    eh:+eh.toFixed(2),
    cap:raw.cap || (tipo==="round"?8:12),
    etiqueta:raw.label || "",
    presetKey:`exact-${i+1}`,
    exactReference:true,
    operationalWidth:+ew.toFixed(2),
    operationalHeight:+eh.toFixed(2),
    miraSide: tipo==="rect_h" || tipo==="imperial" ? "both" : undefined
  });
  return t;
});

const STAGE2_PRESET_CONFIGS = {
  clasica_elegante: {
    label:"Clásica elegante", emoji:"💐", salon:"salón formal · hotel · ballroom claro", pattern:"symmetric", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-1","tipo":"altar","box":[785,165,1015,320],"label":"Altar floral"},{"id":"camino-1","tipo":"camino","box":[842,310,958,675],"label":"Camino central","nonPhysical":true},{"id":"sillas-cer-izq","tipo":"sillas_cer","box":[445,318,785,642],"label":"Sillas ceremonia"},{"id":"sillas-cer-der","tipo":"sillas_cer","box":[1015,318,1355,642],"label":"Sillas ceremonia"},{"id":"novios-1","tipo":"novios","box":[720,655,1080,695],"label":"Mesa novios"},{"id":"pista-1","tipo":"pista","box":[710,720,1090,1010],"label":"Pista central"},{"id":"dj-1","tipo":"escenario","box":[720,1018,1080,1090],"label":"DJ / Banda"},{"id":"barra-1","tipo":"bar","box":[1290,590,1600,690],"label":"Bar"},{"id":"buffet-1","tipo":"buffet","box":[200,590,510,690],"label":"Buffet"},{"id":"photobooth-1","tipo":"photobooth","box":[1460,950,1630,1090],"label":"Photo spot"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":360,"cy":780,"r":58,"cap":8,"label":""},{"tipo":"round","cx":520,"cy":810,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1280,"cy":780,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1440,"cy":810,"r":58,"cap":8,"label":""},{"tipo":"round","cx":410,"cy":980,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1390,"cy":980,"r":58,"cap":8,"label":""}])
  },
  boho_chic: {
    label:"Boho chic", emoji:"🌾", salon:"jardín · terraza · carpa relajada", pattern:"organic", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-textil-1","tipo":"altar","box":[235,210,445,395],"label":"Altar textil"},{"id":"camino-1","tipo":"camino","box":[472,290,568,580],"label":"Camino boho","nonPhysical":true},{"id":"alfombra-1","tipo":"alfombra","box":[600,250,1030,340],"label":"Alfombra","nonPhysical":true},{"id":"alfombra-2","tipo":"alfombra","box":[680,370,1110,460],"label":"Alfombra","nonPhysical":true},{"id":"alfombra-3","tipo":"alfombra","box":[760,490,1190,580],"label":"Alfombra","nonPhysical":true},{"id":"pista-1","tipo":"pista","box":[1120,325,1510,595],"label":"Pista alfombra"},{"id":"lounge-1","tipo":"living","box":[1260,700,1590,850],"label":"Lounge bajo"},{"id":"barra-1","tipo":"bar","box":[1330,930,1600,1035],"label":"Bar gin"},{"id":"buffet-1","tipo":"buffet","box":[200,930,480,1035],"label":"Mesa dulce"},{"id":"flores-1","tipo":"flores","box":[144,194,216,266],"label":"Plantas","nonPhysical":true},{"id":"flores-2","tipo":"flores","box":[1465,205,1535,275],"label":"Plantas","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"rect_h","box":[230,700,690,765],"cap":16,"label":"Mesa larga"},{"tipo":"rect_h","box":[820,690,1280,755],"cap":16,"label":"Mesa larga"},{"tipo":"rect_h","box":[480,860,940,925],"cap":16,"label":"Mesa larga"},{"tipo":"rect_h","box":[1070,850,1530,915],"cap":16,"label":"Mesa larga"}])
  },
  rustica_campo: {
    label:"Rústica de campo", emoji:"🪵", salon:"estancia · quincho · jardín amplio", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-madera-1","tipo":"altar","box":[770,185,1030,365],"label":"Altar de madera"},{"id":"camino-1","tipo":"camino","box":[840,345,960,650],"label":"Camino rústico","nonPhysical":true},{"id":"sillas-campo-izq","tipo":"sillas_cer","box":[305,360,760,625],"label":"Sillas campo"},{"id":"sillas-campo-der","tipo":"sillas_cer","box":[1040,360,1495,625],"label":"Sillas campo"},{"id":"pista-1","tipo":"pista","box":[720,660,1080,760],"label":"Primer baile"},{"id":"barra-1","tipo":"bar","box":[170,370,350,650],"label":"Bar rústico"},{"id":"buffet-1","tipo":"buffet","box":[1450,370,1630,650],"label":"Parrilla / Buffet"},{"id":"lounge-1","tipo":"living","box":[1420,820,1630,1040],"label":"Fogón lounge"},{"id":"torta-1","tipo":"torta","box":[180,835,420,965],"label":"Mesa dulce"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"rect_h","box":[260,780,530,840],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[610,780,880,840],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[960,780,1230,840],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[1310,780,1580,840],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[260,925,530,985],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[610,925,880,985],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[960,925,1230,985],"cap":12,"label":"Comunitaria"},{"tipo":"rect_h","box":[1310,925,1580,985],"cap":12,"label":"Comunitaria"}])
  },
  minimalista_moderno: {
    label:"Minimalista moderno", emoji:"◻️", salon:"loft blanco · galería · salón contemporáneo", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-geo-1","tipo":"backing","box":[760,220,1040,285],"label":"Altar geométrico"},{"id":"camino-1","tipo":"camino","box":[860,285,940,620],"label":"Eje central","nonPhysical":true},{"id":"sillas-min-izq","tipo":"sillas_cer","box":[320,310,680,535],"label":"Sillas lineales"},{"id":"sillas-min-der","tipo":"sillas_cer","box":[1170,310,1530,535],"label":"Sillas lineales"},{"id":"pista-1","tipo":"pista","box":[720,650,1080,930],"label":"Pista limpia"},{"id":"dj-1","tipo":"escenario","box":[720,950,1080,1020],"label":"DJ"},{"id":"barra-1","tipo":"bar","box":[1250,250,1550,335],"label":"Bar"},{"id":"buffet-1","tipo":"buffet","box":[250,250,550,335],"label":"Buffet"},{"id":"photobooth-1","tipo":"photobooth","box":[1420,960,1570,1080],"label":"Foto"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"rect_h","box":[260,730,600,790],"cap":12,"label":"Mesa A"},{"tipo":"rect_h","box":[260,880,600,940],"cap":12,"label":"Mesa B"},{"tipo":"rect_h","box":[1200,730,1540,790],"cap":12,"label":"Mesa C"},{"tipo":"rect_h","box":[1200,880,1540,940],"cap":12,"label":"Mesa D"}])
  },
  jardin_romantico: {
    label:"Jardín romántico", emoji:"🌿", salon:"jardín · pérgola · carpa clara", pattern:"organic", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"pergola-1","tipo":"altar","box":[775,175,1025,350],"label":"Pérgola"},{"id":"camino-floral-1","tipo":"camino","box":[835,300,965,720],"label":"Camino floral","nonPhysical":true},{"id":"pista-1","tipo":"pista","box":[735,725,1065,850],"label":"Pista / brindis"},{"id":"dj-1","tipo":"escenario","box":[735,875,1065,940],"label":"Música acústica"},{"id":"lounge-1","tipo":"living","box":[235,675,485,790],"label":"Lounge jardín"},{"id":"barra-1","tipo":"bar","box":[1315,675,1565,790],"label":"Bar floral"},{"id":"luces-1","tipo":"luces","box":[330,300,1470,390],"label":"Guirnalda","nonPhysical":true},{"id":"luces-2","tipo":"luces","box":[330,920,1470,1010],"label":"Guirnalda","nonPhysical":true},{"id":"flores-1","tipo":"flores","box":[165,195,255,285],"label":"Verde","nonPhysical":true},{"id":"flores-2","tipo":"flores","box":[1545,195,1635,285],"label":"Verde","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":420,"cy":410,"r":55,"cap":8,"label":""},{"tipo":"round","cx":590,"cy":520,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1210,"cy":410,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1380,"cy":520,"r":55,"cap":8,"label":""},{"tipo":"round","cx":420,"cy":800,"r":55,"cap":8,"label":""},{"tipo":"round","cx":590,"cy":920,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1210,"cy":800,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1380,"cy":920,"r":55,"cap":8,"label":""},{"tipo":"round","cx":900,"cy":900,"r":55,"cap":8,"label":""}])
  },
  playa_tropical: {
    label:"Playa tropical", emoji:"🌴", salon:"playa · deck · resort frente al mar", pattern:"organic", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"horizonte-mar","tipo":"exterior","box":[90,160,1710,250],"label":"Horizonte / mar","nonPhysical":true},{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-mar-1","tipo":"altar","box":[770,250,1030,380],"label":"Altar al mar"},{"id":"camino-arena-1","tipo":"camino","box":[832,395,968,690],"label":"Camino arena","nonPhysical":true},{"id":"sillas-playa-izq","tipo":"sillas_cer","box":[300,425,745,625],"label":"Sillas playa"},{"id":"sillas-playa-der","tipo":"sillas_cer","box":[1055,425,1500,625],"label":"Sillas playa"},{"id":"pista-1","tipo":"pista","box":[740,760,1060,970],"label":"Dance deck"},{"id":"dj-1","tipo":"escenario","box":[740,990,1060,1060],"label":"DJ sunset"},{"id":"barra-1","tipo":"bar","box":[1340,280,1580,380],"label":"Bar tropical"},{"id":"buffet-1","tipo":"buffet","box":[220,280,460,380],"label":"Ceviche / frutas"},{"id":"palmera-1","tipo":"flores","box":[175,615,245,685],"label":"Palmera","nonPhysical":true},{"id":"palmera-2","tipo":"flores","box":[1555,615,1625,685],"label":"Palmera","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":340,"cy":820,"r":50,"cap":7,"label":""},{"tipo":"round","cx":520,"cy":920,"r":50,"cap":7,"label":""},{"tipo":"round","cx":1280,"cy":820,"r":50,"cap":7,"label":""},{"tipo":"round","cx":1460,"cy":920,"r":50,"cap":7,"label":""},{"tipo":"round","cx":450,"cy":1040,"r":50,"cap":7,"label":""},{"tipo":"round","cx":1350,"cy":1040,"r":50,"cap":7,"label":""}])
  },
  industrial_chic: {
    label:"Industrial chic", emoji:"🏙️", salon:"galpón · warehouse · loft urbano", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"escenario-led-1","tipo":"escenario","box":[680,200,1120,305],"label":"Escenario / LED"},{"id":"pista-1","tipo":"pista","box":[660,390,1140,730],"label":"Pista central"},{"id":"truss-1","tipo":"luces","box":[620,350,1180,370],"label":"Truss de luces","nonPhysical":true},{"id":"barra-1","tipo":"bar","box":[1250,920,1630,1035],"label":"Bar de autor"},{"id":"buffet-1","tipo":"buffet","box":[170,920,550,1035],"label":"Food station"},{"id":"photobooth-1","tipo":"photobooth","box":[1300,190,1585,320],"label":"Neón / foto"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":310,"cy":385,"r":50,"cap":8,"label":""},{"tipo":"round","cx":470,"cy":515,"r":50,"cap":8,"label":""},{"tipo":"round","cx":310,"cy":645,"r":50,"cap":8,"label":""},{"tipo":"round","cx":470,"cy":775,"r":50,"cap":8,"label":""},{"tipo":"round","cx":1330,"cy":385,"r":50,"cap":8,"label":""},{"tipo":"round","cx":1490,"cy":515,"r":50,"cap":8,"label":""},{"tipo":"round","cx":1330,"cy":645,"r":50,"cap":8,"label":""},{"tipo":"round","cx":1490,"cy":775,"r":50,"cap":8,"label":""},{"tipo":"rect_h","box":[560,830,1240,895],"cap":18,"label":"Mesa industrial larga"},{"tipo":"rect_h","box":[560,970,1240,1035],"cap":18,"label":"Mesa industrial larga"}])
  },
  vintage_romantico: {
    label:"Vintage romántico", emoji:"🕯️", salon:"salón íntimo · casa antigua · jardín boutique", pattern:"ring", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-vintage-1","tipo":"altar","box":[785,165,1015,325],"label":"Altar vintage"},{"id":"camino-vintage-1","tipo":"camino","box":[845,315,955,590],"label":"Camino vintage","nonPhysical":true},{"id":"sillas-vintage-izq","tipo":"sillas_cer","box":[290,315,790,570],"label":"Sillas curvas"},{"id":"sillas-vintage-der","tipo":"sillas_cer","box":[1010,315,1510,570],"label":"Sillas curvas"},{"id":"pista-1","tipo":"pista","box":[745,650,1055,845],"label":"Pista"},{"id":"dj-1","tipo":"escenario","box":[745,860,1055,925],"label":"Trío / DJ"},{"id":"lounge-1","tipo":"living","box":[185,520,420,660],"label":"Lounge antiguo"},{"id":"photobooth-1","tipo":"photobooth","box":[1365,520,1600,660],"label":"Marco vintage"},{"id":"buffet-1","tipo":"buffet","box":[220,1000,560,1080],"label":"Mesa dulce"},{"id":"barra-1","tipo":"bar","box":[1240,1000,1580,1080],"label":"Champagne"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":300,"cy":760,"r":52,"cap":7,"label":""},{"tipo":"round","cx":500,"cy":900,"r":52,"cap":7,"label":""},{"tipo":"round","cx":720,"cy":780,"r":52,"cap":7,"label":""},{"tipo":"round","cx":1080,"cy":780,"r":52,"cap":7,"label":""},{"tipo":"round","cx":1300,"cy":900,"r":52,"cap":7,"label":""},{"tipo":"round","cx":1500,"cy":760,"r":52,"cap":7,"label":""},{"tipo":"round","cx":900,"cy":960,"r":52,"cap":7,"label":""}])
  },
  glam_lujo: {
    label:"Glam lujo", emoji:"✨", salon:"ballroom premium · boda nocturna · gala", pattern:"symmetric", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"eje-vertical","tipo":"alfombra","box":[850,160,950,1090],"label":"Eje dorado","nonPhysical":true},{"id":"eje-horizontal","tipo":"alfombra","box":[190,590,1610,690],"label":"Eje dorado","nonPhysical":true},{"id":"escenario-premium-1","tipo":"escenario","box":[635,190,1165,320],"label":"Escenario premium"},{"id":"pista-1","tipo":"pista","box":[650,440,1150,820],"label":"Gran pista"},{"id":"novios-1","tipo":"novios","box":[610,850,1190,920],"label":"Mesa principal"},{"id":"barra-1","tipo":"bar","box":[1260,250,1580,350],"label":"Bar dorado"},{"id":"buffet-1","tipo":"buffet","box":[220,250,540,350],"label":"Caviar / canapés"},{"id":"photobooth-1","tipo":"photobooth","box":[1260,990,1580,1080],"label":"Photocall"},{"id":"lounge-1","tipo":"living","box":[220,990,540,1080],"label":"VIP lounge"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":270,"cy":430,"r":58,"cap":8,"label":""},{"tipo":"round","cx":460,"cy":420,"r":58,"cap":8,"label":""},{"tipo":"round","cx":270,"cy":720,"r":58,"cap":8,"label":""},{"tipo":"round","cx":460,"cy":735,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1340,"cy":420,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1530,"cy":430,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1340,"cy":735,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1530,"cy":720,"r":58,"cap":8,"label":""},{"tipo":"round","cx":320,"cy":950,"r":58,"cap":8,"label":""},{"tipo":"round","cx":1480,"cy":950,"r":58,"cap":8,"label":""}])
  },
  mediterranea: {
    label:"Mediterránea", emoji:"🍋", salon:"terraza · patio europeo · exterior cálido", pattern:"ring", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"plaza-central","tipo":"exterior","box":[685,330,1115,760],"label":"Plaza central","nonPhysical":true},{"id":"arco-olivos-1","tipo":"altar","box":[785,180,1015,320],"label":"Arco olivos"},{"id":"camino-olivos-1","tipo":"camino","box":[850,320,950,475],"label":"Camino olivos","nonPhysical":true},{"id":"barra-1","tipo":"bar","box":[1260,230,1585,330],"label":"Aperol / vinos"},{"id":"buffet-1","tipo":"buffet","box":[215,230,540,330],"label":"Antipasti"},{"id":"dj-1","tipo":"escenario","box":[700,1040,1100,1090],"label":"Música italiana"},{"id":"olivo-1","tipo":"flores","box":[166,546,234,614],"label":"Olivo","nonPhysical":true},{"id":"olivo-2","tipo":"flores","box":[1566,546,1634,614],"label":"Olivo","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":350,"cy":400,"r":53,"cap":8,"label":""},{"tipo":"round","cx":520,"cy":570,"r":53,"cap":8,"label":""},{"tipo":"round","cx":350,"cy":760,"r":53,"cap":8,"label":""},{"tipo":"round","cx":520,"cy":930,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1280,"cy":570,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1450,"cy":400,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1450,"cy":760,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1280,"cy":930,"r":53,"cap":8,"label":""},{"tipo":"round","cx":900,"cy":940,"r":53,"cap":8,"label":""},{"tipo":"rect_h","box":[670,805,1130,865],"cap":14,"label":"Mesa familiar"}])
  },
  japandi: {
    label:"Japandi", emoji:"🎋", salon:"boutique · minimal cálido · ceremonia íntima", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"jardin-zen-1","tipo":"exterior","box":[790,190,1010,555],"label":"Jardín zen","nonPhysical":true},{"id":"altar-simple-1","tipo":"altar","box":[800,190,1000,325],"label":"Altar simple"},{"id":"camino-zen-1","tipo":"camino","box":[852,320,948,570],"label":"Camino zen","nonPhysical":true},{"id":"pista-1","tipo":"pista","box":[720,935,1080,1055],"label":"Espacio ritual"},{"id":"lounge-1","tipo":"living","box":[245,940,520,1060],"label":"Té / lounge"},{"id":"barra-1","tipo":"bar","box":[1280,940,1555,1060],"label":"Bar sake"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"rect_h","box":[260,680,510,735],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[570,680,820,735],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[970,680,1220,735],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[1280,680,1530,735],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[260,840,510,895],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[570,840,820,895],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[970,840,1220,895],"cap":8,"label":"Mesa baja"},{"tipo":"rect_h","box":[1280,840,1530,895],"cap":8,"label":"Mesa baja"}])
  },
  eco_sustentable: {
    label:"Eco sustentable", emoji:"♻️", salon:"jardín · carpa natural · venue sustentable", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-vivo-1","tipo":"altar","box":[780,175,1020,325],"label":"Altar vivo"},{"id":"camino-verde-1","tipo":"camino","box":[840,325,960,640],"label":"Camino verde","nonPhysical":true},{"id":"pista-1","tipo":"pista","box":[730,680,1070,930],"label":"Pista natural"},{"id":"dj-1","tipo":"escenario","box":[730,950,1070,1020],"label":"Música solar"},{"id":"buffet-1","tipo":"buffet","box":[190,345,470,470],"label":"Comida km 0"},{"id":"barra-1","tipo":"bar","box":[1330,345,1610,470],"label":"Agua / coctel"},{"id":"reciclaje-1","tipo":"backing","box":[190,520,470,620],"label":"Reciclaje + compost"},{"id":"plantas-regalo-1","tipo":"flores","box":[1330,520,1610,620],"label":"Regalos: plantas","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"rect_h","box":[330,720,790,778],"cap":14,"label":"Mesa compartida"},{"tipo":"rect_h","box":[1010,720,1470,778],"cap":14,"label":"Mesa compartida"},{"tipo":"rect_h","box":[330,870,790,928],"cap":14,"label":"Mesa compartida"},{"tipo":"rect_h","box":[1010,870,1470,928],"cap":14,"label":"Mesa compartida"},{"tipo":"rect_h","box":[330,1020,790,1078],"cap":14,"label":"Mesa compartida"},{"tipo":"rect_h","box":[1010,1020,1470,1078],"cap":14,"label":"Mesa compartida"}])
  },
  fiesta_latina: {
    label:"Fiesta latina", emoji:"🎉", salon:"salón social · fiesta con pista central", pattern:"ring", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"escenario-fiesta-1","tipo":"escenario","box":[665,190,1135,315],"label":"Banda / DJ visible"},{"id":"pista-1","tipo":"pista","box":[570,365,1230,780],"label":"Pista de fiesta"},{"id":"barra-1","tipo":"bar","box":[190,960,490,1070],"label":"Bar social"},{"id":"buffet-1","tipo":"buffet","box":[1310,960,1610,1070],"label":"Tacos / snacks"},{"id":"photobooth-1","tipo":"photobooth","box":[190,200,450,330],"label":"Photobooth color"},{"id":"lounge-1","tipo":"living","box":[1350,200,1610,330],"label":"Descanso"},{"id":"luces-1","tipo":"luces","box":[250,290,1550,350],"label":"Guirnalda","nonPhysical":true}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":250,"cy":430,"r":55,"cap":8,"label":""},{"tipo":"round","cx":420,"cy":570,"r":55,"cap":8,"label":""},{"tipo":"round","cx":250,"cy":730,"r":55,"cap":8,"label":""},{"tipo":"round","cx":420,"cy":875,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1380,"cy":570,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1550,"cy":430,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1550,"cy":730,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1380,"cy":875,"r":55,"cap":8,"label":""},{"tipo":"round","cx":690,"cy":940,"r":55,"cap":8,"label":""},{"tipo":"round","cx":1110,"cy":940,"r":55,"cap":8,"label":""}])
  },
  luces_fairy_noche: {
    label:"Luces fairy / noche", emoji:"💡", salon:"jardín nocturno · exterior con guirnaldas", pattern:"organic", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-luz-1","tipo":"altar","box":[782,185,1018,335],"label":"Altar luz"},{"id":"camino-luz-1","tipo":"camino","box":[842,330,958,610],"label":"Camino luz","nonPhysical":true},{"id":"guirnalda-1","tipo":"luces","box":[210,200,1590,280],"label":"Guirnalda","nonPhysical":true},{"id":"guirnalda-2","tipo":"luces","box":[210,320,1590,400],"label":"Guirnalda","nonPhysical":true},{"id":"guirnalda-3","tipo":"luces","box":[210,440,1590,520],"label":"Guirnalda","nonPhysical":true},{"id":"guirnalda-4","tipo":"luces","box":[210,560,1590,640],"label":"Guirnalda","nonPhysical":true},{"id":"guirnalda-5","tipo":"luces","box":[210,800,1590,880],"label":"Guirnalda","nonPhysical":true},{"id":"guirnalda-6","tipo":"luces","box":[210,920,1590,1000],"label":"Guirnalda","nonPhysical":true},{"id":"pista-1","tipo":"pista","box":[730,700,1070,940],"label":"Pista iluminada"},{"id":"dj-1","tipo":"escenario","box":[730,960,1070,1030],"label":"DJ / luces"},{"id":"lounge-1","tipo":"living","box":[195,525,460,645],"label":"Rincón cálido"},{"id":"barra-1","tipo":"bar","box":[1340,525,1605,645],"label":"Bar noche"},{"id":"photobooth-1","tipo":"photobooth","box":[760,1030,1040,1090],"label":"Foto neón"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"round","cx":320,"cy":720,"r":53,"cap":8,"label":""},{"tipo":"round","cx":510,"cy":820,"r":53,"cap":8,"label":""},{"tipo":"round","cx":700,"cy":720,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1100,"cy":720,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1290,"cy":820,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1480,"cy":720,"r":53,"cap":8,"label":""},{"tipo":"round","cx":450,"cy":990,"r":53,"cap":8,"label":""},{"tipo":"round","cx":1350,"cy":990,"r":53,"cap":8,"label":""}])
  },
  micro_wedding_boutique: {
    label:"Micro wedding boutique", emoji:"🤍", salon:"boda íntima · restaurante · casa privada", pattern:"banquet_rows", exactReference:true,
    fixed:({W,H})=>exactElements(W,H,[{"id":"entrada-1","tipo":"entrada","box":[850,1080,950,1115],"label":"Entrada"},{"id":"altar-cercano-1","tipo":"altar","box":[790,195,1010,335],"label":"Ceremonia cercana"},{"id":"camino-intimo-1","tipo":"camino","box":[855,340,945,520],"label":"Camino íntimo","nonPhysical":true},{"id":"sillas-intimas-izq","tipo":"sillas_cer","box":[500,355,785,475],"label":"Sillas íntimas"},{"id":"sillas-intimas-der","tipo":"sillas_cer","box":[1015,355,1300,475],"label":"Sillas íntimas"},{"id":"pista-1","tipo":"pista","box":[720,825,1080,995],"label":"Primer baile"},{"id":"dj-1","tipo":"escenario","box":[720,1015,1080,1080],"label":"Música en vivo"},{"id":"lounge-1","tipo":"living","box":[220,790,500,970],"label":"Mini lounge"},{"id":"barra-1","tipo":"bar","box":[1300,790,1580,900],"label":"Bar boutique"},{"id":"buffet-1","tipo":"buffet","box":[1300,925,1580,1035],"label":"Mesa dulce"},{"id":"photobooth-1","tipo":"photobooth","box":[220,990,500,1080],"label":"Libro de firmas"}]),
    exactTables:({W,H})=>exactTables(W,H,[{"tipo":"imperial","box":[530,675,1270,760],"cap":30,"label":"Mesa imperial / 20–45 invitados"}])
  }
};

// Add-ons visuales pro: reemplazan bloques genéricos de lounge por piezas editables
// y suman instrumentos para crear rincones como los mockups realistas: sofás, mesitas, piano y cello.
const PRESET_DECOR_ADDONS = {
  clasica_elegante: { removeTipos:[], items:[
    {id:"piano-clasico-1",tipo:"piano",box:[610,1018,690,1090],label:"Piano"},
    {id:"cello-clasico-1",tipo:"cello",box:[1110,1018,1160,1090],label:"Cello"}
  ]},
  boho_chic: { removeTipos:["living"], items:[
    {id:"sofa3-boho-1",tipo:"sofa_3",box:[1280,710,1565,755],label:"Sofá 3 cuerpos"},
    {id:"sofa2-boho-1",tipo:"sofa_2",box:[1285,780,1460,825],label:"Sofá 2 cuerpos"},
    {id:"mesita-boho-1",tipo:"mesita",box:[1490,770,1560,840],label:"Mesita"}
  ]},
  rustica_campo: { removeTipos:["living"], items:[
    {id:"sofa3-rustico-1",tipo:"sofa_3",box:[1440,790,1620,845],label:"Sofá fogón"},
    {id:"mesita-rustica-1",tipo:"mesita",box:[1510,860,1580,930],label:"Mesita fogón"},
    {id:"sofa2-rustico-1",tipo:"sofa_2",box:[1460,995,1625,1045],label:"Sofá 2 cuerpos"}
  ]},
  jardin_romantico: { removeTipos:["living"], items:[
    {id:"sofa3-jardin-1",tipo:"sofa_3",box:[250,695,470,732],label:"Sofá jardín"},
    {id:"sofa2-jardin-1",tipo:"sofa_2",box:[260,748,380,785],label:"Sofá 2 cuerpos"},
    {id:"mesita-jardin-1",tipo:"mesita",box:[395,742,455,802],label:"Mesita"},
    {id:"piano-jardin-1",tipo:"piano",box:[1075,860,1160,940],label:"Piano"},
    {id:"cello-jardin-1",tipo:"cello",box:[670,860,715,940],label:"Cello"}
  ]},
  vintage_romantico: { removeTipos:["living"], items:[
    {id:"sofa3-vintage-1",tipo:"sofa_3",box:[205,535,395,578],label:"Sofá antiguo"},
    {id:"mesita-vintage-1",tipo:"mesita",box:[270,588,340,658],label:"Mesita"},
    {id:"sofa2-vintage-1",tipo:"sofa_2",box:[210,670,375,718],label:"Sofá 2 cuerpos"},
    {id:"piano-vintage-1",tipo:"piano",box:[650,850,735,925],label:"Piano"},
    {id:"cello-vintage-1",tipo:"cello",box:[1070,850,1125,925],label:"Cello"}
  ]},
  glam_lujo: { removeTipos:["living"], items:[
    {id:"sofa3-glam-1",tipo:"sofa_3",box:[235,1005,430,1060],label:"Sofá VIP"},
    {id:"mesita-glam-1",tipo:"mesita",box:[455,1010,515,1070],label:"Mesita VIP"}
  ]},
  mediterranea: { removeTipos:[], items:[
    {id:"sofa3-mediterranea-1",tipo:"sofa_3",box:[235,980,455,1030],label:"Sofá patio"},
    {id:"mesita-mediterranea-1",tipo:"mesita",box:[480,980,545,1045],label:"Mesita"}
  ]},
  japandi: { removeTipos:["living"], items:[
    {id:"sofa2-japandi-1",tipo:"sofa_2",box:[260,955,440,1000],label:"Sofá té"},
    {id:"mesita-japandi-1",tipo:"mesita",box:[330,1010,395,1075],label:"Mesita té"}
  ]},
  fiesta_latina: { removeTipos:["living"], items:[
    {id:"sofa3-fiesta-1",tipo:"sofa_3",box:[1365,220,1580,265],label:"Sofá descanso"},
    {id:"mesita-fiesta-1",tipo:"mesita",box:[1460,275,1530,345],label:"Mesita"},
    {id:"piano-fiesta-1",tipo:"piano",box:[600,200,685,300],label:"Teclado / piano"}
  ]},
  luces_fairy_noche: { removeTipos:["living"], items:[
    {id:"sofa3-luces-1",tipo:"sofa_3",box:[215,540,435,580],label:"Sofá cálido"},
    {id:"sofa2-luces-1",tipo:"sofa_2",box:[225,610,380,650],label:"Sofá 2 cuerpos"},
    {id:"mesita-luces-1",tipo:"mesita",box:[392,590,455,653],label:"Mesita"}
  ]},
  micro_wedding_boutique: { removeTipos:["living"], items:[
    {id:"sofa3-micro-1",tipo:"sofa_3",box:[235,810,455,855],label:"Sofá boutique"},
    {id:"sofa2-micro-1",tipo:"sofa_2",box:[235,905,405,950],label:"Sofá 2 cuerpos"},
    {id:"mesita-micro-1",tipo:"mesita",box:[420,880,480,940],label:"Mesita"},
    {id:"piano-micro-1",tipo:"piano",box:[635,1000,715,1080],label:"Piano"},
    {id:"cello-micro-1",tipo:"cello",box:[1090,1000,1140,1080],label:"Cello"}
  ]}
};
Object.entries(PRESET_DECOR_ADDONS).forEach(([presetId,cfg])=>{
  const base = STAGE2_PRESET_CONFIGS[presetId];
  if(!base || typeof base.fixed !== "function") return;
  const originalFixed = base.fixed;
  base.fixed = ({W,H}) => {
    const removeTipos = new Set(cfg.removeTipos||[]);
    const removeIds = new Set(cfg.removeIds||[]);
    const baseItems = originalFixed({W,H}).filter(el => !removeTipos.has(el.tipo) && !removeIds.has(el.id));
    const addonItems = exactElements(W,H,cfg.items||[]).map(el=>({...el, locked:false, editable:true, addonDecor:true}));
    return [...baseItems, ...addonItems];
  };
});

STAGE2_PRESET_CONFIGS.jardin_romantico_central = STAGE2_PRESET_CONFIGS.clasica_elegante;
const PRESET_STAGE2_ORDER = ["clasica_elegante","boho_chic","rustica_campo","minimalista_moderno","jardin_romantico","playa_tropical","industrial_chic","vintage_romantico","glam_lujo","mediterranea","japandi","eco_sustentable","fiesta_latina","luces_fairy_noche","micro_wedding_boutique"];

// ── Guía de presets: sugerencia de ESPACIO ideal + inspiración ──────────────
// Cada estilo es REFERENCIAL: sirve como punto de partida para inspirarse. La
// idea del "espacio" es orientar en qué tipo de venue rinde mejor cada plano.
// vibe = etiqueta corta de estética · espacio = dónde funciona · idealPax = rango
// cómodo de invitados · tip = frase de inspiración que se muestra al elegirlo.
const PRESET_GUIDE = {
  clasica_elegante:{ vibe:"Clásico · elegante", espacio:"Salón formal, hotel o ballroom rectangular", idealPax:"120–250", tip:"Eje central ceremonial, mesa de novios destacada y pista protagonista. Es el preset más equilibrado y protocolar." },
  boho_chic:{ vibe:"Boho · orgánico", espacio:"Jardín, terraza, quinta o carpa relajada", idealPax:"80–180", tip:"Mesas largas, alfombras y lounge bajo para una boda cálida, descontracturada y fotogénica." },
  rustica_campo:{ vibe:"Rústico · campo", espacio:"Estancia, quincho, granero chic o jardín amplio", idealPax:"100–220", tip:"Tablones comunitarios, buffet/parrilla y zona lounge para un clima de campo elegante." },
  minimalista_moderno:{ vibe:"Minimal · moderno", espacio:"Loft blanco, galería o salón contemporáneo", idealPax:"100–200", tip:"Pocas piezas, mucho aire y líneas limpias. Ideal si querés que el plano se vea editorial y ordenado." },
  jardin_romantico:{ vibe:"Jardín · romántico", espacio:"Jardín techado, pérgola o carpa clara", idealPax:"100–220", tip:"La vegetación, las luces y el camino floral ordenan el espacio en micro-escenas románticas." },
  playa_tropical:{ vibe:"Tropical · playa", espacio:"Resort, playa, deck o terraza con vista", idealPax:"80–180", tip:"Altar orientado al horizonte, mesas livianas y barra fresca. Priorizá sombra y circulación informal." },
  industrial_chic:{ vibe:"Industrial · urbano", espacio:"Galpón, warehouse, loft o espacio de ladrillo/hierro", idealPax:"120–240", tip:"Pista central, escenario visible, barras laterales y estética fuerte de luces/truss." },
  vintage_romantico:{ vibe:"Vintage · íntimo", espacio:"Casa antigua, salón boutique o jardín pequeño", idealPax:"60–160", tip:"Rincones de fotos, lounge antiguo y mesas pequeñas para una boda familiar y nostálgica." },
  glam_lujo:{ vibe:"Glam · lujo", espacio:"Ballroom premium, salón oscuro o gala nocturna", idealPax:"150–300", tip:"Gran pista, recorrido de impacto, simetría y elementos dorados/escénicos." },
  mediterranea:{ vibe:"Mediterráneo · familiar", espacio:"Terraza, patio europeo, jardín o salón abierto", idealPax:"80–180", tip:"Plaza central, olivos/limoneros y mesas conversacionales para sensación de sobremesa europea." },
  japandi:{ vibe:"Japandi · zen", espacio:"Espacio boutique, minimal cálido o restaurante elegante", idealPax:"50–140", tip:"Simplicidad, mesas lineales y vegetación puntual. Ideal para una boda serena y muy cuidada." },
  eco_sustentable:{ vibe:"Eco · natural", espacio:"Jardín, carpa natural o venue sustentable", idealPax:"80–180", tip:"Plantas vivas, estaciones reutilizables, reciclaje/compost y mesas compartidas." },
  fiesta_latina:{ vibe:"Fiesta · latina", espacio:"Salón social, club o venue con buena pista", idealPax:"120–250", tip:"La pista domina el centro y todas las mesas miran hacia la celebración. Pensado para energía alta." },
  luces_fairy_noche:{ vibe:"Noche · fairy lights", espacio:"Jardín nocturno, patio o exterior con guirnaldas", idealPax:"100–220", tip:"Las guirnaldas ordenan el plano visualmente y crean rincones cálidos alrededor de la pista." },
  micro_wedding_boutique:{ vibe:"Boutique · íntimo", espacio:"Restaurante, casa privada o salón pequeño", idealPax:"20–80", tip:"Mesa imperial, ceremonia cercana y experiencia muy personalizada. Todo queda cerca y cuidado." },
  jardin_romantico_central:{ vibe:"Clásico · elegante", espacio:"Salón formal, hotel o ballroom rectangular", idealPax:"120–250", tip:"Alias de compatibilidad del preset Clásica elegante." }
};
const getPresetGuide = (id) => PRESET_GUIDE[id] || { vibe:"", espacio:"", idealPax:"", tip:"" };

const getRecommendedTableTypeForPreset = (presetId, guestCount=150, roomSizeOption="recommended") => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  const chosen = roomSizeOption === "compact" && cfg.compact ? cfg.compact : (cfg.recommended || "round_180_comfort");
  return {...TABLE_TYPES[chosen], id: chosen};
};
const getStage2TablePlan = (presetId, guestCount=150, roomSizeOption="recommended", tableTypeId="auto") => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  if(tableTypeId && tableTypeId !== "auto") {
    const t = {...TABLE_TYPES[tableTypeId], id:tableTypeId};
    return [{type:t,count:getRequiredTables(guestCount,t),label:""}];
  }
  if(cfg.mixed){
    const rect = {...TABLE_TYPES.rectangular_12,id:"rectangular_12"};
    const round = {...TABLE_TYPES[cfg.mixed.roundType || "round_180_comfort"], id: cfg.mixed.roundType || "round_180_comfort"};
    const rectSeats = Math.floor(guestCount * cfg.mixed.rectRatio);
    const rectCount = Math.max(1, Math.floor(rectSeats / rect.capacity));
    const remaining = Math.max(0, guestCount - rectCount * rect.capacity);
    const roundCount = Math.max(1, Math.ceil(remaining / round.capacity));
    return [{type:rect,count:rectCount,label:"Rect."},{type:round,count:roundCount,label:"Red."}];
  }
  const t = getRecommendedTableTypeForPreset(presetId, guestCount, roomSizeOption);
  return [{type:t,count:getRequiredTables(guestCount,t),label:""}];
};
const generateFixedElements = (presetId, W, H, guestCount, roomSizeOption="recommended") => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  return (cfg.fixed?.({W,H,guestCount,roomSizeOption}) || []).map(el=>({
    ...el,
    mx:+clampStage2Box(el.mx,0,Math.max(0,W-(el.ew||0))).toFixed(2),
    my:+clampStage2Box(el.my,0,Math.max(0,H-(el.eh||0))).toFixed(2)
  }));
};

// Márgenes de circulación alrededor de cada elemento fijo (metros). Representan
// el pasillo de servicio/paso real. Antes eran demasiado grandes (baños 4 m,
// entrada 3 m) y tapaban casi todo el salón, dejando 0 slots válidos para mesas.
// Ajustados a valores de venue real: ~1–1.5 m de paso de mozos.
const stage2MarginByType = {
  pista:1.2, banios:1.2, entrada:1.2, bar:1, buffet:1, escenario:1.2,
  novios:1, torta:1, photobooth:1, living:1, activacion:1,
  cabina360:1, guardarropa:0.8, proveedores:0.8, mozos:0.8
};
const generateMainAisleZone = (layout={}) => {
  const W=layout.salonW||22, H=layout.salonH||16, els=layout.elementos||[];
  const entrada=els.find(e=>e.tipo==="entrada"), pista=els.find(e=>e.tipo==="pista");
  if(!entrada||!pista) return null;
  const ec=stage2FixedCollisionItem(entrada), pc=stage2FixedCollisionItem(pista);
  return {id:"main_aisle",type:"forbidden",source:"pasillo_principal",x:(ec.x+pc.x)/2,y:(ec.y+pc.y)/2,width:2,height:Math.max(1,Math.abs(ec.y-pc.y)+1)};
};
const generateDjSightlineZone = (layout={}) => {
  const els=layout.elementos||[];
  const dj=els.find(e=>e.tipo==="escenario"), pista=els.find(e=>e.tipo==="pista");
  if(!dj||!pista) return null;
  const dc=stage2FixedCollisionItem(dj), pc=stage2FixedCollisionItem(pista);
  return {id:"dj_sightline",type:"forbidden",source:"corredor_visual_dj",x:pc.x,y:(dc.y+pc.y)/2,width:Math.min(dj.ew||3,pista.ew||3)+0.5,height:Math.max(1,Math.abs(pc.y-dc.y))};
};
const generateForbiddenZones = (layout={}) => {
  const els = layout.elementos || [];
  const zones=[];
  for(const el of els){
    if(el.nonPhysical) continue;
    const margin = stage2MarginByType[el.tipo] ?? 1.2;
    zones.push(expandZone(el, margin));
  }
  const aisle=generateMainAisleZone(layout); if(aisle) zones.push(aisle);
  const sight=generateDjSightlineZone(layout); if(sight) zones.push(sight);
  return zones;
};
const generateHardForbiddenZones = (layout={}) => generateForbiddenZones(layout);

const generateTableZonesForPreset = (presetId, W, H, fixedElements=[]) => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  const base = (cfg.zones?.({W,H,fixedElements}) || []).filter(z=>z.xMax>z.xMin && z.yMax>z.yMin).map((z,idx)=>({
    ...z,
    priority: z.priority ?? (idx+1),
    align: z.align || cfg.pattern || "grid",
    pattern: z.pattern || cfg.pattern || "grid"
  }));
  // La zona de desborde queda última. Solo se usa si faltan mesas.
  const fallbackAlign = cfg.pattern === "ring" ? "ring" : (cfg.pattern === "chevron" ? "chevron" : (cfg.pattern === "banquet_rows" ? "banquet_rows" : (cfg.pattern === "symmetric" ? "symmetric" : "organic")));
  return [...base, {id:"segunda_fila_exterior", xMin:1.5, xMax:W-1.5, yMin:1.5, yMax:H-1.5, priority:50, align:fallbackAlign, pattern:fallbackAlign, fallback:true}];
};

const generateRingSlots = (zone, tableType, W, H, fixedElements=[], spacing=1.5) => {
  const pista = fixedElements.find(e=>e.tipo==="pista");
  if(!pista) return [];
  const cx=pista.mx+pista.ew/2, cy=pista.my+pista.eh/2;
  const opW=tableType.operationalWidth||2.8, opH=tableType.operationalHeight||2.8;
  const base=Math.max(opW,opH)+spacing;
  const slots=[];
  const rings=[1.5,1.5+base,1.5+base*2,1.5+base*3];
  for(let rIndex=0;rIndex<rings.length;rIndex++){
    const rx=pista.ew/2+rings[rIndex]+opW/2;
    const ry=pista.eh/2+rings[rIndex]+opH/2;
    const count=Math.max(8,Math.round((Math.PI*2*Math.max(rx,ry))/base));
    for(let i=0;i<count;i++){
      const angleDeg=25 + (310*i/count);
      if(angleDeg>250 && angleDeg<290) continue; // deja libre la entrada inferior
      const a=angleDeg*Math.PI/180;
      const x=cx+Math.cos(a)*rx, y=cy+Math.sin(a)*ry;
      if(x<zone.xMin||x>zone.xMax||y<zone.yMin||y>zone.yMax) continue;
      slots.push({x:+x.toFixed(2),y:+y.toFixed(2),priority:zone.priority||1,zoneId:zone.id,ring:rIndex,angle:angleDeg,pattern:"ring",score:rIndex*100+i});
    }
  }
  return slots;
};
const generateGridSlots = (zone, tableType, W, H, spacing=1.5) => {
  const opW=tableType.operationalWidth || tableType.width || tableType.realDiameter || 2.8;
  const opH=tableType.operationalHeight || tableType.height || tableType.realDiameter || 2.8;
  const stepX=opW+spacing;
  const stepY=opH+spacing;
  const slots=[];
  let row=0;
  for(let y=zone.yMin+opH/2; y<=zone.yMax-opH/2+0.01; y+=stepY){
    const organicOffset=(zone.align==="organic"||zone.pattern==="organic"||zone.pattern==="organic_controlled") && row%2===1 ? stepX/2 : 0;
    for(let x=zone.xMin+opW/2+organicOffset; x<=zone.xMax-opW/2+0.01; x+=stepX){
      const side=x<W/2?"L":(x>W/2?"R":"C");
      slots.push({x:+x.toFixed(2),y:+y.toFixed(2),priority:zone.priority||1,zoneId:zone.id,label:zone.label||"",side,row,pattern:zone.pattern||zone.align||"grid",fallback:!!zone.fallback});
    }
    row++;
  }
  return slots;
};
// Slots en espiga / chevron: mesas escalonadas formando una V hacia el centro
// del salón. Se construye con la huella operativa real, así que las mesas nunca
// se enciman (a diferencia de rotar tablones a 45°, que rompería las colisiones).
// El escalonado en X por fila crea el efecto diagonal manteniendo el grid válido.
const generateChevronSlots = (zone, tableType, W, H, spacing=1.5) => {
  const opW=tableType.operationalWidth || tableType.width || tableType.realDiameter || 2.8;
  const opH=tableType.operationalHeight || tableType.height || tableType.realDiameter || 2.8;
  const stepX=opW+spacing;
  const stepY=opH+spacing;
  const cx=(zone.xMin+zone.xMax)/2;
  const slots=[];
  let row=0;
  for(let y=zone.yMin+opH/2; y<=zone.yMax-opH/2+0.01; y+=stepY){
    // Cada fila se abre en V: se corre hacia afuera según la profundidad.
    const shift=row*(stepX*0.5);
    for(let side of [-1,1]){
      // Rama izquierda y derecha de la V, desde el centro hacia los lados.
      let x = cx + side*(opW/2 + shift);
      let guard=0;
      while(x>=zone.xMin+opW/2-0.01 && x<=zone.xMax-opW/2+0.01 && guard<20){
        slots.push({x:+x.toFixed(2),y:+y.toFixed(2),priority:zone.priority||1,zoneId:zone.id,label:zone.label||"",side:x<W/2?"L":(x>W/2?"R":"C"),row,pattern:"chevron",fallback:!!zone.fallback,chevDepth:row});
        x += side*stepX;
        guard++;
      }
    }
    row++;
  }
  // Dedup por si las ramas se solapan en el centro en filas iniciales.
  const seen=new Set();
  return slots.filter(s=>{const k=`${s.x}_${s.y}`; if(seen.has(k)) return false; seen.add(k); return true;});
};
const generateTableSlots = (tableZones=[], tableType=TABLE_TYPES.round_180_comfort, W=22, H=16, fixedElements=[], opts={}) => {
  const spacing=opts.spacing ?? 1.5;
  const zones=[...tableZones].sort((a,b)=>(a.priority||9)-(b.priority||9));
  const slots=[];
  for(const z of zones){
    if(z.align==="ring" || z.pattern==="ring") slots.push(...generateRingSlots(z,tableType,W,H,fixedElements,spacing));
    else if(z.align==="chevron" || z.pattern==="chevron") slots.push(...generateChevronSlots(z,tableType,W,H,spacing));
    else slots.push(...generateGridSlots(z,tableType,W,H,spacing));
  }
  return slots.map((s,idx)=>({...s,id:s.id||`${s.zoneId}_${idx}`,centerBias:Math.abs((s.x||0)-W/2)}));
};
// Malla fina de respaldo: barre TODO el salón con un paso chico (0.5 m) y
// propone un candidato por celda. El validador de colisiones descarta los que
// pisan pista/servicios/otras mesas, así que esta malla encuentra los huecos
// reales entre los elementos fijos en vez de depender de zonas predefinidas.
// Es la red de seguridad que garantiza que el preset llene el salón.
const generateDenseFallbackSlots = (W,H,tableType,fixedElements=[]) => {
  const opW=tableType.operationalWidth || tableType.width || tableType.realDiameter || 2.8;
  const opH=tableType.operationalHeight || tableType.height || tableType.realDiameter || 2.8;
  const stepScan=0.5;
  const slots=[];
  let idx=0;
  for(let y=opH/2+0.5; y<=H-opH/2-0.5+0.01; y+=stepScan){
    for(let x=opW/2+0.5; x<=W-opW/2-0.5+0.01; x+=stepScan){
      slots.push({x:+x.toFixed(2),y:+y.toFixed(2),priority:80,zoneId:"malla_fina",label:"",side:x<W/2?"L":(x>W/2?"R":"C"),row:0,pattern:"organic",fallback:true,id:`malla_${idx++}`,centerBias:Math.abs(x-W/2)+Math.abs(y-H/2)*0.3});
    }
  }
  // Ordenar de arriba-centro hacia afuera para un llenado prolijo.
  return slots.sort((a,b)=>a.centerBias-b.centerBias);
};
const sortSlotsByPresetLogic = (slots=[], presetId="clasica_elegante", W=22) => {
  const cfg=STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  const pattern=cfg.pattern || "grid";
  const base=[...slots];
  if(pattern==="symmetric" || ["luxury_ballroom_simetrico","glam_black_gold","garden_tent_formal","romantic_circular_flow"].includes(presetId)){
    return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || Math.round(a.y*2)-Math.round(b.y*2) || Math.abs(a.x-W/2)-Math.abs(b.x-W/2) || (a.x-b.x));
  }
  if(pattern==="ring") return base.sort((a,b)=>(a.ring||0)-(b.ring||0) || (a.angle||0)-(b.angle||0));
  if(pattern==="chevron") return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || (a.chevDepth||0)-(b.chevDepth||0) || Math.abs(a.x-W/2)-Math.abs(b.x-W/2) || (a.y-b.y));
  if(pattern==="banquet_rows") return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || (a.y-b.y) || (a.x-b.x));
  if(pattern==="organic") return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || (a.score||0)-(b.score||0) || (a.y-b.y) || (a.x-b.x));
  return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || Math.abs(a.x-W/2)-Math.abs(b.x-W/2) || (a.y-b.y) || (a.x-b.x));
};
const slotIsValidForTable = (slot, placedTables, forbiddenZones, tableType, W, H) => {
  const temp = stage2TableFromSlot(slot,999,tableType);
  const candidate = stage2TableCollisionItem(temp);
  if(!isInsideRoom(candidate,W,H)) return false;
  if((forbiddenZones||[]).some(z=>boxesOverlap(candidate,z,0))) return false;
  return !(placedTables||[]).some(m=>boxesOverlap(candidate,stage2TableCollisionItem(m),0.2));
};
const chooseBestSlot = (validSlots, placed, presetId, W) => {
  if(!validSlots.length) return null;
  const cfg=STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  const symmetric = cfg.pattern === "symmetric" || ["luxury_ballroom_simetrico","glam_black_gold","garden_tent_formal","romantic_circular_flow","jardin_romantico_central"].includes(presetId);
  if(!symmetric) return validSlots[0];
  const left=placed.filter(t=>t.mx<W/2-.15).length;
  const right=placed.filter(t=>t.mx>W/2+.15).length;
  const prefer = left>right ? "R" : right>left ? "L" : null;
  if(prefer){
    const preferred=validSlots.find(s=>s.side===prefer || (prefer==="L"?s.x<W/2:s.x>W/2));
    if(preferred) return preferred;
  }
  return validSlots[0];
};
const placeTablesInSlots = (requiredTables, slots=[], forbiddenZones=[], tableType=TABLE_TYPES.round_180_comfort, W=22, H=16, startId=1, labelPrefix="", opts={}) => {
  const presetId=opts.presetId || "clasica_elegante";
  const placed=[...(opts.existingTables||[])];
  const newlyPlaced=[];
  const ordered=sortSlotsByPresetLogic(slots,presetId,W).map(s=>({...s,used:false}));
  for(let i=0;i<requiredTables;i++){
    const candidates=ordered.filter(s=>!s.used && slotIsValidForTable(s,placed,forbiddenZones,tableType,W,H));
    const chosen=chooseBestSlot(candidates,newlyPlaced,presetId,W);
    if(!chosen) return {placed:newlyPlaced,success:false,missingTables:requiredTables-newlyPlaced.length};
    chosen.used=true;
    const t=stage2TableFromSlot(chosen,startId+newlyPlaced.length,tableType,chosen.label||labelPrefix);
    newlyPlaced.push(t);
    placed.push(t);
  }
  return {placed:newlyPlaced,success:true,missingTables:0};
};
const validateLayout = (layout={}) => {
  const warnings=[];
  const guestCount=layout.guestCount||0;
  const mesas=layout.mesas||[];
  const capacity=calculateSeatedCapacity(mesas);
  if(!layout.formatCocktail && capacity<guestCount) warnings.push(`Capacidad insuficiente: ${capacity}/${guestCount} asientos.`);
  const forbidden=generateForbiddenZones(layout);
  for(const m of mesas){
    const item=stage2TableCollisionItem(m);
    if(!isInsideRoom(item,layout.salonW||22,layout.salonH||16)) warnings.push(`Mesa ${m.id} queda fuera del salón.`);
    const hit=forbidden.find(z=>boxesOverlap(item,z,0));
    if(hit) warnings.push(`Mesa ${m.id} invade zona prohibida: ${hit.source || hit.id}.`);
  }
  for(let i=0;i<mesas.length;i++) for(let j=i+1;j<mesas.length;j++){
    if(boxesOverlap(stage2TableCollisionItem(mesas[i]),stage2TableCollisionItem(mesas[j]),0.2)) warnings.push(`Mesas ${mesas[i].id} y ${mesas[j].id} están superpuestas.`);
  }
  const els=layout.elementos||[];
  const novios=els.find(e=>e.tipo==="novios"), dj=els.find(e=>e.tipo==="escenario"), pista=els.find(e=>e.tipo==="pista");
  if(novios&&dj){
    const nc=stage2FixedCollisionItem(novios), dc=stage2FixedCollisionItem(dj);
    const overlapX=Math.abs(nc.x-dc.x)<(novios.ew+dj.ew)*0.32;
    if(nc.y>dc.y && overlapX) warnings.push("La mesa de novios quedó detrás o debajo del DJ.");
  }
  if(dj&&pista){
    const dc=stage2FixedCollisionItem(dj), pc=stage2FixedCollisionItem(pista);
    if(Math.hypot(dc.x-pc.x,dc.y-pc.y)>Math.max(8,(layout.salonW||22)*.55)) warnings.push("El DJ queda demasiado desconectado de la pista.");
  }
  const cfg=STAGE2_PRESET_CONFIGS[layout.presetId] || {};
  if(cfg.pattern==="symmetric" || ["luxury_ballroom_simetrico","glam_black_gold","garden_tent_formal","romantic_circular_flow"].includes(layout.presetId)){
    const left=mesas.filter(m=>m.mx<(layout.salonW||22)/2-.2).length;
    const right=mesas.filter(m=>m.mx>(layout.salonW||22)/2+.2).length;
    if(Math.abs(left-right)>1) warnings.push(`El preset simétrico quedó desbalanceado: ${left} mesas a la izquierda y ${right} a la derecha.`);
  }
  return {valid:warnings.length===0,warnings:[...new Set(warnings)],capacity};
};
const generateWeddingLayoutCore = ({presetId="clasica_elegante",guestCount=150,roomSizeOption="recommended",tableType="auto",format="dinner",musicType="dj",coupleTableType="sweetheart"}={}) => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.clasica_elegante;
  const room = cfg.exactReference ? getExactReferenceRoomSize(guestCount,roomSizeOption) : getRoomSize(guestCount,roomSizeOption);
  const W=room.W, H=room.H;
  const fixedElements=generateFixedElements(presetId,W,H,guestCount,roomSizeOption);

  // Modo referencia exacta: se usa la misma disposición de los JPG, sin motor
  // de slots ni fallback denso. Así no se rompen la simetría ni las relaciones
  // entre altar, pista, mesas, barras, lounge y escenario.
  if(cfg.exactReference && typeof cfg.exactTables === "function"){
    const allTables = cfg.exactTables({W,H,guestCount,roomSizeOption,tableType}) || [];
    const capacity = calculateSeatedCapacity(allTables);
    const layout={
      salonW:W, salonH:H, salonShape:"rectangulo", salonShapeConfig:DEFAULT_SALON_SHAPE_CONFIG,
      presetId, presetTitle:cfg.label, guestCount, roomSizeOption, roomSizeLabel:room.label,
      area:room.area, tableTypeId:"preset_editable", tablePlan:[{id:"preset_editable",label:"Distribución del estilo",count:allTables.length,capacity}],
      format, musicType, coupleTableType, estiloDistrib:presetId, estiloDecor:presetId,
      elementos:fixedElements, mesas:allTables
    };
    const summary={
      preset:cfg.label,
      invitados:guestCount,
      salon:room.label,
      medidas:`${W} × ${H} m`,
      area:room.area,
      tipoMesa:"Distribución base del estilo",
      mesasRequeridas:allTables.length,
      mesasGeneradas:allTables.length,
      capacidadPorMesa:"editable por mesa",
      capacidadSentada:capacity,
      estado:"listo para editar",
      alertas: capacity < guestCount ? ["Este estilo prioriza una pista amplia y zonas sociales. Para más capacidad, agregá mesas, aumentá la capacidad de algunas mesas o elegí un salón más amplio."] : []
    };
    return {...layout, layoutSummary:summary, overflowTables:capacity<guestCount, maxPresetSeats:capacity};
  }

  const zones=generateTableZonesForPreset(presetId,W,H,fixedElements);
  const plan=getStage2TablePlan(presetId,guestCount,roomSizeOption,tableType);
  let allTables=[];
  const placementWarnings=[];
  for(const part of plan){
    // Colocación acumulativa: cada pasada agrega mesas sin descartar las ya
    // ubicadas. Antes, si una pasada fallaba, el reintento reiniciaba desde 0 y
    // volvía a fallar igual — por eso los presets quedaban con 0 o 1 mesa.
    let placedForPart=[];
    const runPass=(slotSet)=>{
      const stillNeeded=part.count-placedForPart.length;
      if(stillNeeded<=0) return;
      const forbidden=generateForbiddenZones({salonW:W,salonH:H,elementos:fixedElements,mesas:[...allTables,...placedForPart],guestCount});
      const r=placeTablesInSlots(stillNeeded,slotSet,forbidden,part.type,W,H,allTables.length+placedForPart.length+1,part.label||"",{presetId,existingTables:[...allTables,...placedForPart]});
      placedForPart=[...placedForPart,...(r.placed||[])];
    };
    runPass(generateTableSlots(zones,part.type,W,H,fixedElements,{spacing:1.5}));
    if(placedForPart.length<part.count) runPass(generateTableSlots(zones,part.type,W,H,fixedElements,{spacing:1.2}));
    if(placedForPart.length<part.count) runPass(generateDenseFallbackSlots(W,H,part.type,fixedElements));
    allTables=[...allTables,...placedForPart];
    if(placedForPart.length<part.count) placementWarnings.push(`Faltan ${part.count-placedForPart.length} mesas de ${part.type.label} para este preset.`);
  }
  const layout={
    salonW:W, salonH:H, salonShape:"rectangulo", salonShapeConfig:DEFAULT_SALON_SHAPE_CONFIG,
    presetId, presetTitle:cfg.label, guestCount, roomSizeOption, roomSizeLabel:room.label,
    area:room.area, tableTypeId:tableType, tablePlan:plan.map(p=>({id:p.type.id,label:p.type.label,count:p.count,capacity:p.type.capacity})),
    format, musicType, coupleTableType, estiloDistrib:presetId, estiloDecor:presetId,
    elementos:fixedElements, mesas:allTables
  };
  const validation=validateLayout(layout);
  const requiredTables = plan.reduce((s,p)=>s+p.count,0);
  const summary={
    preset:cfg.label, invitados:guestCount, salon:room.label, medidas:`${W} × ${H} m`, area:room.area,
    tipoMesa: plan.map(p=>`${p.type.label} × ${p.count}`).join(" + "), mesasRequeridas: requiredTables,
    mesasGeneradas: allTables.length, capacidadPorMesa: plan.map(p=>`${p.type.capacity || "cocktail"}`).join(" / "),
    capacidadSentada:validation.capacity, estado:validation.valid?"válido":"revisar", alertas:[...placementWarnings,...validation.warnings]
  };
  if(summary.capacidadSentada<guestCount) summary.alertas.push("Este preset necesita un salón más grande, mesas más compactas o menos invitados. No se invadió pista, baños, entrada ni corredor DJ/pista para forzar mesas.");
  if(cfg.warning250 && guestCount>=250) summary.alertas.push(cfg.warning250);
  if(plan.some(p=>p.type.warning)) summary.alertas.push(...plan.filter(p=>p.type.warning).map(p=>p.type.warning));
  summary.alertas=[...new Set(summary.alertas)];
  return {...layout, layoutSummary:summary, overflowTables: allTables.length<requiredTables, maxPresetSeats:validation.capacity};
};

// Wrapper con auto-escalado: si el tamaño elegido no alcanza a sentar a todos,
// va probando salones más grandes (recommended → spacious → premium) hasta
// cubrir la capacidad. Así "Generar plano" siempre entrega un plano usable en
// vez de uno con la mitad de las mesas. Respeta el tamaño que el usuario pidió
// como piso: nunca achica por debajo de su elección.
const ROOM_SIZE_LADDER = ["compact","recommended","spacious","premium"];
const generateWeddingLayout = (params={}) => {
  const requested = params.roomSizeOption || "recommended";
  const startIdx = Math.max(0, ROOM_SIZE_LADDER.indexOf(requested));
  const guestCount = params.guestCount || 150;
  let best = null;
  for(let i=startIdx; i<ROOM_SIZE_LADDER.length; i++){
    const attempt = generateWeddingLayoutCore({...params, roomSizeOption: ROOM_SIZE_LADDER[i]});
    const cap = attempt.maxPresetSeats || 0;
    // Nos quedamos con el mejor intento visto por si ninguno cubre del todo.
    if(!best || cap > (best.maxPresetSeats||0)) best = attempt;
    // Cocktail no necesita cubrir asientos 1:1.
    if(attempt.layoutSummary?.capacidadSentada >= guestCount || params.format === "cocktail") { best = attempt; break; }
  }
  if(best && (best.maxPresetSeats||0) < guestCount && best.format !== "cocktail"){
    best.layoutSummary = best.layoutSummary || {alertas:[]};
    best.layoutSummary.alertas = [...new Set([...(best.layoutSummary.alertas||[]),
      `Este estilo, tal como está armado, queda corto para ${guestCount} invitados: hoy contempla ${best.maxPresetSeats} asientos. Podés agregar mesas, subir capacidad por mesa, reducir invitados o elegir un estilo con más mesas.`])];
  }
  return best || generateWeddingLayoutCore(params);
};


const makeElementsEditable = (items=[]) => Array.isArray(items) ? items.map(el=>({
  ...el,
  locked:false,
  editable:true
})) : [];

const ELEMENT_RECOMMENDATIONS = {
  pista:["Dejá la pista como zona libre: no pongas mesas ni estaciones encima.","Funciona mejor cerca del DJ/banda y visible desde la mayoría de las mesas.","Dejá al menos 1–1,5 m de circulación alrededor para que la gente entre y salga cómoda."],
  escenario:["Ubicalo mirando a la pista, no contra mesas importantes.","Evitá que barras o buffet bloqueen la visual entre DJ/banda y pista.","Dejá espacio técnico atrás o a un costado para cables, parlantes y proveedores."],
  bar:["Conviene ubicarlo cerca de la fiesta, pero sin invadir la pista.","Dejá frente libre para fila y servicio; no pegues mesas directamente delante.","Si la boda es grande, duplicá barra o agregá estación de bebidas en el lado opuesto."],
  buffet:["Necesita pasillo amplio para filas y circulación de mozos.","Mejor en lateral o fondo, no atravesando el eje principal de entrada.","Separalo de la pista para evitar cruces entre servicio y baile."],
  novios:["La mesa de novios debe ver el salón y quedar cerca de pista/escenario.","Ubicala como punto de referencia visual, no escondida en una esquina.","Familia directa y padrinos suelen ir en mesas cercanas."],
  altar:["Mantené un eje claro desde la entrada o camino central hasta el altar.","Dejá aire lateral para cortejo, fotos y músicos.","Evitá poner buffet, bar o baños demasiado cerca del momento ceremonial."],
  camino:["Debe quedar despejado de mesas y estaciones.","Funciona mejor si conecta entrada, altar o punto focal.","Usalo como guía visual: flores, alfombra o luces pueden reforzar el recorrido."],
  photobooth:["Ubicalo en un lugar visible, pero fuera del flujo principal de mozos.","Dejá espacio frontal para grupos y fila.","Cerca del lounge o barra suele funcionar bien para activar la experiencia."],
  living:["El lounge debe descansar del ruido de la pista, pero seguir conectado visualmente.","No lo encierres detrás de mesas; dejá un acceso claro.","Sumá luces o flores alrededor para que se sienta como rincón de foto."],
  sofa_2:["Ideal para rincones íntimos de 2–3 personas o para acompañar un sector de fotos.","Ubicalo con una mesita cercana, pero sin bloquear la circulación.","Funciona muy bien en lounges, áreas de descanso y rincones acústicos."],
  sofa_3:["Usalo como pieza principal del lounge: deja un frente libre para conversación y fotos.","Combiná con una mesita y otro sofá/sillón para crear una isla de descanso.","Evitá pegarlo a mesas de invitados; debe sentirse como zona social separada."],
  mesita:["Debe acompañar sofás o sillones, no quedar aislada en medio del paso.","Sirve para velas, flores, programa de ceremonia o bebidas de bienvenida.","Dejá espacio alrededor para que los invitados puedan sentarse y circular."],
  piano:["Ubicalo cerca del altar, lounge o escenario si habrá música en vivo.","Dejá espacio lateral para el pianista, banqueta y cables/micrófonos.","No lo pongas en el flujo principal de mozos ni demasiado cerca de la pista."],
  cello:["Funciona como detalle musical premium junto al piano, altar o trío acústico.","Dejá espacio para atril y silla del músico.","Ideal para ceremonias íntimas, recepciones elegantes y rincones románticos."],
  torta:["La mesa de torta debe tener buen fondo para fotos.","No la pegues a la pista si hay mucho movimiento.","Dejá espacio frontal para corte simbólico y fotos familiares."],
  entrada:["La entrada necesita lectura clara: bienvenida, circulación y primer impacto.","No bloquees la entrada con mesas grandes.","Cerca de regalos, seating o bienvenida funciona muy bien."],
  banios:["Los baños deben estar señalizados y accesibles, pero no protagonistas visuales.","Dejá pasillo libre y evitá mesas pegadas a la puerta.","Conviene ubicarlos en perímetro o zona de servicio."],
  sillas_cer:["Mantené simetría respecto al camino central.","Dejá pasillos laterales para cortejo y fotógrafos.","No invadas el altar ni bloquees la salida hacia recepción."],
  luces:["Las luces pueden marcar ejes visuales sin ocupar circulación.","Usalas para unir pista, mesas y lounge en una misma atmósfera.","En exterior, también ayudan a guiar recorridos."],
  flores:["Usalas como acento, no como obstáculo.","Funcionan bien en entradas, altar, mesa de novios y rincones de foto.","Repetí flores simétricas si querés una sensación más elegante."],
  backing:["Debe mirar hacia el flujo de invitados y tener espacio para fotos.","Evitá ponerlo de espaldas a la circulación principal.","Sumale iluminación o flores si querés más impacto visual."],
};

const getElementRecommendations = (el={}, ctx={}) => {
  const base = ELEMENT_RECOMMENDATIONS[el.tipo] || [
    "Dejá circulación libre alrededor para que no bloquee el recorrido.",
    "Ubicalo en relación a la pista, entrada o mesa de novios según su función.",
    "Podés moverlo o redimensionarlo desde el canvas hasta que respire visualmente."
  ];
  const extra=[];
  const W=ctx.salonW||0, H=ctx.salonH||0;
  if(W&&H&&((el.mx||0)<0.4 || (el.my||0)<0.4 || (el.mx||0)+(el.ew||0)>W-0.4 || (el.my||0)+(el.eh||0)>H-0.4)) extra.push("Está muy cerca del borde: revisá que no corte circulación, sillas o servicio.");
  if((el.ew||0)*(el.eh||0)>18 && !el.nonPhysical) extra.push("Es un elemento grande: verificá que no tape mesas ni el paso principal.");
  return [...base,...extra].slice(0,4);
};

const getMesaRecommendations = (mesa={}, personas=[], cap=10, guestList=[]) => {
  const tipo=mesa.tipo||"round";
  const tips=[];
  if(personas.length>cap) tips.push(`Está sobre capacidad: ${personas.length}/${cap}. Subí capacidad, agrandá la mesa o mové invitados.`);
  else if(personas.length===cap) tips.push("Mesa completa: revisá que los invitados tengan afinidad y que no quede demasiado apretada.");
  else if(personas.length===0) tips.push("Mesa libre: podés usarla para invitados pendientes o eliminarla si no aporta al layout.");
  else tips.push(`Todavía tiene ${Math.max(0,cap-personas.length)} lugar${cap-personas.length===1?"":"es"}: completala por afinidad o protocolo.`);
  const counts={};
  personas.forEach(p=>{
    const g=Array.isArray(guestList) ? guestList.find(x=>x.id===p.guestId) : null;
    const k=g?.parentesco||"Otro";
    counts[k]=(counts[k]||0)+1;
  });
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(top) tips.push(`Esta mesa tiene mayoría de ${PARENTESCO_HUMANO[top[0]]||top[0]} (${top[1]} personas).`);
  if(tipo==="round") tips.push("Redonda: ideal para conversación. Funciona mejor con 8–10 personas y paso alrededor.");
  if(tipo==="rect_h"||tipo==="rect_v"||tipo==="imperial") tips.push("Mesa larga/imperial: cuidá la orientación para que no bloquee la vista a pista o escenario.");
  if(!mesa.etiqueta) tips.push("Agregá una etiqueta como Familia, Amigos o Padrinos para entender rápido el plano.");
  tips.push("Mantené al menos 1 m de separación con pista, barras, buffet y otras mesas.");
  return tips.slice(0,4);
};

function RecommendationBox({title="Recomendaciones", items=[]}){
  if(!items||items.length===0) return null;
  return <div style={{background:"rgba(201,169,110,.08)",border:"1px solid rgba(201,169,110,.22)",borderRadius:10,padding:"9px 10px",margin:"0 0 10px"}}>
    <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.62)",marginBottom:6}}>💡 {title}</div>
    <ul style={{margin:0,paddingLeft:16,display:"flex",flexDirection:"column",gap:4}}>
      {items.map((it,i)=><li key={i} style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",lineHeight:1.35,color:"rgba(26,26,20,.58)"}}>{it}</li>)}
    </ul>
  </div>;
}

function SalonView({ mode="guests", user, guests, tableSize, budgetInvitados=0, onAssign, onAssignMany, onRemove, onOpenGuia, onGoDesigner, onGoGuests }){
  // Layout guardado de sesiones anteriores (se lee una sola vez)
  const totalInvitadosInicial = budgetInvitados>0 ? budgetInvitados : (guests||[]).reduce((s,g)=>s+(parseInt(g.cantidadInvitados||1)||1),0);
  const salonInitRef = useRef();
  if(salonInitRef.current===undefined) salonInitRef.current = convertNormalizedLayoutToMeters(isDemoUser(user) ? null : cargarSalon(), totalInvitadosInicial || 150, tableSize || 8);
  const S0Raw = salonInitRef.current;
  const M0 = SALON_MODELO(); // default: salón proporcional 22×16 para 150 personas
  const initialAmbientesRef = useRef();
  if(initialAmbientesRef.current===undefined){
    const rawList=Array.isArray(S0Raw?.ambientes)&&S0Raw.ambientes.length
      ? S0Raw.ambientes
      : [{...M0,...(S0Raw||{}),id:"principal",nombre:"Salón principal"}];
    initialAmbientesRef.current=rawList.map((ambiente,index)=>({
      ...M0,
      ...ambiente,
      id:String(ambiente.id||`ambiente-${index+1}`),
      nombre:String(ambiente.nombre||ambiente.label||(index===0?"Salón principal":`Ambiente ${index+1}`)),
      mesas:Array.isArray(ambiente.mesas)?ambiente.mesas:[],
      elementos:Array.isArray(ambiente.elementos)?ambiente.elementos:[],
      salonShapeConfig:normalizeSalonShapeConfig(ambiente.salonShape||M0.salonShape,ambiente.salonShapeConfig),
    }));
  }
  const initialAmbientes=initialAmbientesRef.current;
  const initialActiveAmbienteId=String(S0Raw?.activeAmbienteId||initialAmbientes[0]?.id||"principal");
  const S0=initialAmbientes.find(ambiente=>ambiente.id===initialActiveAmbienteId)||initialAmbientes[0]||M0;
  const isDesignerMode = mode === "designer";
  const isGuestMode = mode !== "designer";

  // ── Estado general ──
  const [salonW, setSalonW]       = useState(S0?.salonW ?? M0.salonW);
  const [salonH, setSalonH]       = useState(S0?.salonH ?? M0.salonH);
  const [salonShape, setSalonShape] = useState(S0?.salonShape ?? M0.salonShape);
  const [salonShapeConfig, setSalonShapeConfig] = useState(()=>normalizeSalonShapeConfig(S0?.salonShape ?? M0.salonShape, S0?.salonShapeConfig));
  const [zoom, setZoom]           = useState(1);
  const [mesas, setMesas]         = useState(()=>{
    const iniciales=(S0?.mesas&&Array.isArray(S0.mesas)&&S0.mesas.length>0) ? S0.mesas : M0.mesas;
    return (iniciales||[]).map(mesa=>(mesa.tipo||"round")==="round"
      ? {...mesa,cap:normalizeRoundTableCapacity(mesa.cap,8)}
      : mesa
    );
  });
  const [elementos, setElementos] = useState(()=> makeElementsEditable((S0?.elementos&&Array.isArray(S0.elementos)) ? S0.elementos : M0.elementos));
  const [estiloDistrib, setEstiloDistrib] = useState(NORMALIZE_DISTRIB(S0?.estiloDistrib ?? M0.estiloDistrib ?? "banquet"));
  const [estiloDecor, setEstiloDecor] = useState(S0?.estiloDecor ?? M0.estiloDecor ?? "romantico_floral");

  // Estado de Etapa 2: debe declararse ANTES del autoguardado.
  // El error "Cannot access 'ia' before initialization" venía de que el
  // useEffect de guardado armaba su dependency array con estas variables
  // antes de que existieran en el cuerpo de SalonView.
  const [selectedSalonType, setSelectedSalonType] = useState(S0?.selectedSalonType || "fiesta_latina");
  const [selectedGuestCount, setSelectedGuestCount] = useState(nearestGuestOption(S0?.selectedGuestCount || totalInvitadosInicial || 150));
  const [roomSizeOption, setRoomSizeOption] = useState(S0?.roomSizeOption || "recommended");
  const [selectedTableTypeId, setSelectedTableTypeId] = useState(S0?.selectedTableTypeId || "auto");
  const [layoutSummary, setLayoutSummary] = useState(S0?.layoutSummary || null);
  const [ambientes, setAmbientes] = useState(()=>initialAmbientes);
  const [activeAmbienteId, setActiveAmbienteId] = useState(initialActiveAmbienteId);

  const currentEnvironmentSnapshot = (id=activeAmbienteId, nombreOverride) => {
    const currentMeta=ambientes.find(ambiente=>ambiente.id===id);
    return {
      id,
      nombre:nombreOverride||currentMeta?.nombre||"Ambiente",
      salonW,salonH,salonShape,salonShapeConfig,estiloDistrib,estiloDecor,
      mesas,elementos,selectedGuestCount,roomSizeOption,selectedTableTypeId,selectedSalonType,layoutSummary,
    };
  };
  const environmentsWithCurrent = () => {
    const current=currentEnvironmentSnapshot();
    const exists=ambientes.some(ambiente=>ambiente.id===activeAmbienteId);
    return exists
      ? ambientes.map(ambiente=>ambiente.id===activeAmbienteId?{...ambiente,...current}:ambiente)
      : [...ambientes,current];
  };
  const loadEnvironmentIntoCanvas = (ambiente) => {
    if(!ambiente) return;
    setSalonW(ambiente.salonW||M0.salonW);
    setSalonH(ambiente.salonH||M0.salonH);
    setSalonShape(ambiente.salonShape||M0.salonShape);
    setSalonShapeConfig(normalizeSalonShapeConfig(ambiente.salonShape||M0.salonShape,ambiente.salonShapeConfig));
    setEstiloDistrib(NORMALIZE_DISTRIB(ambiente.estiloDistrib||M0.estiloDistrib||"banquet"));
    setEstiloDecor(ambiente.estiloDecor||M0.estiloDecor||"romantico_floral");
    setMesas((Array.isArray(ambiente.mesas)?ambiente.mesas:[]).map(mesa=>(mesa.tipo||"round")==="round"?{...mesa,cap:normalizeRoundTableCapacity(mesa.cap,8)}:mesa));
    setElementos(makeElementsEditable(Array.isArray(ambiente.elementos)?ambiente.elementos:[]));
    setSelectedGuestCount(nearestGuestOption(ambiente.selectedGuestCount||totalInvitadosInicial||150));
    setRoomSizeOption(ambiente.roomSizeOption||"recommended");
    setSelectedTableTypeId(ambiente.selectedTableTypeId||"auto");
    setSelectedSalonType(ambiente.selectedSalonType||"fiesta_latina");
    setLayoutSummary(ambiente.layoutSummary||null);
    setSelectedMesa(null);
    setSelectedElem(null);
    setTimeout(fitToScreen,140);
  };
  const switchEnvironment = (id) => {
    if(id===activeAmbienteId) return;
    const updated=environmentsWithCurrent();
    const target=updated.find(ambiente=>ambiente.id===id);
    if(!target) return;
    setAmbientes(updated);
    setActiveAmbienteId(id);
    loadEnvironmentIntoCanvas(target);
    try{sessionStorage.setItem(`ceci_salon_active_environment:${user?.id||"anon"}`,id);}catch(error){}
  };
  const addBlankEnvironment = () => {
    const updated=environmentsWithCurrent();
    const number=updated.length+1;
    const id=`ambiente-${Date.now()}`;
    const room=getRoomSizeForGuests(Math.max(80,Math.ceil((totalInvitadosInicial||150)/Math.max(2,number))));
    const next={
      ...M0,
      id,
      nombre:`Ambiente ${number}`,
      salonW:room.w,
      salonH:room.h,
      salonShape:"rectangulo",
      salonShapeConfig:DEFAULT_SALON_SHAPE_CONFIG,
      estiloDistrib:"banquet",
      estiloDecor:"romantico_floral",
      mesas:[],
      elementos:[],
      selectedGuestCount:nearestGuestOption(Math.max(50,Math.ceil((totalInvitadosInicial||150)/number))),
      roomSizeOption:"recommended",
      selectedTableTypeId:"auto",
      selectedSalonType:"desde_cero",
      layoutSummary:null,
    };
    const nextList=[...updated,next];
    setAmbientes(nextList);
    setActiveAmbienteId(id);
    loadEnvironmentIntoCanvas(next);
    showToast(`✓ Se agregó ${next.nombre} en blanco`,"success",3200);
  };
  const renameActiveEnvironment = (nombre) => {
    const clean=String(nombre||"").trim().slice(0,42);
    if(!clean) return;
    setAmbientes(list=>list.map(ambiente=>ambiente.id===activeAmbienteId?{...ambiente,nombre:clean}:ambiente));
  };

  // Guardado dual: localStorage (instantáneo, por dispositivo) + Supabase (sincronizado).
  // remoteLoaded evita que el autoguardado con defaults pise el layout remoto
  // antes de que termine de cargar en un dispositivo nuevo.
  const remoteLoaded = useRef(false);
  useEffect(()=>{
    const t=setTimeout(()=>{
      const nextAmbientes=environmentsWithCurrent();
      const current=nextAmbientes.find(ambiente=>ambiente.id===activeAmbienteId)||currentEnvironmentSnapshot();
      const layout={...current,ambientes:nextAmbientes,activeAmbienteId};
      if(!isDemoUser(user)){ try { localStorage.setItem(SALON_LS_KEY, JSON.stringify(layout)); } catch(err){} }
      if(user&&remoteLoaded.current){
        dataClient(user).from("wedding_data")
          .upsert({user_id:user.id,salon_layout:layout,updated_at:new Date().toISOString()},{onConflict:"user_id"})
          .then((res)=>{if(res&&res.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
      }
    },800);
    return ()=>clearTimeout(t);
  },[salonW,salonH,salonShape,salonShapeConfig,estiloDistrib,estiloDecor,mesas,elementos,selectedGuestCount,roomSizeOption,selectedTableTypeId,selectedSalonType,layoutSummary,ambientes,activeAmbienteId]);

  // Flush al desmontar: el debounce de arriba se cancela al salir de la vista,
  // así que guardamos el estado final de forma inmediata para no perder el último cambio
  const layoutFlushRef = useRef(null);
  {
    const nextAmbientes=environmentsWithCurrent();
    const current=nextAmbientes.find(ambiente=>ambiente.id===activeAmbienteId)||currentEnvironmentSnapshot();
    layoutFlushRef.current = {...current,ambientes:nextAmbientes,activeAmbienteId};
  }
  useEffect(()=>()=>{
    if(!isDemoUser(user)){ try { localStorage.setItem(SALON_LS_KEY, JSON.stringify(layoutFlushRef.current)); } catch(err){} }
    if(user&&remoteLoaded.current){
      dataClient(user).from("wedding_data")
        .upsert({user_id:user.id,salon_layout:layoutFlushRef.current,updated_at:new Date().toISOString()},{onConflict:"user_id"})
        .then((res)=>{if(res&&res.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
    }
  },[]);

  // Carga inicial desde Supabase: el layout remoto es la fuente de verdad compartida
  useEffect(()=>{
    if(!user){ remoteLoaded.current=true; return; }
    let alive=true;
    (async()=>{
      try{
        const {data:row}=await dataClient(user).from("wedding_data").select("salon_layout").eq("user_id",user.id).maybeSingle();
        if(!alive) return;
        const L=convertNormalizedLayoutToMeters(row?.salon_layout, totalInvitadosInicial || 150, tableSize || 8);
        if(L){
          const remoteList=(Array.isArray(L.ambientes)&&L.ambientes.length?L.ambientes:[{...L,id:"principal",nombre:"Salón principal"}]).map((ambiente,index)=>({
            ...M0,
            ...ambiente,
            id:String(ambiente.id||`ambiente-${index+1}`),
            nombre:String(ambiente.nombre||ambiente.label||(index===0?"Salón principal":`Ambiente ${index+1}`)),
            mesas:Array.isArray(ambiente.mesas)?ambiente.mesas:[],
            elementos:Array.isArray(ambiente.elementos)?ambiente.elementos:[],
            salonShapeConfig:normalizeSalonShapeConfig(ambiente.salonShape||M0.salonShape,ambiente.salonShapeConfig),
          }));
          let preferredId=String(L.activeAmbienteId||remoteList[0]?.id||"principal");
          try{
            const savedId=sessionStorage.getItem(`ceci_salon_active_environment:${user?.id||"anon"}`);
            if(savedId&&remoteList.some(ambiente=>ambiente.id===savedId)) preferredId=savedId;
          }catch(error){}
          const target=remoteList.find(ambiente=>ambiente.id===preferredId)||remoteList[0];
          setAmbientes(remoteList);
          setActiveAmbienteId(target.id);
          loadEnvironmentIntoCanvas(target);
          if(target.salonShape){ setSelectedSalonShape(target.salonShape); }
          if(target.salonShapeConfig){ setSelectedShapeConfig(normalizeSalonShapeConfig(target.salonShape||salonShape,target.salonShapeConfig)); }
        }
      }catch(err){}
      remoteLoaded.current=true;
    })();
    return ()=>{alive=false;};
  },[]);

  // ── Selección e interacción ──
  const [selectedMesa, setSelectedMesa]   = useState(null);
  const [selectedElem, setSelectedElem]   = useState(null);
  const [dragging, setDragging]           = useState(null);
  const draggingRef = useRef(null); // mantiene el drag activo disponible para listeners globales
  const dragMoved = useRef(false); // true si el mouse se movió durante el drag
  const [hoveredMesa, setHoveredMesa]     = useState(null);
  const hoveredMesaRef = useRef(null);
  const [pinch, setPinch]                 = useState(null);
  const [showSheet, setShowSheet]         = useState(false); // mobile bottom sheet
  const [prevAsignacion, setPrevAsignacion] = useState(null); // snapshot para deshacer protocolo
  const [searchSinMesa, setSearchSinMesa] = useState("");
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showElemMenu, setShowElemMenu]   = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [previewPresetId, setPreviewPresetId] = useState(S0?.selectedSalonType || "fiesta_latina");
  const [previewModalPresetId, setPreviewModalPresetId] = useState(null);
  const presetTouchRef = useRef(null);
  const onPresetTouchStart = (e,id) => {
    const t=e.touches?.[0];
    if(!t) return;
    presetTouchRef.current={id,x:t.clientX,y:t.clientY,moved:false};
  };
  const onPresetTouchMove = (e) => {
    const t=e.touches?.[0];
    const p=presetTouchRef.current;
    if(!t||!p) return;
    if(Math.hypot(t.clientX-p.x,t.clientY-p.y)>10) p.moved=true;
  };
  const onPresetTouchEnd = (e,id) => {
    const p=presetTouchRef.current;
    presetTouchRef.current=null;
    if(p?.moved) return;
    e.preventDefault();
    e.stopPropagation();
    setPreviewPresetId(id);
    setPreviewModalPresetId(id);
  };
  const [selectedSalonShape, setSelectedSalonShape] = useState(S0?.salonShape ?? M0.salonShape);
  const [selectedShapeConfig, setSelectedShapeConfig] = useState(()=>normalizeSalonShapeConfig(S0?.salonShape ?? M0.salonShape, S0?.salonShapeConfig));
  const [selectedGuestForAssign, setSelectedGuestForAssign] = useState(null); // mobile/tablet: invitado elegido para sentar con tap
  const isMobile = useIsMobile();
  const isTabletLayout = useIsMobile(1179);
  const isWideDesktop = !isTabletLayout;
  const useThreePanelWorkspace = isWideDesktop && (isGuestMode || isDesignerMode);
  const isTouchAssignment = useIsMobile(1024); // smartphones y tablets: tocar invitado → tocar mesa
  useEffect(()=>{ draggingRef.current = dragging; }, [dragging]);
  useEffect(()=>{ hoveredMesaRef.current = hoveredMesa; }, [hoveredMesa]);
  const [hideDesktopTip, setHideDesktopTip] = useState(()=>{try{return localStorage.getItem("ceci_salon_desktop_tip")==="1";}catch(err){return false;}});

  const viewportRef = useRef(null);
  const canvasRef   = useRef(null);
  const lastTap     = useRef(0); // doble tap para zoom
  const mesaTouchDragRef = useRef(null); // touch/tablet: arrastrar mesas sin romper el tap para asignar invitados

  // ── Personas ──
  const personas = [];
  (guests||[]).forEach(g=>{
    const cant=parseInt(g.cantidadInvitados||1);
    for(let i=0;i<cant;i++)
      personas.push({guestId:g.id,personIdx:i,nombre:cant>1?`${g.nombre} ${i+1}`:g.nombre,mesa:g.mesa?parseInt(g.mesa):null,confirmacion:g.confirmacion});
  });
  const sinMesa     = personas.filter(p=>!p.mesa);
  const sinMesaFilt = sinMesa.filter(p=>!searchSinMesa||p.nombre.toLowerCase().includes(searchSinMesa.toLowerCase()));
  // UX: cuando hay muchos invitados sin mesa, no renderizamos una lista infinita.
  // Mostramos los primeros resultados y empujamos al usuario a buscar/filtrar.
  const SIN_MESA_CANVAS_LIMIT = searchSinMesa ? 80 : 50;
  const sinMesaVisible = sinMesaFilt.slice(0, SIN_MESA_CANVAS_LIMIT);
  const sinMesaHiddenCount = Math.max(0, sinMesaFilt.length - sinMesaVisible.length);
  const waitingInvitations=(guests||[]).filter(guest=>(!guest.mesa||guest.mesa==="")&&guest.confirmacion!=="no_va").map(guest=>({
    guestId:guest.id,
    personIdx:0,
    nombre:guest.nombre,
    confirmacion:guest.confirmacion,
    cantidadInvitados:parseInt(guest.cantidadInvitados||1)||1,
  }));
  const waitingInvitationsFiltered=waitingInvitations.filter(item=>!searchSinMesa||item.nombre.toLowerCase().includes(searchSinMesa.toLowerCase()));
  const waitingInvitationsVisible=waitingInvitationsFiltered.slice(0,searchSinMesa?80:50);
  const waitingInvitationsHiddenCount=Math.max(0,waitingInvitationsFiltered.length-waitingInvitationsVisible.length);
  const CONF_COLORS = {confirmado:THEME.color.sage,pendiente:THEME.color.gold,no_va:"rgba(26,26,20,.3)"};
  const MESA_R_M    = 0.90;
  const ASIENTO_R_M = 0.28;
  const BASE_PX     = 30;
  const PX          = BASE_PX*zoom;
  const CW          = salonW*PX;
  const CH          = salonH*PX;

  const circlePts=(n,r)=>Array.from({length:n},(_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
  const mesaPersonas=(id)=>personas.filter(p=>parseInt(p.mesa)===parseInt(id));
  const selectedMesaObj = mesas.find(m=>String(m.id)===String(selectedMesa));
  const selectedPersonas = selectedMesa!==null?mesaPersonas(selectedMesa):[];

  const tryAssignGuestToMesa=(guestId,mesaId)=>{
    const invitacion=(guests||[]).find(g=>g.id===guestId);
    const mesa=mesas.find(item=>parseInt(item.id)===parseInt(mesaId));
    if(!invitacion||!mesa||!onAssign) return false;
    const actualMesa=parseInt(invitacion.mesa)||0;
    if(actualMesa===parseInt(mesaId)) return true;
    const cantidad=parseInt(invitacion.cantidadInvitados||1)||1;
    const ocupadas=mesaPersonas(parseInt(mesaId))
      .filter(persona=>persona.guestId!==guestId)
      .length;
    const capacidad=(mesa.tipo||"round")==="round"
      ? normalizeRoundTableCapacity(mesa.cap,8)
      : (parseInt(mesa.cap)||8);
    if(ocupadas+cantidad>capacidad){
      if(typeof showToast==="function"){
        showToast(`Mesa ${mesaId} completa: ${ocupadas}/${capacidad}. Mové otra invitación al Banco de espera o aumentá la mesa a 10 o 12.`,"error",4200);
      }
      return false;
    }
    onAssign(guestId,mesaId);
    return true;
  };

  const selectGuestForTapAssign=(p)=>{
    if(!p) return;
    setSelectedGuestForAssign({guestId:p.guestId,nombre:p.nombre});
    setSelectedElem(null);
    setSelectedMesa(null);
    if(typeof showToast==="function") showToast(`Ahora tocá la mesa donde querés sentar a ${p.nombre}`,"success",2600);
  };

  const assignSelectedGuestToMesa=(mesaId)=>{
    if(!selectedGuestForAssign) return false;
    const asignado=tryAssignGuestToMesa(selectedGuestForAssign.guestId,mesaId);
    if(!asignado) return false;
    if(typeof showToast==="function") showToast(`✓ ${selectedGuestForAssign.nombre} asignado/a a Mesa ${mesaId}`,"success",2200);
    setSelectedGuestForAssign(null);
    setSelectedMesa(mesaId);
    setSelectedElem(null);
    if(isMobile) setShowSheet(false);
    return true;
  };

  // ── Capacidad salón ──
  const totalInvWarn = isDesignerMode ? selectedGuestCount : (budgetInvitados>0?budgetInvitados:(guests||[]).reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0));
  const capacidadMax = Math.floor(salonW*salonH/1.5);
  const salonChico   = totalInvWarn>0&&totalInvWarn>capacidadMax;
  const salonMuyChico= totalInvWarn>0&&totalInvWarn>capacidadMax*1.3;

  // ── Fit to screen ──
  // Reglas expertas de layout:
  // - La pista queda libre y con aire alrededor.
  // - DJ/escenario no debe quedar tapado por mesas.
  // - Baños, cocina, entrada y salidas necesitan pasillos despejados.
  // - Barras, buffet y estaciones generan fila: se les deja un colchón menor.
  // Este sanitizador se aplica a plantillas, para que ninguna combinación
  // de tipo de salón + estilo decorativo produzca ubicaciones sin sentido.
  const mesaDimensiones=(m={})=>{
    const tipo=m.tipo||"round";
    if(tipo==="round") return {w:m.ew||MESA_R_M*2,h:m.eh||MESA_R_M*2};
    if(tipo==="square") return {w:m.ew||2.0,h:m.eh||2.0};
    if(tipo==="rect_h") return {w:m.ew||5.4,h:m.eh||0.9};
    if(tipo==="rect_v") return {w:m.ew||0.9,h:m.eh||5.4};
    if(tipo==="imperial") return {w:m.ew||8.4,h:m.eh||1.1};
    return {w:m.ew||MESA_R_M*2,h:m.eh||MESA_R_M*2};
  };
  const mesaBox=(m)=>{const d=mesaDimensiones(m);return{x1:m.mx-d.w/2,y1:m.my-d.h/2,x2:m.mx+d.w/2,y2:m.my+d.h/2,w:d.w,h:d.h};};
  const elemBox=(el)=>({x1:el.mx,y1:el.my,x2:el.mx+(el.ew||3),y2:el.my+(el.eh||2),w:el.ew||3,h:el.eh||2,tipo:el.tipo});
  const expandBox=(b,g)=>({x1:b.x1-g,y1:b.y1-g,x2:b.x2+g,y2:b.y2+g});
  const boxesHit=(a,b)=>a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1;
  const NON_BLOCKING_ELEMENT_TYPES = new Set(["entrada","salida","emergencia","camino","alfombra","luces","flores","centro_floral","exterior","columnas"]);
  const isBlockingPresetElement=(el)=>!!el && !el.nonPhysical && !NON_BLOCKING_ELEMENT_TYPES.has(el.tipo);

  const resolvePresetOverlaps=(plano)=>{
    if(!plano) return plano;
    const W=plano.salonW||salonW, H=plano.salonH||salonH;
    const shape=plano.salonShape||"rectangulo";
    const cfg=plano.salonShapeConfig||DEFAULT_SALON_SHAPE_CONFIG;
    const clampElem=(el)=>{
      const ew=el.ew||3, eh=el.eh||2;
      return {...el,mx:+Math.max(0.25,Math.min(W-ew-0.25,el.mx||0)).toFixed(2),my:+Math.max(0.25,Math.min(H-eh-0.25,el.my||0)).toFixed(2)};
    };
    const clampMesaLocal=(m)=>{
      const d=mesaDimensiones(m);
      return {...m,mx:+Math.max(d.w/2+0.25,Math.min(W-d.w/2-0.25,m.mx||d.w/2+0.25)).toFixed(2),my:+Math.max(d.h/2+0.25,Math.min(H-d.h/2-0.25,m.my||d.h/2+0.25)).toFixed(2)};
    };
    const candOffsets=()=>{
      const out=[[0,0]];
      for(let r=0.35;r<=4.2;r+=0.35){
        out.push([r,0],[-r,0],[0,r],[0,-r],[r,r],[r,-r],[-r,r],[-r,-r],[r*.55,r],[-r*.55,r],[r*.55,-r],[-r*.55,-r]);
      }
      return out;
    };
    const offsets=candOffsets();
    const safeElem=(el,placed)=>{
      if(!isBlockingPresetElement(el)) return true;
      const b=expandBox(elemBox(el),0.04);
      if(b.x1<0||b.y1<0||b.x2>W||b.y2>H) return false;
      const corners=[[b.x1,b.y1],[b.x2,b.y1],[b.x1,b.y2],[b.x2,b.y2],[el.mx+(el.ew||3)/2,el.my+(el.eh||2)/2]];
      if(!corners.every(([x,y])=>salonShapePointInside(shape,x,y,W,H,cfg))) return false;
      return !placed.some(o=>isBlockingPresetElement(o)&&boxesHit(b,expandBox(elemBox(o),0.04)));
    };
    const placedElems=[];
    for(const raw of (plano.elementos||[])){
      const base=clampElem(raw);
      if(!isBlockingPresetElement(base)||safeElem(base,placedElems)){placedElems.push(base);continue;}
      let found=null;
      for(const [dx,dy] of offsets){
        const c=clampElem({...base,mx:(base.mx||0)+dx,my:(base.my||0)+dy});
        if(safeElem(c,placedElems)){found=c;break;}
      }
      placedElems.push(found||base);
    }
    const fixedBlocks=placedElems.filter(isBlockingPresetElement).map(el=>expandBox(elemBox(el),0.08));
    const safeMesa=(m,placed)=>{
      const b=expandBox(mesaBox(m),0.06);
      if(b.x1<0||b.y1<0||b.x2>W||b.y2>H) return false;
      const corners=[[b.x1,b.y1],[b.x2,b.y1],[b.x1,b.y2],[b.x2,b.y2],[m.mx,m.my]];
      if(!corners.every(([x,y])=>salonShapePointInside(shape,x,y,W,H,cfg))) return false;
      if(fixedBlocks.some(z=>boxesHit(b,z))) return false;
      return !placed.some(pm=>boxesHit(b,expandBox(mesaBox(pm),0.08)));
    };
    const placedMesas=[];
    for(const raw of (plano.mesas||[])){
      const base=clampMesaLocal(raw);
      if(safeMesa(base,placedMesas)){placedMesas.push(base);continue;}
      let found=null;
      for(const [dx,dy] of offsets){
        const c=clampMesaLocal({...base,mx:(base.mx||0)+dx,my:(base.my||0)+dy});
        if(safeMesa(c,placedMesas)){found=c;break;}
      }
      placedMesas.push(found||base);
    }
    return {...plano,elementos:placedElems,mesas:placedMesas};
  };
  const noGoMargin=(tipo)=>({
    // Márgenes pensados como “zonas de circulación” para que los presets se comporten
    // como un plano real de boda: pista libre, DJ visible, baños/cocina sin mesas encima,
    // y barras/buffet con espacio para filas.
    pista:1.55, escenario:2.35, banios:3.00, cocina:2.60, catering:2.10,
    entrada:2.00, salida:2.00, emergencia:2.20, bar:1.55, buffet:1.60,
    cafeteria:1.20, bebidas:1.20, torta:0.95, postres:1.05, photobooth:1.00,
    cabina360:1.15, altar:1.35, camino:1.00, sillas_cer:0.95, musicos:1.15,
    living:0.65, exterior:0.55, guardarropa:1.15, proveedores:1.10, mozos:1.10,
  }[tipo] ?? 0);
  const sanitizarMesasConZonas=(listaMesas=[], listaElementos=[], W=salonW, H=salonH, shapeArg=salonShape, cfgArg=salonShapeConfig)=>{
    const elementosClave=(listaElementos||[]).filter(el=>noGoMargin(el.tipo)>0);
    const zonasProhibidas=elementosClave.map(el=>expandBox(elemBox(el),noGoMargin(el.tipo)));
    const clampMesa=(m)=>{
      const d=mesaDimensiones(m);
      return {...m,mx:Math.max(d.w/2+0.25,Math.min(W-d.w/2-0.25,m.mx)),my:Math.max(d.h/2+0.25,Math.min(H-d.h/2-0.25,m.my))};
    };
    const segura=(m,puestas=[])=>{
      const b=mesaBox(m);
      if(b.x1<0.2||b.y1<0.2||b.x2>W-0.2||b.y2>H-0.2) return false;
      const pts=[[b.x1,b.y1],[b.x2,b.y1],[b.x1,b.y2],[b.x2,b.y2],[m.mx,m.my]];
      if(!pts.every(([x,y])=>puntoDentroForma(shapeArg,x,y,W,H,cfgArg))) return false;
      if(zonasProhibidas.some(z=>boxesHit(b,z))) return false;
      const mesaConAire=expandBox(b,0.45);
      return !puestas.some(pm=>boxesHit(mesaConAire,expandBox(mesaBox(pm),0.20)));
    };
    const candidatosPara=(m)=>{
      const d=mesaDimensiones(m);
      const xs=[],ys=[], step=0.7;
      for(let x=d.w/2+0.5;x<=W-d.w/2-0.5;x+=step) xs.push(+x.toFixed(2));
      for(let y=d.h/2+0.5;y<=H-d.h/2-0.5;y+=step) ys.push(+y.toFixed(2));
      const cand=[];
      for(const y of ys) for(const x of xs) cand.push({...m,mx:x,my:y});
      return cand.sort((a,b)=>Math.hypot(a.mx-m.mx,a.my-m.my)-Math.hypot(b.mx-m.mx,b.my-m.my));
    };
    const puestas=[];
    for(const original of (listaMesas||[])){
      const base=clampMesa(original);
      if(segura(base,puestas)){puestas.push(base);continue;}
      const mejor=candidatosPara(base).find(c=>segura(c,puestas));
      puestas.push(mejor||base);
    }
    return puestas.map(m=>({ ...m, mx:+m.mx.toFixed(2), my:+m.my.toFixed(2) }));
  };

  const escalarPlano=(P,newW,newH)=>{
    const oldW=P.salonW||newW, oldH=P.salonH||newH;
    const sx=newW/oldW, sy=newH/oldH;
    return {
      ...P,
      salonW:newW,
      salonH:newH,
      mesas:(P.mesas||[]).map(m=>({...m,mx:+((m.mx||0)*sx).toFixed(2),my:+((m.my||0)*sy).toFixed(2),ew:m.ew?+(m.ew*sx).toFixed(2):m.ew,eh:m.eh?+(m.eh*sy).toFixed(2):m.eh})),
      elementos:(P.elementos||[]).map(el=>({...el,mx:+((el.mx||0)*sx).toFixed(2),my:+((el.my||0)*sy).toFixed(2),ew:el.ew?+(el.ew*sx).toFixed(2):el.ew,eh:el.eh?+(el.eh*sy).toFixed(2):el.eh})),
    };
  };

  const puntoDentroForma=(shape,x,y,W,H,cfg=salonShapeConfig)=>salonShapePointInside(shape,x,y,W,H,cfg);

  const mantenerElementoDentroForma=(el,shape,W,H)=>{
    const ew=el.ew||3, eh=el.eh||2;
    let mx=el.mx||0, my=el.my||0;
    let cx=mx+ew/2, cy=my+eh/2;
    if(puntoDentroForma(shape,cx,cy,W,H)) return {...el,mx:+mx.toFixed(2),my:+my.toFixed(2)};
    if(shape==="L"){
      // Evita que elementos caigan en el cuadrante recortado de una planta en L.
      mx=Math.min(mx,W*0.50-ew-0.5);
      my=Math.min(my,H*0.50-eh-0.5);
    } else if(shape==="U"){
      // En planta U, no ponemos elementos en la boca/hueco central superior.
      my=Math.max(my,H*0.62);
      mx=Math.max(0.8,Math.min(W-ew-0.8,mx));
    } else if(shape==="oval"){
      const angle=Math.atan2(cy-H/2,cx-W/2);
      cx=W/2+Math.cos(angle)*(W*0.36);
      cy=H/2+Math.sin(angle)*(H*0.36);
      mx=cx-ew/2; my=cy-eh/2;
    }
    mx=Math.max(0.35,Math.min(W-ew-0.35,mx));
    my=Math.max(0.35,Math.min(H-eh-0.35,my));
    return {...el,mx:+mx.toFixed(2),my:+my.toFixed(2)};
  };

  const mantenerMesaDentroForma=(m,shape,W,H)=>{
    if(puntoDentroForma(shape,m.mx,m.my,W,H)) return m;
    let mx=m.mx,my=m.my;
    const d=mesaDimensiones(m);
    if(shape==="L"){
      mx=Math.min(mx,W*0.50-d.w/2-0.6);
      my=Math.min(my,H*0.50-d.h/2-0.6);
    } else if(shape==="U"){
      my=Math.max(my,H*0.62+d.h/2);
    } else if(shape==="oval"){
      const angle=Math.atan2(my-H/2,mx-W/2);
      mx=W/2+Math.cos(angle)*(W*0.34);
      my=H/2+Math.sin(angle)*(H*0.34);
    }
    return {...m,mx:+Math.max(d.w/2+0.35,Math.min(W-d.w/2-0.35,mx)).toFixed(2),my:+Math.max(d.h/2+0.35,Math.min(H-d.h/2-0.35,my)).toFixed(2)};
  };

  const adaptarPlanoAForma=(plano,shape)=>{
    let P={...plano,mesas:[...(plano.mesas||[])],elementos:[...(plano.elementos||[])]};
    const targetShape=shape||P.salonShape||"rectangulo";
    if(targetShape==="cuadrado"){
      const lado=Math.max(24,Math.min(44,Math.round(Math.sqrt((P.salonW||30)*(P.salonH||20)))));
      P=escalarPlano(P,lado,lado);
    }
    P.salonShape=targetShape;
    P.elementos=(P.elementos||[]).map(el=>mantenerElementoDentroForma(el,targetShape,P.salonW,P.salonH));
    P.mesas=(P.mesas||[]).map(m=>mantenerMesaDentroForma(m,targetShape,P.salonW,P.salonH));
    return P;
  };

  // Motor v2: genera el plano desde la geometría elegida.
  // Para formas irregulares ya no se toma un rectángulo y se recorta: se arman
  // zonas funcionales propias para L, U y Oval, cuidando que pista, DJ, mesa de
  // novios, servicios, baños y mesas queden dentro del salón y con circulación.
  const mesasL=(W,H,presetId)=>{
    const roundBase=[
      [6.5,6.2],[12.0,6.0],[31.0,6.0],[37.0,6.2],
      [6.5,12.2],[12.0,12.3],[31.0,12.3],[37.0,12.2],
      [6.5,21.2],[12.3,22.0],[17.0,25.5]
    ];
    if(presetId==="moderno_minimalista") return [
      mesa(1,6.0,6.2,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(2,11.0,6.2,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(3,34.0,6.2,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(4,39.0,6.2,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(5,6.0,21.0,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(6,12.5,23.0,"rect_v",{cap:18,ew:0.9,eh:4.8}),
    ];
    if(presetId==="fiesta_pista") return mesasRedondas([[6.0,5.8],[38.0,5.8],[6.0,13.0],[38.0,13.0],[6.2,21.5],[12.4,23.5]],1);
    if(presetId==="ceremonia_fiesta") return mesasRedondas([[6.0,18.8],[12.0,19.5],[17.0,23.8],[6.2,25.5],[35.5,12.0],[39.5,7.0]],1);
    return mesasRedondas(roundBase,1);
  };

  const elementosL=(W,H,presetId,decor)=>{
    const common=[
      elem("entrada-1","entrada",9.0,H-1.2,3.0,0.8),
      elem("bienvenida-1","bienvenida",4.0,H-3.4,3.2,1.0),
      elem("banios-1","banios",W-4.2,0.9,3.0,2.2),
      elem("cocina-1","cocina",0.9,H-4.0,4.0,2.7),
      elem("salida-1","salida",W-4.2,H*0.50-1.1,3.0,0.8),
    ];
    let main;
    if(presetId==="jardin_exterior"){
      main=[
        elem("altar-1","altar",15.0,1.0,11.0,2.4),
        elem("camino-1","camino",20.0,3.8,1.2,5.4),
        elem("sillascer-1","sillas_cer",12.0,4.0,17.0,4.4),
        elem("novios-1","novios",15.5,10.4,10.0,1.0),
        elem("pista-1","pista",6.0,16.0,10.5,6.2),
        elem("escenario-1","escenario",7.0,23.4,8.5,2.1),
        elem("bar-1","bar",W-6.0,9.0,3.6,2.4),
        elem("postres-1","postres",W-6.2,12.2,3.6,1.4),
        elem("torta-1","torta",3.0,13.0,2.6,1.4),
        elem("photobooth-1","photobooth",W-5.2,3.8,3.0,2.0),
      ];
    } else if(presetId==="fiesta_pista"){
      main=[
        elem("escenario-1","escenario",16.0,2.2,12.0,2.2),
        elem("pista-1","pista",13.0,5.8,18.0,8.0),
        elem("novios-1","novios",15.8,14.2,12.0,1.0),
        elem("bar-1","bar",W-6.2,9.0,3.8,2.6),
        elem("bebidas-1","bebidas",W-6.0,12.4,3.2,1.3),
        elem("cabina360-1","cabina360",2.0,11.2,2.6,2.6),
        elem("photobooth-1","photobooth",2.0,15.0,3.0,2.0),
        elem("torta-1","torta",13.0,16.3,2.6,1.4),
        elem("postres-1","postres",17.0,16.3,3.6,1.4),
      ];
    } else if(presetId==="ceremonia_fiesta"){
      main=[
        elem("altar-1","altar",15.0,1.0,12.0,2.4),
        elem("camino-1","camino",20.4,3.8,1.2,5.8),
        elem("sillascer-1","sillas_cer",12.0,4.0,17.0,4.6),
        elem("novios-1","novios",15.5,10.7,10.0,1.0),
        elem("escenario-1","escenario",4.5,15.0,9.5,2.0),
        elem("pista-1","pista",4.5,18.0,12.0,6.0),
        elem("bar-1","bar",W-6.2,10.2,3.8,2.4),
        elem("torta-1","torta",17.0,16.2,2.6,1.4),
        elem("postres-1","postres",16.0,18.5,3.6,1.4),
      ];
    } else {
      main=[
        elem("escenario-1","escenario",18.0,2.3,8.0,2.2),
        elem("pista-1","pista",16.0,5.8,12.0,7.0),
        elem("novios-1","novios",15.6,13.3,12.0,1.0),
        elem("torta-1","torta",3.0,9.5,2.6,1.4),
        elem("postres-1","postres",3.0,12.3,3.6,1.4),
        elem("bar-1","bar",W-6.2,8.2,3.8,2.8),
        elem("cafeteria-1","cafeteria",W-5.8,12.0,3.0,1.5),
        elem("photobooth-1","photobooth",3.0,16.8,3.0,2.0),
      ];
    }
    return [...main,...common,...decorPackShape(decor,W,H,"L")];
  };

  const buildLPlano=(presetId,decor)=>{
    const W=44,H=30;
    return {salonW:W,salonH:H,salonShape:"L",estiloDistrib:presetId,estiloDecor:decor,mesas:mesasL(W,H,presetId),elementos:elementosL(W,H,presetId,decor)};
  };

  const mesasU=(W,H,presetId)=>{
    if(presetId==="moderno_minimalista") return [
      mesa(1,7.0,6.0,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(2,W-7.0,6.0,"rect_v",{cap:18,ew:0.9,eh:4.8}),
      mesa(3,8.0,H-8.5,"rect_h",{cap:16,ew:5.2,eh:0.9}),
      mesa(4,W-8.0,H-8.5,"rect_h",{cap:16,ew:5.2,eh:0.9}),
    ];
    return mesasRedondas([[7,5.5],[W-7,5.5],[7,11.8],[W-7,11.8],[8,H-8.0],[15,H-5.8],[W-15,H-5.8],[W-8,H-8.0]],1);
  };

  const elementosU=(W,H,presetId,decor)=>{
    const common=[
      elem("entrada-1","entrada",W/2-1.5,H-1.2,3,0.8),
      elem("bienvenida-1","bienvenida",W/2-5.2,H-2.4,3.2,1.0),
      elem("banios-1","banios",W-4.0,1.0,3,2.2),
      elem("cocina-1","cocina",1.0,1.0,4,2.7),
      elem("salida-1","salida",W-4.2,H-1.2,3,0.8),
    ];
    const ceremony=presetId==="ceremonia_fiesta"||presetId==="jardin_exterior";
    const main=ceremony?[
      elem("altar-1","altar",W/2-7,H*0.61,14,2.4),
      elem("camino-1","camino",W/2-0.6,H*0.70,1.2,5.6),
      elem("sillascer-1","sillas_cer",W/2-9,H*0.68,18,4.5),
      elem("novios-1","novios",5.5,H*0.18,10,1),
      elem("pista-1","pista",W/2-6,H*0.78,12,5.5),
      elem("escenario-1","escenario",W/2-4.5,H*0.92-2.0,9,2),
      elem("bar-1","bar",W-7,H*0.18,3.8,2.6),
      elem("torta-1","torta",W-8,H*0.36,2.6,1.4),
      elem("postres-1","postres",W-8,H*0.43,3.6,1.4),
    ]:[
      elem("pista-1","pista",W/2-7,H*0.64,14,7.0),
      elem("escenario-1","escenario",W/2-5,H*0.87,10,2.3),
      elem("novios-1","novios",W/2-5.5,H*0.58,11,1),
      elem("bar-1","bar",W-7,H*0.20,3.8,2.6),
      elem("torta-1","torta",4.8,H*0.42,2.6,1.4),
      elem("postres-1","postres",4.4,H*0.50,3.6,1.4),
      elem("photobooth-1","photobooth",W-7,H*0.44,3,2),
    ];
    return [...main,...common,...decorPackShape(decor,W,H,"U")];
  };

  const buildUPlano=(presetId,decor)=>{
    const W=46,H=30;
    return {salonW:W,salonH:H,salonShape:"U",estiloDistrib:presetId,estiloDecor:decor,mesas:mesasU(W,H,presetId),elementos:elementosU(W,H,presetId,decor)};
  };

  const buildOvalPlano=(presetId,decor)=>{
    const P=(presetId==="jardin_exterior"?PRESET_BUILDERS.jardin_exterior:PRESET_BUILDERS[presetId]||PRESET_BUILDERS.clasico_elegante)(decor);
    let O=escalarPlano(P,42,28);
    O.salonShape="oval";
    O.elementos=(O.elementos||[]).map(el=>mantenerElementoDentroForma(el,"oval",O.salonW,O.salonH));
    O.mesas=(O.mesas||[]).map(m=>mantenerMesaDentroForma(m,"oval",O.salonW,O.salonH));
    O.elementos=[...(O.elementos||[]).filter(el=>!String(el.id).includes("flores-")&&!String(el.id).includes("luces-")&&!String(el.id).includes("backing-")),...decorPackShape(decor,O.salonW,O.salonH,"oval")];
    return O;
  };

  // Motor v3: genera el plano desde la geometría real y configurable.
  // No recorta un layout rectangular: calcula zonas válidas, ubica funciones
  // por prioridad y solo después distribuye mesas y decoración.
  const shapeCfg=(cfg=salonShapeConfig)=>normalizeSalonShapeConfig(selectedSalonShape||salonShape,cfg);
  const elementoDim=(tipo, fallback={})=>{
    const def=ELEMENTOS_FIJOS.find(e=>e.id===tipo);
    return {w:fallback.ew||def?.w||3,h:fallback.eh||def?.h||2};
  };
  const elBox=(el)=>({x1:el.mx,y1:el.my,x2:el.mx+(el.ew||3),y2:el.my+(el.eh||2),w:el.ew||3,h:el.eh||2});
  const elementInsideShape=(el,shape,W,H,cfg)=>{
    const b=elBox(el), pad=0.08;
    const pts=[[b.x1+pad,b.y1+pad],[b.x2-pad,b.y1+pad],[b.x1+pad,b.y2-pad],[b.x2-pad,b.y2-pad],[(b.x1+b.x2)/2,(b.y1+b.y2)/2]];
    return pts.every(([x,y])=>puntoDentroForma(shape,x,y,W,H,cfg));
  };
  const rectCenter=(r)=>({x:r.x+r.w/2,y:r.y+r.h/2});
  const rectAnchor=(r,where,w,h,margin=0.8)=>{
    const mid=rectCenter(r);
    const map={
      center:{x:mid.x-w/2,y:mid.y-h/2},
      top:{x:mid.x-w/2,y:r.y+margin},
      bottom:{x:mid.x-w/2,y:r.y+r.h-h-margin},
      left:{x:r.x+margin,y:mid.y-h/2},
      right:{x:r.x+r.w-w-margin,y:mid.y-h/2},
      topLeft:{x:r.x+margin,y:r.y+margin},
      topRight:{x:r.x+r.w-w-margin,y:r.y+margin},
      bottomLeft:{x:r.x+margin,y:r.y+r.h-h-margin},
      bottomRight:{x:r.x+r.w-w-margin,y:r.y+r.h-h-margin},
    };
    const p=map[where]||map.center;
    return {x:+Math.max(0.2,Math.min(r.x+r.w-w-0.2,p.x)).toFixed(2),y:+Math.max(0.2,Math.min(r.y+r.h-h-0.2,p.y)).toFixed(2)};
  };
  const pickMainRect=(rects,shape,cfg)=>{
    const list=[...rects].sort((a,b)=>b.area-a.area);
    if(shape==="U"){
      const c=normalizeSalonShapeConfig(shape,cfg).U;
      const base=list.find(r=>r.id==="base");
      if(base) return base;
    }
    return list[0]||{x:0,y:0,w:salonW,h:salonH,area:salonW*salonH};
  };
  const placeElementSmart=(placed, shape, W, H, cfg, tipo, id, candidates, size={})=>{
    const d=elementoDim(tipo,size);
    const existing=placed.map(el=>expandBox(elBox(el),0.45));
    const tryOne=(x,y)=>{
      const el=elem(id,tipo,+x.toFixed(2),+y.toFixed(2),+(d.w||3).toFixed(2),+(d.h||2).toFixed(2));
      if(!elementInsideShape(el,shape,W,H,cfg)) return null;
      const b=expandBox(elBox(el),0.25);
      if(existing.some(z=>boxesHit(b,z))) return null;
      return el;
    };
    for(const c of candidates){
      const pos=c.rect ? rectAnchor(c.rect,c.anchor||"center",d.w,d.h,c.margin??0.8) : {x:c.x,y:c.y};
      const ok=tryOne(pos.x,pos.y); if(ok) return ok;
    }
    // Fallback: barrido dentro de todas las zonas válidas, de arriba hacia abajo.
    const rects=salonShapeRects(shape,W,H,cfg).sort((a,b)=>b.area-a.area);
    for(const r of rects){
      for(let y=r.y+0.6;y<=r.y+r.h-d.h-0.6;y+=0.75){
        for(let x=r.x+0.6;x<=r.x+r.w-d.w-0.6;x+=0.75){
          const ok=tryOne(x,y); if(ok) return ok;
        }
      }
    }
    return elem(id,tipo,0.6,0.6,d.w,d.h);
  };
  const elementCenter=(el)=>({x:(el.mx||0)+(el.ew||3)/2,y:(el.my||0)+(el.eh||2)/2});
  const nearestEl=(els,tipo)=>els.find(e=>e.tipo===tipo);
  const generateTablesSmart=(placed, shape, W, H, cfg, presetId)=>{
    const needed=Math.max(6,Math.min(40,Math.ceil((totalInvWarn||90)/(tableSize||8))||12));
    const modern=presetId==="moderno_minimalista";
    const imperial=presetId==="rectangular" && estiloDecor==="minimalista";
    const tipoMesa=modern||imperial?"rect_v":"round";
    const sample=mesa(0,0,0,tipoMesa,modern?{cap:18,ew:.9,eh:4.8}:{});
    const d=mesaDimensiones(sample);
    const zones=placed.filter(el=>noGoMargin(el.tipo)>0).map(el=>expandBox(elBox(el),noGoMargin(el.tipo)));
    const pista=nearestEl(placed,"pista");
    const banios=nearestEl(placed,"banios");
    const pc=pista?elementCenter(pista):{x:W/2,y:H/2};
    const bc=banios?elementCenter(banios):null;
    const candidates=[];
    const rects=salonShapeRects(shape,W,H,cfg).sort((a,b)=>b.area-a.area);
    for(const r of rects){
      const stepX=Math.max(3.2,d.w+2.2), stepY=Math.max(3.1,d.h+2.2);
      for(let y=r.y+d.h/2+1.1;y<=r.y+r.h-d.h/2-1.1;y+=stepY){
        for(let x=r.x+d.w/2+1.1;x<=r.x+r.w-d.w/2-1.1;x+=stepX){
          const m=mesa(0,+x.toFixed(2),+y.toFixed(2),tipoMesa,modern?{cap:18,ew:.9,eh:4.8}:{});
          const b=mesaBox(m);
          const corners=[[b.x1,b.y1],[b.x2,b.y1],[b.x1,b.y2],[b.x2,b.y2],[m.mx,m.my]];
          if(!corners.every(([cx,cy])=>puntoDentroForma(shape,cx,cy,W,H,cfg))) continue;
          if(zones.some(z=>boxesHit(expandBox(b,.25),z))) continue;
          const distP=Math.hypot(x-pc.x,y-pc.y);
          const distBath=bc?Math.hypot(x-bc.x,y-bc.y):9;
          // Preferir anillo social alrededor de pista, pero lejos de baños/servicio.
          const score=Math.abs(distP-10.5) - Math.min(distBath,8)*0.35 + (y>H*0.78?0.8:0);
          candidates.push({m,score});
        }
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    const result=[];
    for(const c of candidates){
      const b=expandBox(mesaBox(c.m),0.45);
      if(result.some(pm=>boxesHit(b,expandBox(mesaBox(pm),0.25)))) continue;
      result.push({...c.m,id:result.length+1});
      if(result.length>=needed) break;
    }
    // Si el salón es muy irregular y no entraron todas, completar sin tocar zonas críticas.
    if(result.length<Math.min(needed,8)){
      for(const c of candidates){
        if(result.some(pm=>Math.hypot(pm.mx-c.m.mx,pm.my-c.m.my)<2.4)) continue;
        result.push({...c.m,id:result.length+1});
        if(result.length>=needed) break;
      }
    }
    return result;
  };
  const decorSmart=(style,shape,W,H,cfg,placed)=>{
    const main=pickMainRect(salonShapeRects(shape,W,H,cfg),shape,cfg);
    const items=[];
    const add=(tipo,id,cands,size={})=>{ const el=placeElementSmart([...placed,...items],shape,W,H,cfg,tipo,id,cands,size); items.push(el); };
    if(style==="romantico_floral"||style==="jardin"){
      add("arco","arco-decor",[{rect:main,anchor:"top",margin:.4}],{ew:4,eh:.7});
      add("flores","flores-1",[{rect:main,anchor:"topLeft"}],{ew:1.2,eh:1.2});
      add("flores","flores-2",[{rect:main,anchor:"topRight"}],{ew:1.2,eh:1.2});
      add("flores","flores-3",[{rect:main,anchor:"bottomLeft"}],{ew:1.2,eh:1.2});
    } else if(style==="boho_chic"||style==="rustico"){
      add("living","living-decor",[{rect:main,anchor:"bottomLeft"},{rect:main,anchor:"left"}],{ew:3.8,eh:2.2});
      add("luces","luces-decor",[{rect:main,anchor:"top"}],{ew:Math.min(9,main.w*.55),eh:.6});
      add("alfombra","alfombra-decor",[{rect:main,anchor:"bottom"}],{ew:1.2,eh:Math.min(6,main.h*.35)});
    } else if(style==="glam_dorado"||style==="fiesta_nocturna"){
      add("backing","backing-decor",[{rect:main,anchor:"top"}],{ew:4.8,eh:.8});
      add("luces","luces-glam",[{rect:main,anchor:"bottom"}],{ew:Math.min(10,main.w*.6),eh:.6});
      add("columnas","columna-1",[{rect:main,anchor:"topLeft"}],{ew:1.1,eh:1.1});
      add("columnas","columna-2",[{rect:main,anchor:"topRight"}],{ew:1.1,eh:1.1});
    } else {
      add("backing","backing-clasico",[{rect:main,anchor:"top"}],{ew:4.2,eh:.8});
      add("columnas","columna-1",[{rect:main,anchor:"bottomLeft"}],{ew:1.1,eh:1.1});
      add("columnas","columna-2",[{rect:main,anchor:"bottomRight"}],{ew:1.1,eh:1.1});
    }
    return items;
  };
  // Aplicar preset profesional Etapa 2: no toca escala del canvas.
  // Calcula invitados, tamaño de salón, tipo de mesa, elementos fijos y slots válidos.
  const aplicarPreset=(presetId, opts={})=>{
    const effectivePreset = presetId || selectedSalonType || "fiesta_latina";
    const guestCount = selectedGuestCount || nearestGuestOption(totalInvWarn || 150);
    const roomOpt = roomSizeOption || "recommended";
    let P = effectivePreset === "desde_cero"
      ? PRESET_BUILDERS.desde_cero()
      : generateWeddingLayout({
          presetId: effectivePreset,
          guestCount,
          roomSizeOption: roomOpt,
          tableType: selectedTableTypeId || "auto",
          format: "dinner",
          musicType: "dj",
          coupleTableType: "sweetheart"
        });

    const hayLayout=(mesas&&mesas.length>0)||(elementos&&elementos.length>0);
    if(!opts.skipConfirm&&hayLayout&&typeof window!=="undefined"){
      const ok=window.confirm("Esto reemplaza el plano actual por un preset profesional editable. Después vas a poder mover y redimensionar mesas, pista, barra, DJ, lounge y todos los elementos. ¿Querés continuar?");
      if(!ok) return;
    }

    P = resolvePresetOverlaps(P);

    setSalonW(P.salonW); setSalonH(P.salonH); setSalonShape(P.salonShape || "rectangulo"); setSelectedSalonShape(P.salonShape || "rectangulo");
    setSalonShapeConfig(P.salonShapeConfig||DEFAULT_SALON_SHAPE_CONFIG); setSelectedShapeConfig(P.salonShapeConfig||DEFAULT_SALON_SHAPE_CONFIG);
    setEstiloDistrib(NORMALIZE_DISTRIB(P.estiloDistrib||effectivePreset)); setEstiloDecor(P.estiloDecor||effectivePreset);
    if(effectivePreset!=="desde_cero") setSelectedSalonType(effectivePreset);
    setMesas(P.mesas||[]); setElementos(makeElementsEditable(P.elementos||[]));
    setLayoutSummary(P.layoutSummary || null);
    setSelectedMesa(null); setSelectedElem(null); setSelectedGuestForAssign(null);
    setShowPresetMenu(false); setShowShapeMenu(false); setShowElemMenu(false);

    const tipoLabel=STAGE2_PRESET_CONFIGS[effectivePreset]?.label||SALON_PRESETS.find(x=>x.id===effectivePreset)?.label||"preset";
    if(P.layoutSummary?.alertas?.length && typeof showToast==="function") {
      showToast(`⚠️ ${tipoLabel}: revisar ${P.layoutSummary.alertas.length} alerta${P.layoutSummary.alertas.length!==1?"s":""}.`,"error",5200);
    } else if(typeof showToast==="function") {
      showToast(`✓ Preset aplicado: ${tipoLabel}. Capacidad sentada ${P.layoutSummary?.capacidadSentada || 0}/${guestCount}.`,"success",3200);
    }
    setTimeout(fitToScreen,80);
  };

  const aplicarModelo=()=>aplicarPreset("fiesta_latina",{skipConfirm:true});

  const fitToScreen=()=>{
    const el=viewportRef.current; if(!el) return;
    const vpW=el.clientWidth-60, vpH=el.clientHeight-60;
    const newZ=Math.min(vpW/(salonW*BASE_PX),vpH/(salonH*BASE_PX),2.5);
    setZoom(+newZ.toFixed(2));
    requestAnimationFrame(()=>{el.scrollLeft=0;el.scrollTop=0;});
  };

  // ── Zoom centrado en un punto: se preserva ajustando el scroll ──
  const zoomAt=(factor,px,py)=>{
    const el=viewportRef.current; if(!el) return;
    const cx=px??el.clientWidth/2, cy=py??el.clientHeight/2;
    const newZ=+Math.max(0.3,Math.min(3,zoom*factor)).toFixed(2);
    if(newZ===zoom) return;
    const k=newZ/zoom;
    const contentX=el.scrollLeft+cx, contentY=el.scrollTop+cy;
    setZoom(newZ);
    requestAnimationFrame(()=>{el.scrollLeft=Math.max(0,contentX*k-cx);el.scrollTop=Math.max(0,contentY*k-cy);});
  };

  // ── Posición en canvas ──
  const getCanvasPos=(e)=>{
    const r=canvasRef.current?.getBoundingClientRect()||{left:0,top:0};
    const cx=e.touches?.[0]?.clientX??e.clientX;
    const cy=e.touches?.[0]?.clientY??e.clientY;
    return{x:cx-r.left,y:cy-r.top};
  };

  const getCanvasPosFromClient=(clientX,clientY)=>{
    const r=canvasRef.current?.getBoundingClientRect()||{left:0,top:0};
    return {x:clientX-r.left,y:clientY-r.top};
  };

  const mesaIdAtClient=(clientX,clientY,isTouchEvt=false)=>{
    // Primero probamos con el DOM real. Esto corrige el caso de arrastrar
    // desde el panel lateral hacia el canvas, donde el mouseup puede caer
    // directamente sobre el div/SVG de la mesa.
    const node=document.elementFromPoint?.(clientX,clientY);
    const drop=node?.closest?.("[data-salon-mesa-drop]");
    const domId=drop?.getAttribute?.("data-salon-mesa-drop");
    if(domId) return parseInt(domId,10)||domId;

    // Fallback por geometría: útil en SVG/touch si elementFromPoint devuelve
    // un nodo interno o si el usuario suelta muy cerca del borde de la mesa.
    const pos=getCanvasPosFromClient(clientX,clientY);
    const detectR=(MESA_R_M+ASIENTO_R_M*2+(isTouchEvt?1.2:0.65))*PX;
    let best=null;
    let bestDist=Infinity;
    mesas.forEach(m=>{
      const dx=m.mx*PX-pos.x, dy=m.my*PX-pos.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<detectR&&d<bestDist){best=m;bestDist=d;}
    });
    return best?best.id:null;
  };

  const moveDraggingGuestFromClient=(clientX,clientY,isTouchEvt=false)=>{
    const pos=getCanvasPosFromClient(clientX,clientY);
    setDragging(d=>d?.type==="guest"?{...d,cx:pos.x,cy:pos.y}:d);
    const over=mesaIdAtClient(clientX,clientY,isTouchEvt);
    setHoveredMesa(over||null);
    hoveredMesaRef.current=over||null;
  };

  // ── Touch/tablet: mover mesas con el dedo ─────────────────────
  // En mobile necesitamos dos gestos distintos sobre la mesa:
  // 1) tap corto = seleccionar mesa o asignar el invitado seleccionado;
  // 2) mantener y arrastrar = mover la mesa de lugar.
  const beginMesaTouchDrag=(e,mesa)=>{
    const t=e.touches?.[0];
    if(!t||selectedGuestForAssign) return;
    const pos=getCanvasPos(e);
    mesaTouchDragRef.current={
      id:mesa.id,
      startX:t.clientX,
      startY:t.clientY,
      ox:pos.x/PX-mesa.mx,
      oy:pos.y/PX-mesa.my,
      moved:false
    };
  };

  const moveMesaTouchDrag=(e)=>{
    const cand=mesaTouchDragRef.current;
    const t=e.touches?.[0];
    if(!cand||!t||selectedGuestForAssign) return false;
    const dx=t.clientX-cand.startX, dy=t.clientY-cand.startY;
    if(!cand.moved&&Math.hypot(dx,dy)<8) return false;

    if(e.cancelable) e.preventDefault();
    cand.moved=true;
    dragMoved.current=true;
    const pos=getCanvasPos(e);
    const mx=Math.max(MESA_R_M,Math.min(salonW-MESA_R_M,pos.x/PX-cand.ox));
    const my=Math.max(MESA_R_M,Math.min(salonH-MESA_R_M,pos.y/PX-cand.oy));
    setDragging({type:"mesa",id:cand.id,ox:cand.ox,oy:cand.oy});
    setMesas(ms=>ms.map(m=>m.id===cand.id?{...m,mx,my}:m));
    setSelectedMesa(cand.id);
    setSelectedElem(null);
    if(isMobile) setShowSheet(false);
    return true;
  };

  const endMesaTouchDrag=()=>{
    const moved=!!mesaTouchDragRef.current?.moved;
    mesaTouchDragRef.current=null;
    return moved;
  };

  // ── Touch pinch ──
  const onTouchStart=(e)=>{
    if(e.touches.length===2){
      mesaTouchDragRef.current=null;
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const my=(e.touches[0].clientY+e.touches[1].clientY)/2;
      setPinch({dist:Math.sqrt(dx*dx+dy*dy),zoom0:zoom,mx,my});
    } else if(e.touches.length===1){
      // 1 dedo: iniciar pan solo si no es sobre una mesa/elemento
      const tgt=e.target;
      const isBg=tgt===viewportRef.current||tgt===canvasRef.current||
                 tgt.tagName==="svg"||tgt.tagName==="rect"||tgt.tagName==="path"||
                 tgt.tagName==="line"||tgt.tagName==="pattern";
      if(isBg){
        const r=viewportRef.current?.getBoundingClientRect()||{left:0,top:0};
        const cx=e.touches[0].clientX;
        const cy=e.touches[0].clientY;
        // Doble tap: acercar sobre el punto tocado, o encuadrar si ya está cerca
        const now=Date.now();
        if(now-lastTap.current<300){
          lastTap.current=0;
          if(zoom<1.5) zoomAt(1.9,cx-r.left,cy-r.top);
          else fitToScreen();
          return;
        }
        lastTap.current=now;
        // El desplazamiento con 1 dedo es scroll nativo del contenedor
      }
    }
  };
  const onTouchMove=(e)=>{
    if(e.touches.length===2&&pinch){
      if(e.cancelable) e.preventDefault();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const newZ=+Math.max(0.3,Math.min(3,pinch.zoom0*(dist/pinch.dist))).toFixed(2);
      const el=viewportRef.current; if(!el) return;
      const r=el.getBoundingClientRect();
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left;
      const my=(e.touches[0].clientY+e.touches[1].clientY)/2-r.top;
      if(newZ!==zoom){
        const k=newZ/zoom;
        const contentX=el.scrollLeft+mx, contentY=el.scrollTop+my;
        setZoom(newZ);
        requestAnimationFrame(()=>{el.scrollLeft=Math.max(0,contentX*k-mx);el.scrollTop=Math.max(0,contentY*k-my);});
      }
      return;
    }
    if(e.touches.length===1&&moveMesaTouchDrag(e)) return;
    onMove(e);
  };
  const onTouchEnd=(e)=>{
    if(e.touches.length<2)setPinch(null);
    endMesaTouchDrag();
    onUp();
  };

  // ── Drag ──
  const startDrag=(e,type,id)=>{
    e.preventDefault();e.stopPropagation();
    const pos=getCanvasPos(e);
    if(type==="mesa"){
      const item=mesas.find(m=>m.id===id); if(!item) return;
      setDragging({type,id,ox:pos.x/PX-item.mx,oy:pos.y/PX-item.my});
    } else if(type==="elem"){
      const item=elementos.find(el=>el.id===id); if(!item) return;
      setSelectedElem(id);setSelectedMesa(null);
      setDragging({type,id,ox:pos.x/PX-item.mx,oy:pos.y/PX-item.my});
    } else if(type==="rotate"){
      // Rotar mesa rectangular
      const item=mesas.find(m=>m.id===id); if(!item) return;
      const cx=item.mx*PX, cy=item.my*PX;
      const angle0=item.angle||0;
      setDragging({type:"rotate",id,cx,cy,angle0,startAng:Math.atan2(pos.y-cy,pos.x-cx)});
    } else if(type==="rotateE"){
      // Rotar cualquier elemento del salón
      const item=elementos.find(el=>el.id===id); if(!item) return;
      setSelectedElem(id);setSelectedMesa(null);
      const cx=(item.mx+(item.ew||1)/2)*PX, cy=(item.my+(item.eh||1)/2)*PX;
      const angle0=item.angle||0;
      setDragging({type:"rotateE",id,cx,cy,angle0,startAng:Math.atan2(pos.y-cy,pos.x-cx)});
    } else if(type==="resize"){
      const item=elementos.find(el=>el.id===id); if(!item) return;
      setDragging({type:"resize",id,ox:pos.x,oy:pos.y,ew0:item.ew,eh0:item.eh});
    } else if(type==="resizeM"){
      const item=mesas.find(m=>m.id===id); if(!item) return;
      const t=item.tipo||"round";
      const ew0=item.ew||(t==="round"?MESA_R_M*2:2.4);
      const eh0=item.eh||(t==="round"?MESA_R_M*2:0.8);
      setDragging({type:"resizeM",id,ox:pos.x,oy:pos.y,ew0,eh0,tipoM:t});
    } else if(type==="guest"){
      setDragging({type:"guest",id,cx:pos.x,cy:pos.y});
    }
    dragMoved.current=false;
  };
  const startDragGuest=(e,guestId)=>{
    e.stopPropagation();
    if(!e.touches&&e.preventDefault) e.preventDefault();
    const pos=getCanvasPos(e);
    const d={type:"guest",id:guestId,cx:pos.x,cy:pos.y};
    draggingRef.current=d;
    setDragging(d);
    const cx=e.touches?.[0]?.clientX??e.clientX;
    const cy=e.touches?.[0]?.clientY??e.clientY;
    if(cx!==undefined&&cy!==undefined) moveDraggingGuestFromClient(cx,cy,!!e.touches);
  };
  const onMove=(e)=>{
    if(!dragging) return;
    dragMoved.current=true;
    const pos=getCanvasPos(e);
    const r=viewportRef.current?.getBoundingClientRect()||{left:0,top:0};
    const cx=e.touches?.[0]?.clientX??e.clientX;
    const cy=e.touches?.[0]?.clientY??e.clientY;
    if(dragging.type==="mesa"){
      const mx=Math.max(MESA_R_M,Math.min(salonW-MESA_R_M,pos.x/PX-dragging.ox));
      const my=Math.max(MESA_R_M,Math.min(salonH-MESA_R_M,pos.y/PX-dragging.oy));
      setMesas(ms=>ms.map(m=>m.id===dragging.id?{...m,mx,my}:m));
    } else if(dragging.type==="elem"){
      const el=elementos.find(x=>x.id===dragging.id); if(!el) return;
      const mx=Math.max(0,Math.min(salonW-el.ew,pos.x/PX-dragging.ox));
      const my=Math.max(0,Math.min(salonH-el.eh,pos.y/PX-dragging.oy));
      setElementos(es=>es.map(x=>x.id===dragging.id?{...x,mx,my}:x));
    } else if(dragging.type==="rotate"){
      // Calcular ángulo desde el centro de la mesa
      const ang=Math.atan2(pos.y-dragging.cy,pos.x-dragging.cx);
      const delta=(ang-dragging.startAng)*(180/Math.PI);
      // Snap a múltiplos de 15°
      const newAngle=Math.round((dragging.angle0+delta)/15)*15;
      setMesas(ms=>ms.map(m=>m.id===dragging.id?{...m,angle:newAngle}:m));
    } else if(dragging.type==="rotateE"){
      const ang=Math.atan2(pos.y-dragging.cy,pos.x-dragging.cx);
      const delta=(ang-dragging.startAng)*(180/Math.PI);
      const newAngle=Math.round((dragging.angle0+delta)/15)*15;
      setElementos(es=>es.map(x=>x.id===dragging.id?{...x,angle:newAngle}:x));
    } else if(dragging.type==="resize"){
      const ew=Math.max(0.5,+(dragging.ew0+(pos.x-dragging.ox)/PX).toFixed(2));
      const eh=Math.max(0.5,+(dragging.eh0+(pos.y-dragging.oy)/PX).toFixed(2));
      setElementos(es=>es.map(x=>x.id===dragging.id?{...x,ew,eh}:x));
    } else if(dragging.type==="resizeM"){
      // Redimensionar mesa: redondas/cuadradas mantienen proporción; la capacidad se recalcula
      const dx=(pos.x-dragging.ox)/PX, dy=(pos.y-dragging.oy)/PX;
      const t=dragging.tipoM;
      let ew,eh;
      if(t==="round"||t==="square"){
        const d=Math.max(dx,dy);
        ew=eh=Math.max(0.8,Math.min(6,+(dragging.ew0+d).toFixed(1)));
      } else {
        ew=Math.max(0.6,Math.min(25,+(dragging.ew0+dx).toFixed(1)));
        eh=Math.max(0.6,Math.min(25,+(dragging.eh0+dy).toFixed(1)));
      }
      setMesas(ms=>ms.map(m=>m.id===dragging.id?{...m,ew,eh,cap:capPorMedidas(t,ew,eh)}:m));
    } else if(dragging.type==="guest"){
      const clientX=e.touches?.[0]?.clientX??e.clientX;
      const clientY=e.touches?.[0]?.clientY??e.clientY;
      moveDraggingGuestFromClient(clientX,clientY,!!e.touches);
    }
  };
  const onUp=(e)=>{
    if(dragging?.type==="guest"){
      let drop=hoveredMesa;
      const clientX=e?.changedTouches?.[0]?.clientX??e?.clientX;
      const clientY=e?.changedTouches?.[0]?.clientY??e?.clientY;
      if(clientX!==undefined&&clientY!==undefined) drop=mesaIdAtClient(clientX,clientY,!!e?.changedTouches);
      if(drop) tryAssignGuestToMesa(dragging.id,drop);
    }
    draggingRef.current=null;
    setDragging(null);setHoveredMesa(null);
  };

  useEffect(()=>{
    if(dragging?.type!=="guest") return;
    const handleMove=(ev)=>{
      const p=ev.touches?.[0]||ev;
      if(!p) return;
      if(ev.cancelable) ev.preventDefault();
      dragMoved.current=true;
      moveDraggingGuestFromClient(p.clientX,p.clientY,!!ev.touches);
    };
    const handleUp=(ev)=>{
      const d=draggingRef.current;
      if(d?.type!=="guest") return;
      const p=ev.changedTouches?.[0]||ev;
      let drop=hoveredMesaRef.current;
      if(p?.clientX!==undefined&&p?.clientY!==undefined) drop=mesaIdAtClient(p.clientX,p.clientY,!!ev.changedTouches);
      if(drop) tryAssignGuestToMesa(d.id,drop);
      draggingRef.current=null;
      setDragging(null);
      setHoveredMesa(null);
    };
    document.addEventListener("mousemove",handleMove);
    document.addEventListener("mouseup",handleUp);
    document.addEventListener("touchmove",handleMove,{passive:false});
    document.addEventListener("touchend",handleUp,{passive:false});
    document.addEventListener("touchcancel",handleUp,{passive:false});
    return ()=>{
      document.removeEventListener("mousemove",handleMove);
      document.removeEventListener("mouseup",handleUp);
      document.removeEventListener("touchmove",handleMove);
      document.removeEventListener("touchend",handleUp);
      document.removeEventListener("touchcancel",handleUp);
    };
  },[dragging?.type,mesas,zoom,salonW,salonH,onAssign]);

  const maxMesaAsignadaSalon=Math.max(0,...(guests||[]).filter(g=>g.mesa).map(g=>parseInt(g.mesa)||0));
  const ambientesConActual=environmentsWithCurrent();
  const idsMesasGlobales=new Set(
    ambientesConActual.flatMap(ambiente=>Array.isArray(ambiente.mesas)?ambiente.mesas:[])
      .map(mesa=>parseInt(mesa.id))
      .filter(id=>Number.isFinite(id)&&id>0)
  );
  const mesasPendientesSalon=Array.from({length:maxMesaAsignadaSalon},(_,index)=>index+1).filter(id=>!idsMesasGlobales.has(id));
  const mesasRequeridasCreadasSalon=Math.max(0,maxMesaAsignadaSalon-mesasPendientesSalon.length);

  const getPosicionLibreSalon=(mesasActuales,totalObjetivo)=>{
    const margen=1.5;
    const separacion=2.8;
    const cols=Math.max(1,Math.floor((Math.max(5,salonW)-margen*2)/separacion)+1);
    const filas=Math.max(1,Math.floor((Math.max(5,salonH)-margen*2)/separacion)+1);
    const ocupada=(mx,my)=>(mesasActuales||[]).some(mesa=>Math.hypot((parseFloat(mesa.mx)||0)-mx,(parseFloat(mesa.my)||0)-my)<1.55);
    const maxSlots=Math.max(cols*filas,totalObjetivo||0,1);
    for(let slot=0;slot<maxSlots;slot++){
      const mx=margen+(slot%cols)*separacion;
      const my=margen+Math.floor(slot/cols)*separacion;
      if(my<=salonH-margen&&!ocupada(mx,my)) return {mx,my};
    }
    const slot=(mesasActuales||[]).length;
    return {mx:margen+(slot%cols)*separacion,my:margen+Math.floor(slot/cols)*separacion};
  };
  const etiquetaMesaSegunInvitados=(id)=>{
    const conteo={};
    (guests||[]).filter(g=>parseInt(g.mesa)===id).forEach(g=>{
      const parentesco=g.parentesco||"Otro";
      conteo[parentesco]=(conteo[parentesco]||0)+(parseInt(g.cantidadInvitados||1)||1);
    });
    const principal=Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0];
    if(!principal||principal[0]==="Otro") return "";
    return principal[0]==="Familia directa"?"Familia":principal[0];
  };
  const agregarMesasPendientesSalon=(cantidad=1)=>{
    const idsAAgregar=mesasPendientesSalon.slice(0,Math.max(1,cantidad));
    if(idsAAgregar.length===0){
      showToast("No hay mesas pendientes para agregar al salón","info");
      return;
    }
    setMesas(ms=>{
      let nuevas=[...ms];
      const totalObjetivo=Math.max(maxMesaAsignadaSalon,nuevas.length+idsAAgregar.length);
      idsAAgregar.forEach(id=>{
        if(nuevas.some(mesa=>parseInt(mesa.id)===id)) return;
        const posicion=getPosicionLibreSalon(nuevas,totalObjetivo);
        nuevas.push({id,...posicion,tipo:"round",etiqueta:etiquetaMesaSegunInvitados(id),cap:tableSize});
      });
      return nuevas.sort((a,b)=>(parseInt(a.id)||0)-(parseInt(b.id)||0));
    });
    const texto=idsAAgregar.length===1
      ? `✓ Se agregó la mesa ${idsAAgregar[0]} al canvas`
      : `✓ Se agregaron ${idsAAgregar.length} mesas al canvas`;
    showToast(texto,"success",3500);
    setTimeout(fitToScreen,120);
  };
  const addMesa=()=>{
    if(mesasPendientesSalon.length>0){
      agregarMesasPendientesSalon(1);
      return;
    }
    const newId=Math.max(0,...idsMesasGlobales,maxMesaAsignadaSalon)+1;
    const posicion=getPosicionLibreSalon(mesas,newId);
    setMesas(ms=>[...ms,{id:newId,...posicion,tipo:"round",etiqueta:"",cap:tableSize}]);
    showToast(`✓ Se agregó la mesa ${newId} al canvas`,"success",3000);
    setTimeout(fitToScreen,120);
  };
  const removeMesa=(id)=>{
    (guests||[]).filter(g=>parseInt(g.mesa)===id).forEach(g=>onRemove(g.id));
    setMesas(ms=>ms.filter(m=>m.id!==id));
    if(selectedMesa===id){setSelectedMesa(null);setShowSheet(false);}
  };
  const addElemento=(tipo)=>{
    const def=ELEMENTOS_FIJOS.find(e=>e.id===tipo);
    const nid=`${tipo}-${Date.now()}`;
    setElementos(es=>[...es,{id:nid,tipo,mx:salonW/2-2,my:salonH/2-2,ew:def?.w||3,eh:def?.h||2}]);
    setSelectedElem(nid);
  };
  const removeElemento=(id)=>{setElementos(es=>es.filter(el=>el.id!==id));setSelectedElem(null);};
  const updateMesa=(id,patch)=>setMesas(ms=>ms.map(m=>m.id===id?{...m,...patch}:m));

  // ── fitToScreen al montar (espera la transición de ancho del contenedor) ──
  useEffect(()=>{setTimeout(fitToScreen,320);},[]);

  // ── Zoom con rueda del mouse, centrado en el cursor ──
  useEffect(()=>{
    const el=viewportRef.current; if(!el) return;
    const h=(e)=>{
      // Zoom solo con Ctrl/Cmd + rueda (o pinch de trackpad); la rueda sola scrollea el salón
      if(!e.ctrlKey&&!e.metaKey) return;
      e.preventDefault();
      const r=el.getBoundingClientRect();
      zoomAt(e.deltaY>0?1/1.12:1.12, e.clientX-r.left, e.clientY-r.top);
    };
    el.addEventListener("wheel",h,{passive:false});
    return ()=>el.removeEventListener("wheel",h);
  },[zoom]);

  // ── Cerrar menus al click fuera ──
  useEffect(()=>{
    const handler=(e)=>{
      setShowShapeMenu(false);
      setShowElemMenu(false);setShowPresetMenu(false);
    };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[]);

  // ── Auto distribución ──
  const autoDistribuir=()=>{
    const W=salonW, H=salonH, mg=1.0;

    const totalInv=budgetInvitados>0?budgetInvitados:(guests||[]).reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
    const ppMesa=estiloDistrib==="cantine"?16:estiloDistrib==="u_shape"?20:estiloDistrib==="chevrons"?10:tableSize;
    // Nunca reducir: distribuir al menos las mesas que ya existen
    const calculado=Math.max(mesas.length, totalInv>0?Math.ceil(totalInv/ppMesa):0);

    const RD=MESA_R_M;       // 0.90m radio
    const D=RD*2;            // 1.80m diámetro
    const GR=D+1.2;          // paso mesas redondas (centro a centro)
    const MW=0.8;            // ancho mesa larga
    const SG=1.1;            // espacio para sillas

    // Grilla de mesas redondas en zona dada, sin encimamiento
    const grillaR=(x1,y1,x2,y2)=>{
      const zW=x2-x1, zH=y2-y1;
      const cols=Math.max(1,Math.floor(zW/GR));
      const rows=Math.max(1,Math.floor(zH/GR));
      const eX=zW/cols, eY=zH/rows;
      const pts=[];
      for(let r=0;r<rows;r++) for(let col=0;col<cols;col++)
        pts.push({mx:x1+col*eX+eX/2, my:y1+r*eY+eY/2, tipo:"round"});
      return pts;
    };

    let pos=[], elems=[];

    // ══════════════════════════════════════════════════════════════
    // BANQUETE
    // [mesa larga novios arriba]
    // [grilla filas × cols de mesas redondas]
    // ══════════════════════════════════════════════════════════════
    if(estiloDistrib==="banquet"){
      const novW=Math.min(W*0.4,6), novH=MW;
      const yNov=mg+SG;
      const yMesas=yNov+novH+SG+RD;
      elems=[{id:"novios-1",tipo:"novios",mx:W/2-novW/2,my:yNov,ew:novW,eh:novH}];
      // Llenar la zona inferior con mesas en grilla
      const allPts=grillaR(mg+RD,yMesas,W-mg-RD,H-mg-RD);
      const N=Math.max(calculado,allPts.length>0?Math.min(allPts.length,6):6);
      pos=allPts.slice(0,N);

    // ══════════════════════════════════════════════════════════════
    // PISTA AL CENTRO
    // [mesa larga novios arriba]
    // [mesas izq] [PISTA grande] [mesas der]
    // [mesas abajo]
    // ══════════════════════════════════════════════════════════════
    } else if(estiloDistrib==="pista_centro"){
      const novW=Math.min(W*0.4,6), novH=MW;
      const yNov=mg+SG;
      // Pista: ocupa ~40% ancho × 35% alto, centrada
      const pW=Math.min(W*0.40,8), pH=Math.min(H*0.35,6);
      const px=(W-pW)/2, py=(H-pH)/2+0.5;
      elems=[
        {id:"novios-1",tipo:"novios",mx:W/2-novW/2,my:yNov,ew:novW,eh:novH},
        {id:"pista-1", tipo:"pista", mx:px,         my:py,  ew:pW,  eh:pH},
      ];
      const G=0.6;
      const yTop=yNov+novH+G+RD;
      // 4 zonas alrededor de la pista
      const zonas=[
        {x1:mg+RD,     y1:yTop,       x2:px-G-RD,    y2:H-mg-RD},  // izq
        {x1:px+pW+G+RD,y1:yTop,       x2:W-mg-RD,    y2:H-mg-RD},  // der
        {x1:px+RD,     y1:yTop,       x2:px+pW-RD,   y2:py-G-RD},  // arriba pista
        {x1:px+RD,     y1:py+pH+G+RD, x2:px+pW-RD,   y2:H-mg-RD},  // abajo pista
      ];
      const ptsZonas=zonas.map(z=>grillaR(z.x1,z.y1,z.x2,z.y2));
      const totalCap=ptsZonas.reduce((s,z)=>s+z.length,0);
      const N=Math.max(calculado,Math.min(totalCap,8));
      const perZ=Math.ceil(N/4);
      let rem=N;
      ptsZonas.forEach(pts=>{
        const n=Math.min(perZ,rem,pts.length);
        pos.push(...pts.slice(0,n));
        rem-=n;
      });

    // ══════════════════════════════════════════════════════════════
    // CENA SHOW / ESCENARIO
    // [mesa larga novios arriba]
    // Mesas en filas abiertas, orientadas visualmente hacia escenario/DJ.
    // Útil cuando hay show, banda, discursos o pantalla protagonista.
    // ══════════════════════════════════════════════════════════════
    } else if(estiloDistrib==="cabaret"){
      const novW=Math.min(W*0.4,6), novH=MW;
      const yNov=mg+SG;
      const yMesas=yNov+novH+SG+RD;
      elems=[{id:"novios-1",tipo:"novios",mx:W/2-novW/2,my:yNov,ew:novW,eh:novH}];
      const maxCols=Math.max(1,Math.floor((W-mg*2)/GR));
      const maxRows=Math.max(1,Math.floor((H-yMesas-mg)/GR));
      // Filas con 2, 3, 4... mesas
      let placed=0, row=0;
      const allPts=[];
      while(row<maxRows){
        const enFila=Math.min(maxCols,2+row);
        const tW=enFila*GR, offX=(W-mg*2-tW)/2;
        for(let i=0;i<enFila;i++)
          allPts.push({
            mx:Math.max(mg+RD,Math.min(W-mg-RD,mg+offX+i*GR+GR/2)),
            my:Math.min(H-mg-RD,yMesas+row*GR+RD),
            tipo:"round",
          });
        row++;
      }
      const N=Math.max(calculado,Math.min(allPts.length,9));
      pos=allPts.slice(0,N);

    // ══════════════════════════════════════════════════════════════
    // IMPERIAL ELEGANTE
    // [mesa larga novios arriba]
    // Mesas rectangulares/imperiales en columnas con pasillos claros.
    // Útil para boda moderna, minimalista o cena formal.
    // ══════════════════════════════════════════════════════════════
    } else if(estiloDistrib==="cantine"){
      const novW=Math.min(W*0.4,6), novH=MW;
      const yNov=mg+SG;
      const yMesas=yNov+novH+SG;
      elems=[{id:"novios-1",tipo:"novios",mx:W/2-novW/2,my:yNov,ew:novW,eh:novH}];
      // 4 columnas siempre
      const NUM_COLS=4;
      // Largo de cada mesa: ocupa ~70% del alto disponible
      const zonaH=H-yMesas-mg-SG;
      const mLH=Math.min(5.0,Math.max(2.5,zonaH*0.75));
      const colW=(W-mg*2)/NUM_COLS;
      // Filas según espacio
      const pasoY=mLH+0.5;
      const maxFilas=Math.max(1,Math.floor((H-yMesas-mg)/(pasoY)));
      const allPts=[];
      for(let fila=0;fila<maxFilas;fila++)
        for(let col=0;col<NUM_COLS;col++)
          allPts.push({
            mx:Math.max(mg+MW/2+SG,Math.min(W-mg-MW/2-SG,mg+col*colW+colW/2)),
            my:Math.max(mg+mLH/2,Math.min(H-mg-mLH/2,yMesas+fila*pasoY+mLH/2)),
            tipo:"rect_v", ew:MW, eh:mLH, miraSide:"both",
          });
      const N=Math.max(calculado,Math.min(allPts.length,8));
      pos=allPts.slice(0,N);

    // ══════════════════════════════════════════════════════════════
    // FORMA EN U
    // 3 mesas largas formando U:
    //  - Brazo izq: vertical, sillas derecha (interior) e izquierda (exterior)
    //  - Fondo: horizontal arriba, sillas arriba y abajo
    //  - Brazo der: vertical, sillas izquierda (interior) y derecha (exterior)
    // ══════════════════════════════════════════════════════════════
    } else if(estiloDistrib==="u_shape"){
      const brazoX_L=mg+SG+MW/2;
      const brazoX_R=W-mg-SG-MW/2;
      const fondoY=mg+SG+MW/2;
      const brazoH=H-mg*2-SG*2;
      const fondoW=brazoX_R-brazoX_L-MW;
      pos=[
        {mx:brazoX_L,               my:mg+SG+brazoH/2, tipo:"rect_v", ew:MW, eh:brazoH, miraSide:"both"},
        {mx:brazoX_L+MW/2+fondoW/2, my:fondoY,          tipo:"rect_h", ew:fondoW, eh:MW, miraSide:"both"},
        {mx:brazoX_R,               my:mg+SG+brazoH/2, tipo:"rect_v", ew:MW, eh:brazoH, miraSide:"both"},
      ];
      elems=[];

    // ══════════════════════════════════════════════════════════════
    // CHEVRONES
    // [mesa larga novios arriba]
    // Izquierda: mesas horizontales que bajan y se alejan del centro \
    // Derecha:   espejo exacto /
    // Las mesas NO están en diagonal, son horizontales pero
    // escalonadas para crear el efecto de espiga
    // ══════════════════════════════════════════════════════════════
    } else if(estiloDistrib==="chevrons"){
      const novW=Math.min(W*0.4,6), novH=MW;
      const yNov=mg+SG;
      const yMesas=yNov+novH+SG+MW/2+SG;
      elems=[{id:"novios-1",tipo:"novios",mx:W/2-novW/2,my:yNov,ew:novW,eh:novH}];
      // Mesa mediana horizontal: ~30% del ancho disponible
      const mW=Math.min((W-mg*2)*0.30,3.5), mH=MW;
      const pasoY=mH+SG*2+0.2;
      const pasoX=0.3; // desplazamiento hacia afuera por fila
      const gapC=0.4;  // hueco en el centro
      const maxFilas=Math.max(1,Math.floor((H-yMesas-mg-SG)/(pasoY)));
      const allPts=[];
      for(let i=0;i<maxFilas;i++){
        // Izquierda — ángulo negativo (diagonal \)
        allPts.push({
          mx:Math.max(mg+mW/2+SG,W/2-gapC-mW/2-i*pasoX),
          my:Math.min(H-mg-mH/2-SG,yMesas+i*pasoY),
          tipo:"rect_h",ew:mW,eh:mH,miraSide:"both",
          angle:-30,
        });
        // Derecha — ángulo positivo (diagonal /)
        allPts.push({
          mx:Math.min(W-mg-mW/2-SG,W/2+gapC+mW/2+i*pasoX),
          my:Math.min(H-mg-mH/2-SG,yMesas+i*pasoY),
          tipo:"rect_h",ew:mW,eh:mH,miraSide:"both",
          angle:30,
        });
      }
      const N=Math.max(calculado,Math.min(allPts.length,8));
      // Tomar de a pares (izq+der)
      const pairs=Math.ceil(N/2);
      pos=allPts.slice(0,pairs*2);
    }

    // Aplicar posiciones preservando etiquetas
    const maxId=mesas.length>0?Math.max(...mesas.map(m=>m.id)):0;
    let base=[...mesas];
    for(let i=base.length;i<pos.length;i++)
      base.push({id:maxId+i-mesas.length+1,mx:W/2,my:H/2,tipo:"round",etiqueta:""});

    const nuevasMesas=base.slice(0,pos.length).map((m,i)=>({
      ...m,
      mx:       pos[i]?.mx       ?? W/2,
      my:       pos[i]?.my       ?? H/2,
      tipo:     pos[i]?.tipo     ?? "round",
      ew:       pos[i]?.ew,
      eh:       pos[i]?.eh,
      angle:    pos[i]?.angle,
      miraSide: pos[i]?.miraSide,
    }));

    // Función heredada para compatibilidad interna: conserva decoración y respeta zonas sensibles.
    // Ya no se muestra como acción principal porque el diseño se resuelve desde tipo + estilo.
    const reemplazables=new Set(["novios","pista","escenario"]);
    setElementos(actual=>{
      const finalElementos=[...elems,...(actual||[]).filter(el=>!reemplazables.has(el.tipo))];
      setMesas(sanitizarMesasConZonas(nuevasMesas, finalElementos, W, H));
      return finalElementos;
    });
    setTimeout(fitToScreen,50);
  };

  // ── Sentar por protocolo (bodas.net) ──────────────────────────
  // Subgrupos PUROS: cada mesa pertenece a un solo grupo
  // (parentesco × lado): familia de la novia con familia de la novia,
  // amigos del novio con amigos del novio, trabajo con trabajo.
  // Solo se mezcla como último recurso para no dejar gente parada.
  // Se puede correr las veces que quieras; guarda la asignación
  // anterior para deshacer.
  const sentarPorProtocolo=()=>{
    if(!guests||guests.length===0||mesas.length===0||!onAssignMany) return;
    const centro=el=>({x:el.mx+(el.ew||0)/2,y:el.my+(el.eh||0)/2});
    const novios=elementos.find(e=>e.tipo==="novios");
    const pista=elementos.find(e=>e.tipo==="pista");
    const entradaEl=elementos.find(e=>e.tipo==="entrada");
    const refNovios=novios?centro(novios):{x:salonW/2,y:1};
    const dist=(m,p)=>Math.hypot(m.mx-p.x,m.my-p.y);
    const porNovios=[...mesas].sort((a,b)=>dist(a,refNovios)-dist(b,refNovios));
    const porPista=pista?[...mesas].sort((a,b)=>dist(a,centro(pista))-dist(b,centro(pista))):porNovios;
    const porEntrada=entradaEl?[...mesas].sort((a,b)=>dist(a,centro(entradaEl))-dist(b,centro(entradaEl))):[...porNovios].reverse();
    const cap={}; mesas.forEach(m=>{cap[m.id]=capDe(m);});
    const dueno={}; // mesaId → clave del subgrupo que la ocupa
    const size=g=>parseInt(g.cantidadInvitados||1)||1;
    const activos=(guests||[]).filter(g=>g.confirmacion!=="no_va");
    const pairs=[]; const sinLugar=[];
    // Snapshot para deshacer
    setPrevAsignacion(guests.map(g=>({guestId:g.id,mesa:g.mesa||""})));
    const asignarSubgrupo=(miembros,clave,candidatas)=>{
      for(const g of miembros){
        const s=size(g);
        // 1) mesa que ya ocupa este mismo subgrupo, con lugar
        let mesa=candidatas.find(m=>dueno[m.id]===clave&&cap[m.id]>=s);
        // 2) mesa libre (sin dueño en esta corrida)
        if(!mesa) mesa=candidatas.find(m=>dueno[m.id]===undefined&&cap[m.id]>=s);
        // 3) último recurso: cualquier mesa con lugar
        if(!mesa) mesa=candidatas.find(m=>cap[m.id]>=s)||candidatas.find(m=>cap[m.id]>0);
        if(!mesa){sinLugar.push(g);continue;}
        pairs.push({guestId:g.id,mesa:mesa.id});
        cap[mesa.id]-=s;
        if(dueno[mesa.id]===undefined) dueno[mesa.id]=clave;
      }
    };
    const miembros=(parentesco,lado)=>activos
      .filter(g=>(g.parentesco||"Otro")===parentesco&&(lado===null||(g.lado||"Ambos")===lado))
      .sort((a,b)=>size(b)-size(a));
    // Niños todos juntos, cerca de la entrada
    asignarSubgrupo(miembros("Niños",null),"Niños",porEntrada);
    // Familia segmentada por lado, en las mesas más cercanas a los novios
    for(const p of ["Familia directa","Familia"]){
      asignarSubgrupo(miembros(p,"Novia"),`${p}·Novia`,porNovios);
      asignarSubgrupo(miembros(p,"Novio"),`${p}·Novio`,porNovios);
      asignarSubgrupo(miembros(p,"Ambos"),`${p}·Ambos`,porNovios);
    }
    // Amigos por lado, cerca de la pista
    asignarSubgrupo(miembros("Amigos","Novia"),"Amigos·Novia",porPista);
    asignarSubgrupo(miembros("Amigos","Novio"),"Amigos·Novio",porPista);
    asignarSubgrupo(miembros("Amigos","Ambos"),"Amigos·Ambos",porPista);
    // Trabajo junto, y el resto
    asignarSubgrupo(miembros("Trabajo",null),"Trabajo",porNovios);
    asignarSubgrupo(miembros("Otro",null),"Otro",porNovios);
    // Los que no entraron en ninguna mesa quedan en "Sin mesa"
    sinLugar.forEach(g=>pairs.push({guestId:g.id,mesa:""}));
    // Etiquetar mesas según su subgrupo (solo las que no tienen etiqueta propia)
    const labelDe=(clave)=>{
      if(clave==="Otro") return "";
      const [p,l]=clave.split("·");
      const base=p==="Familia directa"?"Familia":p;
      return l&&l!=="Ambos"?`${base} ${l}`:base;
    };
    setMesas(ms=>ms.map(m=>dueno[m.id]&&!m.etiqueta?{...m,etiqueta:labelDe(dueno[m.id])}:m));
    if(pairs.length>0) onAssignMany(pairs);
  };

  // ── Render mesa en SVG ──
  // Capacidad de una mesa: la propia de su tipo, o la global si no tiene
  const capDe=(m)=>(m?.tipo||"round")==="round"
    ? normalizeRoundTableCapacity(m?.cap,8)
    : (parseInt(m?.cap)||8);

  // Medidas derivadas de la capacidad: 0.6 m de borde por cubierto,
  // cabeceras incluidas en rectangulares e imperiales.
  const medidasPorCap=(tipo,cap)=>{
    const c=Math.max(2,cap);
    if(tipo==="round"){const d={6:1.2,8:1.5,10:1.8,12:2.2}[c]||+(c*0.6/Math.PI).toFixed(1);return{ew:d,eh:d};}
    if(tipo==="square"){const lado=+(Math.max(1.2,Math.ceil(c/4)*0.66)).toFixed(1);return{ew:lado,eh:lado};}
    if(tipo==="rect_h"){const L=+(Math.max(1.8,(c-2)/2*0.6)).toFixed(1);return{ew:L,eh:0.9};}
    if(tipo==="rect_v"){const L=+(Math.max(1.8,(c-2)/2*0.6)).toFixed(1);return{ew:0.9,eh:L};}
    if(tipo==="imperial"){const L=+(Math.max(2.4,(c-2)/2*0.6)).toFixed(1);return{ew:L,eh:1.1};}
    return {};
  };
  // Capacidad recomendada según las medidas reales (~0.6 m por cubierto)
  const capPorMedidas=(tipo,ew,eh)=>{
    if(tipo==="round"||!tipo) return Math.max(2,Math.round(Math.PI*(ew||MESA_R_M*2)/0.6));
    const nH=Math.max(ew>=eh?1:0,Math.floor(ew/0.55));
    const nV=Math.max(eh>ew?1:0,Math.floor(eh/0.55));
    return Math.max(2,2*nH+2*nV);
  };
  // Cambiar medidas a mano: recalcula la capacidad recomendada
  const setMedidas=(mesa,ew,eh)=>{
    if(!mesa) return;
    const t=mesa.tipo||"round";
    const w=Math.max(0.6,Math.min(25,+ew||0.6));
    const h=t==="round"||t==="square"?w:Math.max(0.6,Math.min(25,+eh||0.6));
    const capacidad=t==="round"
      ? normalizeRoundTableCapacity(capPorMedidas(t,w,h),8)
      : capPorMedidas(t,w,h);
    updateMesa(mesa.id,{ew:w,eh:h,cap:capacidad});
  };
  const setCapacidadA=(mesa,n)=>{
    if(!mesa) return;
    const tipo=mesa.tipo||"round";
    const capacidad=tipo==="round"?normalizeRoundTableCapacity(n,8):n;
    updateMesa(mesa.id,{cap:capacidad,...medidasPorCap(tipo,capacidad)});
  };
  const vaciarMesa=(mesaId)=>{
    if(!onAssignMany) return;
    const guestIds=[...new Set(mesaPersonas(mesaId).map(persona=>persona.guestId))];
    if(guestIds.length===0){
      showToast(`La mesa ${mesaId} ya está vacía`,"info");
      return;
    }
    if(typeof window!=="undefined"&&!window.confirm(`¿Mover todas las invitaciones de la mesa ${mesaId} al Banco de espera?`)) return;
    onAssignMany(guestIds.map(guestId=>({guestId,mesa:""})));
    setSelectedGuestForAssign(null);
    showToast(`✓ Mesa ${mesaId} vaciada. Las invitaciones quedaron en el Banco de espera.`,"success",3600);
  };

  const vaciarTodasLasMesas=()=>{
    if(!onAssignMany) return;
    const asignados=(guests||[]).filter(invitado=>parseInt(invitado.mesa));
    if(asignados.length===0){
      showToast("Todas las invitaciones ya están en el Banco de espera","info");
      return;
    }
    if(typeof window!=="undefined"&&!window.confirm(`¿Vaciar todas las mesas? ${asignados.length} invitaciones volverán al Banco de espera.`)) return;
    onAssignMany(asignados.map(invitado=>({guestId:invitado.id,mesa:""})));
    setSelectedMesa(null);
    setSelectedGuestForAssign(null);
    if(isMobile) setShowSheet(false);
    showToast("✓ Se vaciaron todas las mesas. Podés volver a ubicar las invitaciones desde el Banco de espera.","success",4200);
  };

  const usarOchoEnTodasLasRedondas=()=>{
    const redondas=mesas.filter(mesa=>(mesa.tipo||"round")==="round");
    if(redondas.length===0) return;
    if(typeof window!=="undefined"&&!window.confirm(`¿Restablecer la capacidad de las ${redondas.length} mesas redondas a 8 personas? Las invitaciones no se eliminan; las mesas que queden excedidas se marcarán para revisar.`)) return;
    setMesas(actuales=>actuales.map(mesa=>(mesa.tipo||"round")==="round"
      ? {...mesa,cap:8,...medidasPorCap("round",8)}
      : mesa
    ));
    showToast(`✓ ${redondas.length} mesas redondas configuradas para 8 personas`,"success",3200);
  };

  const medidaDe=(m)=>{
    if(!m) return "";
    const t=m.tipo||"round";
    if(t==="round") return `Ø ${(m.ew||MESA_R_M*2).toFixed(1)} m`;
    return `${(m.ew||0).toFixed(1)} × ${(m.eh||0).toFixed(1)} m`;
  };

  // ── Render premium: el canvas ya no usa bloques genéricos.
  // Cada objeto se dibuja como un asset vectorial top-down editable, manteniendo
  // las coordenadas del preset y permitiendo mover, redimensionar y rotar.
  const safeSvgId=(v)=>String(v||"x").replace(/[^a-zA-Z0-9_-]/g,"_");
  const activeVisualId = selectedSalonType || estiloDecor || "fiesta_latina";
  const CANVAS_VISUALS = {
    clasica_elegante:{linen:"#FFFDF7",wood:"#C8AA73",metal:"#B7934C",accent:"#EAD9B8",flower:"#F7F1E5",leaf:"#7B8E5A",floorA:"#F3EBDD",floorB:"#E9DDC5",stroke:"#8F7650",chair:"#EEE0C5",text:"#4F3B23"},
    boho_chic:{linen:"#F9E7D4",wood:"#8F5D37",metal:"#C47A48",accent:"#DFA06D",flower:"#D87545",leaf:"#788B55",floorA:"#F4DFCB",floorB:"#E8C8A6",stroke:"#7A4F34",chair:"#B77A43",text:"#5A3523"},
    rustica_campo:{linen:"#D9BE85",wood:"#7C5430",metal:"#9C6B3D",accent:"#B7955D",flower:"#F0E0B0",leaf:"#607747",floorA:"#B99660",floorB:"#9A7547",stroke:"#553A21",chair:"#8A623A",text:"#332515"},
    minimalista_moderno:{linen:"#FFFFFF",wood:"#D9D7CE",metal:"#9FA09B",accent:"#EFEDE7",flower:"#F4F3EE",leaf:"#A2B09A",floorA:"#F7F7F3",floorB:"#E9E8E2",stroke:"#696862",chair:"#D9D6CC",text:"#353531"},
    jardin_romantico:{linen:"#FFF7F7",wood:"#C6935D",metal:"#C88A9E",accent:"#F0B8C5",flower:"#F4B7C4",leaf:"#5D8B4A",floorA:"#6D8A42",floorB:"#527332",stroke:"#496D3C",chair:"#EAD5C5",text:"#344C2B"},
    playa_tropical:{linen:"#FFF8E2",wood:"#CFA96A",metal:"#62B8AF",accent:"#F2C970",flower:"#F8F1D2",leaf:"#2E9A73",floorA:"#F6D899",floorB:"#E9C476",stroke:"#3F7A7F",chair:"#D6A85D",text:"#234E55"},
    industrial_chic:{linen:"#2F2F2D",wood:"#7A4D2E",metal:"#414141",accent:"#B1784C",flower:"#C0A36B",leaf:"#556B3D",floorA:"#4A4A48",floorB:"#333331",stroke:"#1D1D1B",chair:"#1F1F1D",text:"#F2E7D1"},
    vintage_romantico:{linen:"#F7D9DF",wood:"#9A6247",metal:"#B98A5E",accent:"#E7A3B3",flower:"#EDB0C0",leaf:"#74815C",floorA:"#F7E7E9",floorB:"#E9CFD4",stroke:"#935E6D",chair:"#C99AA0",text:"#593642"},
    glam_lujo:{linen:"#FFF9EC",wood:"#111113",metal:"#D3A83F",accent:"#DCC078",flower:"#FFF6DF",leaf:"#647246",floorA:"#1B1B1D",floorB:"#101012",stroke:"#6F5520",chair:"#D4AA52",text:"#F9EAC7"},
    mediterranea:{linen:"#FFFDF1",wood:"#B68753",metal:"#D9B646",accent:"#E2C55A",flower:"#F0DA6E",leaf:"#4C7A5F",floorA:"#F4EBD3",floorB:"#E5D7B9",stroke:"#486F5C",chair:"#D7A73B",text:"#2F513F"},
    japandi:{linen:"#FBFAF4",wood:"#A48562",metal:"#8E8B7B",accent:"#D4DCCB",flower:"#EFEDE1",leaf:"#91A082",floorA:"#EDEAE0",floorB:"#DDD8C9",stroke:"#505849",chair:"#C7BBA7",text:"#2F362E"},
    eco_sustentable:{linen:"#FCFFF2",wood:"#9A6B43",metal:"#73A55C",accent:"#B5D8A7",flower:"#E5F3D5",leaf:"#4F934A",floorA:"#E4F0DB",floorB:"#D0E4C4",stroke:"#4E7846",chair:"#A4784A",text:"#33552F"},
    fiesta_latina:{linen:"#FFF2E6",wood:"#B35D38",metal:"#E6A23A",accent:"#F3C144",flower:"#F4774B",leaf:"#4F8B58",floorA:"#F8D4B5",floorB:"#F0B98D",stroke:"#9A4734",chair:"#D9844B",text:"#5C2B20"},
    luces_fairy_noche:{linen:"#F8F6FF",wood:"#5F5688",metal:"#EAC05A",accent:"#D8C06B",flower:"#E8D9FF",leaf:"#6B7B5B",floorA:"#2A2540",floorB:"#1B1730",stroke:"#453E69",chair:"#776DA1",text:"#F8F2D8"},
    micro_wedding_boutique:{linen:"#FFF7EF",wood:"#A46E4C",metal:"#BD825D",accent:"#DABDA3",flower:"#F1D2C1",leaf:"#74875E",floorA:"#F3E5D6",floorB:"#E3CFBA",stroke:"#74533E",chair:"#C79A78",text:"#4A3325"},
    blanco_negro:{linen:"#FFFFFF",wood:"#262626",metal:"#111111",accent:"#E8E8E8",flower:"#F7F7F7",leaf:"#4A4A4A",floorA:"#FFFFFF",floorB:"#F2F2F2",stroke:"#1A1A1A",chair:"#F5F5F5",text:"#111111"}
  };
  // En Invitados el canvas vuelve a la lectura blanco y negro/minimalista.
  // En Diseño del salón se conservan los colores realistas de cada preset.
  const visual = isGuestMode ? CANVAS_VISUALS.blanco_negro : (CANVAS_VISUALS[activeVisualId] || CANVAS_VISUALS.fiesta_latina);
  const isDarkVisual = !isGuestMode && ["industrial_chic","glam_lujo","luces_fairy_noche"].includes(activeVisualId);
  const tableTextColor = (sel=false)=> sel ? "#FFFFFF" : (isDarkVisual ? "#F8F2DE" : visual.text);
  const occupancyStats=(mesa)=>{
    const ps=mesaPersonas(mesa.id);
    return {
      confirmados:ps.filter(p=>String(p.confirmacion||"").toLowerCase().includes("confirm")).length,
      pendientes:ps.filter(p=>String(p.confirmacion||"").toLowerCase().includes("pend")||!p.confirmacion).length,
      noVan:ps.filter(p=>String(p.confirmacion||"").toLowerCase().includes("no")||String(p.confirmacion||"").toLowerCase().includes("rech")).length,
      total:ps.length
    };
  };
  const mesaHasOverlap=(mesa)=>{
    const b=mesaBox(mesa);
    const mesaHit=mesas.some(o=>o.id!==mesa.id&&boxesHit(expandBox(b,0.05),expandBox(mesaBox(o),0.05)));
    const elemHit=elementos.some(el=>isBlockingPresetElement(el)&&boxesHit(b,expandBox(elemBox(el),0.02)));
    return mesaHit||elemHit;
  };
  const elemHasOverlap=(el)=>{
    if(!isBlockingPresetElement(el)) return false;
    const b=elemBox(el);
    return mesas.some(m=>boxesHit(expandBox(b,0.02),mesaBox(m))) || elementos.some(o=>o.id!==el.id&&isBlockingPresetElement(o)&&boxesHit(expandBox(b,0.02),elemBox(o)));
  };
  const professionalOverlapWarnings=()=>{
    const warnings=[];
    mesas.forEach(m=>{ if(mesaHasOverlap(m)) warnings.push(`Mesa ${m.etiqueta||m.id}: revisar superposición o circulación.`); });
    elementos.forEach(el=>{ if(elemHasOverlap(el)) warnings.push(`${el.labelOverride||ELEMENTOS_FIJOS.find(d=>d.id===el.tipo)?.label||'Elemento'}: revisar superposición con mesas u otro elemento.`); });
    return [...new Set(warnings)].slice(0,5);
  };

  const renderElementSVG=(el,def,elW,elH,isSel,conflict=false)=>{
    const Wv=Math.max(36,elW), Hv=Math.max(28,elH);
    const id=safeSvgId(el.id);
    const label=el.labelOverride||def?.label||"Elemento";
    const stroke=conflict?"#D94B3D":isSel?THEME.color.gold:visual.stroke;
    const fontSize=Math.max(7,Math.min(15,Math.min(Wv,Hv)*0.18));
    const showLabel=Wv>44&&Hv>26;
    const labelY=Hv/2+fontSize*.35;
    const commonText={fontFamily:"'Lora',serif",fontWeight:700,fill:tableTextColor(isSel),textAnchor:"middle",style:{pointerEvents:"none",userSelect:"none"}};
    const flower=(cx,cy,r=5)=><g>
      <circle cx={cx} cy={cy} r={r*1.45} fill={visual.leaf} opacity=".78"/>
      {[0,72,144,216,288].map((a,i)=><ellipse key={i} cx={cx+Math.cos(a*Math.PI/180)*r*.95} cy={cy+Math.sin(a*Math.PI/180)*r*.95} rx={r*.42} ry={r*.65} fill={isSel?"rgba(255,255,255,.72)":visual.flower} transform={`rotate(${a},${cx+Math.cos(a*Math.PI/180)*r*.95},${cy+Math.sin(a*Math.PI/180)*r*.95})`}/>) }
      <circle cx={cx} cy={cy} r={r*.35} fill={visual.metal}/>
    </g>;
    const candle=(cx,cy)=><g><ellipse cx={cx} cy={cy} rx="4" ry="4" fill="#F8DFA0" opacity=".9"/><circle cx={cx} cy={cy} r="1.5" fill="#FFF7D9"/></g>;
    const baseRect=(rx=8,fill=visual.linen)=><rect x="3" y="3" width={Wv-6} height={Hv-6} rx={rx} fill={fill} stroke={stroke} strokeWidth={isSel?3:1.8} filter={`url(#shadow-${id})`}/>;

    let body=null;
    if(el.tipo==="pista"){
      const grid=Math.max(18,Math.min(44,Wv/6));
      body=<>
        {baseRect(8, isDarkVisual?"#171719":"#F7ECDD")}
        <pattern id={`grid-${id}`} width={grid} height={grid} patternUnits="userSpaceOnUse"><path d={`M ${grid} 0 L 0 0 0 ${grid}`} fill="none" stroke={isDarkVisual?"rgba(255,236,190,.18)":"rgba(120,92,54,.18)"} strokeWidth="1"/></pattern>
        <rect x="6" y="6" width={Wv-12} height={Hv-12} rx="6" fill={`url(#grid-${id})`}/>
        {[.18,.38,.62,.82].map((k,i)=><circle key={i} cx={Wv*k} cy={Hv*.18+(i%2)*Hv*.56} r={Math.max(2,Math.min(4,Wv*.015))} fill={visual.metal} opacity=".8"/>)}
        {showLabel&&<text x={Wv/2} y={labelY} fontSize={fontSize*1.2} {...commonText}>{label}</text>}
      </>;
    } else if(["escenario","musicos"].includes(el.tipo)){
      body=<>
        {baseRect(8,isDarkVisual?"#202024":"#F7F2E8")}
        <rect x={Wv*.13} y={Hv*.25} width={Wv*.74} height={Hv*.08} rx="4" fill={visual.metal} opacity=".75"/>
        <circle cx={Wv*.27} cy={Hv*.63} r={Math.min(Wv,Hv)*.13} fill={isDarkVisual?"#080809":"#2F2D2B"}/>
        <circle cx={Wv*.73} cy={Hv*.63} r={Math.min(Wv,Hv)*.13} fill={isDarkVisual?"#080809":"#2F2D2B"}/>
        <rect x={Wv*.42} y={Hv*.51} width={Wv*.16} height={Hv*.22} rx="3" fill={isDarkVisual?"#111":"#5A544D"}/>
        {showLabel&&<text x={Wv/2} y={Hv*.42} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["bar","buffet","torta","postres","bebidas","cafeteria","catering"].includes(el.tipo)){
      body=<>
        {baseRect(8,el.tipo==="bar"&&isDarkVisual?"#26211D":visual.linen)}
        <rect x={Wv*.09} y={Hv*.23} width={Wv*.82} height={Math.max(3,Hv*.06)} rx="4" fill={visual.wood} opacity=".86"/>
        {[.18,.34,.50,.66,.82].map((k,i)=><circle key={i} cx={Wv*k} cy={Hv*.47} r={Math.max(4,Math.min(10,Hv*.12))} fill={i%2?visual.metal:visual.accent} stroke={visual.stroke} strokeWidth="1"/>)}
        {flower(Wv*.12,Hv*.76,Math.max(3,Math.min(7,Hv*.07)))}{flower(Wv*.88,Hv*.76,Math.max(3,Math.min(7,Hv*.07)))}
        {showLabel&&<text x={Wv/2} y={Hv*.78} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["novios","presidencial"].includes(el.tipo)){
      body=<>
        {baseRect(10,visual.linen)}
        <rect x={Wv*.08} y={Hv*.52} width={Wv*.84} height={Math.max(3,Hv*.08)} rx="4" fill={visual.accent} opacity=".7"/>
        {[.18,.30,.42,.58,.70,.82].map((k,i)=><rect key={i} x={Wv*k-5} y={Hv*.15} width="10" height={Math.max(8,Hv*.22)} rx="4" fill={visual.chair} stroke={visual.stroke} strokeWidth="1"/>)}
        {flower(Wv*.16,Hv*.55,Math.max(3,Math.min(6,Hv*.08)))}{flower(Wv*.84,Hv*.55,Math.max(3,Math.min(6,Hv*.08)))}
        {showLabel&&<text x={Wv/2} y={Hv*.48} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["altar","arco"].includes(el.tipo)){
      const aw=Wv*.58, ah=Hv*.62;
      body=<>
        <rect x="1" y="1" width={Wv-2} height={Hv-2} rx="10" fill="rgba(255,255,255,.04)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="5 5" opacity=".65"/>
        <path d={`M ${Wv/2-aw/2} ${Hv*.66} V ${Hv*.38} C ${Wv/2-aw/2} ${Hv*.12}, ${Wv/2+aw/2} ${Hv*.12}, ${Wv/2+aw/2} ${Hv*.38} V ${Hv*.66}`} fill="none" stroke={visual.wood} strokeWidth={Math.max(4,Math.min(9,Wv*.035))} strokeLinecap="round"/>
        {flower(Wv/2-aw/2,Hv*.38,Math.max(4,Math.min(9,Wv*.035)))}{flower(Wv/2,Hv*.18,Math.max(4,Math.min(9,Wv*.035)))}{flower(Wv/2+aw/2,Hv*.38,Math.max(4,Math.min(9,Wv*.035)))}
        {showLabel&&<text x={Wv/2} y={Hv*.82} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["camino","alfombra"].includes(el.tipo)){
      body=<>
        <rect x="3" y="3" width={Wv-6} height={Hv-6} rx="12" fill={el.tipo==="alfombra"?visual.accent:visual.linen} opacity={el.tipo==="alfombra"?.72:.84} stroke={stroke} strokeWidth={isSel?2.5:1.4}/>
        <line x1={Wv/2} y1="10" x2={Wv/2} y2={Hv-10} stroke={visual.stroke} strokeWidth="1.2" opacity=".45"/>
        {Array.from({length:18},(_,i)=>{const x=Wv*(.25+((i*37)%50)/100), y=Hv*(.08+i*.048);return <circle key={i} cx={x} cy={y} r={Math.max(1.5,Math.min(4,Wv*.018))} fill={visual.flower} opacity=".85"/>})}
        {showLabel&&Hv>80&&<text x={Wv/2} y={Hv*.52} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(el.tipo==="sillas_cer"){
      const rows=4, cols=6;
      body=<>
        <rect x="1" y="1" width={Wv-2} height={Hv-2} rx="8" fill="rgba(255,255,255,.06)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="5 4"/>
        {Array.from({length:rows*cols},(_,i)=>{const c=i%cols,r=Math.floor(i/cols);return <rect key={i} x={Wv*(.12+c*.15)} y={Hv*(.16+r*.20)} width={Wv*.08} height={Hv*.09} rx="4" fill={visual.chair} stroke={visual.stroke} strokeWidth="1"/>})}
        {showLabel&&<text x={Wv/2} y={Hv*.92} fontSize={fontSize*.86} {...commonText}>{label}</text>}
      </>;
    } else if(["sofa_2","sofa_3"].includes(el.tipo)){
      const cushionCount = el.tipo==="sofa_3" ? 3 : 2;
      const armW = Math.max(5,Wv*.08);
      body=<>
        <rect x="2" y="2" width={Wv-4} height={Hv-4} rx="12" fill="rgba(255,255,255,.03)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="5 5" opacity=".35"/>
        <rect x={Wv*.07} y={Hv*.14} width={Wv*.86} height={Hv*.72} rx="12" fill={isDarkVisual?"#3A3330":"#E8D9C9"} stroke={stroke} strokeWidth={isSel?2.4:1.4} filter={`url(#shadow-${id})`}/>
        <rect x={Wv*.07} y={Hv*.10} width={Wv*.86} height={Hv*.18} rx="9" fill={isDarkVisual?"#544842":"#F1E6DA"} opacity=".92"/>
        <rect x={Wv*.07} y={Hv*.18} width={armW} height={Hv*.62} rx="8" fill={isDarkVisual?"#544842":"#F1E6DA"} stroke={visual.stroke} strokeWidth=".8"/>
        <rect x={Wv*.93-armW} y={Hv*.18} width={armW} height={Hv*.62} rx="8" fill={isDarkVisual?"#544842":"#F1E6DA"} stroke={visual.stroke} strokeWidth=".8"/>
        {Array.from({length:cushionCount},(_,i)=>{const gap=Wv*.03; const innerX=Wv*.07+armW+gap; const innerW=Wv*.86-armW*2-gap*2; const cw=innerW/cushionCount; return <rect key={i} x={innerX+i*cw+2} y={Hv*.34} width={Math.max(5,cw-4)} height={Hv*.34} rx="7" fill={isDarkVisual?"#6A5A50":"#FBF3EA"} stroke="rgba(90,78,62,.22)" strokeWidth=".8"/>})}
        {showLabel&&Wv>90&&<text x={Wv/2} y={Hv*.92} fontSize={fontSize*.78} {...commonText}>{label}</text>}
      </>;
    } else if(el.tipo==="mesita"){
      const r=Math.min(Wv,Hv)*.34;
      body=<>
        <ellipse cx={Wv/2+2} cy={Hv/2+3} rx={r*1.1} ry={r*.9} fill="rgba(0,0,0,.15)"/>
        <circle cx={Wv/2} cy={Hv/2} r={r} fill={visual.linen} stroke={stroke} strokeWidth={isSel?2.4:1.4} filter={`url(#shadow-${id})`}/>
        <circle cx={Wv/2} cy={Hv/2} r={r*.45} fill={visual.wood} opacity=".28"/>
        {flower(Wv/2,Hv/2,Math.max(3,Math.min(7,r*.22)))}
        {showLabel&&Wv>70&&<text x={Wv/2} y={Hv*.90} fontSize={fontSize*.78} {...commonText}>{label}</text>}
      </>;
    } else if(el.tipo==="piano"){
      body=<>
        <rect x="2" y="2" width={Wv-4} height={Hv-4} rx="12" fill="rgba(255,255,255,.02)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="5 5" opacity=".35"/>
        <path d={`M ${Wv*.15} ${Hv*.22} C ${Wv*.28} ${Hv*.04}, ${Wv*.73} ${Hv*.05}, ${Wv*.88} ${Hv*.30} C ${Wv*.99} ${Hv*.50}, ${Wv*.78} ${Hv*.88}, ${Wv*.43} ${Hv*.83} L ${Wv*.18} ${Hv*.73} Z`} fill={isDarkVisual?"#080808":"#171512"} stroke={stroke} strokeWidth={isSel?2.4:1.2} filter={`url(#shadow-${id})`}/>
        <rect x={Wv*.18} y={Hv*.59} width={Wv*.52} height={Hv*.16} rx="3" fill="#F5EFE4" stroke="rgba(255,255,255,.55)" strokeWidth=".8"/>
        {Array.from({length:8},(_,i)=><line key={i} x1={Wv*(.23+i*.055)} y1={Hv*.60} x2={Wv*(.23+i*.055)} y2={Hv*.74} stroke="#1A1A14" strokeWidth=".7" opacity=".65"/>)}
        <rect x={Wv*.24} y={Hv*.84} width={Wv*.20} height={Hv*.08} rx="3" fill={visual.wood} stroke={visual.stroke} strokeWidth=".8"/>
        {showLabel&&Wv>90&&<text x={Wv/2} y={Hv*.50} fontSize={fontSize*.85} {...commonText}>{label}</text>}
      </>;
    } else if(el.tipo==="cello"){
      body=<>
        <rect x="2" y="2" width={Wv-4} height={Hv-4} rx="12" fill="rgba(255,255,255,.02)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="5 5" opacity=".35"/>
        <line x1={Wv*.50} y1={Hv*.08} x2={Wv*.50} y2={Hv*.92} stroke={visual.wood} strokeWidth={Math.max(2,Wv*.05)} strokeLinecap="round"/>
        <ellipse cx={Wv*.50} cy={Hv*.42} rx={Wv*.22} ry={Hv*.18} fill="#B47A45" stroke={stroke} strokeWidth={isSel?2:1.1}/>
        <ellipse cx={Wv*.50} cy={Hv*.66} rx={Wv*.28} ry={Hv*.22} fill="#A86837" stroke={stroke} strokeWidth={isSel?2:1.1}/>
        <circle cx={Wv*.50} cy={Hv*.56} r={Math.max(2,Wv*.045)} fill="#3A2418"/>
        <line x1={Wv*.72} y1={Hv*.18} x2={Wv*.22} y2={Hv*.82} stroke={isDarkVisual?"#F7E6C5":"#4A3A2A"} strokeWidth="1.4" strokeLinecap="round"/>
        {showLabel&&Wv>70&&<text x={Wv/2} y={Hv*.96} fontSize={fontSize*.72} {...commonText}>{label}</text>}
      </>;
    } else if(el.tipo==="living"){
      body=<>
        {baseRect(10,isDarkVisual?"#2A2630":"#F4E8DD")}
        <rect x={Wv*.10} y={Hv*.16} width={Wv*.80} height={Hv*.20} rx="8" fill={visual.chair} stroke={visual.stroke} strokeWidth="1"/>
        <rect x={Wv*.10} y={Hv*.64} width={Wv*.80} height={Hv*.20} rx="8" fill={visual.chair} stroke={visual.stroke} strokeWidth="1"/>
        <circle cx={Wv/2} cy={Hv/2} r={Math.min(Wv,Hv)*.14} fill={visual.linen} stroke={visual.stroke} strokeWidth="1"/>
        {flower(Wv*.12,Hv*.84,Math.max(3,Math.min(6,Hv*.06)))}{flower(Wv*.88,Hv*.16,Math.max(3,Math.min(6,Hv*.06)))}
        {showLabel&&<text x={Wv/2} y={Hv*.54} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["photobooth","backing","cabina360","bienvenida","regalos"].includes(el.tipo)){
      body=<>
        {baseRect(8,visual.linen)}
        <rect x={Wv*.18} y={Hv*.18} width={Wv*.64} height={Hv*.46} rx="4" fill="none" stroke={visual.wood} strokeWidth={Math.max(2,Wv*.015)}/>
        {flower(Wv*.20,Hv*.20,Math.max(3,Math.min(7,Hv*.07)))}{flower(Wv*.80,Hv*.64,Math.max(3,Math.min(7,Hv*.07)))}
        {showLabel&&<text x={Wv/2} y={Hv*.82} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else if(["luces"].includes(el.tipo)){
      body=<>
        <rect x="1" y="1" width={Wv-2} height={Hv-2} rx="10" fill="rgba(255,255,255,.02)" stroke={stroke} strokeWidth={isSel?2.5:1} strokeDasharray="6 5" opacity=".85"/>
        <path d={`M ${Wv*.08} ${Hv*.38} C ${Wv*.30} ${Hv*.10}, ${Wv*.70} ${Hv*.66}, ${Wv*.92} ${Hv*.34}`} fill="none" stroke={visual.stroke} strokeWidth="2"/>
        {[.10,.24,.38,.52,.66,.80,.92].map((k,i)=><g key={i}>{candle(Wv*k,Hv*(.38+Math.sin(i)*.14))}</g>)}
        {showLabel&&<text x={Wv/2} y={Hv*.82} fontSize={fontSize*.9} {...commonText}>{label}</text>}
      </>;
    } else if(["flores","centro_floral","exterior","columnas"].includes(el.tipo)){
      body=<>
        <ellipse cx={Wv/2+2} cy={Hv/2+3} rx={Wv*.32} ry={Hv*.32} fill="rgba(0,0,0,.14)"/>
        <circle cx={Wv/2} cy={Hv/2} r={Math.min(Wv,Hv)*.32} fill={visual.leaf} stroke={stroke} strokeWidth={isSel?2.5:1.5}/>
        {flower(Wv/2,Hv/2,Math.max(5,Math.min(12,Math.min(Wv,Hv)*.10)))}
        {showLabel&&Wv>80&&<text x={Wv/2} y={Hv*.88} fontSize={fontSize*.8} {...commonText}>{label}</text>}
      </>;
    } else if(["entrada","salida","emergencia"].includes(el.tipo)){
      body=<>
        <rect x="3" y="3" width={Wv-6} height={Hv-6} rx="8" fill={visual.linen} stroke={stroke} strokeWidth={isSel?2.5:1.5}/>
        <path d={`M ${Wv*.22} ${Hv*.50} H ${Wv*.68} M ${Wv*.55} ${Hv*.32} L ${Wv*.72} ${Hv*.50} L ${Wv*.55} ${Hv*.68}`} fill="none" stroke={visual.metal} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        {showLabel&&<text x={Wv/2} y={Hv*.82} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    } else {
      body=<>
        {baseRect(8,visual.linen)}
        <text x={Wv/2} y={Hv*.42} textAnchor="middle" fontSize={Math.max(14,Math.min(26,Hv*.35))} style={{pointerEvents:"none"}}>{def?.emoji||"✦"}</text>
        {showLabel&&<text x={Wv/2} y={Hv*.72} fontSize={fontSize} {...commonText}>{label}</text>}
      </>;
    }

    return <svg width={Wv} height={Hv} viewBox={`0 0 ${Wv} ${Hv}`} style={{display:"block",width:"100%",height:"100%",overflow:"visible",pointerEvents:"none"}}>
      <defs><filter id={`shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".20"/></filter></defs>
      {body}
      {conflict&&<text x={Wv/2} y={Math.max(12,fontSize+2)} textAnchor="middle" fontSize={Math.max(8,fontSize*.8)} fill="#D94B3D" fontWeight="800" fontFamily="Arial">revisar</text>}
    </svg>;
  };

  const renderMesaSVG=(mesa)=>{
    const ps=mesaPersonas(mesa.id);
    const isSelected=String(selectedMesa)===String(mesa.id),isHovered=String(hoveredMesa)===String(mesa.id);
    const tipoM=mesa.tipo||"round";
    const capM=capDe(mesa);
    const over=ps.length>capM;
    const overlap=mesaHasOverlap(mesa);
    const libres=Math.max(0,capM-ps.length);
    const stats=occupancyStats(mesa);
    const selectedTableFill = isGuestMode ? "#1F1F1F" : "#3F4A2F";
    const selectedTextProps = isSelected ? { stroke:"rgba(0,0,0,.55)", strokeWidth:1.25, paintOrder:"stroke" } : {};
    const fillC=isSelected?selectedTableFill:(isDarkVisual?visual.linen:visual.linen);
    const strokeC=over||overlap?"#D94B3D":isSelected?(isGuestMode?"#000000":"#1E2A18"):visual.stroke;
    const dh={
      onMouseDown:e=>{
        e.stopPropagation();
        if(selectedGuestForAssign) return;
        startDrag(e,"mesa",mesa.id);
      },
      onTouchStart:e=>{ e.stopPropagation(); beginMesaTouchDrag(e,mesa); }
    };
    const seatFill=(p)=>p?(CONF_COLORS[p.confirmacion]||"#999"):(isDarkVisual?"rgba(255,255,255,.20)":"rgba(255,255,255,.70)");
    const chairStroke=isDarkVisual?"rgba(255,245,210,.35)":"rgba(90,78,62,.28)";

    if(tipoM==="round"){
      const R=(((mesa.ew||MESA_R_M*2))/2)*PX,AR=ASIENTO_R_M*PX,ts=Math.max(ps.length,capM);
      const pts=circlePts(ts,R+AR),sv=(R+AR*2+10)*2,cx=sv/2,cy=sv/2;
      const gid=safeSvgId(`mesa_${mesa.id}`);
      return{w:sv,h:sv,jsx:<svg width={sv} height={sv} style={{overflow:"visible",display:"block"}}>
        <defs>
          <radialGradient id={`linen-${gid}`} cx="42%" cy="36%" r="75%"><stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95"/><stop offset="70%" stopColor={fillC}/><stop offset="100%" stopColor={visual.accent} stopOpacity=".55"/></radialGradient>
          <filter id={`shadow-table-${gid}`} x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".22"/></filter>
        </defs>
        <circle cx={cx+2} cy={cy+4} r={R+2} fill="rgba(0,0,0,.16)"/>
        {pts.map((pt,i)=>{const p=ps[i];const a=Math.atan2(pt.y,pt.x)*180/Math.PI;return<g key={i} style={{cursor:p?"grab":"default",touchAction:"none"}} onMouseDown={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onTouchStart={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onClick={p?e=>{e.stopPropagation(); if(dragMoved.current){dragMoved.current=false;return;} if(isTouchAssignment){selectGuestForTapAssign(p);return;} setSelectedMesa(mesa.id); setSelectedElem(null);}:undefined}>
          {p&&<circle cx={cx+pt.x} cy={cy+pt.y} r={Math.max(AR+6,18)} fill="transparent"/>}
          <rect x={cx+pt.x-AR*.85} y={cy+pt.y-AR*.85} width={AR*1.7} height={AR*1.7} rx={AR*.42} fill={visual.chair} stroke={chairStroke} strokeWidth="1.1" transform={`rotate(${a+90},${cx+pt.x},${cy+pt.y})`}/>
          <circle cx={cx+pt.x} cy={cy+pt.y} r={AR*.64} fill={seatFill(p)} stroke={p?"rgba(255,255,255,.85)":chairStroke} strokeWidth="1.5"/>
          {p&&<text x={cx+pt.x} y={cy+pt.y+AR*.24} textAnchor="middle" fontSize={Math.max(6,AR*.55)} fill="#fff" fontWeight="800" fontFamily="Arial" style={{pointerEvents:"none"}}>{p.nombre.charAt(0)}</text>}
        </g>;})}
        <circle cx={cx} cy={cy} r={R} fill={isSelected?fillC:`url(#linen-${gid})`} stroke={strokeC} strokeWidth={isSelected?3:overlap?2.5:1.7} filter={`url(#shadow-table-${gid})`} style={{cursor:"grab"}} {...dh}/>
        {Array.from({length:Math.min(12,capM)},(_,i)=>{const a=(i/Math.min(12,capM))*2*Math.PI-Math.PI/2;return <circle key={i} cx={cx+Math.cos(a)*R*.72} cy={cy+Math.sin(a)*R*.72} r={Math.max(1.5,R*.045)} fill={isSelected?"rgba(255,255,255,.82)":(isDarkVisual?"rgba(255,245,220,.7)":"rgba(255,255,255,.85)")} stroke={isSelected?"rgba(255,255,255,.55)":visual.stroke} strokeWidth=".5"/>})}
        {/* Centro limpio: sin decoración encima del texto para mantener legibilidad */}
        {isHovered&&dragging?.type==="guest"&&<text x={cx} y={cy+4} textAnchor="middle" fontSize={Math.max(8,R*0.22)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Lora',serif" fontWeight="800" style={{pointerEvents:"none"}}>soltar</text>}
        {mesa.etiqueta
          ?<><text x={cx} y={cy-R*.18} textAnchor="middle" fontSize={Math.max(6,R*.18)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Cinzel',serif" fontWeight="700" style={{pointerEvents:"none"}}>{mesa.etiqueta}</text>
            <text x={cx} y={cy+R*.31} textAnchor="middle" fontSize={Math.max(9,R*.38)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Playfair Display',serif" fontWeight="800" style={{pointerEvents:"none"}}>{mesa.id}</text></>
          :<><text x={cx} y={cy-R*.08} textAnchor="middle" fontSize={Math.max(7,R*.22)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Cinzel',serif" fontWeight="700" style={{pointerEvents:"none"}}>Mesa</text>
            <text x={cx} y={cy+R*.36} textAnchor="middle" fontSize={Math.max(9,R*.42)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Playfair Display',serif" fontWeight="800" style={{pointerEvents:"none"}}>{mesa.id}</text></>}
        {!isSelected&&<text x={cx} y={cy+R*.72} textAnchor="middle" fontSize={Math.max(7,R*.20)} fill={over||overlap?"#D94B3D":libres===0?visual.leaf:visual.stroke} fontFamily="'Lora',serif" fontWeight="700" style={{pointerEvents:"none"}}>{ps.length}/{capM}</text>}
        {stats.total>0&&<g transform={`translate(${cx-R*.45},${cy+R*.88})`}>
          {[{c:CONF_COLORS.Confirmado||THEME.color.sage,n:stats.confirmados},{c:CONF_COLORS.Pendiente||THEME.color.gold,n:stats.pendientes},{c:"rgba(26,26,20,.35)",n:stats.noVan}].map((s,i)=>s.n>0?<circle key={i} cx={i*R*.23} cy="0" r={Math.max(2,R*.045)} fill={s.c}/>:null)}
        </g>}
      </svg>};
    }

    const rW=(mesa.ew||2.4)*PX, rH=(mesa.eh||0.8)*PX;
    const isV=rH>rW, AR=ASIENTO_R_M*PX, pad=AR+8;
    const wD=rW+pad*2, hD=rH+pad*2;
    const mira=mesa.miraSide||"both";
    const SILLA_PASO=0.55*PX;
    const nH=Math.max(rW>=rH?1:0,Math.floor(rW/SILLA_PASO));
    const nV=Math.max(rH>rW?1:0,Math.floor(rH/SILLA_PASO));
    let seatPts=[];
    const addT=()=>{for(let i=0;i<nH;i++)seatPts.push({x:pad+rW/(nH+1)*(i+1),y:pad-AR-2,rot:0});};
    const addB=()=>{for(let i=0;i<nH;i++)seatPts.push({x:pad+rW/(nH+1)*(i+1),y:pad+rH+AR+2,rot:180});};
    const addL=()=>{for(let i=0;i<nV;i++)seatPts.push({x:pad-AR-2,y:pad+rH/(nV+1)*(i+1),rot:-90});};
    const addR=()=>{for(let i=0;i<nV;i++)seatPts.push({x:pad+rW+AR+2,y:pad+rH/(nV+1)*(i+1),rot:90});};
    if(mira==="both"){addT();addR();addB();addL();}
    else if(mira==="left"){ if(isV) addR(); else addB(); }
    else { if(isV) addL(); else addT(); }
    seatPts=seatPts.slice(0,Math.max(ps.length,capM));
    const angle=mesa.angle||0;
    const gid=safeSvgId(`mesa_rect_${mesa.id}`);
    return{w:wD,h:hD,angle,jsx:<svg width={wD} height={hD} style={{overflow:"visible",display:"block"}}>
      <defs><filter id={`shadow-rect-${gid}`} x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".24"/></filter></defs>
      {seatPts.map((pt,i)=>{const p=ps[i];return<g key={'s'+i} style={{cursor:p?"grab":"default",touchAction:"none"}} onMouseDown={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onTouchStart={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onClick={p?e=>{e.stopPropagation(); if(dragMoved.current){dragMoved.current=false;return;} if(isTouchAssignment){selectGuestForTapAssign(p);return;} setSelectedMesa(mesa.id); setSelectedElem(null);}:undefined}>
        {p&&<circle cx={pt.x} cy={pt.y} r={Math.max(AR+5,16)} fill="transparent"/>}
        <rect x={pt.x-AR*.75} y={pt.y-AR*.75} width={AR*1.5} height={AR*1.5} rx={AR*.35} fill={visual.chair} stroke={chairStroke} strokeWidth="1.1" transform={`rotate(${pt.rot},${pt.x},${pt.y})`}/>
        <circle cx={pt.x} cy={pt.y} r={AR*.58} fill={seatFill(p)} stroke={p?"rgba(255,255,255,.85)":chairStroke} strokeWidth="1.4"/>
        {p&&<text x={pt.x} y={pt.y+AR*.24} textAnchor="middle" fontSize={Math.max(5,AR*.52)} fill="#fff" fontWeight="800" fontFamily="Arial" style={{pointerEvents:"none"}}>{p.nombre.charAt(0)}</text>}
      </g>;})}
      <rect x={pad+2} y={pad+3} width={rW} height={rH} rx="7" fill="rgba(0,0,0,.16)"/>
      <rect x={pad} y={pad} width={rW} height={rH} rx="7" fill={fillC} stroke={strokeC} strokeWidth={isSelected?3:overlap?2.5:1.7} filter={`url(#shadow-rect-${gid})`} style={{cursor:"grab"}} {...dh}/>
      {!isSelected&&<>
        <rect x={pad+rW*.08} y={pad+rH*.42} width={rW*.84} height={Math.max(3,rH*.12)} rx="4" fill={visual.accent} opacity=".46"/>
        {[.18,.30,.42,.58,.70,.82].map((k,i)=><circle key={i} cx={pad+rW*k} cy={pad+rH*.50} r={Math.max(1.6,Math.min(5,rH*.12))} fill={visual.flower} opacity=".72"/>)}
      </>}
      <text x={pad+rW/2} y={pad+rH/2+(isV?0:4)} textAnchor="middle" fontSize={Math.max(7,Math.min(rW,rH)*0.25)} fill={tableTextColor(isSelected)} {...selectedTextProps} fontFamily="'Playfair Display',serif" fontWeight="800" transform={isV?`rotate(-90,${pad+rW/2},${pad+rH/2})`:undefined} style={{pointerEvents:"none"}}>{mesa.etiqueta||`Mesa ${mesa.id}`}</text>
      {!isSelected&&<text x={pad+rW-5} y={pad+rH-5} textAnchor="end" fontSize={Math.max(7,Math.min(rW,rH)*.18)} fill={over||overlap?"#D94B3D":visual.stroke} fontWeight="800" fontFamily="Arial" style={{pointerEvents:"none"}}>{ps.length}/{capM}</text>}
      <circle cx={pad/2+2} cy={hD-pad/2-2} r={9} fill="rgba(201,169,110,.90)" stroke="#FBF7EF" strokeWidth="1.5" style={{cursor:"crosshair"}} onMouseDown={e=>{e.stopPropagation();startDrag(e,"rotate",mesa.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,"rotate",mesa.id);}}/>
      <text x={pad/2+2} y={hD-pad/2+2} textAnchor="middle" fontSize="10" fill="#FFF" fontWeight="bold" style={{pointerEvents:"none",userSelect:"none"}}>↻</text>
    </svg>};
  };

  // Estilo de los controles flotantes sobre el canvas
  const fabStyle={width:THEME.tap.min,height:THEME.tap.min,borderRadius:"50%",border:"1px solid rgba(245,239,224,.25)",background:"rgba(26,26,20,.55)",color:THEME.color.cream,fontSize:"1.25rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",padding:0,lineHeight:1};
  const totalPeopleForEnvironments=budgetInvitados>0?budgetInvitados:(guests||[]).filter(guest=>guest.confirmacion!=="no_va").reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0);
  const comfortableCapacityAll=environmentsWithCurrent().reduce((sum,ambiente)=>sum+Math.max(20,Math.floor((parseFloat(ambiente.salonW)||20)*(parseFloat(ambiente.salonH)||15)/1.8)),0);
  const needsAnotherEnvironment=totalPeopleForEnvironments>comfortableCapacityAll;
  const activeEnvironmentName=ambientes.find(ambiente=>ambiente.id===activeAmbienteId)?.nombre||"Ambiente";

  return <div style={{display:"flex",flexDirection:"column",gap:0}}>

    <section aria-label="Ambientes del evento" style={{background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.15)",borderRadius:16,padding:"12px",marginBottom:10,boxShadow:"0 5px 18px rgba(63,50,31,.05)"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:9}}>
        <div>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.58)"}}>Ambientes del evento</div>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.74rem)",lineHeight:1.4,color:"rgba(26,26,20,.5)",marginTop:3}}>Cada ambiente tiene su propio canvas. Las mesas conservan una numeración única en todo el evento.</div>
        </div>
        <button type="button" onClick={addBlankEnvironment} style={{border:"1px solid rgba(74,94,58,.26)",borderRadius:999,padding:"8px 12px",background:"rgba(74,94,58,.08)",fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:800,color:THEME.color.sage,cursor:"pointer",whiteSpace:"nowrap"}}>+ Agregar ambiente</button>
      </div>
      {isMobile
        ?<label style={{display:"grid",gap:5,fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(26,26,20,.52)"}}>Ambiente activo
          <select name="salon-active-environment" value={activeAmbienteId} onChange={event=>switchEnvironment(event.target.value)} style={{width:"100%",minHeight:46,border:"1px solid rgba(74,94,58,.2)",borderRadius:11,padding:"10px 12px",background:"white",fontFamily:THEME.font.body,fontSize:".9rem",fontWeight:700,color:THEME.color.sage}}>
            {ambientes.map(ambiente=><option key={ambiente.id} value={ambiente.id}>{ambiente.nombre} · {(ambiente.id===activeAmbienteId?mesas:(ambiente.mesas||[])).length} mesas</option>)}
          </select>
        </label>
        :<div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:3,WebkitOverflowScrolling:"touch"}}>
          {ambientes.map(ambiente=>{
            const isActive=ambiente.id===activeAmbienteId;
            const environmentTables=isActive?mesas:(ambiente.mesas||[]);
            const tableCount=environmentTables.length;
            const tableIds=new Set(environmentTables.map(table=>String(table.id)));
            const peopleCount=(guests||[]).filter(guest=>guest.confirmacion!=="no_va"&&tableIds.has(String(guest.mesa||""))).reduce((sum,guest)=>sum+(parseInt(guest.cantidadInvitados||1)||1),0);
            return <button key={ambiente.id} type="button" onClick={()=>switchEnvironment(ambiente.id)} style={{flex:"0 0 auto",minWidth:154,textAlign:"left",border:isActive?"1.5px solid rgba(74,94,58,.62)":"1px solid rgba(74,94,58,.14)",borderRadius:12,padding:"9px 11px",background:isActive?"rgba(74,94,58,.09)":"#FFFDF8",cursor:"pointer",boxShadow:isActive?"0 5px 16px rgba(74,94,58,.09)":"none"}}>
              <strong style={{display:"block",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:isActive?THEME.color.sage:THEME.color.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ambiente.nombre}</strong>
              <span style={{display:"block",fontFamily:THEME.font.body,fontSize:"max(10px,.66rem)",color:"rgba(26,26,20,.44)",marginTop:2}}>{peopleCount} personas · {tableCount} {tableCount===1?"mesa":"mesas"}</span>
              <span style={{display:"block",fontFamily:THEME.font.body,fontSize:"max(10px,.64rem)",color:"rgba(26,26,20,.34)",marginTop:1}}>{ambiente.salonW||20}×{ambiente.salonH||15}m</span>
            </button>;
          })}
        </div>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:9,flexWrap:"wrap"}}>
        <label style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.5)"}}>Nombre del ambiente</label>
        <input name="salon-environment-name" value={activeEnvironmentName} onChange={event=>renameActiveEnvironment(event.target.value)} maxLength={42} style={{flex:"1 1 180px",minWidth:0,border:"1px solid rgba(74,94,58,.18)",borderRadius:9,padding:"8px 10px",background:"white",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:THEME.color.ink}}/>
      </div>
      {needsAnotherEnvironment&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:10,background:"rgba(201,169,110,.12)",border:"1px solid rgba(201,169,110,.3)",borderRadius:12,padding:"10px 11px"}}>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.74rem)",lineHeight:1.45,color:"rgba(26,26,20,.62)"}}><strong style={{color:THEME.color.ink}}>El espacio puede quedar demasiado cargado.</strong> Hay {totalPeopleForEnvironments} personas para una capacidad cómoda estimada de {comfortableCapacityAll} entre los ambientes actuales.</div>
        <button type="button" onClick={addBlankEnvironment} style={{border:0,borderRadius:999,padding:"8px 12px",background:THEME.color.sage,color:THEME.color.cream,fontFamily:THEME.font.body,fontSize:"max(11px,.74rem)",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>Agregar otro ambiente</button>
      </div>}
    </section>

    {isDesignerMode&&<div style={{background:THEME.color.cream2,border:"0.5px solid rgba(201,169,110,.22)",borderRadius:16,padding:"12px",marginBottom:10,boxShadow:"0 6px 22px rgba(74,94,58,.06)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.55)"}}>Inspiración visual</div>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.55)",marginTop:2}}>Elegí una miniatura para previsualizar. Doble clic en computadora o toque en tablet/celular para verla grande.</div>
        </div>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.45)",whiteSpace:"nowrap"}}>Doble clic / touch = ver grande</div>
      </div>
      <div style={{display:"grid",gridAutoFlow:"column",gridAutoColumns:isMobile?"148px":"172px",gap:10,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch",scrollSnapType:"x proximity"}}>
        {PRESET_STAGE2_ORDER.map(id=>{
          const p=STAGE2_PRESET_CONFIGS[id];
          const active=selectedSalonType===id;
          const preview=previewPresetId===id;
          return <button
            key={id}
            onClick={()=>{setPreviewPresetId(id);}}
            onDoubleClick={(e)=>{e.preventDefault();e.stopPropagation();setPreviewPresetId(id);setPreviewModalPresetId(id);}}
            onTouchStart={(e)=>onPresetTouchStart(e,id)}
            onTouchMove={onPresetTouchMove}
            onTouchEnd={(e)=>onPresetTouchEnd(e,id)}
            style={{scrollSnapAlign:"start",textAlign:"left",background:preview?"rgba(74,94,58,.08)":"white",border:active?"1.5px solid rgba(74,94,58,.55)":preview?"1.5px solid rgba(201,169,110,.65)":"1px solid rgba(74,94,58,.16)",borderRadius:14,padding:7,cursor:"pointer",boxShadow:preview?"0 8px 22px rgba(74,94,58,.12)":"none",position:"relative"}}>
            <span style={{display:"block",height:isMobile?82:96,borderRadius:10,background:`url(/presets/${id}.jpg) center/cover`,border:"1px solid rgba(74,94,58,.12)",position:"relative",overflow:"hidden"}}>
              {active&&<span style={{position:"absolute",right:6,top:6,background:THEME.color.sage,color:THEME.color.cream,borderRadius:999,padding:"3px 7px",fontFamily:THEME.font.label,fontSize:"10px",letterSpacing:".05em"}}>ACTIVO</span>}
              {preview&&!active&&<span style={{position:"absolute",right:6,top:6,background:"rgba(251,247,239,.92)",color:THEME.color.sage,borderRadius:999,padding:"3px 7px",fontFamily:THEME.font.label,fontSize:"10px",letterSpacing:".05em",boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>VISTA</span>}
              <span style={{position:"absolute",left:6,bottom:6,background:"rgba(26,26,20,.58)",color:"white",borderRadius:999,padding:"3px 7px",fontFamily:THEME.font.body,fontSize:"10px",opacity:preview?1:.0,transition:"opacity .15s"}}>doble clic / touch</span>
            </span>
            <span style={{display:"block",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",fontWeight:800,color:THEME.color.ink,marginTop:7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p?.emoji||"✨"} {p?.label||id}</span>
          </button>;
        })}
      </div>
      {previewPresetId&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:9,background:"rgba(255,255,255,.62)",border:"1px solid rgba(74,94,58,.12)",borderRadius:12,padding:"8px 10px",flexWrap:"wrap"}}>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.58)",lineHeight:1.35}}>
          Previsualizando <strong style={{color:THEME.color.ink}}>{STAGE2_PRESET_CONFIGS[previewPresetId]?.label}</strong>. Un clic solo previsualiza; doble clic o toque abre la vista grande antes de usar.
        </div>
        <button onClick={()=>setPreviewModalPresetId(previewPresetId)} style={{background:"white",border:"1px solid rgba(74,94,58,.2)",borderRadius:999,padding:"7px 12px",fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:800,color:THEME.color.sage,cursor:"pointer"}}>Ver grande / usar</button>
      </div>}
    </div>}

    {isDesignerMode&&previewModalPresetId&&(()=>{
      const id=previewModalPresetId;
      const p=STAGE2_PRESET_CONFIGS[id]||{};
      const g=getPresetGuide(id);
      return <div onMouseDown={(e)=>{if(e.target===e.currentTarget)setPreviewModalPresetId(null);}} style={{position:"fixed",inset:0,background:"rgba(18,18,14,.58)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?12:28,backdropFilter:"blur(5px)",WebkitBackdropFilter:"blur(5px)"}}>
        <div onMouseDown={e=>e.stopPropagation()} style={{width:"min(1120px,96vw)",maxHeight:"92vh",overflow:"hidden",background:THEME.color.cream2,border:"1px solid rgba(251,247,239,.35)",borderRadius:20,boxShadow:"0 24px 80px rgba(0,0,0,.34)",display:"grid",gridTemplateRows:"auto minmax(0,1fr) auto"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,padding:isMobile?"12px 14px":"16px 18px",borderBottom:"1px solid rgba(74,94,58,.12)"}}>
            <div>
              <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.55)"}}>Previsualización de estilo</div>
              <div style={{fontFamily:THEME.font.title,fontSize:isMobile?"1.15rem":"1.45rem",fontWeight:800,color:THEME.color.ink,marginTop:2}}>{p.emoji||"✨"} {p.label||id}</div>
              <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.82rem)",color:"rgba(26,26,20,.56)",marginTop:3}}>Ideal {g.idealPax} invitados · {g.espacio}</div>
            </div>
            <button onClick={()=>setPreviewModalPresetId(null)} style={{width:38,height:38,borderRadius:999,border:"1px solid rgba(26,26,20,.14)",background:"white",fontSize:"1.1rem",cursor:"pointer",color:"rgba(26,26,20,.7)"}}>×</button>
          </div>
          <div style={{overflow:"auto",padding:isMobile?10:16,background:"rgba(255,255,255,.45)"}}>
            <img src={`/presets/${id}.jpg`} alt={p.label||id} draggable={false} style={{display:"block",width:"100%",height:"auto",maxHeight:isMobile?"62vh":"68vh",objectFit:"contain",borderRadius:16,border:"1px solid rgba(26,26,20,.10)",boxShadow:"0 12px 34px rgba(26,26,20,.12)",background:"white"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:isMobile?"12px 14px":"14px 18px",borderTop:"1px solid rgba(74,94,58,.12)",flexWrap:"wrap"}}>
            <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.55)",lineHeight:1.4,maxWidth:620}}>
              {g.tip||"Usá esta imagen para imaginar el estilo. Al usar el preset, el plano editable cargará sus mesas y elementos correspondientes."}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={()=>setPreviewModalPresetId(null)} style={{background:"white",border:"1px solid rgba(26,26,20,.14)",borderRadius:11,padding:"10px 13px",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",fontWeight:700,color:"rgba(26,26,20,.68)",cursor:"pointer"}}>Solo mirar</button>
              <button onClick={()=>{setSelectedSalonType(id);setSelectedTableTypeId("auto");setPreviewPresetId(id);setPreviewModalPresetId(null);aplicarPreset(id);}} style={{background:THEME.color.sage,border:"none",borderRadius:11,padding:"11px 15px",fontFamily:THEME.font.body,fontSize:"max(13px,.86rem)",fontWeight:900,color:"white",cursor:"pointer",boxShadow:"0 10px 24px rgba(74,94,58,.22)"}}>Usar este preset</button>
            </div>
          </div>
        </div>
      </div>;
    })()}

    {/* ── TOOLBAR ── */}
    <div style={{background:THEME.color.cream2,border:"0.5px solid rgba(201,169,110,.2)",borderRadius:12,padding:"8px 10px",marginBottom:8,display:"flex",flexDirection:"column",gap:5,position:"relative"}}>
      {/* Fila 1: Forma + Medidas + Zoom */}
      <div style={{display:"flex",gap:5,alignItems:"center",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        {/* Forma salón: ahora se elige dentro de “Diseñar salón” para que no compita con los presets */}
        <div style={{background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.16)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:THEME.color.sage,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
          🏛️ {SALON_SHAPES[salonShape].label}
        </div>
        {/* Dimensiones */}
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <input name="app-field-12046" type="number" key={`sw-${salonW}`} defaultValue={salonW} min="5" max="100" onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} onBlur={e=>{const v=Math.max(5,Math.min(100,parseInt(e.target.value)||salonW));setSalonW(v);if(salonShape==="cuadrado")setSalonH(v);setTimeout(fitToScreen,60);}} style={{width:48,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",minHeight:40,borderRadius:8,border:"1px solid rgba(74,94,58,.2)",textAlign:"center"}}/>
          <span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.4)"}}>×</span>
          <input name="app-field-12048" type="number" key={`sh-${salonH}`} defaultValue={salonH} min="5" max="100" onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} onBlur={e=>{const v=Math.max(5,Math.min(100,parseInt(e.target.value)||salonH));setSalonH(v);if(salonShape==="cuadrado")setSalonW(v);setTimeout(fitToScreen,60);}} style={{width:48,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",minHeight:40,borderRadius:8,border:"1px solid rgba(74,94,58,.2)",textAlign:"center"}}/>
          <span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.35)"}}>m</span>
        </div>
        {/* Zoom */}
        <div style={{display:"flex",alignItems:"center",background:"white",border:"1px solid rgba(74,94,58,.2)",borderRadius:7,overflow:"hidden",flexShrink:0}}>
          <button onClick={()=>zoomAt(1/1.15)} style={{background:"transparent",border:"none",width:38,height:38,cursor:"pointer",color:THEME.color.sage,fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
          <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,color:"rgba(26,26,20,.5)",minWidth:30,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>zoomAt(1.15)} style={{background:"transparent",border:"none",width:38,height:38,cursor:"pointer",color:THEME.color.sage,fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>
        {/* Ajustar pantalla */}
        <button onClick={fitToScreen} title="Ajustar a pantalla" style={{background:"white",border:"1px solid rgba(74,94,58,.2)",borderRadius:9,padding:"9px 10px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:THEME.color.sage,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 3V1h2M9 1h2v2M11 9v2H9M3 11H1V9" stroke="#4A5E3A" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Ajustar
        </button>
      </div>
      {/* Fila 2: Acciones */}
      <div style={{display:"flex",gap:5,alignItems:"center",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",flexShrink:0}}>
        {isDesignerMode&&<>
          {/* Diseñador de salón: combina tipo de plano + estilo decorativo */}
          <div style={{position:"relative"}}>
            <button title="Elegir un preset real de boda con coordenadas fijas" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setSelectedSalonShape(salonShape);setSelectedShapeConfig(salonShapeConfig);setShowPresetMenu(s=>!s);setShowElemMenu(false);setShowShapeMenu(false);}} style={{background:"rgba(74,94,58,.1)",border:"1px solid rgba(74,94,58,.25)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:THEME.color.sage,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>✨ Presets reales ▾</button>
          </div>
          {/* Agregar elemento */}
          <div style={{position:"relative"}}>
            <button title="Agregar elemento manual opcional" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setShowElemMenu(s=>!s);setShowShapeMenu(false);setShowPresetMenu(false);}} style={{background:"white",border:"1px solid rgba(74,94,58,.2)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.6)",cursor:"pointer"}}>+ Elemento ▾</button>
          </div>
        </>}
        {isGuestMode&&onGoDesigner&&<button onClick={onGoDesigner} title="Ir al módulo de diseño del salón" style={{background:"white",border:"1px solid rgba(26,26,20,.16)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.72)",cursor:"pointer",whiteSpace:"nowrap"}}>🏛️ Diseño del salón</button>}
        <button onClick={addMesa} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:9,padding:"9px 14px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",fontWeight:600,cursor:"pointer"}}>+ Mesa</button>
        <button onClick={sentarPorProtocolo} title="Sienta a los invitados según protocolo: familia directa cerca de los novios, amigos cerca de la pista, niños juntos cerca de la entrada" style={{background:"rgba(74,94,58,.1)",border:"1px solid rgba(74,94,58,.3)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:THEME.color.sage,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>👨‍👩‍👧 Sentar por protocolo</button>
        {prevAsignacion&&<button onClick={()=>{if(onAssignMany){onAssignMany(prevAsignacion);}setPrevAsignacion(null);}} title="Volver a la asignación de mesas anterior" style={{background:"transparent",border:"1px solid rgba(139,107,40,.4)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(139,107,40,.9)",cursor:"pointer",whiteSpace:"nowrap"}}>↩ Deshacer</button>}
        {onOpenGuia&&<button onClick={onOpenGuia} title="Cómo ordenar a los invitados según protocolo" style={{background:"transparent",border:"1px solid rgba(74,94,58,.25)",borderRadius:9,padding:"9px 12px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(74,94,58,.8)",cursor:"pointer",whiteSpace:"nowrap"}}>📖 Guía</button>}
      </div>

      {/* Menús desplegables — anclados al toolbar, fuera de las filas con overflow */}
      {isDesignerMode&&showPresetMenu&&<div onMouseDown={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:10,background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.15)",borderRadius:14,padding:10,zIndex:320,boxShadow:THEME.shadow.pop,minWidth:320,maxWidth:"min(520px,92vw)",maxHeight:"min(560px,72vh)",overflowY:"auto"}}>
        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.55)",padding:"5px 8px 4px"}}>Elegí un estilo</div>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.42)",padding:"0 8px 8px",lineHeight:1.4}}>
          Cada estilo carga una base editable para empezar rápido. Tocá uno para ver en qué espacio rinde mejor y cuántos invitados le quedan cómodos.
        </div>
        <div style={{display:"grid",gap:6,maxHeight:"min(240px,38vh)",overflowY:"auto",padding:"2px 2px 4px"}}>
          {PRESET_STAGE2_ORDER.map(id=>{
            const p=STAGE2_PRESET_CONFIGS[id]; const g=getPresetGuide(id); const sel=selectedSalonType===id;
            return <button key={id} onMouseDown={e=>e.stopPropagation()} onClick={()=>{setSelectedSalonType(id);setSelectedTableTypeId("auto");}} style={{textAlign:"left",display:"grid",gridTemplateColumns:"78px 1fr",gap:10,alignItems:"start",width:"100%",background:sel?"rgba(74,94,58,.1)":"white",border:sel?"1.5px solid rgba(74,94,58,.55)":"1px solid rgba(74,94,58,.16)",borderRadius:12,padding:"9px 10px",cursor:"pointer"}}>
              <span style={{height:54,borderRadius:9,overflow:"hidden",background:`url(/presets/${id}.jpg) center/cover`,border:"1px solid rgba(74,94,58,.16)",boxShadow:sel?"0 0 0 2px rgba(74,94,58,.12)":"none",position:"relative"}}><span style={{position:"absolute",left:6,top:5,fontSize:"1rem",filter:"drop-shadow(0 1px 2px rgba(0,0,0,.3))"}}>{p?.emoji||"✨"}</span></span>
              <span style={{display:"grid",gap:2}}>
                <span style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <strong style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:THEME.color.ink,fontWeight:700}}>{p?.label||id}</strong>
                  {g.vibe&&<span style={{fontFamily:THEME.font.body,fontSize:"max(10px,.65rem)",color:"rgba(74,94,58,.75)",background:"rgba(74,94,58,.09)",borderRadius:20,padding:"1px 8px"}}>{g.vibe}</span>}
                </span>
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.55)",lineHeight:1.35}}>📍 {g.espacio}</span>
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.7rem)",color:"rgba(26,26,20,.42)"}}>👥 Ideal {g.idealPax} invitados</span>
                {sel&&g.tip&&<span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(139,107,40,.9)",lineHeight:1.4,marginTop:3,fontStyle:"italic"}}>💡 {g.tip}</span>}
              </span>
            </button>;
          })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
          <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)"}}>
            Invitados
            <select name="app-field-12108" value={selectedGuestCount} onChange={e=>setSelectedGuestCount(parseInt(e.target.value)||150)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
              {GUEST_COUNT_OPTIONS.map(n=><option key={n} value={n}>{n} invitados</option>)}
            </select>
          </label>
          <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)"}}>
            Tamaño salón
            <select name="app-field-12114" value={roomSizeOption} onChange={e=>setRoomSizeOption(e.target.value)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
              {Object.entries(ROOM_SIZE_OPTION_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)",marginTop:8}}>
          Tipo de mesa
          <select name="app-field-12121" value={selectedTableTypeId} onChange={e=>setSelectedTableTypeId(e.target.value)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
            <option value="auto">Automático recomendado</option>
            {Object.entries(TABLE_TYPES).filter(([id,t])=>id!=="high_cocktail").map(([id,t])=><option key={id} value={id}>{t.label} · {t.capacity} pers.</option>)}
          </select>
        </label>
        <div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.12)",borderRadius:11,padding:"10px 12px",marginTop:10}}>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.62)",lineHeight:1.35}}>
            Preset: <strong style={{color:THEME.color.sage}}>{STAGE2_PRESET_CONFIGS[selectedSalonType]?.label}</strong>
          </div>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)",lineHeight:1.35,marginTop:4}}>
            {getRoomSize(selectedGuestCount,roomSizeOption).label} · Mesa recomendada: {getRecommendedTableTypeForPreset(selectedSalonType,selectedGuestCount,roomSizeOption).label}. El preset carga una base editable: podés mover y redimensionar mesas, pista, barra, DJ, sofás, mesitas, piano, cello y todos los elementos.
          </div>
        </div>
        <button onMouseDown={e=>e.stopPropagation()} onClick={()=>aplicarPreset(selectedSalonType)} style={{width:"100%",marginTop:10,background:THEME.color.sage,border:"none",borderRadius:10,padding:"12px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.86rem)",fontWeight:800,color:"white",cursor:"pointer",boxShadow:"0 8px 20px rgba(74,94,58,.18)"}}>Generar plano</button>
        <button onMouseDown={e=>e.stopPropagation()} onClick={()=>aplicarPreset("desde_cero")} style={{width:"100%",marginTop:7,background:"transparent",border:"1px solid rgba(200,60,60,.22)",borderRadius:10,padding:"10px 12px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(200,60,60,.72)",cursor:"pointer"}}>＋ Crear desde cero</button>
      </div>}
      {/* La forma ya no tiene menú suelto: se elige dentro de “Diseñar salón”. */}
      {isDesignerMode&&showElemMenu&&<div onMouseDown={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:10,background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.15)",borderRadius:10,padding:6,zIndex:300,boxShadow:THEME.shadow.pop,minWidth:200,maxHeight:"min(340px,50vh)",overflowY:"auto"}}>
        {ELEMENTO_CATEGORIAS.map(cat=><div key={cat.label} style={{padding:"2px 0 6px"}}>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.45)",padding:"7px 8px 5px"}}>{cat.label}</div>
          {cat.items.map(id=>{const e=ELEMENTOS_FIJOS.find(x=>x.id===id); if(!e) return null; return <button key={e.id} onMouseDown={ev=>ev.stopPropagation()} onClick={()=>{addElemento(e.id);setShowElemMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",border:"none",borderRadius:8,padding:"10px 12px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:THEME.color.ink,cursor:"pointer",textAlign:"left"}}>{e.emoji} {e.label}</button>;})}
        </div>)}
      </div>}
    </div>

    {isTouchAssignment&&selectedGuestForAssign&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.09)",border:"1px solid rgba(74,94,58,.25)",borderRadius:10,padding:"9px 12px",marginBottom:8}}>
      <span style={{fontSize:"1rem"}}>👤</span>
      <span style={{fontFamily:THEME.font.body,fontSize:"max(13px,.84rem)",color:"rgba(26,26,20,.68)",flex:1,lineHeight:1.35}}>Seleccionado/a: <strong style={{color:THEME.color.sage}}>{selectedGuestForAssign.nombre}</strong>. Ahora tocá una mesa para asignarlo/a.</span>
      <button onClick={()=>setSelectedGuestForAssign(null)} style={{background:"transparent",border:"none",fontFamily:THEME.font.body,fontSize:"max(13px,.84rem)",color:"rgba(200,60,60,.65)",cursor:"pointer",padding:"8px 10px"}}>Cancelar</button>
    </div>}

    {/* ── WARNING CAPACIDAD ── */}
    {salonChico&&<div style={{display:"flex",alignItems:"center",gap:8,background:salonMuyChico?"rgba(200,60,60,.07)":"rgba(201,169,110,.07)",border:`1px solid ${salonMuyChico?"rgba(200,60,60,.3)":"rgba(201,169,110,.3)"}`,borderRadius:8,padding:"7px 12px",marginBottom:8}}>
      <span style={{fontSize:".9rem",flexShrink:0}}>{salonMuyChico?"🔴":"⚠️"}</span>
      <span style={{fontFamily:THEME.font.body,fontSize:".78rem",color:salonMuyChico?"rgba(200,60,60,.8)":"rgba(139,107,40,.85)"}}>
        {salonMuyChico?"Este ambiente está demasiado cargado":"Este ambiente está quedando ajustado"} · {totalInvWarn} personas · capacidad cómoda estimada ~{capacidadMax}. Podés ampliar sus medidas o distribuir mesas en otro ambiente.
      </span>
    </div>}


    {isGuestMode&&mesasPendientesSalon.length>0&&<div style={{background:"rgba(201,169,110,.10)",border:"1px solid rgba(201,169,110,.34)",borderRadius:12,padding:"11px 12px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div style={{minWidth:0,flex:"1 1 260px"}}>
        <div style={{fontFamily:THEME.font.display,fontSize:"1rem",fontWeight:700,color:THEME.color.ink}}>Faltan {mesasPendientesSalon.length} {mesasPendientesSalon.length===1?"mesa":"mesas"} en el canvas</div>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.58)",lineHeight:1.45,marginTop:3}}>
          Tus invitados están asignados hasta la mesa {maxMesaAsignadaSalon}. Ya insertaste {mesasRequeridasCreadasSalon} de {maxMesaAsignadaSalon}. Agregalas de a una o en grupos y acomodalas manualmente.
        </div>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>agregarMesasPendientesSalon(1)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:THEME.radius.pill,padding:"10px 14px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:800,cursor:"pointer"}}>+ Mesa {mesasPendientesSalon[0]}</button>
        {mesasPendientesSalon.length>1&&<button onClick={()=>agregarMesasPendientesSalon(Math.min(5,mesasPendientesSalon.length))} style={{background:"white",color:THEME.color.sage,border:"1px solid rgba(74,94,58,.22)",borderRadius:THEME.radius.pill,padding:"9px 13px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",fontWeight:750,cursor:"pointer"}}>Agregar {Math.min(5,mesasPendientesSalon.length)}</button>}
        {mesasPendientesSalon.length>5&&<button onClick={()=>agregarMesasPendientesSalon(mesasPendientesSalon.length)} style={{background:"transparent",color:"rgba(74,94,58,.78)",border:"1px solid rgba(74,94,58,.18)",borderRadius:THEME.radius.pill,padding:"9px 13px",minHeight:40,fontFamily:THEME.font.body,fontSize:"max(12px,.76rem)",fontWeight:700,cursor:"pointer"}}>Agregar todas</button>}
      </div>
    </div>}

    {isDesignerMode&&layoutSummary&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,minmax(0,1fr))",gap:8,background:"rgba(251,247,239,.96)",border:"1px solid rgba(74,94,58,.18)",borderRadius:12,padding:"10px 12px",marginBottom:8,boxShadow:"0 4px 14px rgba(0,0,0,.04)"}}>
      <div style={{gridColumn:isMobile?"auto":"span 2",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.72)",lineHeight:1.35}}><strong style={{color:THEME.color.sage}}>Preset:</strong> {layoutSummary.preset}<br/><span style={{color:"rgba(26,26,20,.48)"}}>{layoutSummary.salon} · {layoutSummary.medidas} · {layoutSummary.area} m²</span></div>
      <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.72)",lineHeight:1.35}}><strong style={{color:THEME.color.sage}}>Invitados:</strong> {layoutSummary.invitados}<br/><span style={{color:"rgba(26,26,20,.48)"}}>Mesas {layoutSummary.mesasGeneradas}/{layoutSummary.mesasRequeridas}</span></div>
      <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:layoutSummary.estado==="válido"?"rgba(74,94,58,.9)":"rgba(180,90,50,.9)",lineHeight:1.35}}><strong>Estado:</strong> {layoutSummary.estado}<br/><span style={{color:"rgba(26,26,20,.48)"}}>Capacidad {layoutSummary.capacidadSentada}</span></div>
      <div style={{gridColumn:"1 / -1",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.52)",lineHeight:1.4}}>Mesa: {layoutSummary.tipoMesa}</div>
      {layoutSummary.alertas?.length>0&&<div style={{gridColumn:"1 / -1",background:"rgba(200,90,50,.07)",border:"1px solid rgba(200,90,50,.22)",borderRadius:9,padding:"8px 10px",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(170,70,40,.9)",lineHeight:1.45}}>⚠️ {layoutSummary.alertas.slice(0,4).join(" · ")}{layoutSummary.alertas.length>4?` · +${layoutSummary.alertas.length-4} alertas más`:""}</div>}
    </div>}

    {isDesignerMode&&professionalOverlapWarnings().length>0&&<div style={{display:"flex",alignItems:"flex-start",gap:8,background:"rgba(217,75,61,.07)",border:"1px solid rgba(217,75,61,.24)",borderRadius:10,padding:"9px 12px",marginBottom:8}}>
      <span style={{fontSize:"1rem",lineHeight:1.2}}>⚠️</span>
      <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.74rem)",color:"rgba(160,54,42,.92)",lineHeight:1.45}}>
        <strong>Revisión de layout:</strong> {professionalOverlapWarnings().join(" · ")}
      </div>
    </div>}

    {/* ── TIP MOBILE: recomendar pantalla grande ── */}
    {isMobile&&!hideDesktopTip&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.2)",borderRadius:10,padding:"8px 6px 8px 12px",marginBottom:8}}>
      <span style={{fontSize:"1rem",flexShrink:0}}>💻</span>
      <span style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.62)",flex:1,lineHeight:1.45}}>Podés armar el salón desde el celu, pero en una compu o tablet lo vas a ver más grande y trabajar más cómodo.</span>
      <button onClick={()=>{setHideDesktopTip(true);try{localStorage.setItem("ceci_salon_desktop_tip","1");}catch(err){}}} aria-label="Cerrar aviso" style={{background:"transparent",border:"none",color:"rgba(26,26,20,.35)",fontSize:"1.1rem",cursor:"pointer",padding:"10px 12px",minHeight:THEME.tap.min,lineHeight:1,flexShrink:0}}>×</button>
    </div>}

    {/* ── LAYOUT PRINCIPAL: Canvas + Panel ── */}
    <div style={{display:"grid",gridTemplateColumns:useThreePanelWorkspace?"minmax(230px,280px) minmax(0,1fr) minmax(280px,320px)":isMobile?"1fr":"minmax(0,1fr) 320px",gap:12,alignItems:"start",width:"100%",minWidth:0}}>

      {useThreePanelWorkspace&&<aside className="salon-v7-left-bank" aria-label="Banco de espera" style={{gridColumn:"1",background:THEME.color.cream2,border:"1px solid rgba(201,169,110,.24)",borderRadius:16,padding:"12px",boxShadow:"0 8px 24px rgba(63,50,31,.07)"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:9}}>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(139,107,40,.82)"}}>Banco de espera</div>
            <div style={{fontFamily:THEME.font.display,fontSize:"1.08rem",fontWeight:700,color:THEME.color.ink,marginTop:3}}>{waitingInvitations.length} {waitingInvitations.length===1?"invitación":"invitaciones"} · {sinMesa.length} personas</div>
          </div>
          <span style={{fontFamily:THEME.font.body,fontSize:".68rem",color:"rgba(26,26,20,.42)",textAlign:"right",lineHeight:1.35}}>Arrastrá al plano<br/>o tocá y elegí mesa</span>
        </div>
        {isGuestMode&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:9}}>
          <button onClick={vaciarTodasLasMesas} style={{background:"rgba(200,60,60,.055)",border:"1px solid rgba(200,60,60,.18)",borderRadius:9,padding:"8px",fontFamily:THEME.font.body,fontSize:".7rem",fontWeight:750,color:"rgba(170,55,55,.76)",cursor:"pointer"}}>Vaciar mesas</button>
          <button onClick={usarOchoEnTodasLasRedondas} style={{background:"rgba(74,94,58,.065)",border:"1px solid rgba(74,94,58,.18)",borderRadius:9,padding:"8px",fontFamily:THEME.font.body,fontSize:".7rem",fontWeight:750,color:THEME.color.sage,cursor:"pointer"}}>Capacidad global · 8</button>
        </div>}
        <div style={{position:"relative",marginBottom:8}}>
          <input name="salon-waiting-search-desktop" value={searchSinMesa} onChange={e=>setSearchSinMesa(e.target.value)} placeholder="Buscar invitación..." style={{width:"100%",boxSizing:"border-box",border:"1px solid rgba(201,169,110,.24)",borderRadius:999,padding:"9px 30px 9px 30px",background:"rgba(201,169,110,.055)",fontFamily:THEME.font.body,fontSize:".78rem",outline:"none"}}/>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:".78rem",opacity:.42}}>🔍</span>
          {searchSinMesa&&<button onClick={()=>setSearchSinMesa("")} aria-label="Limpiar búsqueda" style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",border:0,background:"transparent",cursor:"pointer",color:"rgba(26,26,20,.42)"}}>×</button>}
        </div>
        {sinMesa.length===0
          ?<div style={{padding:"18px 10px",textAlign:"center",fontFamily:THEME.font.body,fontSize:".78rem",color:"rgba(74,94,58,.58)",background:"rgba(74,94,58,.045)",borderRadius:11}}>✓ Todos los invitados están ubicados</div>
          :<div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:"calc(100vh - 250px)",overflowY:"auto",paddingRight:2}}>
            {waitingInvitationsVisible.map(p=>{
              const selected=selectedGuestForAssign?.guestId===p.guestId;
              return <button key={`${p.guestId}-${p.personIdx}`} type="button" onMouseDown={e=>{e.stopPropagation();startDragGuest(e,p.guestId);}} onTouchStart={e=>{e.stopPropagation();startDragGuest(e,p.guestId);}} onClick={e=>{e.stopPropagation();if(dragMoved.current){dragMoved.current=false;return;}selectGuestForTapAssign(p);}} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:8,alignItems:"center",width:"100%",textAlign:"left",border:selected?"1.5px solid rgba(74,94,58,.48)":"1px solid rgba(201,169,110,.16)",borderRadius:10,padding:"8px",background:selected?"rgba(74,94,58,.11)":"rgba(201,169,110,.045)",cursor:"grab"}}>
                <span style={{width:30,height:30,borderRadius:"50%",display:"grid",placeItems:"center",background:CONF_COLORS[p.confirmacion]||"#999",color:"white",fontFamily:THEME.font.body,fontSize:".72rem",fontWeight:800}}>{p.nombre.charAt(0)}</span>
                <span style={{minWidth:0}}><strong style={{display:"block",fontFamily:THEME.font.body,fontSize:".78rem",color:THEME.color.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}</strong><span style={{display:"block",fontFamily:THEME.font.body,fontSize:".66rem",color:"rgba(26,26,20,.42)",marginTop:2}}>{p.cantidadInvitados} {p.cantidadInvitados===1?"persona":"personas"} · elegí una mesa con lugar</span></span>
                <span style={{fontFamily:THEME.font.label,fontSize:".58rem",letterSpacing:".08em",textTransform:"uppercase",color:selected?THEME.color.sage:"rgba(26,26,20,.3)"}}>{selected?"Mesa?":"⠿"}</span>
              </button>;
            })}
            {waitingInvitationsHiddenCount>0&&<div style={{fontFamily:THEME.font.body,fontSize:".7rem",color:"rgba(26,26,20,.42)",padding:"7px 3px"}}>Mostrando {waitingInvitationsVisible.length} de {waitingInvitationsFiltered.length}. Buscá por nombre para encontrar más rápido.</div>}
          </div>}
      </aside>}

      {/* ── CANVAS ── */}
      <div style={{minWidth:0,gridColumn:useThreePanelWorkspace?"2":"1"}}>
        <div style={{position:"relative"}}>
        <div ref={viewportRef} className="canvas-viewport"
          style={{width:"100%",height:isMobile?"clamp(360px,58vh,520px)":isTabletLayout?"clamp(520px,72vh,820px)":"clamp(680px,78vh,1160px)",background:isGuestMode?"#EDEDED":"repeating-linear-gradient(45deg,#7C9B5A 0,#7C9B5A 16px,#759354 16px,#759354 32px)",borderRadius:12,overflow:"auto",position:"relative",cursor:dragging?.type==="guest"?"crosshair":"default",touchAction:"pan-x pan-y",WebkitUserSelect:"none",userSelect:"none",WebkitOverflowScrolling:"touch"}}
          onMouseDown={e=>{
            const tgt=e.target;
            const isBg=tgt===viewportRef.current||tgt===canvasRef.current||tgt.tagName==="svg"||tgt.tagName==="rect"||tgt.tagName==="path";
            if(isBg){
              // Click en fondo: solo deseleccionar (el canvas ya no se arrastra)
              setSelectedElem(null);
              setSelectedMesa(null);
              setSelectedGuestForAssign(null);
              setShowShapeMenu(false);
              setShowElemMenu(false);
              setShowPresetMenu(false);
            }
          }}
          onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <div ref={canvasRef} style={{position:"relative",margin:"0 auto",width:CW+80,height:CH+80}}>
            {/* Vereda perimetral (contorno del salón) */}
            <div style={{position:"absolute",left:10,top:10,width:CW+40,height:CH+40,background:isGuestMode?"#FFFFFF":"repeating-linear-gradient(0deg,#CFC8B8 0,#CFC8B8 22px,#C6BFAE 22px,#C6BFAE 24px)",border:isGuestMode?"1px solid rgba(26,26,20,.12)":"none",borderRadius:8,boxShadow:isGuestMode?"0 8px 24px rgba(0,0,0,.08)":"0 8px 28px rgba(30,40,20,.35)"}}/>
            {/* Piso */}
            <svg style={{position:"absolute",left:30,top:30,width:CW,height:CH,overflow:"visible",pointerEvents:"none"}}>
              <defs>
                <pattern id="pisoS4" width={PX} height={PX} patternUnits="userSpaceOnUse">
                  <rect width={PX} height={PX} fill={visual.floorA}/>
                  <rect width={PX/2} height={PX/2} fill={visual.floorB}/>
                  <rect x={PX/2} y={PX/2} width={PX/2} height={PX/2} fill={visual.floorB}/>
                </pattern>
                <clipPath id="sClipS4"><path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)}/></clipPath>
              </defs>
              <path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)} fill="rgba(0,0,0,.22)" transform="translate(3,3)"/>
              <path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)} fill="url(#pisoS4)" stroke={visual.stroke} strokeWidth="2.5"/>
              {Array.from({length:salonW+1},(_,i)=><g key={"rx"+i}>
                <line x1={i*PX} y1={-8} x2={i*PX} y2={-2} stroke="rgba(200,180,140,.45)" strokeWidth="1"/>
                {i%5===0&&<text x={i*PX} y={-11} textAnchor="middle" fontSize={Math.max(7,9/zoom)} fill="rgba(200,180,140,.65)" fontFamily="Calibri">{i}m</text>}
              </g>)}
              {Array.from({length:salonH+1},(_,i)=><g key={"ry"+i}>
                <line x1={-8} y1={i*PX} x2={-2} y2={i*PX} stroke="rgba(200,180,140,.45)" strokeWidth="1"/>
                {i%5===0&&<text x={-11} y={i*PX+3} textAnchor="end" fontSize={Math.max(7,9/zoom)} fill="rgba(200,180,140,.65)" fontFamily="Calibri">{i}m</text>}
              </g>)}
              <g clipPath="url(#sClipS4)">
                {Array.from({length:salonH+1},(_,i)=><line key={"gh"+i} x1="0" y1={i*PX} x2={CW} y2={i*PX} stroke="rgba(255,255,255,.12)" strokeWidth="0.5"/>)}
                {Array.from({length:salonW+1},(_,i)=><line key={"gv"+i} x1={i*PX} y1="0" x2={i*PX} y2={CH} stroke="rgba(255,255,255,.12)" strokeWidth="0.5"/>)}
              </g>
            </svg>

            {/* Elementos editables del preset: assets vectoriales premium */}
            {isDesignerMode&&elementos.map(el=>{
              const def=ELEMENTOS_FIJOS.find(e=>e.id===el.tipo); if(!def) return null;
              const elW=el.ew*PX,elH=el.eh*PX,isSel=selectedElem===el.id;
              const conflict=elemHasOverlap(el);
              const angle=el.angle||0;
              return <div key={el.id}
                onClick={e=>{e.stopPropagation();setSelectedElem(el.id);setSelectedMesa(null);}}
                onMouseDown={e=>{e.stopPropagation();startDrag(e,"elem",el.id);}}
                onTouchStart={e=>{e.stopPropagation();startDrag(e,"elem",el.id);}}
                style={{position:"absolute",left:30+el.mx*PX,top:30+el.my*PX,width:elW,height:elH,boxSizing:"border-box",cursor:"grab",zIndex:isSel?9:3,touchAction:"none",transform:angle?`rotate(${angle}deg)`:undefined,transformOrigin:"center center",filter:isSel?"drop-shadow(0 8px 16px rgba(0,0,0,.25))":"drop-shadow(0 4px 9px rgba(0,0,0,.15))"}}>
                {renderElementSVG(el,def,elW,elH,isSel,conflict)}
                {isSel&&<>
                  <button onClick={e=>{e.stopPropagation();removeElemento(el.id);}} style={{position:"absolute",top:-10,right:-10,background:"rgba(200,60,60,.95)",border:"2px solid #FBF7EF",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:"11px",zIndex:10,lineHeight:1}}>×</button>
                  <div title="Rotar" onMouseDown={e=>{e.stopPropagation();startDrag(e,"rotateE",el.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,"rotateE",el.id);}} style={{position:"absolute",bottom:-10,left:-10,width:22,height:22,background:"rgba(201,169,110,.94)",border:"2px solid #FBF7EF",borderRadius:"50%",cursor:"crosshair",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800}}>↻</div>
                  <div title="Redimensionar" onMouseDown={e=>{e.stopPropagation();startDrag(e,"resize",el.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,"resize",el.id);}} style={{position:"absolute",bottom:-9,right:-9,width:20,height:20,background:THEME.color.cream,border:`1.5px solid ${conflict?"#D94B3D":visual.stroke}`,borderRadius:4,cursor:"nwse-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="7" x2="7" y2="1" stroke={conflict?"#D94B3D":visual.stroke} strokeWidth="1.5"/><line x1="4" y1="7" x2="7" y2="4" stroke={conflict?"#D94B3D":visual.stroke} strokeWidth="1.5"/></svg>
                  </div>
                </>}
              </div>;
            })}

            {/* Mesas */}
            {mesas.map(mesa=>{
              const {w,h,angle,jsx}=renderMesaSVG(mesa);
              const isSelected=selectedMesa===mesa.id;
              return <div key={mesa.id} data-salon-mesa-drop={String(mesa.id)}
                style={{position:"absolute",left:30+mesa.mx*PX-w/2,top:30+mesa.my*PX-h/2,width:w,height:h,zIndex:isSelected?6:4,cursor:dragging?.type==="guest"?"copy":"pointer",transform:angle?`rotate(${angle}deg)`:undefined,transformOrigin:"center center",touchAction:"none"}}
                onMouseEnter={()=>dragging?.type==="guest"&&setHoveredMesa(mesa.id)}
                onMouseLeave={()=>dragging?.type==="guest"&&setHoveredMesa(null)}
                onMouseDown={e=>{
                // stopPropagation evita que el viewport inicie pan
                e.stopPropagation();
              }}
              onClick={e=>{
                e.stopPropagation();
                if(dragMoved.current){
                  dragMoved.current=false;
                }
                if(selectedGuestForAssign){
                  assignSelectedGuestToMesa(mesa.id);
                  return;
                }
                setSelectedMesa(prev=>String(prev)===String(mesa.id)?null:mesa.id);
                setSelectedElem(null);
                if(isMobile) setShowSheet(true);
              }}
              >
                {jsx}
                {/* Botón eliminar — solo al seleccionar */}
                {isSelected&&<button onClick={e=>{e.stopPropagation();removeMesa(mesa.id);}} style={{position:"absolute",top:-10,right:-10,background:"rgba(200,60,60,.9)",border:"2px solid #FBF7EF",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:"11px",zIndex:10,lineHeight:1}}>×</button>}
                {/* Handle de resize — esquina inferior derecha */}
                {isSelected&&<div onMouseDown={e=>{e.stopPropagation();startDrag(e,"resizeM",mesa.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,"resizeM",mesa.id);}}
                  style={{position:"absolute",bottom:-9,right:-9,width:20,height:20,background:"#F5EFE0",border:"1.5px solid #4A5E3A",borderRadius:4,cursor:"nwse-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none"}}>
                  <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="7" x2="7" y2="1" stroke="#4A5E3A" strokeWidth="1.5"/><line x1="4" y1="7" x2="7" y2="4" stroke="#4A5E3A" strokeWidth="1.5"/></svg>
                </div>}
              </div>;
            })}

            {/* Ghost invitado */}
            {dragging?.type==="guest"&&<div style={{position:"absolute",left:(dragging.cx||0)-20,top:(dragging.cy||0)-20,width:40,height:40,borderRadius:"50%",background:THEME.color.sage,border:"3px solid #F5EFE0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:50,boxShadow:"0 6px 20px rgba(0,0,0,.5)",transform:"scale(1.05)"}}>
              <span style={{fontSize:"13px",fontWeight:700,color:"#fff",lineHeight:1}}>{personas.find(p=>p.guestId===dragging.id)?.nombre?.charAt(0)||"?"}</span>
              <span style={{fontSize:"7px",color:"rgba(255,255,255,.7)",lineHeight:1,marginTop:1,maxWidth:34,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center"}}>{personas.find(p=>p.guestId===dragging.id)?.nombre?.split(" ")[0]||""}</span>
            </div>}
          </div>

        </div>
          {/* Tip navegación — fijo sobre el visor, no scrollea con el salón */}
          <div style={{position:"absolute",bottom:16,left:10,fontFamily:THEME.font.body,fontSize:THEME.text.tiny,color:"rgba(255,255,255,.78)",pointerEvents:"none",whiteSpace:"nowrap",background:"rgba(26,26,20,.45)",borderRadius:100,padding:"4px 10px",maxWidth:"calc(100% - 90px)",overflow:"hidden",textOverflow:"ellipsis",zIndex:20}}>
            {selectedGuestForAssign?`👆 Tocá una mesa para sentar a ${selectedGuestForAssign.nombre}`:isTouchAssignment?"👆 Tocá invitado → mesa o arrastralo · Pellizco zoom":"🖱️ Barras o rueda para recorrer · Ctrl + rueda para zoom"}
          </div>
          {/* Controles flotantes — fijos sobre el visor */}
          <div style={{position:"absolute",right:18,bottom:18,display:"flex",flexDirection:"column",gap:8,zIndex:20}}>
            <button onClick={()=>zoomAt(1.25)} title="Acercar" style={fabStyle}>+</button>
            <button onClick={()=>zoomAt(1/1.25)} title="Alejar" style={fabStyle}>−</button>
            <button onClick={()=>fitToScreen()} title="Encuadrar todo" style={{...fabStyle,fontSize:".95rem"}}>⛶</button>
          </div>
        </div>

        {/* Leyenda */}
        <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
          {[{c:THEME.color.sage,l:"Confirmado"},{c:THEME.color.gold,l:"Pendiente"},{c:"rgba(26,26,20,.3)",l:"No va"}].map(({c,l})=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
              <span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.4)"}}>{l}</span>
            </div>
          ))}
          <div style={{marginLeft:"auto",fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.35)"}}>
            📐 {salonW}×{salonH}m · {mesas.length} mesa{mesas.length!==1?"s":""} · {totalInvWarn} invitados{isGuestMode?" · vista limpia":""}
          </div>
        </div>
      </div>

      {isMobile&&<div className="salon-v7-mobile-dock" aria-label="Controles rápidos del salón">
        <button type="button" onClick={()=>document.getElementById("salon-waiting-bank")?.scrollIntoView({behavior:"smooth",block:"start"})} style={{border:"1px solid rgba(201,169,110,.3)",borderRadius:12,background:"rgba(201,169,110,.09)",fontFamily:THEME.font.body,fontSize:".78rem",fontWeight:800,color:"rgba(120,88,30,.86)",cursor:"pointer"}}>Banco de espera · {waitingInvitations.length}</button>
        <button type="button" onClick={()=>selectedMesaObj?setShowSheet(true):showToast("Tocá una mesa para editarla","info")} style={{border:"1px solid rgba(74,94,58,.24)",borderRadius:12,background:selectedMesaObj?"rgba(74,94,58,.1)":"rgba(74,94,58,.04)",fontFamily:THEME.font.body,fontSize:".78rem",fontWeight:800,color:THEME.color.sage,cursor:"pointer"}}>{selectedMesaObj?`Mesa ${selectedMesa} · ${selectedPersonas.length}/${capDe(selectedMesaObj)}`:"Elegir mesa"}</button>
      </div>}

      {/* ── PANEL LATERAL ── (desktop) */}
      <div className="salon-v7-right-panel" style={{gridColumn:useThreePanelWorkspace?"3":isMobile?"1":"2",maxWidth:useThreePanelWorkspace?"none":320,minWidth:0,display:"flex",flexDirection:"column",gap:8,alignSelf:"start",position:useThreePanelWorkspace?"sticky":"static",top:useThreePanelWorkspace?8:"auto",maxHeight:useThreePanelWorkspace?"calc(100vh - 120px)":"none",overflowY:useThreePanelWorkspace?"auto":"visible",paddingRight:useThreePanelWorkspace?2:0}}>

        {/* Elemento seleccionado — medidas tipeables (desktop) */}
        {isDesignerMode&&!isMobile&&!selectedMesaObj&&selectedElem&&(()=>{
          const el=elementos.find(x=>x.id===selectedElem); if(!el) return null;
          const def=ELEMENTOS_FIJOS.find(d=>d.id===el.tipo);
          const setElDims=(w,h)=>{
            const ew=Math.max(0.4,Math.min(30,+w||el.ew));
            const eh=Math.max(0.4,Math.min(30,+h||el.eh));
            setElementos(es=>es.map(x=>x.id===el.id?{...x,ew,eh}:x));
          };
          return <div style={{background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.25)",borderRadius:12,padding:"12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontFamily:THEME.font.display,fontSize:".95rem",fontWeight:700,color:THEME.color.ink}}>{def?.emoji} {def?.label||"Elemento"}</div>
              <button onClick={()=>setSelectedElem(null)} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",fontSize:"1rem",cursor:"pointer",lineHeight:1}}>×</button>
            </div>
            <RecommendationBox items={getElementRecommendations(el,{salonW,salonH,mesas,elementos})}/>
            <div style={{display:"grid",gap:6,margin:"8px 0"}}>
              <label style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Nombre visible</label>
              <input name="app-field-12350" type="text" defaultValue={el.labelOverride||def?.label||""} placeholder="Ej: Barra principal, Pista central..."
                onChange={e=>setElementos(es=>es.map(x=>x.id===el.id?{...x,labelOverride:e.target.value}:x))}
                onMouseDown={e=>e.stopPropagation()}
                style={{width:"100%",boxSizing:"border-box",fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"8px 9px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,outline:"none"}}/>
            </div>
            <>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Medidas</span>
                <input name="app-field-12358" type="number" step="0.1" min="0.4" key={`ew-${el.id}-${el.ew}`} defaultValue={(el.ew||1).toFixed(1)}
                  onBlur={e=>setElDims(e.target.value,el.eh)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:56,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"6px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                <span style={{color:"rgba(26,26,20,.35)",fontSize:".75rem"}}>×</span>
                <input name="app-field-12362" type="number" step="0.1" min="0.4" key={`eh-${el.id}-${el.eh}`} defaultValue={(el.eh||1).toFixed(1)}
                  onBlur={e=>setElDims(el.ew,e.target.value)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:56,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"6px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)"}}>m</span>
              </div>
              <p style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.35)",margin:0,fontStyle:"italic"}}>También podés estirar la esquina ◲ en el plano</p>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:9,marginBottom:8}}>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",minWidth:58}}>Rotación</span>
                <button onClick={()=>setElementos(es=>es.map(x=>x.id===el.id?{...x,angle:((x.angle||0)-15+360)%360}:x))} style={{background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:7,padding:"6px 9px",cursor:"pointer",color:THEME.color.sage}}>−15°</button>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,color:"rgba(26,26,20,.48)",minWidth:38,textAlign:"center"}}>{el.angle||0}°</span>
                <button onClick={()=>setElementos(es=>es.map(x=>x.id===el.id?{...x,angle:((x.angle||0)+15)%360}:x))} style={{background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:7,padding:"6px 9px",cursor:"pointer",color:THEME.color.sage}}>+15°</button>
                <button onClick={()=>setElementos(es=>es.map(x=>x.id===el.id?{...x,angle:0}:x))} style={{marginLeft:"auto",background:"transparent",border:"1px solid rgba(74,94,58,.18)",borderRadius:7,padding:"6px 8px",cursor:"pointer",color:"rgba(26,26,20,.45)"}}>reset</button>
              </div>
              <button onClick={()=>removeElemento(el.id)} style={{width:"100%",marginTop:10,background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:7,padding:"8px",fontFamily:THEME.font.body,fontSize:"max(12px,.75rem)",color:"rgba(200,60,60,.65)",cursor:"pointer"}}>Eliminar elemento</button>
            </>
          </div>;
        })()}

        {!useThreePanelWorkspace&&<>
        {/* Lista sin mesa */}
        <div id="salon-waiting-bank" style={{background:THEME.color.cream2,border:"0.5px solid rgba(201,169,110,.2)",borderRadius:12,padding:"10px",flex:"0 0 auto",position:"sticky",top:0,zIndex:12,boxShadow:"0 10px 22px rgba(251,247,239,.92)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div>
              <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.78)"}}>Banco de espera ({waitingInvitations.length})</div>
              <div style={{fontFamily:THEME.font.body,fontSize:".7rem",color:"rgba(26,26,20,.46)",marginTop:3,lineHeight:1.35}}>Invitaciones todavía no ubicadas. Arrastrá o tocá una y después elegí una mesa.</div>
            </div>
            {sinMesa.length>0&&<span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(201,169,110,.6)",fontStyle:"italic"}}>{isTouchAssignment?"tocá o arrastrá a una mesa":"arrastrá al plano"}</span>}
          </div>
          {isGuestMode&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            <button onClick={vaciarTodasLasMesas}
              style={{flex:"1 1 120px",background:"rgba(200,60,60,.055)",border:"1px solid rgba(200,60,60,.2)",borderRadius:8,padding:"8px 9px",fontFamily:THEME.font.body,fontSize:".72rem",fontWeight:700,color:"rgba(170,55,55,.76)",cursor:"pointer"}}>
              Vaciar todas las mesas
            </button>
            <button onClick={usarOchoEnTodasLasRedondas}
              style={{flex:"1 1 120px",background:"rgba(74,94,58,.065)",border:"1px solid rgba(74,94,58,.18)",borderRadius:8,padding:"8px 9px",fontFamily:THEME.font.body,fontSize:".72rem",fontWeight:700,color:THEME.color.sage,cursor:"pointer"}}>
              Restablecer redondas en 8
            </button>
          </div>}
          {sinMesa.length>0&&<div style={{position:"relative",marginBottom:6}}>
            <input name="app-field-12387" value={searchSinMesa} onChange={e=>setSearchSinMesa(e.target.value)} placeholder="Buscar..."
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".78rem",padding:"4px 8px 4px 24px",borderRadius:100,border:"1px solid rgba(201,169,110,.25)",background:"rgba(201,169,110,.06)",outline:"none",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:".75rem",opacity:.4}}>🔍</span>
            {searchSinMesa&&<button onClick={()=>setSearchSinMesa("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(26,26,20,.4)",fontSize:".8rem"}}>×</button>}
          </div>}
          {sinMesa.length===0
            ?<div style={{fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Todos asignados ✓</div>
            :<div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:"min(420px,46vh)",overflowY:"auto"}}>
              {waitingInvitationsVisible.map(p=>{
                const isGuestSelected=selectedGuestForAssign?.guestId===p.guestId;
                return <div key={`${p.guestId}-${p.personIdx}`}
                  onMouseDown={e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}}
                  onTouchStart={e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}}
                  onClick={e=>{
                    e.stopPropagation();
                    if(dragMoved.current){dragMoved.current=false;return;}
                    if(isTouchAssignment) selectGuestForTapAssign(p);
                  }}
                  title={isTouchAssignment?"Tocá y luego elegí una mesa, o arrastrá hacia una mesa":"Arrastrá hacia una mesa en el canvas"}
                  style={{display:"flex",alignItems:"center",gap:5,background:isGuestSelected?"rgba(74,94,58,.12)":"rgba(201,169,110,.06)",borderRadius:6,padding:"7px 8px",cursor:"grab",border:isGuestSelected?"1.5px solid rgba(74,94,58,.48)":"0.5px solid rgba(201,169,110,.15)",userSelect:"none",touchAction:"none",boxShadow:isGuestSelected?"0 0 0 2px rgba(74,94,58,.06)":"none"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:CONF_COLORS[p.confirmacion]||"#999",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:"7px",fontWeight:700,color:"#fff"}}>{p.nombre.charAt(0)}</span>
                  </div>
                  <span style={{fontFamily:THEME.font.body,fontSize:".76rem",color:THEME.color.ink,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}{p.cantidadInvitados>1?` · ${p.cantidadInvitados} pers.`:""}</span>
                  {isGuestSelected&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,color:THEME.color.sage,letterSpacing:".08em",textTransform:"uppercase"}}>mesa?</span>}
                </div>;
              })}
              {waitingInvitationsFiltered.length===0&&searchSinMesa&&<div style={{fontFamily:THEME.font.body,fontSize:".74rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Sin resultados</div>}
              {waitingInvitationsHiddenCount>0&&<div style={{fontFamily:THEME.font.body,fontSize:".74rem",color:"rgba(26,26,20,.42)",fontStyle:"italic",padding:"6px 2px 2px"}}>Mostrando {waitingInvitationsVisible.length} de {waitingInvitationsFiltered.length}. Usá el buscador para encontrar más rápido.</div>}
            </div>
          }
        </div>
        </>}


        {/* Info mesa seleccionada — solo desktop; en mobile se usa el bottom sheet */}
        {!isMobile&&(selectedMesaObj
          ?<div style={{background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.25)",borderRadius:12,padding:"12px",overflow:"visible"}}>
            {/* Header */}
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.52)",marginBottom:5}}>Mesa seleccionada</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontFamily:THEME.font.display,fontSize:".95rem",fontWeight:700,color:THEME.color.ink}}>
                {selectedMesaObj.etiqueta||`Mesa ${selectedMesa}`}
              </div>
              <button onClick={()=>{setSelectedMesa(null);}} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",fontSize:"1rem",cursor:"pointer",lineHeight:1}}>×</button>
            </div>

            {/* Capacidad — selector por tipo, con medidas */}
            <div style={{background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.15)",borderRadius:10,padding:"8px 10px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.6)"}}>Personas</span>
                <span style={{fontFamily:THEME.font.display,fontWeight:700,fontSize:"1rem",color:selectedPersonas.length>capDe(selectedMesaObj)?"#B5443A":THEME.color.ink}}>{selectedPersonas.length}<span style={{color:"rgba(26,26,20,.4)",fontWeight:400,fontSize:".8rem"}}> / {capDe(selectedMesaObj)}</span></span>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:5}}>
                {(CAP_OPCIONES[selectedMesaObj.tipo||"round"]||[8,10,12]).map(n=>
                  <button key={n} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setCapacidadA(selectedMesaObj,n);}}
                    style={{flex:1,minWidth:34,background:capDe(selectedMesaObj)===n?THEME.color.sage:THEME.color.cream,color:capDe(selectedMesaObj)===n?THEME.color.cream:"rgba(26,26,20,.55)",border:`1px solid ${capDe(selectedMesaObj)===n?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"7px 4px",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",fontWeight:capDe(selectedMesaObj)===n?700:400,cursor:"pointer"}}>{n}</button>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)"}}>{(selectedMesaObj.tipo||"round")==="round"?"Ø":"Medida"}</span>
                <input name="app-field-12446" type="number" step="0.1" min="0.6" key={`mw-${selectedMesa}-${selectedMesaObj.ew||""}`} defaultValue={(selectedMesaObj.ew||MESA_R_M*2).toFixed(1)}
                  onBlur={e=>setMedidas(selectedMesaObj,e.target.value,selectedMesaObj.eh)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:52,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"5px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                {(selectedMesaObj.tipo||"round")!=="round"&&(selectedMesaObj.tipo!=="square")&&<>
                  <span style={{color:"rgba(26,26,20,.35)",fontSize:".75rem"}}>×</span>
                  <input name="app-field-12451" type="number" step="0.1" min="0.6" key={`mh-${selectedMesa}-${selectedMesaObj.eh||""}`} defaultValue={(selectedMesaObj.eh||0.8).toFixed(1)}
                    onBlur={e=>setMedidas(selectedMesaObj,selectedMesaObj.ew,e.target.value)} onMouseDown={e=>e.stopPropagation()}
                    style={{width:52,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"5px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                </>}
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)"}}>m</span>
              </div>
              <div style={{fontFamily:THEME.font.body,fontSize:"max(10px,.68rem)",color:"rgba(74,94,58,.55)",textAlign:"right",marginTop:3,fontStyle:"italic"}}>Sillas recomendadas: {capPorMedidas(selectedMesaObj.tipo||"round",selectedMesaObj.ew||MESA_R_M*2,selectedMesaObj.eh||MESA_R_M*2)}</div>
            </div>

            <RecommendationBox items={getMesaRecommendations(selectedMesaObj, selectedPersonas, capDe(selectedMesaObj), guests)}/>

            {/* Etiqueta */}
            <div style={{marginBottom:8}}>
              <input name="app-field-12464" type="text" defaultValue={selectedMesaObj.etiqueta||""} placeholder="Nombre de la mesa (se ve en el plano)"
                onChange={e=>updateMesa(selectedMesa,{etiqueta:e.target.value})}
                style={{width:"100%",fontFamily:THEME.font.body,fontSize:".8rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",outline:"none"}}/>
              <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                {["Familia","Amigos","Presidencial","Padrinos","Testigos"].map(et=>(
                  <button key={et} onClick={()=>updateMesa(selectedMesa,{etiqueta:et})}
                    style={{background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.15)",borderRadius:100,padding:"2px 7px",fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(74,94,58,.7)",cursor:"pointer"}}>
                    {et}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de mesa */}
            <div style={{marginBottom:8}}>
              <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Tipo</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {MESA_TIPOS.map(opt=>{
                  const cur=selectedMesaObj?.tipo||"round";
                  const isAct=cur===opt.v;
                  return <button key={opt.v}
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();updateMesa(selectedMesa,{tipo:opt.v,ew:opt.ew,eh:opt.eh,cap:opt.cap});}}
                    style={{flex:"1 0 30%",minWidth:64,background:isAct?"rgba(74,94,58,.15)":THEME.color.cream,border:`1.5px solid ${isAct?THEME.color.sage:"rgba(74,94,58,.15)"}`,borderRadius:8,padding:"8px 0",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:"1rem",color:isAct?THEME.color.sage:"rgba(26,26,20,.4)"}}>{opt.l}</span>
                    <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".06em",textTransform:"uppercase",color:isAct?THEME.color.sage:"rgba(26,26,20,.35)"}}>{opt.desc}</span>
                  </button>;
                })}
              </div>
            </div>

            {/* Rotación — solo para mesas rect */}
            {selectedMesaObj&&selectedMesaObj.tipo!=="round"&&<div style={{marginBottom:8}}>
              <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Rotación</div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={()=>updateMesa(selectedMesa,{angle:((selectedMesaObj.angle||0)-45+360)%360})}
                  style={{flex:1,background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:7,padding:"6px",cursor:"pointer",fontFamily:THEME.font.body,fontSize:".85rem",color:THEME.color.sage}}>↺ -45°</button>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,color:"rgba(26,26,20,.4)",minWidth:32,textAlign:"center"}}>{selectedMesaObj.angle||0}°</span>
                <button onClick={()=>updateMesa(selectedMesa,{angle:((selectedMesaObj.angle||0)+45)%360})}
                  style={{flex:1,background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:7,padding:"6px",cursor:"pointer",fontFamily:THEME.font.body,fontSize:".85rem",color:THEME.color.sage}}>↻ +45°</button>
                <button onClick={()=>updateMesa(selectedMesa,{angle:0})}
                  style={{background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:7,padding:"6px 8px",cursor:"pointer",fontFamily:THEME.font.label,fontSize:THEME.text.tiny,color:"rgba(26,26,20,.4)"}}>0°</button>
              </div>
              <p style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.35)",margin:"4px 0 0",fontStyle:"italic"}}>O arrastrá el ↻ en la esquina de la mesa</p>
            </div>}

            {/* Invitados asignados */}
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(26,26,20,.38)",marginBottom:5}}>
              Asignados · {selectedPersonas.length}/{capDe(selectedMesaObj)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:"min(42vh,360px)",overflowY:"auto",marginBottom:8,paddingRight:3}}>
              {selectedPersonas.map(p=>(
                <div key={`${p.guestId}-${p.personIdx}`}
                  onMouseDown={e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}}
                  onTouchStart={e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}}
                  onClick={e=>{e.stopPropagation(); if(dragMoved.current){dragMoved.current=false;return;} if(isTouchAssignment) selectGuestForTapAssign(p);}}
                  title={isTouchAssignment?`Tocá para elegir otra mesa o arrastrá a ${p.nombre}`:`Arrastrá a ${p.nombre} hacia una mesa en el canvas`}
                  style={{display:"flex",alignItems:"center",gap:6,background:selectedGuestForAssign?.guestId===p.guestId?"rgba(74,94,58,.12)":"rgba(74,94,58,.05)",borderRadius:6,padding:"5px 7px",cursor:"grab",border:selectedGuestForAssign?.guestId===p.guestId?"1.5px solid rgba(74,94,58,.45)":"0.5px solid rgba(74,94,58,.1)",userSelect:"none",touchAction:"none"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:CONF_COLORS[p.confirmacion]||"#999",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:"7px",fontWeight:700,color:"#fff"}}>{p.nombre.charAt(0)}</span>
                  </div>
                  <span style={{fontFamily:THEME.font.body,fontSize:".76rem",color:THEME.color.ink,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</span>
                  <button aria-label={`Mover ${p.nombre} al Banco de espera`} title="Mover esta invitación al Banco de espera" onClick={e=>{e.stopPropagation();onRemove(p.guestId); if(selectedGuestForAssign?.guestId===p.guestId) setSelectedGuestForAssign(null);}} style={{background:"transparent",border:"none",color:"rgba(200,60,60,.5)",cursor:"pointer",fontSize:".8rem",padding:"3px 5px",flexShrink:0}}>×</button>
                </div>
              ))}
              {selectedPersonas.length===0&&<div style={{fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Elegí personas desde el Banco de espera</div>}
            </div>

            <div style={{display:"grid",gap:6}}>
              <button onClick={()=>vaciarMesa(selectedMesa)} disabled={selectedPersonas.length===0}
                style={{width:"100%",background:"rgba(201,169,110,.08)",border:"1px solid rgba(201,169,110,.26)",borderRadius:7,padding:"8px",fontFamily:THEME.font.body,fontSize:".75rem",fontWeight:700,color:"rgba(120,88,30,.78)",cursor:selectedPersonas.length===0?"default":"pointer",opacity:selectedPersonas.length===0?.5:1}}>
                Vaciar mesa · pasar al Banco de espera
              </button>
              <button onClick={()=>removeMesa(selectedMesa)} style={{width:"100%",background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:7,padding:"7px",fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(200,60,60,.65)",cursor:"pointer"}}>
                Eliminar esta mesa
              </button>
            </div>
          </div>

          :<div style={{background:"rgba(74,94,58,.04)",border:"0.5px dashed rgba(74,94,58,.18)",borderRadius:12,padding:"20px 12px",textAlign:"center"}}>
            <div style={{fontSize:"1.4rem",marginBottom:6}}>👆</div>
            <div style={{fontFamily:THEME.font.body,fontSize:".8rem",color:"rgba(26,26,20,.38)",lineHeight:1.6}}>Tocá una mesa para editarla. Para moverla, mantené presionado y arrastrá.</div>
          </div>
        )}

        {/* Resumen salón */}
        <div style={{background:"rgba(74,94,58,.05)",border:"0.5px solid rgba(74,94,58,.15)",borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Salón</div>
          <div style={{fontFamily:THEME.font.body,fontSize:".76rem",color:"rgba(26,26,20,.6)"}}>📐 {salonW}×{salonH}m = {(salonW*salonH).toFixed(0)}m²</div>
          <div style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.4)",marginTop:2}}>{mesas.length} mesa{mesas.length!==1?"s":""} · Ø{(MESA_R_M*2).toFixed(1)}m c/u</div>
          {budgetInvitados>0&&<div style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(74,94,58,.6)",marginTop:2}}>👥 {budgetInvitados} inv → {Math.ceil(budgetInvitados/tableSize)} mesas sugeridas</div>}
        </div>
      </div>
    </div>

    {/* ── BOTTOM SHEET MOBILE: editor de mesa ── */}
    {showSheet&&selectedMesaObj&&isMobile&&<BottomSheet title={selectedMesaObj.etiqueta||`Mesa ${selectedMesa}`} onClose={()=>setShowSheet(false)}>
      {/* Capacidad — selector por tipo, con medidas */}
      <div style={{background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.15)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.6)"}}>Personas</span>
          <span style={{fontFamily:THEME.font.display,fontWeight:700,fontSize:"1.15rem",color:selectedPersonas.length>capDe(selectedMesaObj)?"#B5443A":THEME.color.ink}}>{selectedPersonas.length}<span style={{color:"rgba(26,26,20,.4)",fontWeight:400,fontSize:".85rem"}}> / {capDe(selectedMesaObj)}</span></span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
          {(CAP_OPCIONES[selectedMesaObj.tipo||"round"]||[8,10,12]).map(n=>
            <button key={n} onClick={()=>setCapacidadA(selectedMesaObj,n)}
              style={{flex:1,minWidth:THEME.tap.min,minHeight:THEME.tap.min,background:capDe(selectedMesaObj)===n?THEME.color.sage:THEME.color.cream,color:capDe(selectedMesaObj)===n?THEME.color.cream:"rgba(26,26,20,.55)",border:`1px solid ${capDe(selectedMesaObj)===n?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"8px 4px",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:capDe(selectedMesaObj)===n?700:400,cursor:"pointer"}}>{n}</button>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
          <span style={{fontFamily:THEME.font.body,fontSize:"max(12px,.75rem)",color:"rgba(26,26,20,.45)"}}>{(selectedMesaObj.tipo||"round")==="round"?"Ø":"Medida"}</span>
          <input name="app-field-12569" type="number" step="0.1" min="0.6" key={`smw-${selectedMesa}-${selectedMesaObj.ew||""}`} defaultValue={(selectedMesaObj.ew||MESA_R_M*2).toFixed(1)}
            onBlur={e=>setMedidas(selectedMesaObj,e.target.value,selectedMesaObj.eh)}
            style={{width:64,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
          {(selectedMesaObj.tipo||"round")!=="round"&&(selectedMesaObj.tipo!=="square")&&<>
            <span style={{color:"rgba(26,26,20,.35)"}}>×</span>
            <input name="app-field-12574" type="number" step="0.1" min="0.6" key={`smh-${selectedMesa}-${selectedMesaObj.eh||""}`} defaultValue={(selectedMesaObj.eh||0.8).toFixed(1)}
              onBlur={e=>setMedidas(selectedMesaObj,selectedMesaObj.ew,e.target.value)}
              style={{width:64,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
          </>}
          <span style={{fontFamily:THEME.font.body,fontSize:"max(12px,.75rem)",color:"rgba(26,26,20,.45)"}}>m</span>
        </div>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(74,94,58,.55)",textAlign:"right",marginTop:4,fontStyle:"italic"}}>Sillas recomendadas: {capPorMedidas(selectedMesaObj.tipo||"round",selectedMesaObj.ew||MESA_R_M*2,selectedMesaObj.eh||MESA_R_M*2)}</div>
      </div>
      <RecommendationBox items={getMesaRecommendations(selectedMesaObj, selectedPersonas, capDe(selectedMesaObj), guests)}/>
      {/* Etiquetas rápidas */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {["Familia","Amigos","Presidencial","Padrinos","Testigos"].map(et=>(
          <button key={et} onClick={()=>updateMesa(selectedMesa,{etiqueta:et})}
            style={{background:selectedMesaObj.etiqueta===et?"rgba(74,94,58,.15)":"rgba(74,94,58,.06)",border:`1px solid ${selectedMesaObj.etiqueta===et?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"10px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(74,94,58,.85)",cursor:"pointer"}}>
            {et}
          </button>
        ))}
      </div>
      <input name="app-field-12592" type="text" defaultValue={selectedMesaObj.etiqueta||""} placeholder="Nombre de la mesa (se ve en el plano)"
        onChange={e=>updateMesa(selectedMesa,{etiqueta:e.target.value})}
        style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(14px,.9rem)",padding:"11px 12px",borderRadius:THEME.radius.sm,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",marginBottom:12}}/>
      {/* Tipo de mesa */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {MESA_TIPOS.map(opt=>{
          const cur=selectedMesaObj.tipo||"round";
          return <button key={opt.v} onClick={()=>updateMesa(selectedMesa,{tipo:opt.v,ew:opt.ew,eh:opt.eh,cap:opt.cap})}
            style={{flex:"1 0 30%",background:cur===opt.v?"rgba(74,94,58,.12)":"transparent",border:`1.5px solid ${cur===opt.v?THEME.color.sage:"rgba(74,94,58,.15)"}`,borderRadius:THEME.radius.sm,padding:"12px 4px",minHeight:THEME.tap.comfortable,cursor:"pointer",fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:cur===opt.v?THEME.color.sage:"rgba(26,26,20,.45)"}}>
            {opt.l} {opt.desc}
          </button>;
        })}
      </div>
      {/* Rotación — solo mesas rectangulares */}
      {selectedMesaObj.tipo&&selectedMesaObj.tipo!=="round"&&<div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center"}}>
        <button onClick={()=>updateMesa(selectedMesa,{angle:((selectedMesaObj.angle||0)-45+360)%360})}
          style={{flex:1,background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:THEME.radius.sm,padding:"11px",minHeight:THEME.tap.min,cursor:"pointer",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:THEME.color.sage}}>↺ -45°</button>
        <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,color:"rgba(26,26,20,.45)",minWidth:40,textAlign:"center"}}>{selectedMesaObj.angle||0}°</span>
        <button onClick={()=>updateMesa(selectedMesa,{angle:((selectedMesaObj.angle||0)+45)%360})}
          style={{flex:1,background:THEME.color.cream,border:"1px solid rgba(74,94,58,.2)",borderRadius:THEME.radius.sm,padding:"11px",minHeight:THEME.tap.min,cursor:"pointer",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:THEME.color.sage}}>↻ +45°</button>
      </div>}
      {/* Invitados asignados */}
      <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.38)",marginBottom:6}}>Asignados · {selectedPersonas.length}/{capDe(selectedMesaObj)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
        {selectedPersonas.map(p=>(
          <div key={`${p.guestId}-${p.personIdx}`}
            onClick={e=>{e.stopPropagation(); if(isTouchAssignment) selectGuestForTapAssign(p);}}
            style={{display:"flex",alignItems:"center",gap:10,background:selectedGuestForAssign?.guestId===p.guestId?"rgba(74,94,58,.12)":"rgba(74,94,58,.05)",border:selectedGuestForAssign?.guestId===p.guestId?"1.5px solid rgba(74,94,58,.45)":"1px solid transparent",borderRadius:THEME.radius.sm,padding:"8px 10px",minHeight:THEME.tap.min,cursor:isTouchAssignment?"pointer":"default"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:CONF_COLORS[p.confirmacion]||"#999",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:"10px",fontWeight:700,color:"#fff"}}>{p.nombre.charAt(0)}</span>
            </div>
            <span style={{fontFamily:THEME.font.body,fontSize:"max(14px,.88rem)",color:THEME.color.ink,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</span>
            <button aria-label={`Mover ${p.nombre} al Banco de espera`} title="Mover esta invitación al Banco de espera" onClick={e=>{e.stopPropagation();onRemove(p.guestId); if(selectedGuestForAssign?.guestId===p.guestId) setSelectedGuestForAssign(null);}} style={{background:"transparent",border:"none",color:"rgba(200,60,60,.62)",cursor:"pointer",fontSize:"1.05rem",padding:"8px 12px",minHeight:THEME.tap.min,lineHeight:1,flexShrink:0}}>×</button>
          </div>
        ))}
        {selectedPersonas.length===0&&<div style={{fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(26,26,20,.3)",fontStyle:"italic",padding:"8px 0"}}>Sin invitados asignados todavía · Elegilos desde el Banco de espera</div>}
      </div>
      <button onClick={()=>vaciarMesa(selectedMesa)} disabled={selectedPersonas.length===0}
        style={{width:"100%",marginTop:14,background:"rgba(201,169,110,.08)",border:"1px solid rgba(201,169,110,.28)",borderRadius:THEME.radius.sm,padding:"12px",minHeight:THEME.tap.comfortable,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:750,color:"rgba(120,88,30,.8)",cursor:selectedPersonas.length===0?"default":"pointer",opacity:selectedPersonas.length===0?.5:1}}>
        Vaciar mesa · pasar al Banco de espera
      </button>
      <button onClick={()=>removeMesa(selectedMesa)} style={{width:"100%",marginTop:8,background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:THEME.radius.sm,padding:"12px",minHeight:THEME.tap.comfortable,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(200,60,60,.7)",cursor:"pointer"}}>
        🗑 Eliminar mesa {selectedMesa}
      </button>
    </BottomSheet>}
  </div>;
}


// ─── SEATING CIRCLE VIEW ─────────────────────────────────────────────────────
function SeatingCircleView({ guests, tableSize, onAssign, onRemove }){
  const [dragging, setDragging] = useState(null); // {guestId, personIdx}
  const [dragOver, setDragOver] = useState(null); // {tableNum, seatIdx}
  const [searchSinMesaCircle, setSearchSinMesaCircle] = useState("");

  // Expandir cada invitado en personas individuales
  const personas = [];
  (guests||[]).forEach(g=>{
    const cant = parseInt(g.cantidadInvitados||1);
    for(let i=0;i<cant;i++){
      personas.push({
        guestId: g.id,
        personIdx: i,
        nombre: cant>1 ? `${g.nombre} ${i+1}` : g.nombre,
        mesa: g.mesa ? parseInt(g.mesa) : null,
        confirmacion: g.confirmacion,
      });
    }
  });

  const sinMesa = personas.filter(p=>!p.mesa);
  const sinMesaFilt = sinMesa.filter(p=>!searchSinMesaCircle||p.nombre.toLowerCase().includes(searchSinMesaCircle.toLowerCase()));
  const SIN_MESA_VIEW_LIMIT = searchSinMesaCircle ? 100 : 60;
  const sinMesaVisible = sinMesaFilt.slice(0, SIN_MESA_VIEW_LIMIT);
  const sinMesaHiddenCount = Math.max(0, sinMesaFilt.length - sinMesaVisible.length);
  const maxMesa = Math.max(0, ...personas.filter(p=>p.mesa).map(p=>p.mesa));
  const numMesas = Math.max(maxMesa, 1);

  const tables = Array.from({length:numMesas},(_,i)=>({
    num: i+1,
    personas: personas.filter(p=>p.mesa===i+1),
  }));

  const CONF_COLORS = {
    confirmado: "#4A5E3A", pendiente: "#C9A96E", declinado: "#C05A4A"
  };

  // Posiciones en círculo
  const circlePosiciones = (total, r=90) =>
    Array.from({length:total},(_,i)=>{
      const angle = (i/total)*2*Math.PI - Math.PI/2;
      return { x: Math.cos(angle)*r, y: Math.sin(angle)*r };
    });

  const handleDragStart = (guestId, personIdx) => setDragging({guestId, personIdx});
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleDropOnTable = (tableNum) => {
    if(!dragging) return;
    // Si el grupo tiene cantidad > 1, asignar toda la familia a esa mesa
    onAssign(dragging.guestId, tableNum);
    setDragging(null); setDragOver(null);
  };

  const handleDropOnSin = () => {
    if(!dragging) return;
    onRemove(dragging.guestId);
    setDragging(null); setDragOver(null);
  };

  const TableCircle = ({table}) => {
    const seats = tableSize;
    const assigned = table.personas;
    const libres = Math.max(0, seats - assigned.length);
    const allSeats = [...assigned, ...Array(libres).fill(null)];
    const positions = circlePosiciones(Math.max(allSeats.length, 4), Math.max(70, 20 + allSeats.length * 10));
    const R = Math.max(70, 20 + allSeats.length * 10);
    const svgSize = (R + 36) * 2;
    const cx = svgSize / 2;
    const cy = svgSize / 2;
    const over = assigned.length > seats;

    return <div
      onDragOver={e=>{e.preventDefault();setDragOver(table.num);}}
      onDrop={()=>handleDropOnTable(table.num)}
      style={{
        background: dragOver===table.num ? "rgba(74,94,58,.08)" : "#FBF7EF",
        border: `0.5px solid ${over?"rgba(200,80,60,.4)":dragOver===table.num?"rgba(74,94,58,.4)":"rgba(201,169,110,.22)"}`,
        borderRadius:16,padding:"16px 12px",
        transition:"all .2s",cursor:"default"
      }}
    >
      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"1rem",color:"#1A1A14",textAlign:"center",marginBottom:4}}>
        Mesa {table.num}
      </div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(26,26,20,.4)",textAlign:"center",marginBottom:8}}>
        {assigned.length} asignados · {libres} libres{over?" ⚠️":""}
      </div>
      <div style={{display:"flex",justifyContent:"center"}}>
        <svg width={svgSize} height={svgSize} style={{overflow:"visible"}}>
          {/* Mesa central */}
          <circle cx={cx} cy={cy} r={28} fill="rgba(201,169,110,.12)" stroke="rgba(201,169,110,.35)" strokeWidth="1.5"/>
          <text x={cx} y={cy+4} textAnchor="middle" fontSize="11" fill="rgba(201,169,110,.8)" fontFamily="'Cinzel',serif">{assigned.length}/{seats}</text>
          {/* Sillas */}
          {allSeats.map((persona,i)=>{
            const pos = positions[i] || {x:0,y:0};
            const px = cx + pos.x;
            const py = cy + pos.y;
            const color = persona ? (CONF_COLORS[persona.confirmacion]||"#999") : "rgba(74,94,58,.12)";
            const inicial = persona ? persona.nombre.charAt(0).toUpperCase() : "+";
            return <g key={i}
              draggable={!!persona}
              onDragStart={()=>persona&&handleDragStart(persona.guestId, persona.personIdx)}
              onDragEnd={handleDragEnd}
              style={{cursor:persona?"grab":"default"}}
            >
              <circle cx={px} cy={py} r={16} fill={color} stroke="#FBF7EF" strokeWidth="2"/>
              <text x={px} y={py+5} textAnchor="middle" fontSize={persona?"11":"14"} fill="#FBF7EF" fontFamily="'Calibri',sans-serif" fontWeight="600">{inicial}</text>
              {persona&&<title>{persona.nombre}</title>}
            </g>;
          })}
        </svg>
      </div>
    </div>;
  };

  return <div>
    {/* Sin mesa */}
    {sinMesa.length>0&&<div
      onDragOver={e=>{e.preventDefault();setDragOver("sin");}}
      onDrop={handleDropOnSin}
      style={{
        background:dragOver==="sin"?"rgba(200,80,60,.06)":"rgba(201,169,110,.06)",
        border:`0.5px solid ${dragOver==="sin"?"rgba(200,80,60,.3)":"rgba(201,169,110,.25)"}`,
        borderRadius:14,padding:"14px 16px",marginBottom:16,transition:"all .2s",position:"sticky",top:8,zIndex:6,boxShadow:"0 10px 24px rgba(251,247,239,.86)",backdropFilter:"blur(8px)"
      }}
    >
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:8}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.7)"}}>
          Sin mesa asignada ({sinMesa.length} {sinMesa.length===1?"persona":"personas"})
        </div>
        {sinMesa.length>12&&<span style={{fontFamily:"'Lora',serif",fontSize:".76rem",color:"rgba(26,26,20,.42)",whiteSpace:"nowrap"}}>buscar y arrastrar</span>}
      </div>
      {sinMesa.length>12&&<div style={{position:"relative",marginBottom:10}}>
        <input name="app-field-12772" value={searchSinMesaCircle} onChange={e=>setSearchSinMesaCircle(e.target.value)} placeholder="Buscar invitado sin mesa..."
          style={{width:"100%",boxSizing:"border-box",fontFamily:"'Lora',serif",fontSize:".84rem",padding:"8px 12px 8px 30px",borderRadius:100,border:"1px solid rgba(201,169,110,.28)",background:"#FBF7EF",outline:"none",color:"#1A1A14"}}/>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:".82rem",opacity:.38}}>🔍</span>
        {searchSinMesaCircle&&<button onClick={()=>setSearchSinMesaCircle("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(26,26,20,.45)",fontSize:".9rem"}}>×</button>}
      </div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:sinMesa.length>18?"min(260px,36vh)":"none",overflowY:sinMesa.length>18?"auto":"visible",paddingRight:sinMesa.length>18?4:0}}>
        {sinMesaVisible.map((p,i)=>{
          const color = CONF_COLORS[p.confirmacion]||"#999";
          return <div key={`${p.guestId}-${p.personIdx}`}
            draggable
            onDragStart={()=>handleDragStart(p.guestId, p.personIdx)}
            onDragEnd={handleDragEnd}
            style={{
              display:"flex",alignItems:"center",gap:8,
              background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.3)",
              borderRadius:100,padding:"6px 12px 6px 8px",cursor:"grab",
              boxShadow:dragging?.guestId===p.guestId?"0 2px 8px rgba(0,0,0,.12)":"none"
            }}
          >
            <div style={{width:26,height:26,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontFamily:"'Calibri',sans-serif",fontSize:"11px",fontWeight:600,color:"#FFF"}}>{p.nombre.charAt(0)}</span>
            </div>
            <span style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"#1A1A14",whiteSpace:"nowrap"}}>{p.nombre}</span>
          </div>;
        })}
        {sinMesaFilt.length===0&&searchSinMesaCircle&&<div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.35)",fontStyle:"italic",padding:"8px 2px"}}>No hay resultados para esa búsqueda.</div>}
        {sinMesaHiddenCount>0&&<div style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.42)",fontStyle:"italic",padding:"6px 2px"}}>Mostrando {sinMesaVisible.length} de {sinMesaFilt.length}. Usá el buscador para ubicar a alguien específico.</div>}
      </div>
      {sinMesa.length>0&&<p style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.35)",marginTop:10,marginBottom:0,fontStyle:"italic"}}>
        Arrastrá una persona a una mesa para asignarla
      </p>}
    </div>}

    {/* Mesas en círculo */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(200px,44vw),1fr))",gap:16}}>
      {tables.map(t=><TableCircle key={t.num} table={t}/>)}
      {/* Botón agregar mesa */}
      <div
        onDragOver={e=>{e.preventDefault();setDragOver("nueva");}}
        onDrop={()=>{
          if(!dragging) return;
          handleDropOnTable(numMesas+1);
        }}
        style={{
          border:`1.5px dashed ${dragOver==="nueva"?"#4A5E3A":"rgba(74,94,58,.25)"}`,
          borderRadius:16,padding:"16px",display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",gap:8,minHeight:180,
          background:dragOver==="nueva"?"rgba(74,94,58,.06)":"transparent",
          cursor:"default",transition:"all .2s"
        }}
      >
        <span style={{fontSize:"1.5rem"}}>➕</span>
        <span style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(74,94,58,.5)",textAlign:"center"}}>
          {dragOver==="nueva"?"Soltar aquí para crear mesa nueva":"Arrastrá aquí para crear Mesa "+(numMesas+1)}
        </span>
      </div>
    </div>
  </div>;
}

// ─── MÓDULO CHECKLIST GENERAL ─────────────────────────────────────────────────
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

function ChecklistModule({user, form, results, onGoMusic, onBack}){
  const [checked,   setChecked]   = useState(null);
  const [custom,    setCustom]    = useState({}); // {etapaIdx: [{id,texto,completada}]}
  const [order,     setOrder]     = useState({}); // {etapaIdx: [idx array for predefined]}
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
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

  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await dataClient(user).from("wedding_data")
          .select("checklist_general,checklist_custom,checklist_order")
          .eq("user_id",user.id).maybeSingle();
        setChecked(row?.checklist_general || {});
        setCustom(row?.checklist_custom || {});
        setOrder(row?.checklist_order || {});
        setNotas(row?.checklist_notas || {});
        setResp(row?.checklist_resp || {});
        // Cargar vendors para vincular tareas
        try{
          const {data:vrow} = await dataClient(user).from("wedding_data").select("vendors").eq("user_id",user.id).maybeSingle();
          if(Array.isArray(vrow?.vendors)) setVendors4Chk(vrow.vendors.filter(v=>v.estado!=="descartado"));
        }catch(e){}
      }catch(e){ setChecked({}); setCustom({}); setOrder({}); }
    };
    load();
  },[user]);

  const persist = async(ch, cu, ord) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async()=>{
      setSaving(true);
      try{
        await dataClient(user).from("wedding_data").upsert({
          user_id:user.id,
          checklist_general: ch ?? checked,
          checklist_custom: cu ?? custom,
          checklist_order: ord ?? order,
          checklist_notas: notas,
          checklist_resp: resp,
          updated_at:new Date().toISOString()
        },{onConflict:"user_id"});
        setSaved(true); setTimeout(()=>setSaved(false),1500);
      }catch(e){}
      setSaving(false);
    }, 500);
  };

  const toggleItem = (key, val) => {
    const next = {...checked, [key]: val===undefined?!checked[key]:val};
    setChecked(next); persist(next, null, null);
  };

  const setNota = (key, text) => {
    const next = {...notas, [key]: text};
    setNotas(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async function() {
      try {
        await dataClient(user).from("wedding_data").upsert({
          user_id:user.id, checklist_notas:next, updated_at:new Date().toISOString()
        },{onConflict:"user_id"});
      } catch(e) {}
    }, 800);
  };

  const setResponsable = (key, value) => {
    const next = {...resp, [key]: value};
    setResp(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async function() {
      try {
        await dataClient(user).from("wedding_data").upsert({
          user_id:user.id, checklist_resp:next, updated_at:new Date().toISOString()
        },{onConflict:"user_id"});
      } catch(e) {}
    }, 800);
  };

  const RESPONSABLES = ["Novio","Novia","Ambos","Coordinadora"];
  const RESP_COLORS = {"Novio":"rgba(74,94,58,.7)","Novia":"rgba(201,169,110,.8)","Ambos":"rgba(26,26,20,.5)","Coordinadora":"rgba(100,80,160,.7)"};

  // Vendor link helpers
  const getVendorId = (key) => notas[key+"__vendor"] || "";
  const setVendorId = (key, val) => {
    const next = {...notas, [key+"__vendor"]: val};
    setNotas(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try { await dataClient(user).from("wedding_data").upsert({user_id:user.id,checklist_notas:next,updated_at:new Date().toISOString()},{onConflict:"user_id"}); } catch(e){}
    }, 800);
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
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try { await dataClient(user).from("wedding_data").upsert({user_id:user.id,checklist_notas:next,updated_at:new Date().toISOString()},{onConflict:"user_id"}); } catch(e){}
    }, 800);
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
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:0,lineHeight:1.1}}>📋 Checklist de la boda</h1>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2rem,4vw,3rem)",color:"#C9A96E",fontWeight:700,lineHeight:1}}>{pct}%</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(245,239,224,.55)"}}>{doneItems} de {totalItems} completados</div>
            {(saving||saved)&&<div style={{fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(201,169,110,.8)",marginTop:2}}>{saving?"Guardando...":"✓ Guardado"}</div>}
          </div>
        </div>
        <div style={{marginTop:16,height:6,background:"rgba(255,255,255,.15)",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#C9A96E",borderRadius:6,transition:"width .4s"}}/>
        </div>
      </div>
    </div>

    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>

      {/* ── CLIMA ── */}
      <WeatherWidget fechaBoda={form?.fechaBoda} ciudad={form?.ciudad}/>

      {/* ── BANDA SONORA ── */}
      <div style={{background:results?"rgba(74,94,58,.06)":"rgba(201,169,110,.06)",border:`0.5px solid ${results?"rgba(74,94,58,.2)":"rgba(201,169,110,.25)"}`,borderRadius:14,padding:"16px 18px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".18em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>🎵 Tu Banda Sonora de Boda</div>
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
          <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:8}}>Tareas clave del guion musical</div>
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
                {done&&<span style={{color:"#F5EFE0",fontSize:THEME.text.tiny,fontWeight:700}}>✓</span>}
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
              {etapaPct===100?<span style={{color:"#F5EFE0",fontSize:".85rem"}}>✓</span>:<span style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,fontWeight:700,color:"#4A5E3A"}}>{etapaPct}%</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"1rem",color:"#1A1A14",lineHeight:1.2}}>{etapa.etapa}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                <div style={{flex:1,maxWidth:90,height:3,background:"rgba(74,94,58,.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${etapaPct}%`,background:etapaPct===100?"#4A5E3A":"rgba(201,169,110,.65)",borderRadius:3,transition:"width .3s"}}/>
                </div>
                <span style={{fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(26,26,20,.4)"}}>{etapaDone}/{etapaTotal}</span>
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
                      {done&&<span style={{color:"#F5EFE0",fontSize:THEME.text.tiny,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <span style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:done?"rgba(26,26,20,.3)":"rgba(26,26,20,.75)",textDecoration:done?"line-through":"none",lineHeight:1.5}}>{item}</span>
                      {notas[`${ei}_${ii}`]&&<div style={{fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(74,94,58,.6)",fontStyle:"italic",marginTop:3}}>📝 {notas[`${ei}_${ii}`]}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center",flexWrap:"wrap"}}>
                    {resp[`${ei}_${ii}`]&&<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".08em",padding:"2px 7px",borderRadius:100,background:"rgba(74,94,58,.08)",color:RESP_COLORS[resp[`${ei}_${ii}`]]||"rgba(26,26,20,.5)"}}>{resp[`${ei}_${ii}`]}</span>}
                    {(()=>{const b=badgeFecha(`${ei}_${ii}`);return b?<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".06em",padding:"2px 7px",borderRadius:100,background:b.bg,color:b.color,border:`0.5px solid ${b.border}`,whiteSpace:"nowrap"}}>📅 {b.label}</span>:null;})()}
                    {getVendorLabel(`${ei}_${ii}`)&&<span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".06em",padding:"2px 7px",borderRadius:100,background:"rgba(74,94,58,.07)",color:"rgba(74,94,58,.65)",border:"0.5px solid rgba(74,94,58,.2)",whiteSpace:"nowrap"}}>🏢 {getVendorLabel(`${ei}_${ii}`)}</span>}
                    <button onClick={()=>setExpandKey(expandKey===`${ei}_${ii}`?null:`${ei}_${ii}`)} style={{background:"transparent",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:100,padding:"2px 8px",fontFamily:"'Lora',serif",fontSize:THEME.text.label,color:"rgba(74,94,58,.5)",cursor:"pointer"}}>+</button>
                  </div>
                </div>
                {expandKey===`${ei}_${ii}`&&<div style={{display:"flex",gap:6,paddingLeft:0,width:"100%",flexWrap:"wrap",alignItems:"flex-start",marginTop:6}}>
                  <select name="app-field-13751" value={resp[`${ei}_${ii}`]||""} onChange={e=>setResponsable(`${ei}_${ii}`,e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
                    <option value="">Sin responsable</option>
                    {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <input name="app-field-13755" type="text" value={notas[`${ei}_${ii}`]||""} onChange={e=>setNota(`${ei}_${ii}`,e.target.value)} placeholder="Nota (proveedor, recordatorio...)" style={{flex:1,minWidth:120,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"4px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Límite:</span>
                    <input name="app-field-13758" type="date" value={getFecha(`${ei}_${ii}`)} onChange={e=>setFecha(`${ei}_${ii}`,e.target.value)}
                      style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14",width:"min(130px,100%)",boxSizing:"border-box"}}/>
                    {getFecha(`${ei}_${ii}`)&&<button onClick={()=>setFecha(`${ei}_${ii}`,"")} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",cursor:"pointer",fontSize:".9rem",padding:"0 2px",lineHeight:1}}>×</button>}
                  </div>
                  {vendors4Chk.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Proveedor:</span>
                    <select name="app-field-13764" value={getVendorId(`${ei}_${ii}`)} onChange={e=>setVendorId(`${ei}_${ii}`,e.target.value)}
                      style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14",maxWidth:140}}>
                      <option value="">Ninguno</option>
                      {vendors4Chk.map(v=><option key={v.id} value={v.id}>{v.nombre||"Sin nombre"}</option>)}
                    </select>
                  </div>}
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
                    {item.completada&&<span style={{color:"#1A1A14",fontSize:THEME.text.tiny,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:item.completada?"rgba(26,26,20,.3)":"rgba(26,26,20,.75)",textDecoration:item.completada?"line-through":"none",lineHeight:1.5}}>
                    {item.texto} <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".08em",color:"rgba(201,169,110,.6)",marginLeft:4}}>personalizada</span>
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
      <BackToHome onBack={onBack}/>
    </div>
  </div>;
}


// ─── PWA INSTALL PROMPT ──────────────────────────────────────────────────────
function InstallPrompt(){
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(()=>{
    if(window.matchMedia('(display-mode: standalone)').matches) return;
    if(localStorage.getItem('pwa_dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', ()=>setInstalado(true));

    const timer = setTimeout(()=>setShow(true), 5000);
    return()=>{ clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
  },[]);

  const instalar = async()=>{
    if(deferredPrompt){
      try{
        await deferredPrompt.prompt();
        const {outcome} = await deferredPrompt.userChoice;
        if(outcome==='accepted'){ setShow(false); return; }
      }catch(e){}
      setDeferredPrompt(null);
    }
    // Si no hay prompt nativo, mostrar instrucciones manuales Android
    setDeferredPrompt(null);
  };

  const rechazar = ()=>{
    localStorage.setItem('pwa_dismissed','1');
    setShow(false);
  };

  if(!show || instalado) return null;

  // Instrucciones según plataforma
  const esAndroid = !isIOS;
  const tienePromptNativo = !!deferredPrompt;

  return <div style={{
    position:"fixed",bottom:"max(84px,calc(84px + env(safe-area-inset-bottom)))",
    left:16,right:16,zIndex:200,
    background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.4)",
    borderRadius:18,padding:"18px 20px",
    boxShadow:"0 8px 32px rgba(26,20,14,.2)",
    animation:"fadeUp .4s ease both"
  }}>
    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
      <div style={{fontSize:"1.8rem",flexShrink:0}}>💍</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:600,color:"#1A1A14",marginBottom:6}}>
          Instalá la app en tu celular
        </div>
        {isIOS
          ? <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,marginBottom:12}}>
              Tocá el botón <strong>Compartir</strong> <span style={{fontSize:"1rem"}}>⎋</span> en la barra de Safari → <strong>"Agregar a pantalla de inicio"</strong>
            </div>
          : tienePromptNativo
            ? <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,marginBottom:12}}>
                Accedé a tu planificación directamente desde la pantalla de inicio, sin abrir el browser.
              </div>
            : <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.55)",lineHeight:1.6,marginBottom:12}}>
                Tocá los <strong>3 puntos</strong> ⋮ del navegador → <strong>"Agregar a pantalla de inicio"</strong> o <strong>"Instalar app"</strong>
              </div>
        }
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {!isIOS && tienePromptNativo && <button onClick={instalar} style={{
            background:"#4A5E3A",color:"#F5EFE0",border:"none",
            borderRadius:100,padding:"9px 20px",
            fontFamily:"'Lora',serif",fontWeight:700,fontSize:".88rem",cursor:"pointer"
          }}>📲 Instalar</button>}
          <button onClick={rechazar} style={{
            background:"transparent",color:"rgba(26,26,20,.45)",
            border:"1px solid rgba(26,26,20,.15)",
            borderRadius:100,padding:"9px 16px",
            fontFamily:"'Lora',serif",fontSize:".85rem",cursor:"pointer"
          }}>Ahora no</button>
        </div>
      </div>
      <button onClick={rechazar} style={{
        background:"transparent",border:"none",
        color:"rgba(26,26,20,.3)",fontSize:"1.3rem",
        cursor:"pointer",padding:"0 0 0 4px",flexShrink:0,lineHeight:1
      }}>×</button>
    </div>
  </div>;
}

// ─── BOTÓN VOLVER AL MENÚ PRINCIPAL ──────────────────────────────────────────
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


function FreeStartChoice({onGuided,onExplore,onLogin,onExit}){
  return <div className="home-floral-bg" style={{minHeight:"100svh",padding:"clamp(18px,4vw,48px)",display:"grid",placeItems:"center"}}>
    <div className="fu" style={{width:"100%",maxWidth:820,background:"rgba(251,247,239,.97)",border:"0.5px solid rgba(201,169,110,.36)",borderRadius:26,padding:"clamp(24px,5vw,46px)",boxShadow:"0 24px 70px rgba(49,39,25,.15)"}}>
      <div className="brand-logo" style={{textAlign:"center",marginBottom:10}}>Tu Boda Organizada</div>
      <h1 className="brand-title" style={{textAlign:"center",fontSize:"clamp(2rem,6vw,3.3rem)",lineHeight:1.08,margin:"0 0 10px"}}>¿Cómo querés empezar?</h1>
      <p className="brand-copy" style={{textAlign:"center",fontSize:"clamp(.98rem,2.5vw,1.12rem)",maxWidth:610,margin:"0 auto 28px"}}>No hay una única forma correcta. Podés explorar libremente o dejar que el sistema te recomiende por dónde avanzar.</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))",gap:14,marginBottom:22}}>
        <button type="button" onClick={()=>{trackProductEvent("free_start_selected",{mode:"guided"});onGuided();}} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:22,padding:"clamp(22px,4vw,30px)",textAlign:"left",cursor:"pointer",boxShadow:"0 12px 28px rgba(74,94,58,.18)"}}>
          <div style={{fontSize:"2rem",marginBottom:11}}>🧭</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".13em",textTransform:"uppercase",color:"#D9B86F",marginBottom:8}}>Opción guiada</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.45rem",margin:"0 0 8px"}}>Ayudame a saber por dónde empezar</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",lineHeight:1.55,color:"rgba(245,239,224,.72)",margin:"0 0 15px"}}>Respondé dos preguntas sobre tu etapa y tu principal preocupación. Recibís un próximo paso concreto.</p>
          <span style={{fontFamily:"'Lora',serif",fontWeight:800,color:"#D9B86F"}}>Empezar el recorrido →</span>
        </button>

        <button type="button" onClick={()=>{trackProductEvent("free_start_selected",{mode:"all_modules"});onExplore();}} style={{background:"#FBF7EF",color:"#1A1A14",border:"1px solid rgba(74,94,58,.32)",borderRadius:22,padding:"clamp(22px,4vw,30px)",textAlign:"left",cursor:"pointer",boxShadow:"0 10px 25px rgba(49,39,25,.08)"}}>
          <div style={{fontSize:"2rem",marginBottom:11}}>▦</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".13em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:8}}>Exploración libre</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.45rem",margin:"0 0 8px"}}>Quiero ver todos los módulos</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",lineHeight:1.55,color:"rgba(26,26,20,.58)",margin:"0 0 15px"}}>Entrá directamente a presupuesto, invitados, salón, proveedores, cronograma, checklist y música.</p>
          <span style={{fontFamily:"'Lora',serif",fontWeight:800,color:"#4A5E3A"}}>Ver todos los módulos →</span>
        </button>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",paddingTop:17,borderTop:"0.5px solid rgba(201,169,110,.18)"}}>
        <button className="gbtn" onClick={onLogin}>Ya compré / iniciar sesión</button>
        <button onClick={onExit} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:"rgba(26,26,20,.48)",textDecoration:"underline",cursor:"pointer",padding:"10px"}}>Volver</button>
      </div>
    </div>
  </div>;
}

function ToolsHub({user,hasResults,isDemo=false,onGoModule,onViewResults,onStartNew,onOpenStart,onRequestPurchase}){
  const groups = [
    {title:"Ordenar la planificación",copy:"Las bases para tomar decisiones con claridad.",items:[
      {id:"checklist-boda",icon:"plan",label:"Plan y checklist",desc:"Qué hacer, en qué orden y qué falta."},
      {id:"budget",icon:"budget",label:"Presupuesto",desc:"Categorías, pagos y control del total."},
      {id:"vendors",icon:"vendors",label:"Proveedores",desc:"Propuestas, contactos y decisiones."}
    ]},
    {title:"Invitados y espacio",copy:"Todo lo que define cómo se vive y se organiza el evento.",items:[
      {id:"guests",icon:"guests",label:"Invitados",desc:"Lista, etiquetas, confirmaciones y grupos."},
      {id:"salon-design",icon:"salon",label:"Diseño del salón",desc:"Medidas, mesas, muebles y circulación."},
      {id:"timeline",icon:"timeline",label:"Cronograma",desc:"Secuencia y responsables del gran día."}
    ]},
    {title:"La experiencia de la boda",copy:"Decisiones que hacen que la celebración se sienta propia.",items:[
      {id:"guia",icon:"music",label:"Música",desc:hasResults?"Tu guion musical personalizado.":"Test y planificación musical."},
      {id:"guia-novios",icon:"guide",label:"Guía para novios",desc:"Protocolo, ceremonia y consejos prácticos."}
    ]}
  ];

  const open=(item)=>{
    trackProductEvent("module_opened",{module:item.id,is_demo:isDemo,source:"tools_hub_v10"});
    if(item.id==="guia") return hasResults?onViewResults():onStartNew();
    onGoModule(item.id);
  };

  return <div style={{minHeight:"100svh",background:"#F5EFE0",padding:"clamp(18px,4vw,44px) clamp(12px,4vw,38px) 112px"}}>
    <div className="fu" style={{maxWidth:980,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:16,marginBottom:18}}>
        <div style={{background:"#FFFDF8",border:"1px solid rgba(201,169,110,.24)",borderRadius:24,padding:"clamp(22px,5vw,36px)"}}>
          <div className="brand-logo" style={{marginBottom:9}}>Tu Boda Organizada</div>
          <h1 className="brand-title" style={{fontSize:"clamp(2rem,6vw,3.25rem)",margin:"0 0 8px"}}>Todas las herramientas</h1>
          <p className="brand-copy" style={{fontSize:".96rem",margin:"0 0 18px",maxWidth:650}}>Entrá directamente cuando ya sabés qué necesitás resolver. También podés volver al recorrido guiado para recibir una recomendación.</p>
          <button className="gbtn" onClick={onOpenStart} style={{display:"inline-flex",alignItems:"center",gap:9}}><ProductIcon name="compass" size={20}/> Ayudame a priorizar</button>
        </div>
      </div>

      {isDemo&&<div style={{background:"#FFFDF8",border:"1px solid rgba(74,94,58,.18)",borderRadius:16,padding:"13px 15px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:".84rem",lineHeight:1.5,color:"rgba(26,26,20,.66)"}}><strong style={{color:"#4A5E3A"}}>Prueba gratuita.</strong> Podés recorrer y cargar datos temporales. Se borran al recargar o salir.</div>
        <button className="lbtn" onClick={onRequestPurchase}>Guardar mi planificación</button>
      </div>}

      {groups.map(group=><section className="tools-v10-section" key={group.title}>
        <div style={{marginBottom:14}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,3vw,1.75rem)",margin:"0 0 4px"}}>{group.title}</h2>
          <p style={{fontFamily:"'Lora',serif",fontSize:".84rem",color:"rgba(26,26,20,.48)",margin:0}}>{group.copy}</p>
        </div>
        <div className="tools-v10-grid">
          {group.items.map(item=><button key={item.id} className="tools-v10-card module-card-v10" type="button" onClick={()=>open(item)}>
            <span className="product-icon-wrap"><ProductIcon name={item.icon} size={23}/></span>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"1.03rem",marginBottom:6}}>{item.label}</div>
            <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",lineHeight:1.48,color:"rgba(26,26,20,.5)"}}>{item.desc}</div>
          </button>)}
        </div>
      </section>)}
    </div>
  </div>;
}

function AccountScreen({user,isDemo=false,onLogin,onBuy,onLogout}){
  return <div style={{minHeight:"100svh",padding:"clamp(18px,4vw,48px) 16px 110px",display:"grid",placeItems:"start center"}}>
    <div className="fu home-content-card" style={{width:"100%",maxWidth:620,textAlign:"center"}}>
      <div className="brand-logo" style={{marginBottom:12}}>Mi cuenta</div>
      <div style={{fontSize:"2.2rem",marginBottom:10}}>{isDemo?"🌿":"✓"}</div>
      <h1 className="brand-title" style={{fontSize:"clamp(1.8rem,5vw,2.5rem)",margin:"0 0 10px"}}>{isDemo?"Estás explorando gratis":"Tu acceso está activo"}</h1>
      <p className="brand-copy" style={{fontSize:".98rem",margin:"0 0 22px"}}>{isDemo?"La prueba no requiere cuenta. Para guardar tu planificación, ingresá con el email usado en Hotmart.":`Sesión iniciada como ${user?.email||"usuario"}.`}</p>
      {isDemo?<>
        <button className="pbtn" onClick={onLogin} style={{width:"100%",marginBottom:10}}>Ya compré: iniciar sesión →</button>
        <button className="gbtn" onClick={onBuy} style={{width:"100%",marginBottom:10}}>Comprar acceso completo</button>
        <button onClick={onLogout} style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",color:"rgba(26,26,20,.5)",textDecoration:"underline",cursor:"pointer",padding:10}}>Salir de la prueba</button>
      </>:<button className="gbtn" onClick={onLogout} style={{width:"100%"}}>Cerrar sesión</button>}
    </div>
  </div>;
}

function ModuleContextBar({title,onBack,onHome}){
  return <div className="module-context-bar no-print">
    <div className="module-context-inner">
      <button type="button" className="module-context-btn" onClick={onBack}>← Módulos</button>
      <div className="module-context-title">{title}</div>
      <button type="button" className="module-context-btn" onClick={onHome} aria-label="Volver al inicio">Inicio</button>
    </div>
  </div>;
}

function DemoPurchaseBar({onBuy,withNav=true}){
  return <>
    <aside className={`demo-purchase-bar no-print ${withNav?"":"no-nav"}`} aria-label="Opciones de compra de la demo">
      <div className="demo-purchase-copy">
        <strong>Estás probando gratis</strong>
        <span>Comprá para guardar y descargar las plantillas en Excel.</span>
      </div>
      <button type="button" onClick={onBuy}>Comprar acceso</button>
    </aside>
    <div className={`demo-purchase-spacer ${withNav?"":"no-nav"}`} aria-hidden="true"/>
  </>;
}

// ─── GLOBAL NAV BAR ───────────────────────────────────────────────────────────
function GlobalNav({view, setView, hasResults, isDemo=false}){
  const items = [
    {id:"home",icon:"home",label:"Inicio",activeIds:["home"]},
    {id:"tools",icon:"grid",label:"Módulos",activeIds:["tools","budget","vendors","guests","salon-design","timeline","guia-novios"]},
    {id:"checklist-boda",icon:"plan",label:"Mi plan",activeIds:["checklist-boda"]},
    {id:hasResults?"results":"guia",icon:"music",label:"Música",activeIds:["guia","form","generating","results"]},
    {id:"account",icon:"account",label:"Cuenta",activeIds:["account"]}
  ];
  return <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"#FFFDF8",borderTop:"1px solid rgba(74,94,58,.12)",boxShadow:"0 -7px 22px rgba(63,50,31,.07)"}} className="no-print global-nav">
    <div style={{display:"flex",alignItems:"stretch",maxWidth:680,margin:"0 auto",paddingBottom:"max(5px,env(safe-area-inset-bottom))"}}>
      {items.map(item=>{const active=item.activeIds.includes(view);return <button key={item.label} onClick={()=>setView(item.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",padding:"9px 5px 7px",minHeight:THEME.tap.comfortable,flex:1,borderTop:active?"2.5px solid #4A5E3A":"2.5px solid transparent",color:active?"#4A5E3A":"rgba(26,26,20,.46)"}}>
        <span className="nav-v10-icon"><ProductIcon name={item.icon} size={22} color="currentColor" strokeWidth={active?2.1:1.7}/></span>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".04em",textTransform:"uppercase",color:"currentColor",fontWeight:active?700:500,whiteSpace:"nowrap",marginTop:3,lineHeight:1}}>{item.label}</span>
      </button>;})}
    </div>
  </nav>;
}

const RESTORABLE_APP_VIEWS = new Set([
  "home","tools","budget","vendors","guests","salon-design","timeline",
  "checklist-boda","guia-novios","results","guia","form","start"
]);
const getSavedAppView = (userId, hasResults=false) => {
  if(typeof window==="undefined"||!userId) return null;
  try{
    const saved=localStorage.getItem(`ceci_last_app_view:${userId}`);
    if(!RESTORABLE_APP_VIEWS.has(saved)) return null;
    if(saved==="results"&&!hasResults) return "home";
    return saved;
  }catch(error){
    return null;
  }
};

const getInitialPublicView=()=>{
  if(typeof window==="undefined") return "landing";
  const params=new URLSearchParams(window.location.search||"");
  return params.get("modo")==="ingresar" || params.get("modo")==="activar" || params.get("auth")==="recovery" ? "auth" : "landing";
};

const getInitialAuthMode=()=>{
  if(typeof window==="undefined") return "login";
  return new URLSearchParams(window.location.search||"").get("modo")==="activar" ? "signup" : "login";
};

export default function App(){
  const [view,setView]=useState(getInitialPublicView);
  const [step,setStep]=useState(()=>{
    try{ const s=localStorage.getItem("bsb_step"); return s?parseInt(s):1; }catch(e){ return 1; }
  });
  const [phase,setPhase]=useState(0);
  const [form,setForm]=useState(()=>{
    try{ const s=localStorage.getItem("bsb_form"); return s?{...EMPTY_FORM,...JSON.parse(s)}:{...EMPTY_FORM}; }catch(e){ return {...EMPTY_FORM}; }
  });
  const [results,setResults]=useState(null);
  const [checked,setChecked]=useState({});
  const [error,setError]=useState(null);
  const [arquetipo,setArquetipo]=useState(null);
  const [resultToken,setResultToken]=useState(null);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [authNotice,setAuthNotice]=useState("");
  const [accessStatus,setAccessStatus]=useState("idle");
  const [purchaseOpen,setPurchaseOpen]=useState(false);
  const [demoChanged,setDemoChanged]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false);
  const [fullGuideWelcomeOpen,setFullGuideWelcomeOpen]=useState(false);
  const [authInitialMode,setAuthInitialMode]=useState(getInitialAuthMode);


  // Las pantallas operativas usan un fondo limpio para priorizar lectura y concentración.
  useEffect(()=>{
    if(typeof document==="undefined") return;
    const editorialViews = new Set(["landing","auth","free-choice","start","form","generating","guia"]);
    const operational = !editorialViews.has(view);
    if(operational){
      document.documentElement.style.backgroundImage = "none";
      document.documentElement.style.backgroundColor = "#F5EFE0";
      document.body.style.backgroundColor = "#F5EFE0";
    }else{
      document.documentElement.style.removeProperty("background-image");
      document.documentElement.style.removeProperty("background-color");
      document.body.style.removeProperty("background-color");
    }
  },[view]);

  // El test demo puede recuperarse tras la compra.
  // Los demás módulos funcionan solo en memoria durante la sesión: no llegan a Supabase
  // y no se conservan al recargar o salir.
  useEffect(()=>{
    try{
      if(isDemoUser(user)) localStorage.setItem(DEMO_TEST_FORM_KEY, JSON.stringify(form));
      else localStorage.setItem("bsb_form", JSON.stringify(form));
    }catch(e){}
  },[form,user]);
  useEffect(()=>{
    try{
      if(isDemoUser(user)) localStorage.setItem(DEMO_TEST_STEP_KEY, String(step));
      else localStorage.setItem("bsb_step", String(step));
    }catch(e){}
  },[step,user]);

  // Cada pantalla y cada paso empiezan desde arriba. Evita entrar a un módulo
  // conservando la posición de scroll de la pantalla anterior.
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
    return()=>cancelAnimationFrame(frame);
  },[view,step]);


  useEffect(()=>{
    const onDemoSaveAttempt=()=>{
      setDemoChanged(true);
      setPurchaseOpen(true);
    };
    const onDemoChange=()=>setDemoChanged(true);
    window.addEventListener("ceci-demo-save-attempt",onDemoSaveAttempt);
    window.addEventListener("ceci-demo-change",onDemoChange);
    return()=>{
      window.removeEventListener("ceci-demo-save-attempt",onDemoSaveAttempt);
      window.removeEventListener("ceci-demo-change",onDemoChange);
    };
  },[]);

  // En demo se puede editar y navegar libremente. Las acciones que implican
  // conservar o sacar información del producto llevan al checkout.
  useEffect(()=>{
    if(!isDemoUser(user)) return;
    const normalize=(value)=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
    const onDemoAction=(event)=>{
      const control=event.target?.closest?.("button, a, label");
      if(!control || control.closest?.('[data-purchase-gate="true"]')) return;
      const text=normalize(control.innerText || control.textContent || control.getAttribute?.("aria-label"));
      if(!text) return;

      const isSave=/\b(guardar|publicar)\b/.test(text) && !/\bguardarropa\b/.test(text);
      const isExport=/\b(exportar|descargar|imprimir|importar|compartir|pdf)\b/.test(text);
      if(!isSave && !isExport) return;

      setDemoChanged(true);
      if(isExport){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setPurchaseOpen(true);
        return;
      }

      // Guardar/publicar conserva el cambio solo en memoria para que la demo
      // se sienta real, pero muestra inmediatamente que no quedará persistido.
      setTimeout(()=>setPurchaseOpen(true),0);
    };
    document.addEventListener("click",onDemoAction,true);
    return()=>document.removeEventListener("click",onDemoAction,true);
  },[user?.id]);

  // ─── Auth de Supabase ─────────────────────────────────────────────────────
  useEffect(()=>{
    if(!supabase){ setAuthLoading(false); return; }

    const readAuthUrl = () => {
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search || "");

      const hasAuthError = hash.get("error") || query.get("error");
      const errorCode = hash.get("error_code") || query.get("error_code");
      const errorDescription = hash.get("error_description") || query.get("error_description");

      if(hasAuthError){
        const expired = errorCode === "otp_expired" || String(errorDescription || "").toLowerCase().includes("expired");
        setAuthNotice(expired
          ? "El link de recuperación venció o ya fue usado. Pedí un nuevo email desde Olvidé mi contraseña."
          : "El link de acceso no es válido. Pedí uno nuevo desde Olvidé mi contraseña."
        );
        setRecoveryMode(false);
        setView("auth");
        try { supabase.auth.signOut(); } catch(e) {}
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
        return;
      }

      const isRecovery = query.get("auth") === "recovery" || hash.get("type") === "recovery";
      if(isRecovery){
        setRecoveryMode(true);
        setAuthNotice("");
        setView("auth");
      }
    };

    readAuthUrl();

    supabase.auth.getSession().then(({ data })=>{
      const realUser=data.session?.user || null;
      if(realUser) setUser(realUser);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session)=>{
      if(event === "PASSWORD_RECOVERY"){
        setRecoveryMode(true);
        setAuthNotice("");
        setView("auth");
      }
      if(session?.user){
        // Supabase puede emitir SIGNED_IN otra vez al volver a una pestaña.
        // No reiniciamos la hidratación porque eso sacaba a la usuaria del módulo activo.
        setUser(session.user);
      } else setUser(current=>isDemoUser(current)?current:null);
      setAuthLoading(false);
    });

    return()=>subscription.unsubscribe();
  },[]);

  // ─── Verificar compra / acceso ─────────────────────────────────────────────
  useEffect(()=>{
    if(!user){ setAccessStatus("idle"); return; }
    if(isDemoUser(user)){ setAccessStatus("demo"); return; }
    let alive=true;
    (async()=>{
      setAccessStatus("checking");
      try{
        const {data:{session}}=await supabase.auth.getSession();
        const token=session?.access_token;
        if(!token) throw new Error("Sesión inválida");
        const response=await fetch("/api/access",{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();
        if(!alive) return;
        const granted=response.ok&&payload?.has_access;
        if(granted){
          // Recupera únicamente las respuestas del test hechas antes de comprar.
          // Los módulos premium nunca se guardan ni se ejecutan en modo demo.
          try{
            const purchaseEmail=(localStorage.getItem("ceci_purchase_email")||"").toLowerCase();
            const sameBuyer=!purchaseEmail||purchaseEmail===(user.email||"").toLowerCase();
            const savedForm=JSON.parse(localStorage.getItem(DEMO_TEST_FORM_KEY)||"null");
            const savedStep=parseInt(localStorage.getItem(DEMO_TEST_STEP_KEY)||"1",10);
            if(sameBuyer&&savedForm){
              setForm({...EMPTY_FORM,...savedForm,email:user.email||savedForm.email||""});
              setStep(Number.isFinite(savedStep)?Math.max(1,Math.min(6,savedStep)):1);
            }
            localStorage.removeItem(DEMO_WEDDING_KEY);
          }catch(e){ console.warn("No se pudieron recuperar las respuestas del test demo:",e); }
        }
        setAccessStatus(granted?"granted":"denied");
      }catch(e){ if(alive) setAccessStatus("denied"); }
    })();
    return()=>{alive=false;};
  },[user?.id]);


  // Muestra una bienvenida con la guía completa la primera vez que una compra
  // validada ingresa en este dispositivo. La guía queda disponible después
  // de forma permanente dentro de “Guía para novios”.
  useEffect(()=>{
    if(!user || isDemoUser(user) || accessStatus!=="granted"){
      setFullGuideWelcomeOpen(false);
      return;
    }
    const storageKey=`${FULL_GUIDE_WELCOME_KEY}:${user.id}`;
    try{
      if(localStorage.getItem(storageKey)!=="1") setFullGuideWelcomeOpen(true);
    }catch(e){ setFullGuideWelcomeOpen(true); }
  },[user?.id,accessStatus]);

  // ─── Cargar resultado del usuario cuando inicia sesión ────────────────────
  const hydrateFromSession = (remote, email, tokenFromUrl=null, goToResults=false) => {
    const safeForm = {...EMPTY_FORM, ...(remote.form || {}), email: remote.email || email || remote.form?.email || ""};
    setResults(remote.results);
    setForm(safeForm);
    setArquetipo(remote.arquetipo || null);
    setChecked(remote.checked || {});
    setResultToken(remote.result_token || tokenFromUrl || null);
    const savedView=getSavedAppView(user?.id,!!remote.results);
    setView(goToResults ? "results" : (savedView||"home"));

    try{
      localStorage.setItem("bsb_session", JSON.stringify({
        results: remote.results,
        form: safeForm,
        arquetipo: remote.arquetipo,
        checked: remote.checked || {},
        result_token: remote.result_token || tokenFromUrl || null,
        user_id: user?.id
      }));
    }catch(e){}

    if(remote.result_token){
      const newUrl = `${window.location.origin}${window.location.pathname}?r=${remote.result_token}`;
      window.history.replaceState({}, "", newUrl);
    }
  };

  useEffect(()=>{
    const loadUserSession = async()=>{
      if(authLoading) return;
      if(recoveryMode){
        setView("auth");
        return;
      }
      if(!user){
        setView(current=>(current==="auth"||current==="landing")?current:"landing");
        return;
      }
      if(isDemoUser(user)){
        setView(current=>current==="entry"||current==="auth"?"home":current);
        return;
      }
      if(accessStatus==="idle"||accessStatus==="checking") return;
      if(accessStatus!=="granted"){
        setView("locked");
        return;
      }
      // Already hydrated — don't interrupt current navigation (e.g. tab switching)
      if(hasHydrated.current) return;
      hasHydrated.current = true;

      const email = user.email || "";
      setForm(f=>({...f,email}));

      try{
        const params = new URLSearchParams(window.location.search);
        const token = params.get("r");
        let remote = null;

        // 1) Si el link trae result_token, intentamos cargar ese resultado.
        if(token){
          const byToken = await cargarSesionPorToken(token);
          // Solo usar si el token pertenece al usuario actual
          if(byToken && byToken.user_id === user.id){
            remote = byToken;
          }
          // Si el token pertenece a otra persona, limpiar la URL y no cargar esa sesión
          if(byToken && byToken.user_id !== user.id){
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        // 2) Si no hay token o no encontró nada, cargamos el último resultado del usuario.
        if(!remote){
          remote = await cargarSesionPorUsuario(user.id);
        }

        // 3) Fallback por email: útil si quedó una fila vieja o migrada.
        if(!remote && email){
          const byEmail = await cargarSesion(email);
          // Solo usar si coincide con el usuario actual
          if(byEmail && byEmail.user_id === user.id) remote = byEmail;
        }

        if(remote?.results){
          hydrateFromSession(remote, email, token, !!token);
          return;
        }

        // 4) Fallback local. Solo se usa si pertenece al mismo usuario o mismo email.
        try{
          const saved = localStorage.getItem("bsb_session");
          if(saved){
            const s = JSON.parse(saved);
            const sameUser = s.user_id && s.user_id === user.id;
            const sameEmail = s.form?.email && email && s.form.email.toLowerCase() === email.toLowerCase();
            if(s.results && (sameUser || sameEmail)){
              setResults(s.results);
              setForm({...EMPTY_FORM, ...s.form, email});
              setArquetipo(s.arquetipo || null);
              setChecked(s.checked || {});
              setResultToken(s.result_token || null);
              setView(getSavedAppView(user.id,true)||"home");
              return;
            }
          }
        }catch(e){}

        // Si no existe resultado, limpiamos la URL y mostramos tablero limpio
        window.history.replaceState({}, "", window.location.pathname);
        setResults(null);
        setView(getSavedAppView(user.id,false)||"home");
      }catch(e){
        console.error("Error cargando sesión del usuario:", e);
        setView("home");
      }
    };
    loadUserSession();
  },[user,authLoading,recoveryMode,accessStatus]);

  // ─── Guardar cuando hay resultados ────────────────────────────────────────
  useEffect(()=>{
    if(!results || !form.email || !user?.id) return;
    const token = resultToken || generarToken();
    if(!resultToken) setResultToken(token);

    try{
      localStorage.setItem("bsb_session", JSON.stringify({results,form,arquetipo,checked,result_token:token,user_id:user.id}));
    }catch(e){}

    guardarSesion({
      user_id: user.id,
      email: form.email,
      nombre1: form.nombre1,
      nombre2: form.nombre2,
      fechaBoda: form.fechaBoda,
      ciudad: form.ciudad,
      form,
      results,
      arquetipo,
      checked,
      result_token: token
    });
  },[results,resultToken,user?.id]);

  // ─── Sincronizar checklist en Supabase ────────────────────────────────────
  const checkedTimer = useRef(null);
  const hasHydrated = useRef(false);

  useEffect(()=>{
    if(!user?.id || isDemoUser(user) || accessStatus!=="granted") return;
    if(!RESTORABLE_APP_VIEWS.has(view)) return;
    try{
      localStorage.setItem(`ceci_last_app_view:${user.id}`,view);
    }catch(error){}
  },[view,user?.id,accessStatus]);

  const syncChecked = (newChecked) => {
    if(!user?.id) return;
    clearTimeout(checkedTimer.current);
    checkedTimer.current = setTimeout(()=>{
      try{ localStorage.setItem("bsb_session", JSON.stringify({results,form,arquetipo,checked:newChecked,result_token:resultToken,user_id:user.id})); }catch(e){}
      actualizarChecked({ user_id:user.id, email:form.email, checked:newChecked });
    }, 800);
  };

  const logout = async()=>{
    hasHydrated.current = false;
    if(isDemoUser(user)){
      setUser(null);
      setAccessStatus("idle");
      setDemoChanged(false);
      setView("landing");
      return;
    }
    try{localStorage.removeItem("bsb_session");}catch(e){}
    await supabase.auth.signOut();
    window.history.replaceState({}, "", window.location.pathname);
    setUser(null);
    setAccessStatus("idle");
    setView("landing");
    setStep(1);
    setResults(null);
    setChecked({});
    setForm({...EMPTY_FORM});
    setArquetipo(null);
    setResultToken(null);
  };

  const generate=async()=>{
    if(isDemoUser(user)){
      setPurchaseOpen(true);
      return;
    }
    if(!user?.id){
      setView("auth");
      return;
    }

    const formWithEmail = {...form,email:user.email || form.email};
    setForm(formWithEmail);
    setView("generating");setPhase(0);setError(null);
    const arch=calcularArquetipo(formWithEmail);
    setArquetipo(arch);
    const archData=ARQUETIPOS[arch];

    const isCatolica=(formWithEmail.tipoCeremonia.includes("Religiosa")&&formWithEmail.denominacionReligiosa==="Católica")||formWithEmail.tipoCeremonia.includes("Religiosa católica");
    const momentosBase=isCatolica?MOMENTOS_CATOLICA:MOMENTOS_CIVIL_SIMBOLICA;
    const momentosStr=formWithEmail.momentosSeleccionados.map(id=>{
      const m=momentosBase.find(x=>x.id===id);
      return m?`${m.nombre}${m.obligatorio?" (litúrgico-obligatorio)":""}`:id;
    }).join(", ");

    // Build detailed context
    const generos = formWithEmail.generos.join(", ") || "variado";
    const tieneCancionPersonal = formWithEmail.cancionPersonal && formWithEmail.cancionPersonal.trim().length > 2;
    const tieneArtistas = formWithEmail.artistas && formWithEmail.artistas.trim().length > 2;
    const tieneProhibidas = formWithEmail.cancionesProhibidas && formWithEmail.cancionesProhibidas.trim().length > 2;

    // Idioma: regla estricta cuando la pareja eligió un idioma específico (no "Mezcla" ni "No importa")
    const idiomaEstrictoMap = { "Castellano": "español/castellano", "Inglés": "inglés" };
    const idiomaEstricto = idiomaEstrictoMap[formWithEmail.idioma] || null;
    const idiomaInstruccion = idiomaEstricto
      ? `REGLA IDIOMA: la pareja eligió canciones en ${idiomaEstricto} ÚNICAMENTE. TODAS las canciones del guion y las playlists deben tener letra en ${idiomaEstricto} (las instrumentales sin letra están exentas de esta regla). No mezcles idiomas salvo que sea instrumental.`
      : formWithEmail.idioma === "Mezcla"
        ? "REGLA IDIOMA: la pareja quiere una mezcla de español e inglés — combiná ambos idiomas de forma equilibrada a lo largo del guion."
        : "";

    // Formato musical: traducir el formato elegido a instrucción concreta de versión instrumental
    const formatoInstruccionMap = {
      "Violín en vivo": "Para los momentos de ceremonia, la versión debe ser ejecutable por UN violín solo (instrumental violín solo, o violín con backing track). El campo 'artista' DEBE ser un artista o canal REAL conocido por hacer covers instrumentales en violín de canciones populares (ej: 'The Piano Guys', 'Lindsey Stirling', 'Violin Joe', 'cover violín' del artista original) — NO inventes una versión genérica que no existe. Si no conocés un cover real específico, usa el formato '[Canción] - Instrumental violín (cover)' y aclaralo en 'razon'. No sugieras versiones de banda completa.",
      "Cuarteto cuerdas": "Para los momentos de ceremonia, la versión debe ser para CUARTETO DE CUERDAS (2 violines, viola, violonchelo) — instrumental, sin batería ni vientos. El campo 'artista' DEBE ser un artista o canal REAL conocido por covers de cuarteto de cuerdas (ej: 'Vitamin String Quartet', 'The String Tribute Players', 'Adagio Strings') — NO inventes una versión que no existe. Si no conocés un cover real específico de esa canción exacta, decilo en 'razon' y sugerí buscar 'string quartet cover' de ese tema.",
      "Piano": "Para los momentos de ceremonia, la versión debe ser ejecutable por PIANO SOLO — instrumental. El campo 'artista' debe ser un artista/canal real de covers en piano (ej: 'The Piano Guys', 'Costantino Carrara') si existe, o aclarar en 'razon' que es una versión piano cover genérica.",
      "Banda": "Para los momentos de ceremonia, la versión puede ser interpretada por una banda en vivo completa (voz + instrumentos).",
      "Cantante": "Para los momentos de ceremonia, la versión debe contemplar un CANTANTE en vivo (con pista o acompañamiento mínimo).",
      "DJ": "Para los momentos de ceremonia, la versión es la grabación original o un edit de DJ — no requiere instrumento en vivo.",
      "Solo grabada": "Todas las versiones deben ser la grabación original o un edit — no hay músicos en vivo disponibles."
    };
    const formatosElegidos = (formWithEmail.formatoMusical || []).filter(f => formatoInstruccionMap[f]);
    const formatoInstruccion = formatosElegidos.length > 0
      ? "REGLA FORMATO INSTRUMENTAL: " + formatosElegidos.map(f => formatoInstruccionMap[f]).join(" ")
      : "";

    // Géneros explícitamente excluidos — nunca recomendar salvo que la pareja los haya pedido explícitamente
    const generosExcluidos = ["vallenato", "cumbia"];
    const textoLibreGeneros = `${formWithEmail.artistas||""} ${formWithEmail.generos.join(" ")}`.toLowerCase();
    const pidieronExplicitamente = generosExcluidos.some(ex => textoLibreGeneros.includes(ex));
    const generosExcluidosTexto = pidieronExplicitamente
      ? ""
      : `REGLA EXCLUSIÓN: NUNCA recomiendes vallenato ni cumbia en ningún momento (ceremonia, cóctel o cena), salvo que la pareja los haya mencionado explícitamente en artistas de referencia. Esto aplica incluso si el género elegido es Latina/Flamenco — eso NO incluye vallenato ni cumbia salvo pedido explícito.`;

    // Contenido lírico excluido — canciones de desamor/ruptura no tienen sentido en una boda
    const contenidoLiricoExcluido = `REGLA CONTENIDO LÍRICO (CRÍTICA, verificar SIEMPRE antes de responder): NUNCA recomiendes canciones cuya letra hable de desamor, ruptura, despecho, traición, infidelidad, celos, peleas de pareja, extrañar a un ex, o sufrimiento amoroso — sin importar cuán pegadiza, popular o "romántica de oído" suene la melodía. Muchos artistas populares en español tienen catálogos MIXTOS: canciones realmente sobre amor pleno y comprometido junto con otras sobre desamor/traición/despecho que suenan parecido musicalmente. Ejemplo de artistas con este patrón: Morat (tiene temas de amor genuino como "Yo Te Esperaré" o "Llueve", pero también temas de despecho/traición como "Cómo Te Atreves" o "Besos en Guerra" — hay que elegir SOLO de la primera categoría), Camilo, Sebastián Yatra, Reik. Para CUALQUIER canción en español que consideres, repasá mentalmente el tema real de la letra completa (no solo el estribillo o el tono de la melodía) antes de incluirla. Si tenés dudas sobre el contenido exacto de la letra, elegí una alternativa más segura y reconocida explícitamente como canción de amor comprometido/boda (ej: "Eres Tú" de Yarey, "Color Esperanza", "Y Te Vas", "Llueve" de Morat, "Tu Foto" de Ozuna, baladas clásicas de bodas). Esta regla aplica a TODOS los momentos: ceremonia, cóctel y cena.`;
    
    const ctx=`Pareja: ${formWithEmail.nombre1} y ${formWithEmail.nombre2}. Ciudad: ${formWithEmail.ciudad||"nd"}. Invitados: ${formWithEmail.invitados||"nd"}. Ceremonias: ${formWithEmail.tipoCeremonia.join(" + ")||"nd"}. Restricciones iglesia: ${formWithEmail.restriccionIglesia||"ninguna"}. Lugar ceremonia religiosa: ${formWithEmail.lugarCeremoniaReligiosa||"nd"}. Lugar ceremonia civil/otra: ${formWithEmail.lugarCeremonia||"nd"}. Duración: ${formWithEmail.duracion||"nd"}. Formato musical: ${formWithEmail.formatoMusical.join(", ")||"nd"}. Arquetipo: ${archData.n}. Objetivo emocional: ${formWithEmail.objetivoEmocional||"nd"}. GÉNEROS OBLIGATORIOS (todas las canciones DEBEN ser de estos géneros o muy cercanos): ${generos}. Artistas de referencia de estilo (las canciones deben sonar similares a estos artistas): ${formWithEmail.artistas||"ninguno indicado"}. CANCIONES PROHIBIDAS (no usar ninguna de estas ni versiones de ellas): ${formWithEmail.cancionesProhibidas||"ninguna"}. Idioma preferido para letras: ${formWithEmail.idioma||"cualquiera"}. Momentos a cubrir: ${momentosStr}. CANCIÓN PERSONAL DE LA PAREJA: ${formWithEmail.cancionPersonal||"no indicaron"}. Qué quieren que la gente recuerde musicalmente: ${formWithEmail.recuerdo||"nd"}.`;

    try{
      setPhase(0);
      const p1 = CECI_VOICE + "\nBODA: " + ctx + "\nSOLO JSON COMPACTO EN UNA LINEA sin saltos de linea. Strings sin comillas internas:\n{\"nota\":\"2 oraciones calidas de Ceci para esta pareja mencionando su arquetipo\",\"perfil\":{\"cluster\":\"estilo 3 palabras\",\"desc\":\"2 oraciones sobre universo musical\",\"concepto\":\"1 oracion sobre arco emocional\"}}";
      const r1 = await callAIWithRetry(p1, 1200);

      setPhase(1);
      const momentosListado = formWithEmail.momentosSeleccionados.map(id => {
        const m = momentosBase.find(x => x.id === id);
        if (!m) return null;
        const nombre = m.nombre + (m.obligatorio ? " (liturgico)" : "");
        const guia = CECI_MOMENTOS_GUIA[id];
        return guia ? (nombre + " => " + guia) : nombre;
      }).filter(Boolean).join(" | ");

      // Build per-moment seed pool based on selected moments
      const seedPool = formWithEmail.momentosSeleccionados
        .map(id => {
          const songs = CECI_SONG_POOL[id];
          return songs ? `${id}: ejemplos validados por Ceci → ${songs.join(", ")}` : null;
        }).filter(Boolean).join(" | ");

      const cancionPersonalInstruccion = tieneCancionPersonal
        ? `REGLA CANCION PERSONAL: La pareja indicó que su canción personal es "${formWithEmail.cancionPersonal}". DEBES incluirla en el momento "votos" o "primer_baile" si están seleccionados, o en el momento más íntimo disponible. Adaptá la versión al formato musical disponible.`
        : "";

      const prohibidasInstruccion = tieneProhibidas
        ? `REGLA PROHIBIDAS: Estas canciones NO pueden aparecer bajo ninguna forma ni versión: ${formWithEmail.cancionesProhibidas}. Verificá canción por canción antes de responder.`
        : "";

      const p2 = CECI_VOICE + "\nBODA: " + ctx + "\nArquetipo: " + archData.n + ". Estilo identificado: " + (r1.perfil?.cluster||"romantico") + "." +
        "\n\nREGLAS DE SELECCIÓN MUSICAL (cumplirlas en orden de prioridad):" +
        "\n1. GÉNEROS: todas las canciones deben ser de los géneros indicados en el contexto o muy cercanos. Si la pareja eligió Pop, no pongas ópera. Si eligió Disney, todas deben sonar a Disney/películas animadas." +
        "\n2. ARTISTAS REFERENCIA: el estilo sonoro debe ser consistente con los artistas mencionados como referencia." +
        "\n3. " + contenidoLiricoExcluido +
        (generosExcluidosTexto ? "\n4. " + generosExcluidosTexto : "") +
        (idiomaInstruccion ? "\n5. " + idiomaInstruccion : "") +
        (formatoInstruccion ? "\n6. " + formatoInstruccion : "") +
        (cancionPersonalInstruccion ? "\n7. " + cancionPersonalInstruccion : "") +
        (prohibidasInstruccion ? "\n8. " + prohibidasInstruccion : "") +
        "\n9. REGLA VERSIONES: NUNCA sugieras versiones remix, remixed, mashup, bootleg, ni edits de canciones. Usá siempre la versión ORIGINAL del artista, o una versión en piano/instrumental acústico si el formato lo requiere. Por ejemplo: Young and Beautiful de Lana Del Rey debe ser la versión original de la película El Gran Gatsby, o una versión en piano solo — NUNCA una versión remixada. Si una canción es conocida por sus remixes, especificá explícitamente en el campo version: Original o Piano solo." +
        "\n\nCRITERIO POR MOMENTO (función emocional + ejemplos validados de Ceci como punto de partida):\n" + momentosListado +
        "\n\nPOOL DE CANCIONES VALIDADAS POR CECI (usá estas como referencia, adaptando a los géneros de la pareja):\n" + seedPool +
        "\n\nDevuelve SOLO JSON COMPACTO EN UNA SOLA LINEA. Sin saltos de linea. Strings sin comillas internas:" +
        "\n{\"guion\":[{\"momento\":\"nombre\",\"icono\":\"emoji\",\"cancion\":\"titulo\",\"artista\":\"artista\",\"version\":\"Instrumental violin / Vocal original / etc\",\"duracion\":\"2:30\",\"razon\":\"por que esta cancion cumple la funcion emocional para ESTA pareja especificamente\",\"alt\":\"titulo alternativo - artista\"}]}" +
        "\nIncluye TODOS los momentos listados en el mismo orden. Para litúrgicos: solo música sacra aprobada.";
      const r2 = await callAIWithRetry(p2, 3000);

      setPhase(2);
      const coctelSeedStr = CECI_SONG_POOL.coctel.join(", ");
      const cenaSeedStr = CECI_SONG_POOL.cena.join(", ");

      const p3 = CECI_VOICE + "\nBODA: " + ctx + "\nArquetipo: " + archData.n + "." +
        "\n\nGÉNEROS OBLIGATORIOS: " + generos + ". Las playlists deben sonar a estos géneros, no a música de bodas genérica." +
        "\n" + contenidoLiricoExcluido +
        (generosExcluidosTexto ? "\n" + generosExcluidosTexto : "") +
        (idiomaInstruccion ? "\n" + idiomaInstruccion : "") +
        (prohibidasInstruccion ? "\n" + prohibidasInstruccion : "") +
        "\n\nCRITERIO CÓCTEL: " + CECI_COCTEL_GUIA + " Canciones de referencia de Ceci: " + coctelSeedStr +
        "\nCRITERIO CENA: " + CECI_CENA_GUIA + " Canciones de referencia de Ceci: " + cenaSeedStr +
        "\nREGLA DE PROGRESIÓN EN CENA (MUY IMPORTANTE): el array 'cena' debe estar ORDENADO de forma progresiva — las primeras canciones (posiciones 1-2) deben ser las MÁS TRANQUILAS y suaves (volumen bajo, ideal para conversar), las del medio (posiciones 3-4) deben subir levemente la energía, y las últimas (posiciones 5-6) deben tener más ritmo y movimiento, sirviendo de puente para abrir la pista de baile al terminar la cena. Es una transición gradual de lento a movido, nunca un salto abrupto." +
        "\n\nDevuelve SOLO JSON COMPACTO EN UNA LINEA. Sin saltos de linea. Strings sin comillas internas:" +
        "\n{\"coctel\":[{\"c\":\"cancion\",\"a\":\"artista\",\"d\":\"3:30\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"cena\":[{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"checklist\":{\"dj\":[\"tarea especifica 1\",\"tarea 2\",\"tarea 3\"],\"musicos\":[\"tarea 1\",\"tarea 2\"],\"planner\":[\"tarea 1\",\"tarea 2\"],\"pareja\":[\"consejo 1\",\"consejo 2\",\"consejo 3\"]},\"errores\":[\"error comun 1 con solucion concreta\",\"error 2\",\"error 3\"]}";
      const r3 = await callAIWithRetry(p3, 2500);

      const finalResults = {nota:r1.nota,perfil:r1.perfil,...r2,...r3};
      const token = resultToken || generarToken();
      setResultToken(token);
      setResults(finalResults);

      try{
        localStorage.setItem("bsb_session", JSON.stringify({
          results: finalResults,
          form: formWithEmail,
          arquetipo: arch,
          checked,
          result_token: token,
          user_id: user.id
        }));
        const newUrl = `${window.location.origin}${window.location.pathname}?r=${token}`;
        window.history.replaceState({}, "", newUrl);
      }catch(e){}

      await guardarSesion({
        user_id: user.id,
        email: formWithEmail.email,
        nombre1: formWithEmail.nombre1,
        nombre2: formWithEmail.nombre2,
        fechaBoda: formWithEmail.fechaBoda,
        ciudad: formWithEmail.ciudad,
        form: formWithEmail,
        results: finalResults,
        arquetipo: arch,
        checked,
        result_token: token
      });

      setView("results");
    }catch(e){
      console.error(e);
      setError(`${e.message}`);
      setView("form");setStep(6);
    }
  };

  const beginDemo=(targetView="free-choice",source="auth_free")=>{
    hasHydrated.current=true;
    demoWeddingMemory={};
    let savedForm=null;
    let savedStep=1;
    try{savedForm=JSON.parse(localStorage.getItem(DEMO_TEST_FORM_KEY)||"null");}catch(e){}
    try{savedStep=parseInt(localStorage.getItem(DEMO_TEST_STEP_KEY)||"1",10)||1;}catch(e){}
    try{localStorage.removeItem(DEMO_WEDDING_KEY);}catch(e){}
    try{localStorage.removeItem("bsb_session");}catch(e){}
    try{localStorage.removeItem("bsb_form");}catch(e){}
    try{localStorage.removeItem("bsb_step");}catch(e){}
    setUser(getDemoUser());
    setAccessStatus("demo");
    setDemoChanged(false);
    setResults(null);
    setStep(Math.max(1,Math.min(6,savedStep)));
    setForm(savedForm?{...EMPTY_FORM,...savedForm}:{...EMPTY_FORM});
    setChecked({});
    setArquetipo(null);
    setResultToken(null);
    trackProductEvent("demo_started", {source,target_view:targetView});
    setView(targetView);
  };
  const startDemo=()=>beginDemo("free-choice","auth_free");
  const startDemoAtModule=(module)=>beginDemo(module,"landing_module");

  const openAuth=(mode="login")=>{
    setAuthInitialMode(mode);
    setView("auth");
    try{
      const url=new URL(window.location.href);
      url.searchParams.set("modo",mode==="signup"?"activar":"ingresar");
      window.history.replaceState({},document.title,url.toString());
    }catch(e){}
  };

  const backToLanding=()=>{
    setView("landing");
    try{
      const url=new URL(window.location.href);
      url.searchParams.delete("modo");
      window.history.replaceState({},document.title,url.toString());
    }catch(e){}
  };

  const goDirectCheckout=()=>{
    trackProductEvent("checkout_started",{source:"public_direct"});
    window.location.href=buildHotmartCheckoutUrl();
  };

  const initialPurchaseEmail=(()=>{ try{return localStorage.getItem("ceci_purchase_email")||user?.email||"";}catch(e){return user?.email||"";} })();
  const demo=isDemoUser(user);
  const showNav = !!user && !['auth','entry','landing','free-choice','start','form','generating','locked'].includes(view);
  const dismissFullGuideWelcome=(reason="dismissed")=>{
    try{ if(user?.id) localStorage.setItem(`${FULL_GUIDE_WELCOME_KEY}:${user.id}`,"1"); }catch(e){}
    setFullGuideWelcomeOpen(false);
    trackProductEvent("full_guide_welcome_closed",{reason});
  };
  const moduleContextTitles = {
    "budget":"Presupuesto",
    "vendors":"Proveedores",
    "guests":"Invitados",
    "salon-design":"Diseño del salón",
    "timeline":"Cronograma",
    "checklist-boda":"Mi plan y checklist",
    "guia-novios":"Guía para novios"
  };
  const showModuleContext = !!user && !!moduleContextTitles[view];
  const showDemoPurchase = demo && !["free-choice","start","auth","landing","account","locked","generating","results"].includes(view);
  const excelTemplateIds = EXCEL_TEMPLATES_BY_VIEW[view] || [];
  const showExcelAccess = !!user && excelTemplateIds.length>0 && (demo || accessStatus==="granted");
  const excelPanel = showExcelAccess
    ? <ExcelAccessPanel key={`excel-${view}-${demo?"demo":"paid"}`} templateIds={excelTemplateIds} isDemo={demo} withNav={showNav} onRequestPurchase={()=>setPurchaseOpen(true)} source={`view_${view}`}/>
    : null;
  const excelBeforeContent = false;
  const decorate=(content)=><>
    {showModuleContext&&<ModuleContextBar title={moduleContextTitles[view]} onBack={()=>setView("tools")} onHome={()=>setView("home")}/>}
    {excelBeforeContent&&excelPanel}
    {content}
    {!excelBeforeContent&&excelPanel}
    {showDemoPurchase&&<DemoPurchaseBar withNav={showNav} onBuy={()=>setPurchaseOpen(true)}/>}
    <PurchaseGateModal open={purchaseOpen} onClose={()=>setPurchaseOpen(false)} initialEmail={initialPurchaseEmail}/>
    <GuideLeadModal open={guideOpen} onClose={()=>setGuideOpen(false)}/>
    <FullGuideWelcomeModal open={fullGuideWelcomeOpen&&!demo&&accessStatus==="granted"} onClose={dismissFullGuideWelcome} onGoGuide={()=>{dismissFullGuideWelcome("open_guide_module");setView("guia-novios");}}/>
  </>;

  if(authLoading || (!!user&&!demo&&accessStatus==="checking")) return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",display:"flex",alignItems:"center",justifyContent:"center",color:C,fontFamily:"'Lora',serif"}}>Cargando acceso...</div>;
  if(recoveryMode) return <AuthScreen initialMode="update" initialError={authNotice} onBack={backToLanding} onPasswordUpdated={()=>{
    try { localStorage.removeItem("bsb_session"); } catch(e) {}
    try { localStorage.removeItem("bsb_form"); } catch(e) {}
    try { localStorage.removeItem("bsb_step"); } catch(e) {}
    hasHydrated.current = false;
    setResults(null);
    setForm({...EMPTY_FORM});
    setArquetipo(null);
    setResultToken(null);
    setChecked({});
    setRecoveryMode(false);
    setAuthNotice("");
    setUser(null);
    setView("auth");
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }}/>;

  if(!user){
    if(view==="landing") return decorate(<Landing onTry={startDemo} onLogin={()=>openAuth("login")} onBuy={goDirectCheckout} onGuide={()=>setGuideOpen(true)} onOpenDemoModule={startDemoAtModule}/>);
    return decorate(<AuthScreen
      initialMode={authInitialMode}
      initialError={authNotice}
      initialEmail={initialPurchaseEmail}
      onTryFree={startDemo}
      onBuy={goDirectCheckout}
      onBack={backToLanding}
    />);
  }

  if(!demo && accessStatus==="denied") return decorate(<LockedAccessScreen email={user.email||"tu email"} onBuy={goDirectCheckout} onLogout={logout} onCreateAccess={async()=>{await logout();openAuth("login");}}/>);

  if(view==="free-choice") return decorate(<FreeStartChoice
    onGuided={()=>setView("start")}
    onExplore={()=>setView("tools")}
    onLogin={async()=>{await logout();openAuth("login");}}
    onExit={logout}
  />);

  if(view==="start") return decorate(<WeddingStartPlanner
    isDemo={demo}
    onBack={()=>demo?logout():setView("home")}
    onSeeAll={()=>setView("tools")}
    onOpenModule={(module)=>setView(module)}
  />);

  // El resultado musical y la generación con IA siguen reservados para compradores.
  // Los módulos de planificación sí pueden probarse con datos temporales.
  if(demo && DEMO_BLOCKED_VIEWS.has(view)){
    return decorate(<HomeScreen
      user={user}
      hasResults={false}
      form={form}
      resultToken={null}
      isDemo={true}
      onRequestPurchase={()=>setPurchaseOpen(true)}
      onGoModule={()=>setPurchaseOpen(true)}
      onViewResults={()=>setPurchaseOpen(true)}
      onStartNew={()=>setView("form")}
      onLogout={logout}
      onOpenStart={()=>setView("start")}
    />);
  }

  if(view==="tools") return decorate(<><ToolsHub
    user={user}
    hasResults={!!results}
    isDemo={demo}
    onGoModule={(m)=>setView(m)}
    onViewResults={()=>demo?setPurchaseOpen(true):setView("results")}
    onStartNew={()=>setView(demo?"form":"guia")}
    onOpenStart={()=>setView("start")}
    onRequestPurchase={()=>setPurchaseOpen(true)}
  />{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);

  if(view==="account") return decorate(<><AccountScreen
    user={user}
    isDemo={demo}
    onLogin={async()=>{await logout();openAuth("login");}}
    onBuy={()=>setPurchaseOpen(true)}
    onLogout={logout}
  />{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);

  if(view==="home") return decorate(<><HomeScreen
    user={user}
    hasResults={!!results}
    form={form}
    resultToken={resultToken}
    isDemo={demo}
    onRequestPurchase={()=>setPurchaseOpen(true)}
    onGoModule={(m)=>setView(m)}
    onViewResults={()=>demo?setPurchaseOpen(true):setView("results")}
    onStartNew={()=>{
      try{localStorage.removeItem("bsb_session");}catch(e){}
      window.history.replaceState({}, "", window.location.pathname);
      setStep(1);
      setResults(null);
      setChecked({});
      setForm({...EMPTY_FORM,email:demo?"":(user.email||"")});
      setArquetipo(null);
      setResultToken(null);
      setView(demo?"form":"guia");
    }}
    onLogout={logout}
    onOpenStart={()=>setView("start")}
  />{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="landing") return decorate(<Landing onTry={()=>setView("free-choice")} onLogin={()=>openAuth("login")} onBuy={goDirectCheckout} onGuide={()=>setGuideOpen(true)} onOpenDemoModule={(module)=>setView(module)}/>);
  if(view==="guia") return demo
    ? decorate(<Form step={step} setStep={setStep} form={form} setForm={setForm} onSubmit={generate} error={error} onGoHome={()=>setView("home")} isDemo={true}/>)
    : decorate(<GuiaCanciones onStart={()=>setView("form")} onBack={()=>setView("home")}/>);
  if(view==="guia-novios") return decorate(<><GuiaModule onBack={()=>setView("home")} isDemo={demo} onRequestPurchase={()=>setPurchaseOpen(true)}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="budget") return decorate(<><BudgetModule user={user} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="vendors") return decorate(<><VendorsModule user={user} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="guests") return decorate(<><GuestsModule user={user} isDemo={demo} onBack={()=>setView("home")} onGoDesigner={()=>setView("salon-design")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="salon-design") return decorate(<><SalonDesignerModule user={user} onBack={()=>setView("home")} onGoGuests={()=>setView("guests")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="timeline") return decorate(<><Suspense fallback={<div style={{minHeight:"55vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"\'Lora\',serif",color:"rgba(74,94,58,.7)"}}>Cargando cronograma…</div>}><TimelineModule getDataClient={dataClient} user={user} form={form} results={results} onBack={()=>setView("home")}/></Suspense>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="checklist-boda") return decorate(<><ChecklistModule user={user} form={form} results={results} onGoMusic={()=>setView(results?"results":"guia")} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/>}</>);
  if(view==="form") return decorate(<Form step={step} setStep={setStep} form={form} setForm={setForm} onSubmit={generate} error={error} onGoHome={()=>setView("home")} isDemo={demo}/>);
  if(view==="generating") return decorate(<Generating names={`${form.nombre1} & ${form.nombre2}`} phase={phase}/>);
  if(view==="results") return decorate(<><Results results={results} form={form} checked={checked} setChecked={(fn)=>{ const next=typeof fn==='function'?fn(checked):fn; setChecked(next); syncChecked(next); }} arquetipo={arquetipo} resultToken={resultToken} onGoHome={()=>setView("home")} onLogout={logout} onRestart={()=>{
    try{localStorage.removeItem("bsb_session");}catch(e){}
    window.history.replaceState({}, "", window.location.pathname);
    setView("guia");setStep(1);setResults(null);setChecked({});setForm({...EMPTY_FORM,email:demo?"":(user.email||"")});setArquetipo(null);setResultToken(null);
  }}/><GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/><InstallPrompt/></>);

  return decorate(<><HomeScreen user={user} hasResults={!!results} form={form} resultToken={resultToken} isDemo={demo} onRequestPurchase={()=>setPurchaseOpen(true)} onGoModule={(m)=>setView(m)} onViewResults={()=>demo?setPurchaseOpen(true):setView("results")} onStartNew={()=>setView("guia")} onLogout={logout} onOpenStart={()=>setView("start")}/><GlobalNav view={view} setView={setView} hasResults={!!results} isDemo={demo}/><InstallPrompt/></>);

}

function AppWithProviders(){
  return <ToastProvider><App/></ToastProvider>;
}
