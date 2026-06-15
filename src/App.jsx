import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&display=swap');
*,*::before,*::after{box-sizing:border-box}
html{font-size:clamp(17px,1.15vw,20px);scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:#07111B;color:#F8F2E6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;font-size:18px;font-weight:500}
button,input,textarea{font:inherit}
button{-webkit-tap-highlight-color:transparent}
#root{min-height:100vh;background:#07111B}
@media(max-width:480px){html{font-size:17px} body{min-width:320px}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.fu{animation:fadeUp .5s ease both}
.fu1{animation:fadeUp .5s .07s ease both;opacity:0}
.fu2{animation:fadeUp .5s .14s ease both;opacity:0}
.fu3{animation:fadeUp .5s .21s ease both;opacity:0}
.fu4{animation:fadeUp .5s .28s ease both;opacity:0}
.fu5{animation:fadeUp .5s .35s ease both;opacity:0}
input,textarea{background:transparent;border:none;border-bottom:1px solid rgba(217,184,111,.22);color:#F8F2E6;font-family:'Cormorant Garamond',serif;font-weight:500;font-size:1.15rem;padding:12px 2px;width:100%;outline:none;transition:border-color .3s;-webkit-appearance:none}
input:focus,textarea:focus{border-bottom-color:#D9B86F}
input::placeholder,textarea::placeholder{color:rgba(248,242,230,.42);font-style:italic;font-weight:500}
input[type=date]{color-scheme:dark}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#D9B86F;border-radius:2px}
.tag{display:inline-block;padding:9px 16px;border:1px solid rgba(217,184,111,.22);border-radius:100px;cursor:pointer;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1rem;color:rgba(248,242,230,.7);transition:all .2s;user-select:none;margin:3px 3px 3px 0}
.tag:hover{border-color:rgba(217,184,111,.5);color:#F8F2E6}
.tag.sel{background:rgba(217,184,111,.12);border-color:#D9B86F;color:#E6C76A}
.pill{display:flex;align-items:center;gap:10px;padding:14px 18px;border:1px solid rgba(217,184,111,.17);border-radius:12px;cursor:pointer;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.05rem;color:rgba(248,242,230,.75);transition:all .2s;user-select:none;width:100%;margin-bottom:9px;background:transparent;text-align:left;line-height:1.4}
.pill:hover{border-color:rgba(217,184,111,.38);color:#F8F2E6;background:rgba(217,184,111,.04)}
.pill.sel{background:rgba(217,184,111,.09);border-color:#D9B86F;color:#F8F2E6}
.pbtn{background:linear-gradient(135deg,#D9B86F,#E6C76A);color:#0C1721;border:none;padding:16px 38px;font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:700;letter-spacing:.06em;border-radius:100px;cursor:pointer;transition:all .3s;min-height:54px;white-space:nowrap}
.pbtn:active{transform:scale(.98)}
.pbtn:disabled{opacity:.28;cursor:not-allowed;transform:none}
.gbtn{background:transparent;color:rgba(248,242,230,.42);border:1px solid rgba(248,242,230,.14);padding:13px 24px;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;min-height:52px}
.gbtn:hover{border-color:rgba(248,242,230,.28);color:rgba(248,242,230,.72)}
.wbtn{background:rgba(37,211,102,.1);color:#2ECC71;border:1px solid rgba(37,211,102,.28);padding:13px 20px;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;text-decoration:none;line-height:1.3}
.wbtn:hover{background:rgba(37,211,102,.18);border-color:rgba(37,211,102,.5)}
.scard{background:#111C27;border:1px solid rgba(217,184,111,.1);border-radius:14px;padding:20px;margin-bottom:12px}
.lbtn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border:1px solid rgba(217,184,111,.3);border-radius:100px;color:#D9B86F;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:.95rem;cursor:pointer;background:transparent;transition:all .2s;text-decoration:none;white-space:nowrap}
.lbtn:hover{background:rgba(217,184,111,.08)}
.ci{display:flex;align-items:flex-start;gap:12px;padding:14px 0;cursor:pointer;border-bottom:1px solid rgba(217,184,111,.05)}
.ci:last-child{border-bottom:none}
.cb{width:22px;height:22px;min-width:22px;border:1px solid rgba(217,184,111,.3);border-radius:4px;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.cb.ck{background:rgba(217,184,111,.18);border-color:#D9B86F}
.divider{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.divider::before,.divider::after{content:'';flex:1;height:1px}
.divider::before{background:linear-gradient(to right,transparent,rgba(217,184,111,.18))}
.divider::after{background:linear-gradient(to left,transparent,rgba(217,184,111,.18))}
.fl{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:.84rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(217,184,111,.75);margin-top:26px;margin-bottom:10px}
.sl-n{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:.84rem;letter-spacing:.13em;text-transform:uppercase;color:#D9B86F;margin-bottom:8px}
.sl-t{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,5vw,2rem);font-weight:700;color:#F8F2E6;margin:0 0 6px;line-height:1.15}
.sl-s{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:1.02rem;color:rgba(248,242,230,.62);margin:0;font-style:italic;line-height:1.55}
.song-item{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid rgba(217,184,111,.06)}
.song-item:last-child{border-bottom:none}
.song-num{width:24px;height:24px;min-width:24px;border-radius:50%;background:rgba(217,184,111,.1);border:1px solid rgba(217,184,111,.22);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:.8rem;color:#D9B86F;margin-top:2px;flex-shrink:0}
.song-ceci{font-family:'Cormorant Garamond',serif;font-size:.9rem;color:rgba(217,184,111,.6);font-style:italic;margin-top:4px;line-height:1.5}
.guide-sec{background:#111C27;border:1px solid rgba(217,184,111,.1);border-radius:14px;padding:20px 22px;margin-bottom:14px}
.guide-sec-title{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:600;color:#E6C76A;margin:0 0 4px}
.guide-sec-sub{font-family:'Cormorant Garamond',serif;font-size:.9rem;color:rgba(248,242,230,.38);font-style:italic;margin:0 0 14px}
.tab{padding:10px 18px;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:.95rem;border-radius:100px;cursor:pointer;border:1px solid rgba(217,184,111,.2);color:rgba(248,242,230,.45);background:transparent;transition:all .2s;white-space:nowrap;min-height:42px}
.tab.act{background:rgba(217,184,111,.12);border-color:#D9B86F;color:#E6C76A}
.moment-card{border:1px solid rgba(217,184,111,.12);border-radius:13px;padding:17px 18px;margin-bottom:10px;background:#111C27;cursor:pointer;transition:border-color .2s}
.moment-card:hover{border-color:rgba(217,184,111,.28)}
.moment-card.sel{border-color:#D9B86F;background:rgba(217,184,111,.05)}
.info-box{background:rgba(217,184,111,.05);border:1px solid rgba(217,184,111,.15);border-radius:10px;padding:14px 16px;margin-top:10px}
.arch-badge{display:inline-flex;align-items:center;gap:9px;background:rgba(217,184,111,.09);border:1px solid rgba(217,184,111,.25);border-radius:100px;padding:8px 18px;margin-bottom:14px}
@media(max-width:680px){
  .generating-notes{grid-template-columns:1fr!important}
}
@media(max-width:480px){
  .pbtn{width:100%;justify-content:center;display:flex;align-items:center}
  .tag{font-size:.92rem;padding:8px 13px}
  .lbtn{font-size:.88rem;padding:7px 13px}
}

.brand-logo{font-family:'Cinzel',serif;font-size:clamp(.7rem,1vw,.92rem);letter-spacing:.32em;text-transform:uppercase;color:#D9B86F;font-weight:500}
.brand-title{font-family:'Playfair Display',serif;font-weight:600;color:#F8F2E6;letter-spacing:.04em;line-height:1.15;text-wrap:balance}
.brand-title .gold{color:#D9B86F}
.brand-subtitle{font-family:'Cormorant Garamond',serif;color:rgba(248,242,230,.82);font-weight:600;text-wrap:balance}
.brand-copy{font-family:'Cormorant Garamond',serif;color:rgba(248,242,230,.68);line-height:1.75}
.responsive-shell{width:100%;max-width:1120px;margin:0 auto;padding-left:clamp(18px,4vw,48px);padding-right:clamp(18px,4vw,48px)}
.auth-card{width:100%;max-width:min(460px,calc(100vw - 32px));background:rgba(17,28,39,.88)!important;backdrop-filter:blur(14px);border:1px solid rgba(217,184,111,.22)!important;border-radius:24px!important;padding:clamp(24px,5vw,38px)!important;box-shadow:0 28px 90px rgba(0,0,0,.36)}
.auth-card input{background:rgba(248,242,230,.96)!important;color:#0C1721!important;border:1px solid rgba(217,184,111,.2)!important;border-radius:0!important;padding:14px 14px!important;font-family:'Cormorant Garamond',serif!important;font-weight:600;box-shadow:none!important}
.auth-card input::placeholder{color:rgba(12,23,33,.45)!important}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;min-height:min(760px,100svh);padding-top:clamp(54px,9vw,112px);padding-bottom:clamp(54px,9vw,112px);text-align:center}
.hero-title{font-size:clamp(2.7rem,9vw,6.2rem);max-width:980px;margin:0 auto 28px}
.hero-kicker{margin-bottom:clamp(34px,7vw,72px)}
.hero-sub{font-size:clamp(1.35rem,3vw,2rem);font-style:italic;margin:0 0 12px}
.hero-line{font-family:'Cormorant Garamond',serif;font-size:clamp(1rem,2vw,1.35rem);font-weight:700;letter-spacing:.02em;color:rgba(248,242,230,.86);margin:0}
@media(min-width:900px){
  .desktop-two-col{display:grid!important;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
  .results-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}
  .results-container{max-width:900px!important}
}

@media(max-width:900px){
  .desktop-guide-grid{grid-template-columns:1fr!important}
}
@media(min-width:901px){
  .guide-sec{font-size:1.04rem}
}

@media(max-width:640px){
  .hero-grid{min-height:100svh;padding-top:44px;padding-bottom:44px}
  .hero-title{font-size:clamp(2.65rem,14vw,4.2rem);line-height:1.18;margin-bottom:34px}
  .hero-sub{font-size:clamp(1.25rem,7vw,1.75rem);line-height:1.25}
  .hero-line{font-size:clamp(.96rem,4.5vw,1.15rem);line-height:1.4}
  .brand-logo{letter-spacing:.24em}
  input,textarea{font-size:1.02rem;padding:12px 2px}
  .pill{font-size:1rem;padding:13px 15px}
  .guide-sec{padding:18px 16px}
}

.tag-desktop{display:none}
.momento-slide{user-select:none}
div[style*="grab"]:active{cursor:grabbing}

@media(min-width:640px){.tag-desktop{display:inline-block!important}}
.accordion-open{border-color:rgba(217,184,111,.28)!important}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  html,body{background:#fff!important;color:#1a1a1a!important;font-size:13px!important}
  body{padding:0!important;margin:0!important}
  .no-print,.pbtn,.gbtn,.wbtn,.lbtn{display:none!important}
  .print-page{page-break-before:always;padding:0}
  @page{margin:1.8cm;size:A4}
  @page:first{margin-top:2.4cm}

  /* Portada */
  .pdf-cover{background:#07111B!important;color:#F8F2E6!important;padding:48px 40px!important;min-height:200px!important;border-radius:0!important;text-align:center;margin-bottom:24px;border-bottom:3px solid #D9B86F}
  .pdf-cover h1{color:#F8F2E6!important;font-size:28px!important;margin:0 0 6px!important}
  .pdf-cover .sub{color:#D9B86F!important;font-size:13px!important}

  /* Secciones */
  .divider{margin:18px 0 14px!important}
  .divider::before,.divider::after{background:rgba(0,0,0,.15)!important}
  .divider h2{color:#854F0B!important;font-size:13px!important;font-weight:700!important}

  /* Cards */
  .scard{background:#faf8f5!important;border:1px solid #e0d5c0!important;border-radius:8px!important;break-inside:avoid;margin-bottom:10px!important;padding:14px!important}
  .song-star-card{background:#faf5ec!important;border:2px solid #D9B86F!important;border-radius:8px!important;break-inside:avoid;margin-bottom:10px!important;padding:14px!important}
  .moment-card{background:#faf8f5!important;border:1px solid #e0d5c0!important;break-inside:avoid}

  /* Tipografía */
  h1,h2,h3{color:#1a1a1a!important}
  [style*="color:#F8F2E6"],[style*="color: #F7F2EA"]{color:#1a1a1a!important}
  [style*="color:rgba(248,242,230"]{color:#555!important}
  [style*="color:#D9B86F"],[style*="color: #D9B86F"],[style*="color:#E6C76A"]{color:#854F0B!important}
  [style*="background:#0"],[style*="background: #0"],[style*="background:#0e"]{background:#fff!important}
  [style*="background:#0f"]{background:#faf8f5!important}

  /* Checklist */
  .ci{border-bottom:1px solid #e8e0d0!important}
  .cb{border:1px solid #D9B86F!important;border-radius:3px!important}
  .cb.ck{background:#D9B86F!important}

  /* Guía: forzar mostrar todas las secciones */
  .pdf-guia-section{display:block!important;break-inside:avoid;margin-bottom:16px}
  .song-item{border-bottom:1px solid #e8e0d0!important}
}
`;

const G="#D9B86F", C="#F8F2E6", DIM="rgba(248,242,230,.68)", DIMSOFT="rgba(248,242,230,.45)", BG="#07111B", BG2="#111C27", BG3="#152230", BORDER="rgba(217,184,111,.18)";

const CECI_VOICE = `Sos Ceci, violinista con 200 bodas en Paraguay y Brasil. Estilo: Emocional, Elegante, Cinematográfico.
FILOSOFÍA: La música no es decoración — es la emoción que todos van a recordar. Lo que la gente recuerda es cómo se sintió cuando empezó la música. En boda luxury, hasta los silencios tienen intención.
ERRORES: elegir pensando en el público no en los novios; canciones de moda que no los representan; ignorar la letra; dejar la música para último; canciones rítmicas sin voz (Your Song, Signed Sealed Delivered pierden fuerza en instrumental).
SIEMPRE FUNCIONA: Can't Help Falling in Love.
EJEMPLO REGIONAL: en Paraguay es comun celebrar dos ceremonias el mismo dia (religiosa + civil), cada una en un lugar distinto. La ceremonia religiosa catolica suele ser en iglesia; ceremonias cristianas no catolicas y civiles suelen ser en salones u otros venues.`;

// Guía de criterio musical de Ceci por momento — función emocional + ejemplos reales
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

  const pageStyle={
    width:"100%",
    minHeight:"100vh",
    background:"#07111B",
    padding:"clamp(28px,5vw,76px) clamp(18px,6vw,96px) 96px",
  };
  const shellStyle={width:"100%",maxWidth:1180,margin:"0 auto"};
  const readableStyle={width:"100%",maxWidth:920,margin:"0 auto"};

  return <div style={pageStyle}>
    <div style={shellStyle}>
      <div style={{textAlign:"center",marginBottom:"clamp(30px,5vw,56px)",paddingTop:"clamp(8px,2vw,20px)"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(.78rem,1vw,.92rem)",letterSpacing:".24em",textTransform:"uppercase",color:G,marginBottom:14}}>El Violín de Ceci</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(3rem,6.2vw,6.4rem)",fontWeight:700,color:C,margin:"0 auto 18px",lineHeight:.98,letterSpacing:".02em",maxWidth:980}}>
          La Banda Sonora<br/><span style={{color:G}}>de tu Boda</span>
        </h1>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.18rem,2vw,1.65rem)",color:C,margin:"0 auto 8px",fontStyle:"italic",fontWeight:600,lineHeight:1.25,maxWidth:820}}>La música que hace de tu día inolvidable</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1rem,1.35vw,1.18rem)",color:DIM,margin:"0 auto",lineHeight:1.55,maxWidth:740}}>Guía musical · Test para definir tus canciones · Checklist musical</p>
      </div>

      <div style={{...readableStyle,background:"rgba(17,28,39,.88)",border:"1px solid rgba(217,184,111,.18)",borderRadius:22,padding:"clamp(20px,3vw,32px)",marginBottom:"clamp(24px,3vw,34px)",boxShadow:"0 24px 70px rgba(0,0,0,.22)"}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.08rem,1.35vw,1.25rem)",color:C,lineHeight:1.75,margin:"0 0 10px"}}>Esta guía reúne el criterio de Ceci después de más de 200 bodas. No es una lista de Spotify — es lo que realmente funciona en cada momento, con la explicación de por qué.</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1rem,1.2vw,1.12rem)",color:"rgba(217,184,111,.68)",fontStyle:"italic",margin:0,lineHeight:1.6}}>Usala como punto de partida. Para que sea 100% tuya, hacé el test personalizado al final.</p>
      </div>

      <div style={{...readableStyle,display:"flex",gap:10,overflowX:"auto",paddingBottom:8,marginBottom:20,scrollbarWidth:"none",justifyContent:"center",flexWrap:"wrap"}}>
        {tabs.map(k=>{
          const m=CANCIONES_POR_MOMENTO[k];
          return <button key={k} className={`tab${tab===k?" act":""}`} onClick={()=>setTab(k)}>{m.icono} {m.titulo.split(" ")[0]}</button>;
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0, 1.1fr) minmax(320px,.9fr)",gap:"clamp(22px,4vw,44px)",alignItems:"start"}} className="desktop-guide-grid">
        <div className="guide-sec" key={tab} style={{padding:"clamp(22px,3vw,34px)",borderRadius:22}}>
          <h2 className="guide-sec-title" style={{fontSize:"clamp(1.55rem,2.6vw,2.25rem)",lineHeight:1.15}}>{momento.icono} {momento.titulo}</h2>
          <p className="guide-sec-sub" style={{fontSize:"clamp(1rem,1.2vw,1.12rem)"}}>Criterio de Ceci</p>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.08rem,1.35vw,1.25rem)",color:C,lineHeight:1.75,margin:"0 0 16px"}}>{momento.guia}</p>
          <div style={{background:"rgba(217,184,111,.06)",border:"1px solid rgba(217,184,111,.14)",borderRadius:14,padding:"14px 16px",marginBottom:22}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.98rem,1.1vw,1.08rem)",color:"rgba(217,184,111,.78)",margin:0,lineHeight:1.55}}>⚠️ {momento.errores}</p>
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(217,184,111,.55)",marginBottom:12}}>Las más pedidas por los novios</div>
          {momento.canciones.map((c,i)=>{
            const q=encodeURIComponent(c.t+" "+c.a);
            return <div key={i} className="song-item">
              <div className="song-num">{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.15rem,1.45vw,1.35rem)",color:C,lineHeight:1.2}}>{c.t}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.98rem,1.15vw,1.08rem)",color:DIM,marginBottom:3}}>{c.a}</div>
                <div className="song-ceci">"{c.n}"</div>
              </div>
              <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,marginTop:4}}>▶</a>
            </div>;
          })}
        </div>

        <div>
          <div style={{background:"rgba(17,28,39,.72)",border:"1px solid rgba(217,184,111,.14)",borderRadius:22,padding:"clamp(20px,2.5vw,30px)",marginBottom:22}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(217,184,111,.55)",marginBottom:16}}>5 reglas de Ceci para elegir bien</div>
            {GUIA_TIPS.map((tip,i)=><div key={i} style={{display:"flex",gap:14,paddingBottom:16,borderBottom:i<4?"1px solid rgba(217,184,111,.08)":"none",marginBottom:16}}>
              <div style={{width:30,height:30,minWidth:30,borderRadius:"50%",background:"rgba(217,184,111,.1)",border:"1px solid rgba(217,184,111,.22)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:G,flexShrink:0,marginTop:2}}>{i+1}</div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.05rem,1.2vw,1.18rem)",color:C,marginBottom:5,lineHeight:1.25}}>{tip.t}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.98rem,1.1vw,1.06rem)",color:DIM,lineHeight:1.62}}>{tip.d}</div>
              </div>
            </div>)}
          </div>

          <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(217,184,111,.24)",borderRadius:22,padding:"clamp(24px,3vw,34px)",textAlign:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:G,marginBottom:12}}>El siguiente nivel</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.55rem,2.4vw,2.1rem)",fontWeight:600,color:C,margin:"0 0 12px",lineHeight:1.15}}>Hacé el test personalizado</h3>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.02rem,1.2vw,1.14rem)",color:DIM,lineHeight:1.65,margin:"0 0 24px"}}>La guía te da el criterio general. El test crea el guion musical exacto para tu boda — con tu arquetipo, tus momentos elegidos y el checklist para tus proveedores.</p>
            <button className="pbtn" onClick={onStart}>Crear mi guion personalizado →</button>
            <p style={{marginTop:12,fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(248,242,230,.24)"}}>15 minutos · Resultado inmediato</p>
          </div>
        </div>
      </div>
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
  const r = await fetch(LOCAL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    {Array.from({length:6}).map((_,i)=>(<div key={i} style={{width:i===step-1?24:6,height:5,borderRadius:3,background:i<step?G:"rgba(217,184,111,.1)",transition:"all .35s"}}/>))}
  </div>;
}

function Landing({onStart}){
  return <div style={{background:"#07111B",minHeight:"100vh",overflow:"hidden"}}>
    <section className="responsive-shell hero-grid" style={{position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 18%, rgba(217,184,111,.10), transparent 38%), radial-gradient(circle at 50% 100%, rgba(248,242,230,.035), transparent 48%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1}}>
        <div className="brand-logo hero-kicker fu">El Violín de Ceci</div>
        <h1 className="brand-title hero-title fu1">
          La Banda Sonora<br/>
          <span className="gold">de tu Boda</span>
        </h1>
        <p className="brand-subtitle hero-sub fu2">La música que hace de tu día inolvidable</p>
        <p className="hero-line fu3">Guía musical · Test para definir tus canciones · Checklist musical</p>
        <div className="fu4" style={{marginTop:"clamp(30px,5vw,48px)",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button className="pbtn" onClick={onStart}>Comenzar ahora →</button>
        </div>
      </div>
    </section>

    <section className="responsive-shell" style={{paddingBottom:"clamp(42px,8vw,88px)"}}>
      <div className="desktop-two-col" style={{display:"grid",gridTemplateColumns:"1fr",gap:22,alignItems:"start"}}>
        <div style={{background:"#111C27",border:"1px solid rgba(217,184,111,.14)",borderRadius:22,padding:"clamp(22px,4vw,34px)"}}>
          <div className="brand-logo" style={{fontSize:".7rem",letterSpacing:".18em",marginBottom:14}}>El problema que nadie habla</div>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0 0 14px"}}>Podés tener el mejor salón, el vestido perfecto y una decoración impecable — pero si la música no está pensada, el momento puede no sentirse como lo imaginaste.</p>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0",color:G,fontStyle:"italic"}}>La música no es un detalle. Es lo que transforma una boda bonita en un recuerdo inolvidable.</p>
        </div>
        <div style={{background:"#111C27",border:"1px solid rgba(217,184,111,.16)",borderRadius:22,padding:"clamp(28px,4vw,42px)",boxShadow:"0 24px 80px rgba(0,0,0,.32)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"3.5rem",color:"rgba(217,184,111,.1)",lineHeight:1,marginBottom:12,userSelect:"none"}}>"</div>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.2rem,2.2vw,1.55rem)",color:C,lineHeight:1.75,fontStyle:"italic",margin:"0 0 24px"}}>Lo que la gente recuerda de tu boda no es el vestido ni el salón. Recuerdan cómo se sintieron cuando empezó la música.</p>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:2,height:40,background:"rgba(217,184,111,.35)",borderRadius:1}}/>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G}}>Ceci</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:DIMSOFT}}>El Violín de Ceci · +200 bodas en Paraguay y Brasil</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{marginTop:"clamp(36px,6vw,64px)"}}>
        <div className="brand-logo" style={{textAlign:"center",fontSize:".74rem",letterSpacing:".18em",marginBottom:22}}>Lo que recibís al comprar</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
          {[
            {e:"📖",t:"Guía de canciones",d:"Las más pedidas en bodas reales, con criterio de Ceci para cada momento."},
            {e:"🎯",t:"Test + Arquetipo musical",d:"El perfil que define el estilo de toda la banda sonora."},
            {e:"🎼",t:"Guion personalizado",d:"Canciones para cada momento de la ceremonia, según su historia."},
            {e:"✅",t:"Checklist para proveedores",d:"DJ, músicos, wedding planner, iglesia y pareja, todo coordinado."},
            {e:"📤",t:"WhatsApp listo",d:"Mensajes adaptados para compartir con cada proveedor."},
            {e:"📄",t:"PDF premium",d:"Documento para guardar, imprimir o compartir."}
          ].map((item,i)=>(
            <div key={i} style={{background:"#111C27",border:"1px solid rgba(217,184,111,.10)",borderRadius:18,padding:"20px 18px"}}>
              <div style={{fontSize:"1.65rem",marginBottom:10}}>{item.e}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.08rem",color:C,marginBottom:6}}>{item.t}</div>
              <div className="brand-copy" style={{fontSize:".98rem",lineHeight:1.6}}>{item.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:"clamp(36px,6vw,64px)",background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(217,184,111,.24)",borderRadius:24,padding:"clamp(28px,5vw,46px)",textAlign:"center"}}>
        <div className="brand-logo" style={{fontSize:".74rem",letterSpacing:".18em",marginBottom:14}}>Tu Banda Sonora de Boda</div>
        <h2 className="brand-title" style={{fontSize:"clamp(1.8rem,5vw,3rem)",margin:"0 0 12px"}}>Diseñá la música de tu boda con criterio experto.</h2>
        <p className="brand-copy" style={{fontSize:"clamp(1rem,2vw,1.2rem)",margin:"0 0 10px"}}>Guía · Arquetipo · Guion personalizado · Checklist · WhatsApp · PDF</p>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.8rem,4vw,2.4rem)",color:G,margin:"0 0 24px",fontWeight:500}}>USD 47</p>
        <button className="pbtn" onClick={onStart}>Comenzar ahora →</button>
      </div>
    </section>
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

  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#07111B",padding:"32px 24px"}}>
    <div style={{maxWidth:440,width:"100%",textAlign:"center"}} className="fu">
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".2em",textTransform:"uppercase",color:G,marginBottom:18}}>El Violín de Ceci</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.85rem",fontWeight:700,color:C,margin:"0 0 12px"}}>Tu guion musical está listo.</h2>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",color:DIM,lineHeight:1.7,margin:"0 0 10px"}}>Dejá tu email para guardar tu resultado y poder acceder desde cualquier dispositivo.</p>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(217,184,111,.45)",fontStyle:"italic",margin:"0 0 28px"}}>📧 Tu resultado queda guardado en tu cuenta y podés volver a verlo cuando quieras.</p>
      <input type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setNotFound(false);}} style={{textAlign:"center",fontSize:"1.15rem",marginBottom:16}}/>
      {notFound&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(217,184,111,.7)",margin:"0 0 12px",fontStyle:"italic"}}>No encontramos ese email. Continuá para crear tu guion nuevo.</p>}
      <button className="pbtn" disabled={!ok} onClick={()=>{setForm(f=>({...f,email}));onContinue();}} style={{width:"100%",marginBottom:12}}>
        Ver mi resultado →
      </button>
      <div style={{borderTop:"1px solid rgba(217,184,111,.1)",paddingTop:16,marginTop:4}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(248,242,230,.3)",margin:"0 0 10px"}}>¿Ya completaste el test antes?</p>
        <button className="gbtn" disabled={!ok||recovering} onClick={handleRecover} style={{width:"100%"}}>
          {recovering?"Buscando tu guion...":"Recuperar mi guion anterior →"}
        </button>
      </div>
      <p style={{marginTop:14,fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(248,242,230,.2)"}}>Sin spam. Solo tu guion y novedades de Ceci.</p>
    </div>
  </div>;
}


function Form({step,setStep,form,setForm,onSubmit,error}){
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
  const wrap=ch=><div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#07111B",padding:"24px 22px",maxWidth:"min(820px,calc(100vw - 32px))",margin:"0 auto"}}>
    <Progress step={step}/>
    <div style={{flex:1}} className="fu">{ch}</div>
    <div style={{display:"flex",gap:10,paddingTop:28,paddingBottom:8}}>
      {step>1&&<button className="gbtn" onClick={()=>setStep(s=>s-1)}>← Volver</button>}
      {step<6
        ?<button className="pbtn" disabled={!ok()} style={{marginLeft:"auto"}} onClick={()=>setStep(s=>s+1)}>Continuar →</button>
        :<button className="pbtn" disabled={!ok()} style={{marginLeft:"auto"}} onClick={onSubmit}>✨ Crear mi guion</button>
      }
    </div>
    {error&&<p style={{color:"#ff8080",fontFamily:"'Cormorant Garamond',serif",textAlign:"center",fontSize:".95rem",marginTop:8,lineHeight:1.5}}>{error}</p>}
  </div>;

  if(step===1) return wrap(<>
    <SL n={1} l="Cuéntenme sobre la pareja"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div><FL>Nombre 1</FL><input placeholder="Tu nombre" value={form.nombre1} onChange={e=>set("nombre1",e.target.value)}/></div>
      <div><FL>Nombre 2</FL><input placeholder="Su nombre" value={form.nombre2} onChange={e=>set("nombre2",e.target.value)}/></div>
    </div>
    <FL>Fecha de la boda</FL>
    <input type="date" value={form.fechaBoda} onChange={e=>set("fechaBoda",e.target.value)}/>
    <FL>Ciudad / país</FL>
    <input placeholder="ej: Asunción, Paraguay" value={form.ciudad} onChange={e=>set("ciudad",e.target.value)}/>
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
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:G,marginBottom:8}}>Denominación religiosa</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {["Católica","Cristiana","Ortodoxa","Otra religión"].map(v=><Tag key={v} label={v} selected={(form.denominacionReligiosa||"")===v} onClick={()=>set("denominacionReligiosa",v)}/>)}
      </div>
      {(form.denominacionReligiosa==="Católica")&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,margin:"12px 0 0",lineHeight:1.6}}>
        ⚠️ La misa católica tiene momentos litúrgicos con música obligatoria (Aleluya, Comunión, Ofertorio). Muchas iglesias solo permiten música sacra. Siempre consultá con el sacerdote antes de definir el repertorio.
      </p>}
      <FL>¿Hay restricciones musicales específicas?</FL>
      <input placeholder="ej: Solo música sacra, el sacerdote eligió el Aleluya..." value={form.restriccionIglesia||""} onChange={e=>set("restriccionIglesia",e.target.value)}/>

      <FL>¿Dónde será la ceremonia religiosa?</FL>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
        {["Iglesia / templo","Salón de fiestas","Al aire libre","Hotel","Otro"].map(v=><Tag key={v} label={v} selected={form.lugarCeremoniaReligiosa===v} onClick={()=>set("lugarCeremoniaReligiosa",v)}/>)}
      </div>
      {form.lugarCeremoniaReligiosa&&lugarGuia[form.lugarCeremoniaReligiosa]&&<div style={{background:"rgba(217,184,111,.06)",border:"1px solid rgba(217,184,111,.14)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>{lugarGuia[form.lugarCeremoniaReligiosa]}</p>
      </div>}
    </div>}
    {tieneReligiosa&&form.tipoCeremonia.includes("Civil")&&<div style={{background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.12)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>
        💡 Como van a tener ceremonia religiosa y civil, es común que sean en lugares distintos — por ejemplo, primero la iglesia y después el salón. Más abajo van a poder indicar dónde será la parte civil.
      </p>
    </div>}
    {(form.tipoCeremonia.includes("Civil")||form.tipoCeremonia.includes("Simbólica")||form.tipoCeremonia.includes("Otra")||(tieneReligiosa&&form.denominacionReligiosa&&form.denominacionReligiosa!=="Católica"&&!form.tipoCeremonia.includes("Civil")))&&<>
      <FL>{tieneReligiosa?"¿Dónde será la ceremonia civil?":"¿Dónde será la ceremonia?"}</FL>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
        {["Salón de fiestas","Al aire libre","Hacienda / estancia","Hotel","Espacio íntimo","Otro"].map(v=><Tag key={v} label={v} selected={form.lugarCeremonia===v} onClick={()=>set("lugarCeremonia",v)}/>)}
      </div>
      {form.lugarCeremonia&&lugarGuia[form.lugarCeremonia]&&<div style={{background:"rgba(217,184,111,.06)",border:"1px solid rgba(217,184,111,.14)",borderRadius:10,padding:"10px 14px",marginTop:8}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>{lugarGuia[form.lugarCeremonia]}</p>
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
    <input placeholder="ej: Coldplay, La Oreja de Van Gogh, Hans Zimmer" value={form.artistas} onChange={e=>set("artistas",e.target.value)}/>
    <FL>¿Alguna canción que definitivamente NO quieren?</FL>
    <input placeholder="(opcional) — y si querés, contanos por qué" value={form.cancionesProhibidas} onChange={e=>set("cancionesProhibidas",e.target.value)}/>
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
    <div style={{background:"rgba(217,184,111,.06)",border:"1px solid rgba(217,184,111,.14)",borderRadius:14,padding:"14px 16px",marginBottom:20}}>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,margin:"0 0 6px",lineHeight:1.6}}>
        No necesitás saber qué se musicaliza en una boda — te guiamos momento a momento.
      </p>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:DIM,margin:0,lineHeight:1.55}}>
        Ya pre-seleccionamos los momentos esenciales. Podés agregar o quitar según tu ceremonia.
      </p>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(217,184,111,.12)",color:G,border:"1px solid rgba(217,184,111,.25)"}}>★ Esencial</span>
      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(248,242,230,.05)",color:DIM,border:"1px solid rgba(248,242,230,.12)"}}>○ Opcional</span>
      {isCatolica&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",padding:"4px 12px",borderRadius:20,background:"rgba(217,184,111,.08)",color:G,border:"1px solid rgba(217,184,111,.2)"}}>⛪ Litúrgico</span>}
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
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",color:esEsencial?G:DIM,marginTop:2}}>
                  {m.obligatorio?"⛪ Litúrgico obligatorio":esEsencial?"★ Esencial":"○ Opcional"}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
              {m.obligatorio
                ? <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".72rem",color:"rgba(217,184,111,.6)",border:"1px solid rgba(217,184,111,.25)",borderRadius:100,padding:"2px 8px"}}>siempre incluido</span>
                : <div style={{width:22,height:22,borderRadius:4,border:`1px solid ${sel?G:"rgba(217,184,111,.3)"}`,background:sel?"rgba(217,184,111,.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                    {sel&&<span style={{color:G,fontSize:".65rem",fontWeight:700}}>✓</span>}
                  </div>
              }
            </div>
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(217,184,111,.6)",marginBottom:5,fontStyle:"italic"}}>{m.emocion} · {m.duracion}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:"rgba(248,242,230,.52)",lineHeight:1.58}}>{m.desc}</div>
        </div>;
      })}
    </div>
    {isCatolica&&<div style={{marginTop:12,background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.14)",borderRadius:10,padding:"12px 14px"}}>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:DIM,margin:0,lineHeight:1.6}}>
        ⚠️ Los momentos litúrgicos deben tener música aprobada por la iglesia. Consultá con el sacerdote antes de confirmar el repertorio.
      </p>
    </div>}
    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(248,242,230,.28)",marginTop:12,fontStyle:"italic",lineHeight:1.5}}>
      No hay respuesta correcta única. La idea es construir una banda sonora que se sienta como ustedes.
    </p>
  </>);

  return wrap(<>
    <SL n={6} l="Lo que hace especial a su boda"/>
    <FL>¿Tienen una canción que los une como pareja?</FL>
    <textarea rows={2} placeholder="ej: una canción que escucharon juntos en un viaje, o que sonaba cuando se conocieron..." value={form.cancionPersonal} onChange={e=>set("cancionPersonal",e.target.value)} style={{resize:"none"}}/>
    <FL>¿Qué querés que la gente sienta o recuerde musicalmente? *</FL>
    <textarea rows={3} placeholder="Contanos con tus palabras, sin filtros — esto es lo que más importa..." value={form.recuerdo} onChange={e=>set("recuerdo",e.target.value)} style={{resize:"none"}}/>
    <p style={{marginTop:24,fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(248,242,230,.22)",lineHeight:1.65,fontStyle:"italic"}}>Con estas respuestas, Ceci crea un guion que no podría aplicarse a ninguna otra boda.</p>
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
  return <div style={{minHeight:"100vh",background:"#07111B",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 20px",textAlign:"center"}}>
    <div style={{width:"100%",maxWidth:720,background:"linear-gradient(135deg,rgba(17,28,39,.92),rgba(12,23,33,.96))",border:"1px solid rgba(217,184,111,.18)",borderRadius:28,padding:"clamp(30px,6vw,54px)",boxShadow:"0 24px 80px rgba(0,0,0,.22)"}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".24em",textTransform:"uppercase",color:G,marginBottom:20}}>El Violín de Ceci</div>
      <div style={{position:"relative",width:92,height:92,margin:"0 auto 28px"}}>
        <div style={{position:"absolute",inset:0,border:"1px solid rgba(217,184,111,.08)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:0,border:"2px solid transparent",borderTopColor:G,borderRightColor:"rgba(217,184,111,.32)",borderRadius:"50%",animation:"spin 1.5s linear infinite"}}/>
        <div style={{position:"absolute",inset:13,border:"1px solid rgba(217,184,111,.14)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:G,fontSize:"1.6rem"}}>♪</div>
      </div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.8rem,4vw,2.7rem)",fontWeight:400,color:C,margin:"0 0 8px",lineHeight:1.15}}>Creando la banda sonora de {names}</h2>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.05rem,2.2vw,1.25rem)",color:"rgba(248,242,230,.62)",fontStyle:"italic",margin:"0 0 28px",lineHeight:1.55}}>Respirá tranquila. Este proceso puede tardar un poco porque estamos creando un guion único, no una respuesta automática.</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10}}>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",letterSpacing:".12em",textTransform:"uppercase",color:G}}>{PHASE_TITLES[phase]||PHASE_TITLES[0]}</span>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(248,242,230,.34)"}}>Paso {phase+1} de 3 · {seconds}s</span>
      </div>
      <div style={{height:6,background:"rgba(217,184,111,.12)",borderRadius:999,overflow:"hidden",marginBottom:24}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#C9A055,#E7C875)",borderRadius:999,transition:"width .55s ease"}}/>
      </div>
      <div style={{background:"rgba(217,184,111,.06)",border:"1px solid rgba(217,184,111,.14)",borderRadius:18,padding:"18px 20px",marginBottom:18,minHeight:96,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.15rem,2.3vw,1.38rem)",color:C,animation:"pulse 2.4s ease infinite",fontStyle:"italic",margin:0,lineHeight:1.55}}>{pool[i]}</p>
      </div>
      <div className="generating-notes" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
        {CALMING_NOTES.map((note,idx)=><div key={idx} style={{background:"rgba(248,242,230,.035)",border:"1px solid rgba(248,242,230,.08)",borderRadius:14,padding:"12px 10px",fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(248,242,230,.52)",lineHeight:1.45}}>
          {note}
        </div>)}
      </div>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(248,242,230,.28)",margin:"22px 0 0",lineHeight:1.5}}>Dejá esta pestaña abierta hasta que aparezca tu resultado.</p>
    </div>
  </div>;
}

// ─── ACORDEÓN ─────────────────────────────────────────────────────────────────
function AccordionBlock({id,icon,title,subtitle,isOpen,onToggle,children,defaultTag}){
  return <div style={{marginBottom:12,border:`1px solid ${isOpen?"rgba(217,184,111,.28)":"rgba(217,184,111,.1)"}`,borderRadius:18,overflow:"hidden",transition:"border-color .25s"}}>
    <button onClick={onToggle} style={{width:"100%",background:isOpen?"linear-gradient(135deg,rgba(21,34,48,.96),rgba(12,23,33,.98))":"rgba(17,28,39,.72)",border:"none",cursor:"pointer",padding:"18px 22px",display:"flex",alignItems:"center",gap:14,textAlign:"left",transition:"background .25s"}}>
      <span style={{fontSize:"1.3rem",flexShrink:0}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.05rem,2vw,1.2rem)",fontWeight:600,color:isOpen?G:C,lineHeight:1.2,transition:"color .25s"}}>{title}</div>
        {subtitle&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:DIM,marginTop:3,lineHeight:1.4}}>{subtitle}</div>}
      </div>
      {defaultTag&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".75rem",padding:"3px 10px",borderRadius:20,background:"rgba(217,184,111,.1)",color:G,border:"1px solid rgba(217,184,111,.2)",flexShrink:0,display:"none"}} className="tag-desktop">{defaultTag}</span>}
      <span style={{color:G,fontSize:"1.1rem",flexShrink:0,transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s"}}>▾</span>
    </button>
    {isOpen&&<div style={{padding:"4px 22px 22px",background:"rgba(12,23,33,.6)"}}>{children}</div>}
  </div>;
}

function SecLabel({children}){
  return <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0 14px"}}>
    <div style={{height:"1px",width:16,background:`linear-gradient(to right,transparent,rgba(217,184,111,.3))`}}/>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(217,184,111,.5)",whiteSpace:"nowrap"}}>{children}</div>
    <div style={{height:"1px",flex:1,background:`linear-gradient(to right,rgba(217,184,111,.3),transparent)`}}/>
  </div>;
}

function SongCardStar({item}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}${item.version?" "+item.version:""}`);
  return <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(217,184,111,.3)",borderRadius:14,padding:"20px",marginBottom:10,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:"radial-gradient(circle,rgba(217,184,111,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",letterSpacing:".12em",textTransform:"uppercase",color:G}}>{item.momento}</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",color:"rgba(217,184,111,.4)",fontStyle:"italic"}}>El momento más recordado</div>
      </div>
      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(248,242,230,.3)",flexShrink:0,marginLeft:8}}>{item.duracion}</span>
    </div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.3rem,3vw,1.55rem)",color:C,marginBottom:3,lineHeight:1.2}}>{item.cancion}</div>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:DIM,marginBottom:item.razon?12:0}}>{item.artista}{item.version&&<em style={{color:"rgba(248,242,230,.3)",fontStyle:"italic"}}> · {item.version}</em>}</div>
    {item.razon&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:"rgba(248,242,230,.62)",lineHeight:1.65,margin:"0 0 12px",fontStyle:"italic",borderLeft:"2px solid rgba(217,184,111,.25)",paddingLeft:12}}>{item.razon}</p>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      {item.alt&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(248,242,230,.28)"}}>Alt: {item.alt}</span>}
      <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer">▶ Escuchar</a>
    </div>
  </div>;
}

function SongCard({item,idx}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}${item.version?" "+item.version:""}`);
  const isNovia=item.momento?.toLowerCase().includes("novia");
  if(isNovia) return <SongCardStar item={item}/>;
  return <div style={{background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.09)",borderRadius:12,padding:"14px 16px",marginBottom:9,display:"flex",gap:12,alignItems:"flex-start"}}>
    <div style={{flexShrink:0,marginTop:2,textAlign:"center"}}>
      <div style={{fontSize:"1.2rem"}}>{item.icono}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".72rem",color:"rgba(217,184,111,.4)"}}>{String(idx+1).padStart(2,"0")}</div>
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(217,184,111,.5)",marginBottom:3}}>{item.momento}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:C,marginBottom:2,lineHeight:1.2}}>{item.cancion}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,marginBottom:item.razon?6:0}}>{item.artista}{item.version&&<em style={{color:"rgba(248,242,230,.28)",fontStyle:"italic"}}> · {item.version}</em>}{item.duracion&&<span style={{color:"rgba(248,242,230,.22)",marginLeft:8}}>{item.duracion}</span>}</div>
      {item.razon&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(248,242,230,.5)",lineHeight:1.55,margin:"0 0 8px",fontStyle:"italic"}}>{item.razon}</p>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
        {item.alt&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(248,242,230,.24)"}}>Alt: {item.alt}</span>}
        <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".82rem",padding:"6px 12px"}}>▶</a>
      </div>
    </div>
  </div>;
}

function PlaylistRow({item,num}){
  const q=encodeURIComponent(`${item.c||""} ${item.a||""}`);
  return <div style={{display:"grid",gridTemplateColumns:"22px 1fr auto auto",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(217,184,111,.05)"}}>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(217,184,111,.3)",textAlign:"center"}}>{num}</div>
    <div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.3}}>{item.c}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:DIM}}>{item.a}</div>
    </div>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",color:"rgba(248,242,230,.2)",whiteSpace:"nowrap"}}>{item.d}</div>
    <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{padding:"5px 10px",fontSize:".8rem"}}>▶</a>
  </div>;
}

function CheckItem({label,done,onToggle,important}){
  return <div className="ci" onClick={onToggle}>
    <div className={`cb${done?" ck":""}`} style={{borderColor:important&&!done?"rgba(217,184,111,.45)":undefined}}>
      {done&&<span style={{color:G,fontSize:".65rem",fontWeight:700}}>✓</span>}
    </div>
    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:done?"rgba(248,242,230,.22)":C,textDecoration:done?"line-through":"none",lineHeight:1.55,transition:"all .2s"}}>{label}</span>
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

  if(!items || items.length === 0) return <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:DIM,textAlign:"center",padding:"20px 0"}}>El guion musical no pudo generarse. Intentá de nuevo.</p>;

  return <div>
    {/* Scroll horizontal */}
    <div ref={scrollRef} style={{display:"flex",overflowX:"auto",gap:14,scrollSnapType:"x mandatory",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",padding:"4px 2px 8px",cursor:"grab"}}>
      {items.map((item,i)=>{
        const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}`);
        const isNovia=item.momento?.toLowerCase().includes("novia");
        return <div key={i} className="momento-slide" style={{
          minWidth:"min(88vw,360px)",maxWidth:380,scrollSnapAlign:"start",flexShrink:0,
          background:isNovia?"linear-gradient(135deg,#152230,#0C1721)":"rgba(17,28,39,.85)",
          border:`1px solid ${isNovia?"rgba(217,184,111,.32)":"rgba(217,184,111,.12)"}`,
          borderRadius:18,padding:"22px 20px",position:"relative",overflow:"hidden"
        }}>
          {isNovia&&<div style={{position:"absolute",top:0,right:0,width:80,height:80,background:"radial-gradient(circle,rgba(217,184,111,.1) 0%,transparent 70%)",pointerEvents:"none"}}/>}
          {/* Número y ícono */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1.4rem"}}>{item.icono||"♪"}</span>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".75rem",letterSpacing:".1em",textTransform:"uppercase",color:G}}>{item.momento}</div>
                {isNovia&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".72rem",color:"rgba(217,184,111,.5)",fontStyle:"italic"}}>El momento más recordado</div>}
              </div>
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".75rem",color:"rgba(248,242,230,.25)",background:"rgba(217,184,111,.06)",padding:"3px 8px",borderRadius:20}}>{item.duracion}</div>
          </div>
          {/* Canción principal */}
          <div style={{borderTop:"1px solid rgba(217,184,111,.1)",paddingTop:14,marginBottom:12}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.2rem,3vw,1.45rem)",color:C,marginBottom:4,lineHeight:1.15}}>{item.cancion}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:DIM}}>{item.artista}{item.version&&<em style={{color:"rgba(248,242,230,.32)",fontStyle:"italic"}}> · {item.version}</em>}</div>
          </div>
          {/* Razón de Ceci */}
          {item.razon&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:"rgba(248,242,230,.6)",lineHeight:1.65,margin:"0 0 14px",fontStyle:"italic",borderLeft:"2px solid rgba(217,184,111,.22)",paddingLeft:12}}>{item.razon}</p>}
          {/* Footer */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginTop:"auto",paddingTop:4}}>
            {item.alt&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(248,242,230,.28)"}}>Alt: {item.alt}</div>}
            <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto"}}>▶ Escuchar</a>
          </div>
        </div>;
      })}
    </div>
    {/* Dots de navegación */}
    <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:12}}>
      {items.map((_,i)=><button key={i} onClick={()=>scrollTo(i)} style={{width:i===activeIdx?22:7,height:7,borderRadius:4,border:"none",background:i===activeIdx?G:"rgba(217,184,111,.2)",cursor:"pointer",transition:"all .3s",padding:0}}/>)}
    </div>
    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(248,242,230,.24)",textAlign:"center",marginTop:6,fontStyle:"italic"}}>
      {activeIdx+1} de {items.length} · Deslizá para ver todos los momentos
    </p>
  </div>;
}


function Results({results,form,checked,setChecked,arquetipo,resultToken,onRestart,onLogout}){
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

  return <div style={{maxWidth:860,margin:"0 auto",background:"#07111B",minHeight:"100vh",padding:"0 0 100px"}}>

    {/* ══ PORTADA ══ */}
    <div className="pdf-cover" style={{padding:"clamp(36px,6vw,64px) clamp(20px,4vw,48px)",textAlign:"center",borderBottom:"1px solid rgba(217,184,111,.08)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(217,184,111,.06) 0%,transparent 100%)",pointerEvents:"none"}}/>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(.72rem,.9vw,.86rem)",letterSpacing:".22em",textTransform:"uppercase",color:"rgba(217,184,111,.5)",marginBottom:18}}>El Violín de Ceci · Tu Banda Sonora de Boda</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2rem,5vw,2.8rem)",fontWeight:600,color:C,margin:"0 0 6px",lineHeight:1.1}}>
        {form.nombre1} <span style={{color:"rgba(217,184,111,.4)",fontWeight:300}}>&</span> {form.nombre2}
      </h1>
      {(fecha||form.ciudad)&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:"rgba(248,242,230,.38)",margin:"0 0 18px",letterSpacing:".04em"}}>{fecha}{fecha&&form.ciudad?" · ":""}{form.ciudad}</p>}
      {arch&&<div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(217,184,111,.08)",border:"1px solid rgba(217,184,111,.22)",borderRadius:100,padding:"9px 20px",marginBottom:16}}>
        <span style={{fontSize:"1.2rem"}}>{arch.e}</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G,fontStyle:"italic"}}>{arch.n}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",color:"rgba(217,184,111,.5)"}}>{arch.m}</div>
        </div>
      </div>}
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(248,242,230,.28)",margin:0,lineHeight:1.6}}>
        No necesitás leer todo de una vez. Abrí cada sección cuando la necesites.
      </p>
    </div>

    <div style={{padding:"24px 20px 0"}}>

      {/* Link privado */}
      {resultToken&&<div className="no-print" style={{background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.16)",borderRadius:14,padding:"14px 18px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:G,marginBottom:3}}>Tu link privado de acceso</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:DIM,lineHeight:1.4}}>Guardalo para volver a tu guion desde cualquier dispositivo.</div>
          </div>
          <button className="lbtn" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?r=${resultToken}`);alert("Link copiado ✓");}catch(e){}}}>Copiar link</button>
        </div>
      </div>}

      {/* ══ 1. RESUMEN GENERAL ══ */}
      <AccordionBlock id="resumen" icon="✦" title="Resumen de su boda" subtitle={`${form.nombre1} & ${form.nombre2}${arch?` · ${arch.n}`:""}`} isOpen={open.resumen} onToggle={()=>toggle("resumen")}>
        <div style={{paddingTop:16}}>
          {results.nota&&<div style={{position:"relative",padding:"20px 20px 16px",borderRadius:12,background:"rgba(12,23,33,.8)",border:"1px solid rgba(217,184,111,.14)",marginBottom:16}}>
            <div style={{position:"absolute",top:12,left:16,fontFamily:"'Playfair Display',serif",fontSize:"3rem",color:"rgba(217,184,111,.07)",lineHeight:1,userSelect:"none"}}>"</div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",fontStyle:"italic",color:C,lineHeight:1.78,margin:"0 0 12px",paddingTop:6}}>{results.nota}</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{height:"1px",width:20,background:G,opacity:.4}}/>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:G}}>Ceci · El Violín de Ceci</div>
            </div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16}}>
            {[{l:"Pareja",v:`${form.nombre1} & ${form.nombre2}`},{l:"Fecha",v:fecha||"—"},{l:"Ciudad",v:form.ciudad||"—"},{l:"Arquetipo",v:arch?.n||"—"}].map(it=><div key={it.l} style={{background:"rgba(17,28,39,.7)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(217,184,111,.08)"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(217,184,111,.45)",marginBottom:4}}>{it.l}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.3}}>{it.v}</div>
            </div>)}
          </div>
          <button className="pbtn" onClick={()=>setOpen(o=>({...o,guion:true,resumen:false}))} style={{width:"100%"}}>Empezar por mi guion musical →</button>
        </div>
      </AccordionBlock>

      {/* ══ 2. ARQUETIPO ══ */}
      <AccordionBlock id="arquetipo" icon={arch?.e||"♪"} title="Su perfil musical" subtitle={arch?`${arch.n} · ${arch.m}`:""} isOpen={open.arquetipo} onToggle={()=>toggle("arquetipo")}>
        {arch&&results.perfil&&<div style={{paddingTop:16}}>
          <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(217,184,111,.12)",marginBottom:12}}>
            <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",padding:"16px 18px",borderBottom:"1px solid rgba(217,184,111,.1)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:"1.8rem"}}>{arch.e}</span>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontStyle:"italic",color:G}}>{arch.n}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(217,184,111,.5)",marginTop:2}}>{arch.m}</div>
                </div>
              </div>
            </div>
            <div style={{background:"rgba(17,28,39,.7)",padding:"14px 18px"}}>
              {results.perfil.cluster&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".76rem",letterSpacing:".14em",textTransform:"uppercase",color:"rgba(217,184,111,.4)",marginBottom:8}}>{results.perfil.cluster}</div>}
              {results.perfil.desc&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.68,margin:"0 0 8px"}}>{results.perfil.desc}</p>}
              {results.perfil.concepto&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(248,242,230,.4)",lineHeight:1.62,fontStyle:"italic",margin:0,borderTop:"1px solid rgba(217,184,111,.06)",paddingTop:10}}>{results.perfil.concepto}</p>}
            </div>
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:DIM,lineHeight:1.6,fontStyle:"italic",padding:"0 4px"}}>{arch.d}</div>
        </div>}
      </AccordionBlock>

      {/* ══ 3. GUION ══ */}
      <AccordionBlock id="guion" icon="♩" title="Guion musical de la ceremonia" subtitle="Deslizá para ver cada momento de la ceremonia" isOpen={open.guion} onToggle={()=>toggle("guion")} defaultTag="Principal">
        <div style={{paddingTop:16}}>
          {isCatolica&&<div style={{background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.14)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:DIM,margin:0,lineHeight:1.6}}>⚠️ Los momentos litúrgicos (Aleluya, Comunión, Ofertorio) requieren música aprobada por la iglesia. Confirmá con el sacerdote antes de cerrar el repertorio.</p>
          </div>}
          <GuionCarousel items={results.guion||[]}/>
        </div>
      </AccordionBlock>

      {/* ══ 4. PLAYLISTS ══ */}
      {(results.coctel?.length>0||results.cena?.length>0)&&<AccordionBlock id="playlists" icon="◈" title="Playlists de cóctel y cena" subtitle="Canciones curadas para después de la ceremonia" isOpen={open.playlists} onToggle={()=>toggle("playlists")}>
        <div style={{paddingTop:16}}>
          {results.coctel?.length>0&&<div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(217,184,111,.45)",marginBottom:8}}>Cóctel</div>
            <div style={{background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.07)",borderRadius:12,padding:"4px 14px"}}>
              {results.coctel.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
            </div>
          </div>}
          {results.cena?.length>0&&<div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(217,184,111,.45)",marginBottom:8}}>Cena</div>
            <div style={{background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.07)",borderRadius:12,padding:"4px 14px"}}>
              {results.cena.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
            </div>
          </div>}
        </div>
      </AccordionBlock>}

      {/* ══ 5. CHECKLIST ══ */}
      <AccordionBlock id="checklist" icon="✓" title="Checklist de coordinación" subtitle={`${doneItems} de ${totalItems} tareas completadas · ${pct}%`} isOpen={open.checklist} onToggle={()=>toggle("checklist")}>
        <div style={{paddingTop:16}}>
          <div style={{background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.1)",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:C}}>{doneItems} de {totalItems} completados</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",color:pct===100?G:DIM}}>{pct}%</div>
            </div>
            <div style={{height:5,background:"rgba(217,184,111,.1)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(to right,${G},#E6C76A)`,borderRadius:3,transition:"width .4s ease"}}/>
            </div>
            {pct===100&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:G,fontStyle:"italic",margin:"8px 0 0",textAlign:"center"}}>¡Todo listo para el gran día! ✨</p>}
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
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:G}}>{cat.l}</div>
                <div style={{flex:1,height:"1px",background:"rgba(217,184,111,.08)"}}/>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",color:"rgba(217,184,111,.35)"}}>
                  {checklistFull[cat.k].filter((_,i)=>checked[`${cat.k}_${i}`]).length}/{checklistFull[cat.k].length}
                </div>
              </div>
              <div style={{background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.07)",borderRadius:12,padding:"2px 14px"}}>
                {checklistFull[cat.k].map((item,i)=><CheckItem key={i} label={item} done={!!checked[`${cat.k}_${i}`]} onToggle={()=>tog(`${cat.k}_${i}`)} important={cat.important.includes(i)}/>)}
              </div>
            </div>
          ))}
          {results.errores?.length>0&&<>
            <SecLabel>⚠ Errores frecuentes para esta boda</SecLabel>
            {results.errores.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<results.errores.length-1?"1px solid rgba(217,184,111,.06)":"none"}}>
                <div style={{width:22,height:22,minWidth:22,borderRadius:"50%",background:"rgba(217,184,111,.08)",border:"1px solid rgba(217,184,111,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",color:G,flexShrink:0,marginTop:2}}>!</div>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.62,margin:0}}>{e}</p>
              </div>
            ))}
          </>}
        </div>
      </AccordionBlock>

      {/* ══ 6. COMPARTIR ══ */}
      <AccordionBlock id="compartir" icon="📤" title="Compartir con proveedores" subtitle="Mensajes listos para enviar por WhatsApp a cada proveedor" isOpen={open.compartir} onToggle={()=>toggle("compartir")}>
        <div style={{paddingTop:16}}>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,lineHeight:1.65,marginBottom:14}}>Estos botones preparan un mensaje de WhatsApp adaptado para cada proveedor. No todos necesitan recibir la misma información — cada uno recibe exactamente lo que necesita.</p>
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
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,lineHeight:1.65,marginBottom:14}}>Guardá tu guion como PDF para tenerlo siempre a mano o enviárselo a tu planner.</p>
          <button onClick={()=>window.print()} style={{width:"100%",background:"rgba(17,28,39,.7)",border:"1px solid rgba(217,184,111,.14)",borderRadius:12,padding:"14px 18px",fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:"1.2rem"}}>🖨️</span>
            <div>
              <div style={{marginBottom:2}}>Guardar como PDF</div>
              <div style={{fontSize:".85rem",color:"rgba(248,242,230,.3)"}}>En el diálogo de impresión, elegí "Guardar como PDF"</div>
            </div>
          </button>
          {resultToken&&<div style={{background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.14)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:G,marginBottom:6}}>Volver a tu resultado desde cualquier dispositivo</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:DIM,wordBreak:"break-all",marginBottom:10,lineHeight:1.4}}>{typeof window!=="undefined"?`${window.location.origin}${window.location.pathname}?r=${resultToken}`:""}</div>
            <button className="lbtn" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?r=${resultToken}`);alert("Link copiado ✓");}catch(e){}}}>Copiar link privado</button>
          </div>}
        </div>
      </AccordionBlock>

      {/* ══ UPSELL ══ */}
      <div className="no-print" style={{marginTop:20,background:"linear-gradient(135deg,#152230,#07111B)",border:"1px solid rgba(217,184,111,.22)",borderRadius:18,padding:"clamp(22px,4vw,32px)",textAlign:"center"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:".76rem",letterSpacing:".16em",textTransform:"uppercase",color:G,marginBottom:12}}>Servicio adicional</div>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.3rem,3vw,1.6rem)",fontWeight:600,color:C,margin:"0 0 10px",lineHeight:1.2}}>¿Querés que Ceci revise tu guion con vos?</h3>
        <div style={{display:"inline-block",background:"rgba(217,184,111,.1)",border:"1px solid rgba(217,184,111,.28)",borderRadius:100,padding:"7px 20px",marginBottom:14}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.08rem",color:G,fontWeight:600,letterSpacing:".02em"}}>Revisión personalizada de 45 minutos — USD 30</span>
        </div>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:DIM,lineHeight:1.68,margin:"0 auto 20px",maxWidth:400}}>Escribile a Ceci por WhatsApp y coordinan fecha y forma de pago.</p>
        <a className="pbtn" href="https://wa.me/595985689454?text=Hola%20Ceci!%20Me%20interesa%20la%20revisión%20personalizada%20de%20mi%20guion%20musical%20(USD%2030%20-%2045%20min)" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",textDecoration:"none"}}>Escribirle a Ceci →</a>
        <p style={{marginTop:12,fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(248,242,230,.2)"}}>@elviolindececi · +595 985 689 454</p>
      </div>

      <div className="no-print" style={{textAlign:"center",marginTop:20}}>
        <button className="gbtn" onClick={onRestart} style={{marginRight:8}}>← Volver a hacer el test</button>
        <button className="gbtn" onClick={onLogout}>Cerrar sesión</button>
      </div>

    </div>
  </div>;
}

function AuthScreen({ initialMode="login", initialError="", onPasswordUpdated }={}){
  const [mode,setMode]=useState(initialMode);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState(initialError || "");

  useEffect(()=>{
    setMode(initialMode || "login");
    setErr(initialError || "");
    setMsg("");
  },[initialMode, initialError]);

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
    if(!email || !password) return setErr("Completá email y contraseña.");
    if(password.length<6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options:{ emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    if(error){
      const msg = error.message?.toLowerCase();
      if(msg?.includes("already")) return setErr("Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.");
      return setErr("No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.");
    }
    setMsg("Cuenta creada. Revisá tu email para confirmar el acceso — puede llegar en unos minutos.");
    setMode("login");
  };

  const signIn=async()=>{
    clean();
    if(!email || !password) return setErr("Completá email y contraseña.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });
    setLoading(false);
    if(error) return setErr("No pudimos iniciar sesión. Revisá el email y la contraseña.");
  };

  const forgot=async()=>{
    clean();
    if(!email) return setErr("Escribí tu email para recuperar la contraseña.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/?auth=recovery`
    });
    setLoading(false);
    if(error) return setErr(error.message);
    setMsg("Te enviamos un email para crear una nueva contraseña.");
  };

  const updatePassword=async()=>{
    clean();
    if(!newPassword || newPassword.length<6) return setErr("La nueva contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password:newPassword });
    setLoading(false);
    if(error) return setErr(error.message);
    setMsg("Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.");
    try { await supabase.auth.signOut(); } catch(e) {}
    setMode("login");
    if(onPasswordUpdated) onPasswordUpdated();
  };

  const title = mode==="signup" ? "Crear mi cuenta" : mode==="forgot" ? "Recuperar contraseña" : mode==="update" ? "Crear nueva contraseña" : "Entrar a mi producto";
  const subtitle = mode==="signup" ? "Usá el mismo email con el que compraste el producto." : mode==="forgot" ? "Te enviaremos un link para crear una nueva contraseña." : mode==="update" ? "Definí una nueva contraseña para volver a entrar." : "Iniciá sesión para ver o crear tu guion musical.";

  return <div style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle at 50% 0%, rgba(217,184,111,.10), transparent 42%), #0C1721",padding:"clamp(18px,4vw,42px)"}}>
    <div className="fu auth-card" style={{textAlign:"center"}}>
      <div className="brand-logo" style={{marginBottom:14}}>El Violín de Ceci</div>
      <h1 className="brand-title" style={{fontSize:"clamp(1.85rem,6vw,2.35rem)",margin:"0 0 8px"}}>{title}</h1>
      <p className="brand-copy" style={{fontSize:"clamp(1rem,3vw,1.12rem)",margin:"0 0 22px"}}>{subtitle}</p>

      {mode!=="update"&&<>
        <input type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={{textAlign:"center",marginBottom:12}} />
        {mode!=="forgot"&&<input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} style={{textAlign:"center",marginBottom:18}} />}
      </>}

      {mode==="update"&&<input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{textAlign:"center",marginBottom:18}} />}

      {err&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"#ff8b8b",lineHeight:1.5,margin:"0 0 12px"}}>{err}</p>}
      {msg&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(217,184,111,.85)",lineHeight:1.5,margin:"0 0 12px"}}>{msg}</p>}

      {mode==="login"&&<button className="pbtn" disabled={loading} onClick={signIn} style={{width:"100%"}}>{loading?"Entrando...":"Entrar →"}</button>}
      {mode==="signup"&&<button className="pbtn" disabled={loading} onClick={signUp} style={{width:"100%"}}>{loading?"Creando...":"Crear cuenta →"}</button>}
      {mode==="forgot"&&<button className="pbtn" disabled={loading} onClick={forgot} style={{width:"100%"}}>{loading?"Enviando...":"Enviar recuperación →"}</button>}
      {mode==="update"&&<button className="pbtn" disabled={loading} onClick={updatePassword} style={{width:"100%"}}>{loading?"Guardando...":"Guardar nueva contraseña →"}</button>}

      <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid rgba(217,184,111,.12)",display:"flex",flexDirection:"column",gap:8}}>
        {mode!=="login"&&<button className="gbtn" onClick={()=>{clean();setMode("login");}} style={{width:"100%"}}>Ya tengo cuenta</button>}
        {mode!=="signup"&&mode!=="update"&&<button className="gbtn" onClick={()=>{clean();setMode("signup");}} style={{width:"100%"}}>Crear cuenta nueva</button>}
        {mode!=="forgot"&&mode!=="update"&&<button onClick={()=>{clean();setMode("forgot");}} style={{background:"transparent",border:"none",color:"rgba(217,184,111,.55)",fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",cursor:"pointer",textDecoration:"underline",marginTop:2}}>Olvidé mi contraseña</button>}
      </div>
    </div>
  </div>;
}


function HomeScreen({ user, hasResults, form, resultToken, onViewResults, onStartNew, onLogout }){
  const pareja = [form?.nombre1, form?.nombre2].filter(Boolean).join(" & ");
  const link = resultToken && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?r=${resultToken}` : "";
  const [copied, setCopied] = useState(false);
  const copyLink = async()=>{
    if(!link) return;
    try{
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2400);
    }catch(e){}
  };

  return <div style={{minHeight:"100svh",background:`radial-gradient(ellipse 80% 50% at 50% 0%, rgba(217,184,111,.08), transparent 60%), ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(20px,4vw,48px)"}}>
    <div className="fu" style={{width:"100%",maxWidth:"min(680px,calc(100vw - 32px))",textAlign:"center"}}>

      <div className="brand-logo" style={{marginBottom:20}}>El Violín de Ceci</div>

      {hasResults ? <>
        <h1 className="brand-title" style={{fontSize:"clamp(2.2rem,6vw,3.2rem)",margin:"0 0 12px"}}>
          Tu guion musical está guardado
        </h1>
        <p className="brand-copy" style={{fontSize:"clamp(1rem,2.4vw,1.18rem)",margin:"0 auto 28px",maxWidth:520,lineHeight:1.75}}>
          No hace falta completar el test de nuevo. Podés volver a ver tu resultado, copiar tu link privado o crear una nueva versión si cambió algo de la boda.
        </p>

        {pareja&&<div style={{background:BG2,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 20px",marginBottom:16,textAlign:"left"}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".13em",textTransform:"uppercase",color:"rgba(217,184,111,.55)",marginBottom:6}}>Resultado guardado</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.25rem",color:C}}>{pareja}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:DIM,marginTop:3}}>{user?.email}</div>
        </div>}

        {link&&<div style={{background:"rgba(217,184,111,.06)",border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 18px",marginBottom:22,textAlign:"left"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".13em",textTransform:"uppercase",color:G,marginBottom:4}}>Link privado para volver a tu guion</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:DIMSOFT,lineHeight:1.45,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</div>
            </div>
            <button className="lbtn" onClick={copyLink} style={{flexShrink:0}}>{copied?"¡Copiado ✓":"Copiar link"}</button>
          </div>
        </div>}

        <button className="pbtn" onClick={onViewResults} style={{width:"100%",marginBottom:10,fontSize:"1.1rem"}}>Ver mi resultado →</button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button className="gbtn" onClick={onStartNew}>Hacer el test de nuevo</button>
          <button className="gbtn" onClick={onLogout}>Cerrar sesión</button>
        </div>

      </> : <>
        <h1 className="brand-title" style={{fontSize:"clamp(2.2rem,6vw,3.2rem)",margin:"0 0 12px"}}>
          Bienvenidos a su producto
        </h1>
        <p className="brand-copy" style={{fontSize:"clamp(1rem,2.4vw,1.18rem)",margin:"0 auto 10px",maxWidth:520,lineHeight:1.75}}>
          Su acceso ya está activo. Ahora pueden crear su guion musical personalizado.
        </p>
        <p className="brand-copy" style={{fontSize:"clamp(.95rem,1.8vw,1.05rem)",margin:"0 auto 16px",maxWidth:480,lineHeight:1.7,opacity:.7}}>
          Van a responder algunas preguntas sobre su boda y su estilo musical. Al final van a recibir:
        </p>
        <div style={{background:"rgba(217,184,111,.05)",border:"1px solid rgba(217,184,111,.12)",borderRadius:14,padding:"16px 18px",marginBottom:24,textAlign:"left",maxWidth:480,margin:"0 auto 24px"}}>
          {["🎼 Guion musical personalizado con canciones para cada momento","✅ Checklist musical para coordinar con sus proveedores","📋 Plantilla para cargar sus canciones","📤 Mensajes listos para enviar a DJ, músico y planner"].map((item,i)=>(
            <div key={i} style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.95rem,1.6vw,1.05rem)",color:C,lineHeight:1.65,padding:"5px 0",borderBottom:i<3?"1px solid rgba(217,184,111,.08)":"none"}}>{item}</div>
          ))}
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(217,184,111,.6)",marginTop:10,fontStyle:"italic",lineHeight:1.6}}>
            💡 Si tienen dudas sobre cómo usar algún recurso, no olviden ver el video explicativo en el área de miembros de Hotmart.
          </div>
        </div>

        <div style={{background:BG2,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 20px",marginBottom:24,textAlign:"left"}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".13em",textTransform:"uppercase",color:"rgba(217,184,111,.55)",marginBottom:6}}>Cuenta activa</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",color:C}}>{user?.email}</div>
        </div>

        <button className="pbtn" onClick={onStartNew} style={{width:"100%",marginBottom:10,fontSize:"1.1rem"}}>Crear mi guion musical →</button>
        <button className="gbtn" onClick={onLogout} style={{width:"100%"}}>Cerrar sesión</button>
      </>}
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

export default function App(){
  const [view,setView]=useState("auth");
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

  // Persist form and step in localStorage so tab switches don't reset progress
  useEffect(()=>{
    try{ localStorage.setItem("bsb_form", JSON.stringify(form)); }catch(e){}
  },[form]);
  useEffect(()=>{
    try{ localStorage.setItem("bsb_step", String(step)); }catch(e){}
  },[step]);

  useEffect(()=>{
    const s=document.createElement("style");s.id="wsa-css";s.textContent=CSS;
    document.head.appendChild(s);
    return()=>{const el=document.getElementById("wsa-css");if(el)el.remove();};
  },[]);

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
      setUser(data.session?.user || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session)=>{
      if(event === "PASSWORD_RECOVERY"){
        setRecoveryMode(true);
        setAuthNotice("");
        setView("auth");
      }
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return()=>subscription.unsubscribe();
  },[]);

  // ─── Cargar resultado del usuario cuando inicia sesión ────────────────────
  const hydrateFromSession = (remote, email, tokenFromUrl=null) => {
    const safeForm = {...EMPTY_FORM, ...(remote.form || {}), email: remote.email || email || remote.form?.email || ""};
    setResults(remote.results);
    setForm(safeForm);
    setArquetipo(remote.arquetipo || null);
    setChecked(remote.checked || {});
    setResultToken(remote.result_token || tokenFromUrl || null);
    setView("results");

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
        setView("auth");
        return;
      }

      const email = user.email || "";
      setForm(f=>({...f,email}));

      try{
        const params = new URLSearchParams(window.location.search);
        const token = params.get("r");
        let remote = null;

        // 1) Si el link trae result_token, intentamos cargar ese resultado.
        if(token){
          remote = await cargarSesionPorToken(token);
        }

        // 2) Si no hay token o no encontró nada, cargamos el último resultado del usuario.
        if(!remote){
          remote = await cargarSesionPorUsuario(user.id);
        }

        // 3) Fallback por email: útil si quedó una fila vieja o migrada.
        if(!remote && email){
          remote = await cargarSesion(email);
        }

        if(remote?.results){
          hydrateFromSession(remote, email, token);
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
              setView("results");
              return;
            }
          }
        }catch(e){}

        // Si no existe resultado, no mandamos directo al cuestionario: mostramos un tablero claro.
        setResults(null);
        setView("home");
      }catch(e){
        console.error("Error cargando sesión del usuario:", e);
        setView("home");
      }
    };
    loadUserSession();
  },[user,authLoading,recoveryMode]);

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
  const syncChecked = (newChecked) => {
    if(!user?.id) return;
    clearTimeout(checkedTimer.current);
    checkedTimer.current = setTimeout(()=>{
      try{ localStorage.setItem("bsb_session", JSON.stringify({results,form,arquetipo,checked:newChecked,result_token:resultToken,user_id:user.id})); }catch(e){}
      actualizarChecked({ user_id:user.id, email:form.email, checked:newChecked });
    }, 800);
  };

  const logout = async()=>{
    try{localStorage.removeItem("bsb_session");}catch(e){}
    await supabase.auth.signOut();
    window.history.replaceState({}, "", window.location.pathname);
    setUser(null);
    setView("auth");
    setStep(1);
    setResults(null);
    setChecked({});
    setForm({...EMPTY_FORM});
    setArquetipo(null);
    setResultToken(null);
  };

  const generate=async()=>{
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

    const ctx=`Pareja: ${formWithEmail.nombre1} y ${formWithEmail.nombre2}. Ciudad: ${formWithEmail.ciudad||"nd"}. Invitados: ${formWithEmail.invitados||"nd"}. Ceremonias: ${formWithEmail.tipoCeremonia.join(" + ")||"nd"}. Restricciones iglesia: ${formWithEmail.restriccionIglesia||"ninguna"}. Lugar ceremonia religiosa: ${formWithEmail.lugarCeremoniaReligiosa||"nd"}. Lugar ceremonia civil/otra: ${formWithEmail.lugarCeremonia||"nd"}. Duración: ${formWithEmail.duracion||"nd"}. Formato musical: ${formWithEmail.formatoMusical.join(", ")||"nd"}. Arquetipo: ${archData.n}. Objetivo emocional: ${formWithEmail.objetivoEmocional||"nd"}. Géneros: ${formWithEmail.generos.join(", ")||"nd"}. Artistas ref: ${formWithEmail.artistas||"nd"}. Prohibidas: ${formWithEmail.cancionesProhibidas||"ninguna"}. Idioma: ${formWithEmail.idioma||"nd"}. Momentos a cubrir: ${momentosStr}. Canción personal: ${formWithEmail.cancionPersonal||"ninguna"}. Qué quieren que recuerden: ${formWithEmail.recuerdo||"nd"}.`;

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

      const p2 = CECI_VOICE + "\nBODA: " + ctx + ". Arquetipo: " + archData.n + ". Estilo: " + (r1.perfil?.cluster||"romantico") + ".\nCRITERIO POR MOMENTO (la funcion emocional y los ejemplos son la guia real de Ceci, basate en ellos para elegir o inspirarte, ajustando al estilo/generos de la pareja si corresponde):\n" + momentosListado + "\nDevuelve SOLO JSON COMPACTO EN UNA SOLA LINEA. Sin saltos de linea. Strings cortos sin comillas internas:\n{\"guion\":[{\"momento\":\"nombre\",\"icono\":\"emoji\",\"cancion\":\"titulo\",\"artista\":\"artista\",\"version\":\"version\",\"duracion\":\"2:30\",\"razon\":\"razon corta sin comillas\",\"alt\":\"titulo - artista\"}]}\nLa cancion elegida para cada momento debe cumplir la FUNCION EMOCIONAL descripta en el criterio, no ser generica. El campo 'version' es OBLIGATORIO y debe indicar el formato de interpretacion mas adecuado para el momento de CEREMONIA (ej: 'Instrumental violin', 'Violin y piano', 'Version acustica', 'Cuarteto de cuerdas', 'Vocal original') segun el formato musical disponible de la pareja; si tienen DJ o solo grabada y el momento lo permite, version puede ser 'Original'. Para momentos liturgicos usa SOLO musica sacra aprobada. Incluye TODOS los momentos listados, en el mismo orden.";
      const r2 = await callAIWithRetry(p2, 3000);

      setPhase(2);
      const p3 = CECI_VOICE + "\nBODA: " + ctx + ". Arquetipo: " + archData.n + ".\nCRITERIO COCTEL: " + CECI_COCTEL_GUIA + "\nCRITERIO CENA: " + CECI_CENA_GUIA + "\nSOLO JSON COMPACTO EN UNA LINEA sin saltos de linea. Strings cortos sin comillas internas:\n{\"coctel\":[{\"c\":\"cancion\",\"a\":\"artista\",\"d\":\"3:30\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"cena\":[{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"checklist\":{\"dj\":[\"item1\",\"item2\",\"item3\"],\"musicos\":[\"item1\",\"item2\"],\"planner\":[\"item1\",\"item2\"],\"pareja\":[\"consejo1\",\"consejo2\",\"consejo3\"]},\"errores\":[\"error1 con solucion\",\"error2\",\"error3\"]}\nLas canciones de coctel y cena deben cumplir el criterio descripto arriba (atmosfera, volumen y estilos sugeridos), no ser temas genericos de fiesta.";
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

  if(authLoading) return <div style={{minHeight:"100vh",background:"#07111B",display:"flex",alignItems:"center",justifyContent:"center",color:C,fontFamily:"'Cormorant Garamond',serif"}}>Cargando acceso...</div>;
  if(recoveryMode) return <AuthScreen initialMode="update" initialError={authNotice} onPasswordUpdated={()=>{
    setRecoveryMode(false);
    setAuthNotice("");
    setUser(null);
    setView("auth");
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }}/>;
  if(!user || view==="auth") return <AuthScreen initialMode="login" initialError={authNotice}/>;
  if(view==="home") return <HomeScreen
    user={user}
    hasResults={!!results}
    form={form}
    resultToken={resultToken}
    onViewResults={()=>setView("results")}
    onStartNew={()=>{
      try{localStorage.removeItem("bsb_session");}catch(e){}
      window.history.replaceState({}, "", window.location.pathname);
      setStep(1);
      setResults(null);
      setChecked({});
      setForm({...EMPTY_FORM,email:user.email||""});
      setArquetipo(null);
      setResultToken(null);
      setView("guia");
    }}
    onLogout={logout}
  />;
  if(view==="landing") return <Landing onStart={()=>setView("guia")}/>;
  if(view==="guia") return <GuiaCanciones onStart={()=>setView("form")} onBack={()=>setView("home")}/>;
  if(view==="form") return <Form step={step} setStep={setStep} form={form} setForm={setForm} onSubmit={generate} error={error}/>;
  if(view==="generating") return <Generating names={`${form.nombre1} & ${form.nombre2}`} phase={phase}/>;
  if(view==="results") return <Results results={results} form={form} checked={checked} setChecked={(fn)=>{ const next=typeof fn==='function'?fn(checked):fn; setChecked(next); syncChecked(next); }} arquetipo={arquetipo} resultToken={resultToken} onLogout={logout} onRestart={()=>{
    try{localStorage.removeItem("bsb_session");}catch(e){}
    window.history.replaceState({}, "", window.location.pathname);
    setView("guia");setStep(1);setResults(null);setChecked({});setForm({...EMPTY_FORM,email:user.email||""});setArquetipo(null);setResultToken(null);
  }}/>;

  return <HomeScreen user={user} hasResults={!!results} form={form} resultToken={resultToken} onViewResults={()=>setView("results")} onStartNew={()=>setView("guia")} onLogout={logout}/>;
}

