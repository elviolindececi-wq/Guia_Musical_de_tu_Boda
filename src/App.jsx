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
    return await sbFetch('sesiones?on_conflict=user_id', {
      method: 'POST',
      upsert: true,
      body: JSON.stringify({
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
        result_token
      })
    });
  } catch(e) {
    console.error('Error guardando sesión:', e);
    return null;
  }
};

const cargarSesion = async (email) => {
  try {
    return await sbFetch(`sesiones?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&limit=1`);
  } catch(e) { return null; }
};

const cargarSesionPorUsuario = async (userId) => {
  try {
    if (!userId) return null;
    return await sbFetch(`sesiones?user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  } catch(e) { return null; }
};

const cargarSesionPorToken = async (token) => {
  try {
    if (!token) return null;
    return await sbFetch(`sesiones?result_token=eq.${encodeURIComponent(token)}&limit=1`);
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
html{font-size:clamp(16px,1.1vw,19px);scroll-behavior:smooth}
body{margin:0;background:#0C1721;color:#F7F2EA;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
button,input,textarea{font:inherit}
button{-webkit-tap-highlight-color:transparent}
#root{min-height:100vh;background:#0C1721}
@media(max-width:480px){html{font-size:16px} body{min-width:320px}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.fu{animation:fadeUp .5s ease both}
.fu1{animation:fadeUp .5s .07s ease both;opacity:0}
.fu2{animation:fadeUp .5s .14s ease both;opacity:0}
.fu3{animation:fadeUp .5s .21s ease both;opacity:0}
.fu4{animation:fadeUp .5s .28s ease both;opacity:0}
.fu5{animation:fadeUp .5s .35s ease both;opacity:0}
input,textarea{background:transparent;border:none;border-bottom:1px solid rgba(201,160,85,.22);color:#F7F2EA;font-family:'Cormorant Garamond',serif;font-size:1.1rem;padding:12px 2px;width:100%;outline:none;transition:border-color .3s;-webkit-appearance:none}
input:focus,textarea:focus{border-bottom-color:#D9B873}
input::placeholder,textarea::placeholder{color:rgba(247,242,234,.3);font-style:italic}
input[type=date]{color-scheme:dark}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#D9B873;border-radius:2px}
.tag{display:inline-block;padding:9px 16px;border:1px solid rgba(201,160,85,.22);border-radius:100px;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:1rem;color:rgba(247,242,234,.52);transition:all .2s;user-select:none;margin:3px 3px 3px 0}
.tag:hover{border-color:rgba(201,160,85,.5);color:#F7F2EA}
.tag.sel{background:rgba(201,160,85,.12);border-color:#D9B873;color:#E6C781}
.pill{display:flex;align-items:center;gap:10px;padding:14px 18px;border:1px solid rgba(201,160,85,.17);border-radius:12px;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:rgba(247,242,234,.6);transition:all .2s;user-select:none;width:100%;margin-bottom:9px;background:transparent;text-align:left;line-height:1.4}
.pill:hover{border-color:rgba(201,160,85,.38);color:#F7F2EA;background:rgba(201,160,85,.04)}
.pill.sel{background:rgba(201,160,85,.09);border-color:#D9B873;color:#F7F2EA}
.pbtn{background:linear-gradient(135deg,#D9B873,#E9C978);color:#0C1721;border:none;padding:16px 38px;font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:600;letter-spacing:.06em;border-radius:100px;cursor:pointer;transition:all .3s;min-height:54px;white-space:nowrap}
.pbtn:active{transform:scale(.98)}
.pbtn:disabled{opacity:.28;cursor:not-allowed;transform:none}
.gbtn{background:transparent;color:rgba(247,242,234,.42);border:1px solid rgba(247,242,234,.14);padding:13px 24px;font-family:'Cormorant Garamond',serif;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;min-height:52px}
.gbtn:hover{border-color:rgba(247,242,234,.28);color:rgba(247,242,234,.72)}
.wbtn{background:rgba(37,211,102,.1);color:#2ECC71;border:1px solid rgba(37,211,102,.28);padding:13px 20px;font-family:'Cormorant Garamond',serif;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;text-decoration:none;line-height:1.3}
.wbtn:hover{background:rgba(37,211,102,.18);border-color:rgba(37,211,102,.5)}
.scard{background:#111D28;border:1px solid rgba(201,160,85,.1);border-radius:14px;padding:20px;margin-bottom:12px}
.lbtn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border:1px solid rgba(201,160,85,.3);border-radius:100px;color:#D9B873;font-family:'Cormorant Garamond',serif;font-size:.95rem;cursor:pointer;background:transparent;transition:all .2s;text-decoration:none;white-space:nowrap}
.lbtn:hover{background:rgba(201,160,85,.08)}
.ci{display:flex;align-items:flex-start;gap:12px;padding:14px 0;cursor:pointer;border-bottom:1px solid rgba(201,160,85,.05)}
.ci:last-child{border-bottom:none}
.cb{width:22px;height:22px;min-width:22px;border:1px solid rgba(201,160,85,.3);border-radius:4px;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.cb.ck{background:rgba(201,160,85,.18);border-color:#D9B873}
.divider{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.divider::before,.divider::after{content:'';flex:1;height:1px}
.divider::before{background:linear-gradient(to right,transparent,rgba(201,160,85,.18))}
.divider::after{background:linear-gradient(to left,transparent,rgba(201,160,85,.18))}
.fl{font-family:'Cormorant Garamond',serif;font-size:.82rem;letter-spacing:.13em;text-transform:uppercase;color:rgba(201,160,85,.55);margin-top:26px;margin-bottom:10px}
.sl-n{font-family:'Cormorant Garamond',serif;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:#D9B873;margin-bottom:8px}
.sl-t{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,5vw,2rem);font-weight:700;color:#F7F2EA;margin:0 0 6px;line-height:1.15}
.sl-s{font-family:'Cormorant Garamond',serif;font-size:1rem;color:rgba(247,242,234,.44);margin:0;font-style:italic;line-height:1.5}
.song-item{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid rgba(201,160,85,.06)}
.song-item:last-child{border-bottom:none}
.song-num{width:24px;height:24px;min-width:24px;border-radius:50%;background:rgba(201,160,85,.1);border:1px solid rgba(201,160,85,.22);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:.8rem;color:#D9B873;margin-top:2px;flex-shrink:0}
.song-ceci{font-family:'Cormorant Garamond',serif;font-size:.9rem;color:rgba(201,160,85,.6);font-style:italic;margin-top:4px;line-height:1.5}
.guide-sec{background:#111D28;border:1px solid rgba(201,160,85,.1);border-radius:14px;padding:20px 22px;margin-bottom:14px}
.guide-sec-title{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:600;color:#E6C781;margin:0 0 4px}
.guide-sec-sub{font-family:'Cormorant Garamond',serif;font-size:.9rem;color:rgba(247,242,234,.38);font-style:italic;margin:0 0 14px}
.tab{padding:10px 18px;font-family:'Cormorant Garamond',serif;font-size:.95rem;border-radius:100px;cursor:pointer;border:1px solid rgba(201,160,85,.2);color:rgba(247,242,234,.45);background:transparent;transition:all .2s;white-space:nowrap;min-height:42px}
.tab.act{background:rgba(201,160,85,.12);border-color:#D9B873;color:#E6C781}
.moment-card{border:1px solid rgba(201,160,85,.12);border-radius:13px;padding:17px 18px;margin-bottom:10px;background:#111D28;cursor:pointer;transition:border-color .2s}
.moment-card:hover{border-color:rgba(201,160,85,.28)}
.moment-card.sel{border-color:#D9B873;background:rgba(201,160,85,.05)}
.info-box{background:rgba(201,160,85,.05);border:1px solid rgba(201,160,85,.15);border-radius:10px;padding:14px 16px;margin-top:10px}
.arch-badge{display:inline-flex;align-items:center;gap:9px;background:rgba(201,160,85,.09);border:1px solid rgba(201,160,85,.25);border-radius:100px;padding:8px 18px;margin-bottom:14px}
@media(max-width:480px){
  .pbtn{width:100%;justify-content:center;display:flex;align-items:center}
  .tag{font-size:.92rem;padding:8px 13px}
  .lbtn{font-size:.88rem;padding:7px 13px}
}

.brand-logo{font-family:'Cinzel',serif;font-size:clamp(.7rem,1vw,.92rem);letter-spacing:.32em;text-transform:uppercase;color:#D9B873;font-weight:500}
.brand-title{font-family:'Playfair Display',serif;font-weight:600;color:#F7F2EA;letter-spacing:.04em;line-height:1.15;text-wrap:balance}
.brand-title .gold{color:#D9B873}
.brand-subtitle{font-family:'Cormorant Garamond',serif;color:rgba(247,242,234,.82);font-weight:600;text-wrap:balance}
.brand-copy{font-family:'Cormorant Garamond',serif;color:rgba(247,242,234,.68);line-height:1.75}
.responsive-shell{width:100%;max-width:1120px;margin:0 auto;padding-left:clamp(18px,4vw,48px);padding-right:clamp(18px,4vw,48px)}
.auth-card{width:100%;max-width:min(460px,calc(100vw - 32px));background:rgba(17,28,39,.88)!important;backdrop-filter:blur(14px);border:1px solid rgba(217,184,115,.22)!important;border-radius:24px!important;padding:clamp(24px,5vw,38px)!important;box-shadow:0 28px 90px rgba(0,0,0,.36)}
.auth-card input{background:rgba(247,242,234,.96)!important;color:#0C1721!important;border:1px solid rgba(217,184,115,.2)!important;border-radius:0!important;padding:14px 14px!important;font-family:'Cormorant Garamond',serif!important;font-weight:600;box-shadow:none!important}
.auth-card input::placeholder{color:rgba(12,23,33,.45)!important}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;min-height:min(760px,100svh);padding-top:clamp(54px,9vw,112px);padding-bottom:clamp(54px,9vw,112px);text-align:center}
.hero-title{font-size:clamp(2.7rem,9vw,6.2rem);max-width:980px;margin:0 auto 28px}
.hero-kicker{margin-bottom:clamp(34px,7vw,72px)}
.hero-sub{font-size:clamp(1.35rem,3vw,2rem);font-style:italic;margin:0 0 12px}
.hero-line{font-family:'Cormorant Garamond',serif;font-size:clamp(1rem,2vw,1.35rem);font-weight:700;letter-spacing:.02em;color:rgba(247,242,234,.86);margin:0}
@media(min-width:900px){
  .desktop-two-col{display:grid!important;grid-template-columns:1fr 1fr;gap:22px;align-items:start}
  .results-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}
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

@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  html,body{background:#fff!important;color:#1a1a1a!important;font-size:13px!important}
  body{padding:0!important;margin:0!important}
  .no-print,.pbtn,.gbtn,.wbtn,.lbtn{display:none!important}
  .print-page{page-break-before:always;padding:0}
  @page{margin:1.8cm;size:A4}
  @page:first{margin-top:2.4cm}

  /* Portada */
  .pdf-cover{background:#0C1721!important;color:#F7F2EA!important;padding:48px 40px!important;min-height:200px!important;border-radius:0!important;text-align:center;margin-bottom:24px;border-bottom:3px solid #D9B873}
  .pdf-cover h1{color:#F7F2EA!important;font-size:28px!important;margin:0 0 6px!important}
  .pdf-cover .sub{color:#D9B873!important;font-size:13px!important}

  /* Secciones */
  .divider{margin:18px 0 14px!important}
  .divider::before,.divider::after{background:rgba(0,0,0,.15)!important}
  .divider h2{color:#854F0B!important;font-size:13px!important;font-weight:700!important}

  /* Cards */
  .scard{background:#faf8f5!important;border:1px solid #e0d5c0!important;border-radius:8px!important;break-inside:avoid;margin-bottom:10px!important;padding:14px!important}
  .song-star-card{background:#faf5ec!important;border:2px solid #D9B873!important;border-radius:8px!important;break-inside:avoid;margin-bottom:10px!important;padding:14px!important}
  .moment-card{background:#faf8f5!important;border:1px solid #e0d5c0!important;break-inside:avoid}

  /* Tipografía */
  h1,h2,h3{color:#1a1a1a!important}
  [style*="color:#F7F2EA"],[style*="color: #F7F2EA"]{color:#1a1a1a!important}
  [style*="color:rgba(247,242,234"]{color:#555!important}
  [style*="color:#D9B873"],[style*="color: #D9B873"],[style*="color:#E6C781"]{color:#854F0B!important}
  [style*="background:#0"],[style*="background: #0"],[style*="background:#0e"]{background:#fff!important}
  [style*="background:#0f"]{background:#faf8f5!important}

  /* Checklist */
  .ci{border-bottom:1px solid #e8e0d0!important}
  .cb{border:1px solid #D9B873!important;border-radius:3px!important}
  .cb.ck{background:#D9B873!important}

  /* Guía: forzar mostrar todas las secciones */
  .pdf-guia-section{display:block!important;break-inside:avoid;margin-bottom:16px}
  .song-item{border-bottom:1px solid #e8e0d0!important}
}
`;

const G="#D9B873", C="#F7F2EA", DIM="rgba(247,242,234,.68)";

const CECI_VOICE = `Sos Ceci, violinista con 200 bodas en Paraguay y Brasil. Estilo: Emocional, Elegante, Cinematográfico.
FILOSOFÍA: La música no es decoración — es la emoción que todos van a recordar. Lo que la gente recuerda es cómo se sintió cuando empezó la música. En boda luxury, hasta los silencios tienen intención.
ERRORES: elegir pensando en el público no en los novios; canciones de moda que no los representan; ignorar la letra; dejar la música para último; canciones rítmicas sin voz (Your Song, Signed Sealed Delivered pierden fuerza en instrumental).
SIEMPRE FUNCIONA: Can't Help Falling in Love.
CONTEXTO PARAGUAY: Muchas bodas combinan civil + religioso el mismo día. Religiosas católicas en iglesia. No-católicas y civiles en venues.`;

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
    background:"#0C1721",
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

      <div style={{...readableStyle,background:"rgba(17,28,39,.88)",border:"1px solid rgba(217,184,115,.18)",borderRadius:22,padding:"clamp(20px,3vw,32px)",marginBottom:"clamp(24px,3vw,34px)",boxShadow:"0 24px 70px rgba(0,0,0,.22)"}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.08rem,1.35vw,1.25rem)",color:C,lineHeight:1.75,margin:"0 0 10px"}}>Esta guía reúne el criterio de Ceci después de más de 200 bodas. No es una lista de Spotify — es lo que realmente funciona en cada momento, con la explicación de por qué.</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1rem,1.2vw,1.12rem)",color:"rgba(217,184,115,.68)",fontStyle:"italic",margin:0,lineHeight:1.6}}>Usala como punto de partida. Para que sea 100% tuya, hacé el test personalizado al final.</p>
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
          <div style={{background:"rgba(217,184,115,.06)",border:"1px solid rgba(217,184,115,.14)",borderRadius:14,padding:"14px 16px",marginBottom:22}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.98rem,1.1vw,1.08rem)",color:"rgba(217,184,115,.78)",margin:0,lineHeight:1.55}}>⚠️ {momento.errores}</p>
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(217,184,115,.55)",marginBottom:12}}>Las más pedidas por los novios</div>
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
          <div style={{background:"rgba(17,28,39,.72)",border:"1px solid rgba(217,184,115,.14)",borderRadius:22,padding:"clamp(20px,2.5vw,30px)",marginBottom:22}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(217,184,115,.55)",marginBottom:16}}>5 reglas de Ceci para elegir bien</div>
            {GUIA_TIPS.map((tip,i)=><div key={i} style={{display:"flex",gap:14,paddingBottom:16,borderBottom:i<4?"1px solid rgba(217,184,115,.08)":"none",marginBottom:16}}>
              <div style={{width:30,height:30,minWidth:30,borderRadius:"50%",background:"rgba(217,184,115,.1)",border:"1px solid rgba(217,184,115,.22)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:G,flexShrink:0,marginTop:2}}>{i+1}</div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.05rem,1.2vw,1.18rem)",color:C,marginBottom:5,lineHeight:1.25}}>{tip.t}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(.98rem,1.1vw,1.06rem)",color:DIM,lineHeight:1.62}}>{tip.d}</div>
              </div>
            </div>)}
          </div>

          <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(217,184,115,.24)",borderRadius:22,padding:"clamp(24px,3vw,34px)",textAlign:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:G,marginBottom:12}}>El siguiente nivel</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.55rem,2.4vw,2.1rem)",fontWeight:600,color:C,margin:"0 0 12px",lineHeight:1.15}}>Hacé el test personalizado</h3>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.02rem,1.2vw,1.14rem)",color:DIM,lineHeight:1.65,margin:"0 0 24px"}}>La guía te da el criterio general. El test crea el guion musical exacto para tu boda — con tu arquetipo, tus momentos elegidos y el checklist para tus proveedores.</p>
            <button className="pbtn" onClick={onStart}>Crear mi guion personalizado →</button>
            <p style={{marginTop:12,fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(247,242,234,.24)"}}>15 minutos · Resultado inmediato</p>
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
  {id:"salida",icono:"🎊",nombre:"Salida de los novios",emocion:"Primera celebración juntos",desc:"Acaban de decirse que sí. Puede subir la energía para arrancar la fiesta o ser un momento íntimo de transición.",duracion:"2–3 min"},
];

const MOMENTOS_CATOLICA = [
  {id:"llegada",icono:"🕯️",nombre:"Llegada de invitados",emocion:"Recogimiento y anticipación",desc:"En una iglesia católica, la atmósfera es distinta. La música debe crear un ambiente sagrado y respetuoso.",duracion:"20–40 min antes"},
  {id:"cortejo",icono:"🌸",nombre:"Entrada del cortejo / familiares",emocion:"Procesión solemne",desc:"Familiares y padrinos entran. Música suave, respetuosa con el espacio litúrgico.",duracion:"2–4 min"},
  {id:"novio",icono:"🤵",nombre:"Entrada del novio",emocion:"Solemnidad y presencia",desc:"El novio entra al espacio sagrado. La música lo acompaña con dignidad.",duracion:"1–2 min"},
  {id:"novia",icono:"👰",nombre:"Entrada de la novia ★",emocion:"El momento más recordado — sagrado y emotivo",desc:"En la iglesia, la entrada de la novia tiene un peso especial. La música debe respetar el espacio pero también honrar la emoción.",duracion:"1.5–3 min"},
  {id:"aleluya",icono:"✨",nombre:"Aleluya / antes del Evangelio",emocion:"Celebración litúrgica",desc:"⚠️ Momento litúrgico obligatorio. Debe ser el Aleluya u otro himno aprobado por la iglesia. No se puede reemplazar por música secular.",duracion:"1–2 min",obligatorio:true},
  {id:"ofertorio",icono:"🙏",nombre:"Ofertorio",emocion:"Ofrenda y recogimiento",desc:"Durante la preparación del altar. Música sacra, suave, que acompaña sin distraer.",duracion:"3–5 min"},
  {id:"comunion",icono:"🕊️",nombre:"Comunión",emocion:"Paz y profundidad espiritual",desc:"Momento de mayor recogimiento de la misa. La música debe ser sacra o en algunos casos se permite música más suave y contemplativa.",duracion:"5–10 min"},
  {id:"firmas",icono:"📜",nombre:"Firma de las actas",emocion:"Intimidad y detalle",desc:"Mientras los novios firman, un momento musical íntimo puede llenar el espacio.",duracion:"3–5 min"},
  {id:"salida",icono:"🎊",nombre:"Salida de los novios",emocion:"Alegría y celebración",desc:"La iglesia permite más libertad en la salida. Es el primer momento de alegría compartida.",duracion:"2–3 min"},
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
const LOCAL_API_URL = "http://127.0.0.1:3001/api/generate";
const VIDEO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

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
    throw new Error("La API local no devolvió respuesta. Verificá que node server.cjs esté corriendo.");
  }

  let d;
  try {
    d = JSON.parse(raw);
  } catch (err) {
    console.error("Respuesta no JSON de la API local:", raw);
    throw new Error("La API local devolvió una respuesta inválida.");
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
      throw new Error("Claude devolvió JSON mal formado. Intentá de nuevo.");
    }
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
    {Array.from({length:6}).map((_,i)=>(<div key={i} style={{width:i===step-1?24:6,height:5,borderRadius:3,background:i<step?G:"rgba(201,160,85,.1)",transition:"all .35s"}}/>))}
  </div>;
}

function Landing({onStart}){
  return <div style={{background:"#0C1721",minHeight:"100vh",overflow:"hidden"}}>
    <section className="responsive-shell hero-grid" style={{position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 18%, rgba(217,184,115,.10), transparent 38%), radial-gradient(circle at 50% 100%, rgba(247,242,234,.035), transparent 48%)",pointerEvents:"none"}}/>
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
        <div style={{background:"#111C27",border:"1px solid rgba(217,184,115,.14)",borderRadius:22,padding:"clamp(22px,4vw,34px)"}}>
          <div className="brand-logo" style={{fontSize:".7rem",letterSpacing:".18em",marginBottom:14}}>El problema que nadie habla</div>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0 0 14px"}}>Podés tener el mejor salón, el vestido perfecto y una decoración impecable — pero si la música no está pensada, el momento puede no sentirse como lo imaginaste.</p>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0",color:G,fontStyle:"italic"}}>La música no es un detalle. Es lo que transforma una boda bonita en un recuerdo inolvidable.</p>
        </div>
        <div style={{position:"relative",width:"100%",paddingTop:"56.25%",borderRadius:22,overflow:"hidden",background:"#111C27",border:"1px solid rgba(217,184,115,.16)",boxShadow:"0 24px 80px rgba(0,0,0,.32)"}}>
          <iframe src={VIDEO_URL} title="Ceci" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}}/>
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
            <div key={i} style={{background:"#111C27",border:"1px solid rgba(217,184,115,.10)",borderRadius:18,padding:"20px 18px"}}>
              <div style={{fontSize:"1.65rem",marginBottom:10}}>{item.e}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.08rem",color:C,marginBottom:6}}>{item.t}</div>
              <div className="brand-copy" style={{fontSize:".98rem",lineHeight:1.6}}>{item.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:"clamp(36px,6vw,64px)",background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(217,184,115,.24)",borderRadius:24,padding:"clamp(28px,5vw,46px)",textAlign:"center"}}>
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

  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0C1721",padding:"32px 24px"}}>
    <div style={{maxWidth:440,width:"100%",textAlign:"center"}} className="fu">
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".2em",textTransform:"uppercase",color:G,marginBottom:18}}>El Violín de Ceci</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.85rem",fontWeight:700,color:C,margin:"0 0 12px"}}>Tu guion musical está listo.</h2>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",color:DIM,lineHeight:1.7,margin:"0 0 10px"}}>Dejá tu email para recibir el resultado y el video de Ceci.</p>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(201,160,85,.45)",fontStyle:"italic",margin:"0 0 28px"}}>📧 También te enviamos el video de Ceci explicando cómo usarlo.</p>
      <input type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setNotFound(false);}} style={{textAlign:"center",fontSize:"1.15rem",marginBottom:16}}/>
      {notFound&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".9rem",color:"rgba(201,160,85,.7)",margin:"0 0 12px",fontStyle:"italic"}}>No encontramos ese email. Continuá para crear tu guion nuevo.</p>}
      <button className="pbtn" disabled={!ok} onClick={()=>{setForm(f=>({...f,email}));onContinue();}} style={{width:"100%",marginBottom:12}}>
        Ver mi resultado →
      </button>
      <div style={{borderTop:"1px solid rgba(201,160,85,.1)",paddingTop:16,marginTop:4}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(247,242,234,.3)",margin:"0 0 10px"}}>¿Ya completaste el test antes?</p>
        <button className="gbtn" disabled={!ok||recovering} onClick={handleRecover} style={{width:"100%"}}>
          {recovering?"Buscando tu guion...":"Recuperar mi guion anterior →"}
        </button>
      </div>
      <p style={{marginTop:14,fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(247,242,234,.2)"}}>Sin spam. Solo tu guion y novedades de Ceci.</p>
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
  const isCatolica=form.tipoCeremonia.includes("Religiosa católica");
  const momentosDisponibles=isCatolica?MOMENTOS_CATOLICA:MOMENTOS_CIVIL_SIMBOLICA;
  const wrap=ch=><div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#0C1721",padding:"24px 22px",maxWidth:"min(820px,calc(100vw - 32px))",margin:"0 auto"}}>
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

  if(step===2) return wrap(<>
    <SL n={2} l="La ceremonia" sub="Podés combinar — en Paraguay es muy común hacer el civil y el religioso el mismo día."/>
    <FL>Tipo de ceremonia</FL>
    {["Religiosa católica","Religiosa no-católica","Civil","Simbólica","Otra"].map(v=>(
      <Pill key={v} label={v} selected={form.tipoCeremonia.includes(v)} onClick={()=>tog("tipoCeremonia",v)}/>
    ))}
    {isCatolica&&<div className="info-box">
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,margin:"0 0 12px",lineHeight:1.6}}>
        ⚠️ La iglesia católica tiene momentos litúrgicos con música obligatoria (Aleluya, Comunión). Muchas iglesias solo permiten música sacra. Siempre consultá con el sacerdote antes de definir el repertorio.
      </p>
      <FL>¿Hay restricciones musicales específicas?</FL>
      <input placeholder="ej: Solo música sacra, no canciones en inglés..." value={form.restriccionIglesia||""} onChange={e=>set("restriccionIglesia",e.target.value)}/>
    </div>}
    {(form.tipoCeremonia.includes("Civil")||form.tipoCeremonia.includes("Simbólica")||form.tipoCeremonia.includes("Religiosa no-católica")||form.tipoCeremonia.includes("Otra"))&&<>
      <FL>¿Dónde será la ceremonia?</FL>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
        {["Salón de fiestas","Al aire libre","Hacienda / estancia","Hotel","Espacio íntimo","Otro"].map(v=><Tag key={v} label={v} selected={form.lugarCeremonia===v} onClick={()=>set("lugarCeremonia",v)}/>)}
      </div>
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

  if(step===5) return wrap(<>
    <SL n={5} l="Los momentos de tu ceremonia" sub="Tocá cada momento para ver qué emoción debe tener. Seleccioná los que quieren cubrir."/>
    <div style={{marginTop:4}}>
      {momentosDisponibles.map((m,i)=>{
        const sel=form.momentosSeleccionados.includes(m.id);
        return <div key={m.id} className={`moment-card${sel?" sel":""}`} onClick={()=>tog("momentosSeleccionados",m.id)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",color:sel?G:C}}>{m.icono} {m.nombre}</div>
            {m.obligatorio&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".75rem",color:"rgba(201,160,85,.6)",border:"1px solid rgba(201,160,85,.25)",borderRadius:100,padding:"2px 8px",flexShrink:0,marginLeft:8}}>obligatorio</span>}
            {!m.obligatorio&&<div style={{width:20,height:20,borderRadius:3,border:`1px solid ${sel?G:"rgba(201,160,85,.3)"}`,background:sel?"rgba(201,160,85,.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:8}}>
              {sel&&<span style={{color:G,fontSize:".62rem",fontWeight:700}}>✓</span>}
            </div>}
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:G,marginBottom:5,fontStyle:"italic"}}>{m.emocion} · {m.duracion}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(247,242,234,.52)",lineHeight:1.58}}>{m.desc}</div>
        </div>;
      })}
    </div>
    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(247,242,234,.3)",marginTop:10,fontStyle:"italic"}}>
      Seleccioná al menos un momento para continuar.
    </p>
  </>);

  return wrap(<>
    <SL n={6} l="Lo que hace especial a su boda"/>
    <FL>¿Tienen una canción que los une como pareja?</FL>
    <textarea rows={2} placeholder="ej: una canción que escucharon juntos en un viaje, o que sonaba cuando se conocieron..." value={form.cancionPersonal} onChange={e=>set("cancionPersonal",e.target.value)} style={{resize:"none"}}/>
    <FL>¿Qué querés que la gente sienta o recuerde musicalmente? *</FL>
    <textarea rows={3} placeholder="Contanos con tus palabras, sin filtros — esto es lo que más importa..." value={form.recuerdo} onChange={e=>set("recuerdo",e.target.value)} style={{resize:"none"}}/>
    <p style={{marginTop:24,fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:"rgba(247,242,234,.22)",lineHeight:1.65,fontStyle:"italic"}}>Con estas respuestas, Ceci crea un guion que no podría aplicarse a ninguna otra boda.</p>
  </>);
}

const PHASE_MSGS=[
  ["Descubriendo su arquetipo musical…","Analizando quiénes son como pareja…"],
  ["Eligiendo canciones para cada momento…","Aplicando criterio de más de 200 bodas…"],
  ["Armando checklist para todos los proveedores…","Finalizando tu guion musical…"]
];
function Generating({names,phase}){
  const [i,setI]=useState(0);
  const pool=PHASE_MSGS[phase]||PHASE_MSGS[0];
  useEffect(()=>{const t=setInterval(()=>setI(x=>(x+1)%pool.length),2200);return()=>clearInterval(t);},[phase]);
  return <div style={{minHeight:"100vh",background:"#0C1721",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
    <div style={{position:"relative",width:72,height:72,marginBottom:32}}>
      <div style={{position:"absolute",inset:0,border:"1px solid rgba(201,160,85,.07)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",inset:0,border:"2px solid transparent",borderTopColor:G,borderRadius:"50%",animation:"spin 1.4s linear infinite"}}/>
      <div style={{position:"absolute",inset:10,border:"1px solid rgba(201,160,85,.1)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:G,fontSize:"1.25rem"}}>♪</div>
    </div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.35rem",fontWeight:400,color:C,margin:"0 0 10px"}}>Creando la banda sonora de {names}</h2>
    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:DIM,animation:"pulse 2.2s ease infinite",fontStyle:"italic",margin:"0 0 8px"}}>{pool[i]}</p>
    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(247,242,234,.18)"}}>Paso {phase+1} de 3</p>
  </div>;
}


// ─── JERARQUÍA VISUAL: 3 niveles ──────────────────────────────────────────
// NIVEL 1 — Portada: nombre, fecha, arquetipo (impacto máximo)
// NIVEL 2 — Secciones: separadores con título dorado
// NIVEL 3 — Contenido: cards con peso variable según importancia

function SecLabel({children}){
  return <div style={{display:"flex",alignItems:"center",gap:12,margin:"36px 0 18px"}}>
    <div style={{height:"1px",width:20,background:`linear-gradient(to right,transparent,rgba(201,160,85,.3))`}}/>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:"rgba(201,160,85,.5)",whiteSpace:"nowrap"}}>{children}</div>
    <div style={{height:"1px",flex:1,background:`linear-gradient(to right,rgba(201,160,85,.3),transparent)`}}/>
  </div>;
}

// Canción ESTRELLA (entrada de la novia) — máximo peso visual
function SongCardStar({item}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}`);
  return <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(201,160,85,.28)",borderRadius:16,padding:"24px 22px",marginBottom:12,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:"radial-gradient(circle,rgba(201,160,85,.07) 0%,transparent 70%)",pointerEvents:"none"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:"1.4rem"}}>{item.icono}</span>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".12em",textTransform:"uppercase",color:G}}>{item.momento}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",color:"rgba(201,160,85,.4)",fontStyle:"italic"}}>El momento más recordado</div>
        </div>
      </div>
      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(247,242,234,.3)",flexShrink:0,marginLeft:8}}>{item.duracion}</span>
    </div>
    <div style={{borderTop:"1px solid rgba(201,160,85,.1)",paddingTop:12,marginBottom:12}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.45rem",color:C,marginBottom:4,lineHeight:1.2}}>{item.cancion}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",color:DIM}}>{item.artista}{item.version&&<em style={{color:"rgba(247,242,234,.3)",fontStyle:"italic"}}> · {item.version}</em>}</div>
    </div>
    {item.razon&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.02rem",color:"rgba(247,242,234,.62)",lineHeight:1.65,margin:"0 0 14px",fontStyle:"italic",borderLeft:"2px solid rgba(201,160,85,.25)",paddingLeft:12}}>{item.razon}</p>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      {item.alt&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(247,242,234,.28)"}}>Alternativa: {item.alt}</span>}
      <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer">▶ Escuchar</a>
    </div>
  </div>;
}

// Canción normal — peso medio
function SongCard({item,idx}){
  const q=encodeURIComponent(`${item.cancion||""} ${item.artista||""}`);
  const isNovia=item.momento?.toLowerCase().includes("novia");
  if(isNovia) return <SongCardStar item={item}/>;
  return <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.09)",borderRadius:13,padding:"16px 18px",marginBottom:10,display:"flex",gap:14,alignItems:"flex-start"}}>
    <div style={{flexShrink:0,marginTop:2,textAlign:"center"}}>
      <div style={{fontSize:"1.3rem",marginBottom:2}}>{item.icono}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".72rem",color:"rgba(201,160,85,.4)",letterSpacing:".04em"}}>{String(idx+1).padStart(2,"0")}</div>
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,160,85,.5)",marginBottom:4}}>{item.momento}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.12rem",color:C,marginBottom:2,lineHeight:1.2}}>{item.cancion}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:DIM,marginBottom:item.razon?8:0}}>{item.artista}{item.version&&<em style={{color:"rgba(247,242,234,.28)",fontStyle:"italic"}}> · {item.version}</em>}{item.duracion&&<span style={{color:"rgba(247,242,234,.22)",marginLeft:8}}>{item.duracion}</span>}</div>
      {item.razon&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".93rem",color:"rgba(247,242,234,.5)",lineHeight:1.58,margin:"0 0 8px",fontStyle:"italic"}}>{item.razon}</p>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
        {item.alt&&<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(247,242,234,.24)"}}>Alt: {item.alt}</span>}
        <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{fontSize:".82rem"}}>▶</a>
      </div>
    </div>
  </div>;
}

// Playlist — peso ligero, compacto
function PlaylistRow({item,num}){
  const q=encodeURIComponent(`${item.c||""} ${item.a||""}`);
  return <div style={{display:"grid",gridTemplateColumns:"22px 1fr auto auto",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(201,160,85,.05)"}}>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(201,160,85,.3)",textAlign:"center"}}>{num}</div>
    <div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.3}}>{item.c}</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:DIM}}>{item.a}</div>
    </div>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".8rem",color:"rgba(247,242,234,.2)",whiteSpace:"nowrap"}}>{item.d}</div>
    <a className="lbtn" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" style={{padding:"5px 10px",fontSize:".8rem"}}>▶</a>
  </div>;
}

// Checklist item con peso variable
function CheckItem({label,done,onToggle,important}){
  return <div className="ci" onClick={onToggle}>
    <div className={`cb${done?" ck":""}`} style={{borderColor:important&&!done?"rgba(201,160,85,.45)":undefined,background:done?"rgba(201,160,85,.16)":important?"rgba(201,160,85,.05)":undefined}}>
      {done&&<span style={{color:G,fontSize:".65rem",fontWeight:700}}>✓</span>}
    </div>
    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:done?"rgba(247,242,234,.22)":important?C:C,textDecoration:done?"line-through":"none",lineHeight:1.55,transition:"all .2s",fontWeight:important&&!done?"500":"normal"}}>{label}</span>
  </div>;
}

function Results({results,form,checked,setChecked,arquetipo,resultToken,onRestart,onLogout}){
  const tog=k=>setChecked(c=>({...c,[k]:!c[k]}));
  if(!results) return null;

  const fecha=form.fechaBoda?new Date(form.fechaBoda+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}):"";
  const arch=ARQUETIPOS[arquetipo];
  const isCatolica=form.tipoCeremonia?.includes("Religiosa católica");
  const tieneMusico=form.formatoMusical?.some(f=>["Violín en vivo","Banda","Cuarteto cuerdas","Piano","Cantante"].includes(f));

  const checklistFull={
    planner:[...CHECKLIST_BASE.planner,...(results.checklist?.planner||[])],
    dj:[...CHECKLIST_BASE.dj,...(results.checklist?.dj||[])],
    musicos:tieneMusico?[...CHECKLIST_BASE.musicos,...(results.checklist?.musicos||[])]:[],
    iglesia:isCatolica?CHECKLIST_BASE.iglesia:[],
    pareja:[...CHECKLIST_BASE.pareja,...(results.checklist?.pareja||[])],
  };

  // Contar items completados
  const totalItems=Object.values(checklistFull).flat().length;
  const doneItems=Object.entries(checklistFull).flatMap(([k,items])=>items.map((_,i)=>checked[`${k}_${i}`])).filter(Boolean).length;
  const pct=totalItems>0?Math.round(doneItems/totalItems*100):0;

  return <div style={{maxWidth:1120,margin:"0 auto",background:"#0C1721",minHeight:"100vh"}}>

    {/* ══ PORTADA — Nivel 1, máximo impacto ══ */}
    <div className="pdf-cover" style={{padding:"52px 24px 40px",textAlign:"center",borderBottom:"1px solid rgba(201,160,85,.08)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,160,85,.06) 0%,transparent 100%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"1px",height:60,background:"linear-gradient(to bottom,transparent,rgba(201,160,85,.3),transparent)"}}/>
      {/* Eyebrow */}
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".22em",textTransform:"uppercase",color:"rgba(201,160,85,.5)",marginBottom:20}}>El Violín de Ceci · Tu Banda Sonora de Boda</div>
      {/* Nombres — el elemento más grande y prominente */}
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(2rem,6vw,2.8rem)",fontWeight:400,color:C,margin:"0 0 6px",lineHeight:1.1}}>{form.nombre1} <span style={{color:"rgba(201,160,85,.4)",fontWeight:300}}>&</span> {form.nombre2}</h1>
      {(fecha||form.ciudad)&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:"rgba(247,242,234,.38)",margin:"0 0 18px",letterSpacing:".04em"}}>{fecha}{fecha&&form.ciudad?" · ":""}{form.ciudad}</p>}
      {/* Arquetipo badge — segundo elemento de jerarquía */}
      {arch&&<div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(201,160,85,.08)",border:"1px solid rgba(201,160,85,.22)",borderRadius:100,padding:"9px 20px",marginBottom:6}}>
        <span style={{fontSize:"1.2rem"}}>{arch.e}</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G,fontStyle:"italic"}}>{arch.n}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",color:"rgba(201,160,85,.5)"}}>{arch.m}</div>
        </div>
      </div>}
    </div>

    <div style={{padding:"0 20px 80px"}}>

      {/* ══ VIDEO DE CECI ══ */}
      <SecLabel>📹 Antes de leer — un mensaje de Ceci</SecLabel>
      <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.12)",borderRadius:14,padding:"20px",textAlign:"center"}}>
        <div style={{fontSize:"2.2rem",marginBottom:8}}>🎻</div>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",color:C,margin:"0 0 6px"}}>El video de Ceci está en camino</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:DIM,lineHeight:1.62,margin:"0 0 10px"}}>Ceci te explica cómo leer este guion, cómo coordinarlo con tus proveedores y los 3 errores más comunes.</p>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(201,160,85,.5)",fontStyle:"italic",margin:0}}>📧 Llegará a {form.email||"tu email"} en los próximos minutos.</p>
      </div>

      {resultToken&&<div className="no-print" style={{background:"rgba(201,160,85,.05)",border:"1px solid rgba(201,160,85,.16)",borderRadius:14,padding:"16px 18px",marginTop:14}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G,marginBottom:6}}>Link privado de acceso</div>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:DIM,lineHeight:1.55,margin:"0 0 10px"}}>Guardá este enlace. La pareja puede volver directo a su guion desde cualquier dispositivo.</p>
        <input readOnly value={`${window.location.origin}${window.location.pathname}?r=${resultToken}`} onFocus={e=>e.target.select()} style={{fontSize:".82rem",color:C,marginBottom:10}} />
        <button className="gbtn" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?r=${resultToken}`); alert('Link copiado');}catch(e){}}} style={{width:"100%"}}>Copiar link privado</button>
      </div>}

      {/* ══ NOTA DE CECI — carta personal ══ */}
      {results.nota&&<>
        <SecLabel>✦ Una nota de Ceci</SecLabel>
        <div style={{position:"relative",padding:"24px 24px 20px",borderRadius:14,background:"#101923",border:"1px solid rgba(201,160,85,.16)"}}>
          <div style={{position:"absolute",top:16,left:20,fontFamily:"'Playfair Display',serif",fontSize:"3.5rem",color:"rgba(201,160,85,.08)",lineHeight:1,userSelect:"none"}}>"</div>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.08rem",fontStyle:"italic",color:C,lineHeight:1.8,margin:"0 0 14px",paddingTop:8}}>{results.nota}</p>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{height:"1px",width:24,background:G,opacity:.4}}/>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:G}}>Ceci · El Violín de Ceci</div>
          </div>
        </div>
      </>}

      {/* ══ ARQUETIPO — perfil completo ══ */}
      {arch&&results.perfil&&<>
        <SecLabel>♪ Su perfil musical</SecLabel>
        <div style={{borderRadius:14,overflow:"hidden",border:"1px solid rgba(201,160,85,.1)"}}>
          {/* Header del arquetipo con color de fondo */}
          <div style={{background:"linear-gradient(135deg,#152230,#0C1721)",padding:"18px 20px",borderBottom:"1px solid rgba(201,160,85,.1)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1.8rem"}}>{arch.e}</span>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontStyle:"italic",color:G}}>{arch.n}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:"rgba(201,160,85,.5)",marginTop:2}}>{arch.m}</div>
              </div>
            </div>
          </div>
          {/* Descripción */}
          <div style={{background:"#111C27",padding:"16px 20px"}}>
            {results.perfil.cluster&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".14em",textTransform:"uppercase",color:"rgba(201,160,85,.4)",marginBottom:8}}>{results.perfil.cluster}</div>}
            {results.perfil.desc&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.68,margin:"0 0 8px"}}>{results.perfil.desc}</p>}
            {results.perfil.concepto&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(247,242,234,.4)",lineHeight:1.62,fontStyle:"italic",margin:0,borderTop:"1px solid rgba(201,160,85,.06)",paddingTop:10}}>{results.perfil.concepto}</p>}
          </div>
        </div>
      </>}

      {/* ══ GUION — corazón del producto ══ */}
      {results.guion?.length>0&&<>
        <SecLabel>♩ Guion musical de la ceremonia</SecLabel>
        {isCatolica&&<div style={{background:"rgba(201,160,85,.05)",border:"1px solid rgba(201,160,85,.14)",borderRadius:10,padding:"12px 15px",marginBottom:14}}>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:DIM,margin:0,lineHeight:1.6}}>⚠️ Los momentos litúrgicos obligatorios (Aleluya, Comunión, Ofertorio) requieren música aprobada por la iglesia. Confirmá con el sacerdote.</p>
        </div>}
        {results.guion.map((item,i)=><SongCard key={i} item={item} idx={i}/>)}
      </>}

      {/* ══ PLAYLISTS — peso secundario ══ */}
      {(results.coctel?.length>0||results.cena?.length>0)&&<>
        <SecLabel>◈ Playlists</SecLabel>
        {results.coctel?.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,160,85,.45)",marginBottom:6,paddingLeft:2}}>Cóctel</div>
          <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.07)",borderRadius:13,padding:"4px 16px"}}>
            {results.coctel.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
          </div>
        </div>}
        {results.cena?.length>0&&<div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".1em",textTransform:"uppercase",color:"rgba(201,160,85,.45)",marginBottom:6,paddingLeft:2}}>Cena</div>
          <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.07)",borderRadius:13,padding:"4px 16px"}}>
            {results.cena.map((item,i)=><PlaylistRow key={i} item={item} num={i+1}/>)}
          </div>
        </div>}
      </>}

      {/* ══ ENVIAR A PROVEEDORES ══ */}
      <SecLabel>📤 Compartir con tus proveedores</SecLabel>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,lineHeight:1.62,marginBottom:12}}>Cada mensaje está adaptado para lo que necesita ese proveedor — no es el mismo texto para todos.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <a className="wbtn" href={`https://wa.me/?text=${generarMsgDJ(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{justifyContent:"center"}}>🎧 DJ</a>
        <a className="wbtn" href={`https://wa.me/?text=${generarMsgPlanner(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{justifyContent:"center"}}>📋 Planner</a>
      </div>
      {tieneMusico&&<a className="wbtn" href={`https://wa.me/?text=${generarMsgMusico(form,results,arch)}`} target="_blank" rel="noopener noreferrer" style={{width:"100%",justifyContent:"center",display:"flex"}}>🎻 Músico en vivo</a>}

      {/* ══ CHECKLIST con progreso ══ */}
      <SecLabel>✓ Checklist de coordinación</SecLabel>
      {/* Barra de progreso */}
      <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.1)",borderRadius:12,padding:"14px 18px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:C}}>{doneItems} de {totalItems} completados</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:pct===100?G:DIM}}>{pct}%</div>
        </div>
        <div style={{height:4,background:"rgba(201,160,85,.1)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(to right,${G},#ddb968)`,borderRadius:2,transition:"width .4s ease"}}/>
        </div>
        {pct===100&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:G,fontStyle:"italic",margin:"8px 0 0",textAlign:"center"}}>¡Todo listo para el gran día! ✨</p>}
      </div>
      {/* Categorías del checklist */}
      {[
        {k:"planner",l:"Wedding Planner",e:"📋",important:[0,1,2]},
        {k:"dj",l:"DJ",e:"🎧",important:[0,1,2]},
        {k:"musicos",l:"Músicos en vivo",e:"🎻",important:[0,1]},
        {k:"iglesia",l:"Iglesia",e:"⛪",important:[0,1,2]},
        {k:"pareja",l:"Para la pareja",e:"💍",important:[0,1,5]},
      ].filter(c=>checklistFull[c.k]?.length>0).map(cat=>(
        <div key={cat.k} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:"1rem"}}>{cat.e}</span>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".1em",textTransform:"uppercase",color:G}}>{cat.l}</div>
            <div style={{flex:1,height:"1px",background:"rgba(201,160,85,.08)"}}/>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",color:"rgba(201,160,85,.35)"}}>
              {checklistFull[cat.k].filter((_,i)=>checked[`${cat.k}_${i}`]).length}/{checklistFull[cat.k].length}
            </div>
          </div>
          <div style={{background:"#111C27",border:"1px solid rgba(201,160,85,.07)",borderRadius:12,padding:"2px 14px"}}>
            {checklistFull[cat.k].map((item,i)=><CheckItem key={i} label={item} done={!!checked[`${cat.k}_${i}`]} onToggle={()=>tog(`${cat.k}_${i}`)} important={cat.important.includes(i)}/>)}
          </div>
        </div>
      ))}

      {/* ══ ERRORES — peso visual de alerta ══ */}
      {results.errores?.length>0&&<>
        <SecLabel>⚠ Errores frecuentes para esta boda</SecLabel>
        {results.errores.map((e,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<results.errores.length-1?"1px solid rgba(201,160,85,.06)":"none"}}>
            <div style={{width:24,height:24,minWidth:24,borderRadius:"50%",background:"rgba(201,160,85,.08)",border:"1px solid rgba(201,160,85,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",color:G,flexShrink:0,marginTop:2}}>!</div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,lineHeight:1.62,margin:0}}>{e}</p>
          </div>
        ))}
      </>}

      {/* ══ EXPORT PDF ══ */}
      <SecLabel>📄 Exportar a PDF</SecLabel>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,lineHeight:1.62,marginBottom:14}}>
        Guardá tu guion como PDF para compartirlo con el DJ, el planner y tus músicos.
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={()=>{
          document.getElementById('pdf-guia-block').style.display='none';
          setTimeout(()=>{ window.print(); setTimeout(()=>{ document.getElementById('pdf-guia-block').style.display='block'; },500); },100);
        }} style={{background:"#111D28",border:"1px solid rgba(201,160,85,.18)",borderRadius:12,padding:"14px 18px",fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.2rem"}}>🎼</span>
          <div>
            <div style={{marginBottom:2}}>Exportar solo el guion musical</div>
            <div style={{fontSize:".85rem",color:"rgba(247,242,234,.3)"}}>Arquetipo · Canciones · Playlists · Checklist</div>
          </div>
        </button>
        <button onClick={()=>{ window.print(); }} style={{background:"#111D28",border:"1px solid rgba(201,160,85,.18)",borderRadius:12,padding:"14px 18px",fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:C,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.2rem"}}>📚</span>
          <div>
            <div style={{marginBottom:2}}>Exportar guion + guía completa</div>
            <div style={{fontSize:".85rem",color:"rgba(247,242,234,.3)"}}>Todo el documento incluyendo la Guía de Canciones de Ceci</div>
          </div>
        </button>
      </div>

      {/* ══ GUIA PARA PDF (visible solo al imprimir) ══ */}
      <div id="pdf-guia-block" className="no-print" style={{display:"none"}}>
      </div>
      <div id="pdf-guia-print" style={{}}>
        <div style={{pageBreakBefore:"always",paddingTop:8}}>
          <SecLabel>📖 Guía de Canciones · El Violín de Ceci</SecLabel>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:DIM,lineHeight:1.62,marginBottom:16}}>Las canciones más pedidas en bodas reales, con el criterio de Ceci para cada momento.</p>
          {Object.entries(CANCIONES_POR_MOMENTO).map(([k,m])=>(
            <div key={k} className="pdf-guia-section" style={{marginBottom:22,breakInside:"avoid"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.05rem",fontWeight:700,color:G,marginBottom:4}}>{m.icono} {m.titulo}</div>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".92rem",color:DIM,lineHeight:1.6,margin:"0 0 8px",fontStyle:"italic"}}>{m.guia}</p>
              <div style={{background:"rgba(201,160,85,.05)",border:"1px solid rgba(201,160,85,.12)",borderRadius:8,padding:"8px 12px",marginBottom:10}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(201,160,85,.7)"}}>⚠ {m.errores}</span>
              </div>
              {m.canciones.map((c,i)=>(
                <div key={i} className="song-item" style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(201,160,85,.06)"}}>
                  <div className="song-num" style={{width:20,height:20,minWidth:20,borderRadius:"50%",background:"rgba(201,160,85,.1)",border:"1px solid rgba(201,160,85,.22)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:".75rem",color:G,flexShrink:0,marginTop:2}}>{i+1}</div>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:C}}>{c.t}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:DIM}}>{c.a}</div>
                    <div className="song-ceci" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",color:"rgba(201,160,85,.6)",fontStyle:"italic"}}>"{c.n}"</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{marginTop:20,borderTop:"1px solid rgba(201,160,85,.1)",paddingTop:16}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".82rem",letterSpacing:".13em",textTransform:"uppercase",color:"rgba(201,160,85,.45)",marginBottom:14}}>5 reglas de Ceci para elegir bien</div>
            {GUIA_TIPS.map((tip,i)=>(
              <div key={i} style={{display:"flex",gap:12,paddingBottom:12,borderBottom:i<4?"1px solid rgba(201,160,85,.06)":"none",marginBottom:12}}>
                <div style={{width:22,height:22,minWidth:22,borderRadius:"50%",background:"rgba(201,160,85,.1)",border:"1px solid rgba(201,160,85,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:G,flexShrink:0}}>{i+1}</div>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:".95rem",color:C,marginBottom:3}}>{tip.t}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".88rem",color:DIM,lineHeight:1.55}}>{tip.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ UPSELL — CTA final ══ */}
      <div style={{marginTop:36,background:"linear-gradient(135deg,#152230,#0C1721)",border:"1px solid rgba(201,160,85,.22)",borderRadius:16,padding:"28px 24px",textAlign:"center"}} className="no-print">
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".78rem",letterSpacing:".16em",textTransform:"uppercase",color:G,marginBottom:10}}>¿Querés que Ceci lo revise con vos?</div>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",fontWeight:400,color:C,margin:"0 0 8px"}}>Revisión personalizada · 45 minutos</h3>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".97rem",color:DIM,lineHeight:1.65,margin:"0 0 20px"}}>Revisamos juntas este guion, ajustamos lo que necesitás y te quedás con todo confirmado.</p>
        <a className="pbtn" href="https://wa.me/595985689454?text=Hola%20Ceci!%20Quiero%20una%20revisión%20personalizada%20de%20mi%20guion%20musical" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",textDecoration:"none"}}>
          Escribirle a Ceci por WhatsApp →
        </a>
        <p style={{marginTop:12,fontFamily:"'Cormorant Garamond',serif",fontSize:".85rem",color:"rgba(247,242,234,.2)"}}>+595 985 689 454 · @elviolindececi</p>
      </div>

      <div style={{textAlign:"center",marginTop:20}} className="no-print">
        <button className="gbtn" onClick={onRestart}>← Crear otro guion</button>
        <button className="gbtn" onClick={onLogout} style={{marginLeft:8}}>Cerrar sesión</button>
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
    if(error) return setErr(error.message);
    setMsg("Cuenta creada. Si Supabase pide confirmación, revisá tu email. Si no, ya podés iniciar sesión.");
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

  return <div style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle at 50% 0%, rgba(217,184,115,.10), transparent 42%), #0C1721",padding:"clamp(18px,4vw,42px)"}}>
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
      {msg&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",color:"rgba(201,160,85,.85)",lineHeight:1.5,margin:"0 0 12px"}}>{msg}</p>}

      {mode==="login"&&<button className="pbtn" disabled={loading} onClick={signIn} style={{width:"100%"}}>{loading?"Entrando...":"Entrar →"}</button>}
      {mode==="signup"&&<button className="pbtn" disabled={loading} onClick={signUp} style={{width:"100%"}}>{loading?"Creando...":"Crear cuenta →"}</button>}
      {mode==="forgot"&&<button className="pbtn" disabled={loading} onClick={forgot} style={{width:"100%"}}>{loading?"Enviando...":"Enviar recuperación →"}</button>}
      {mode==="update"&&<button className="pbtn" disabled={loading} onClick={updatePassword} style={{width:"100%"}}>{loading?"Guardando...":"Guardar nueva contraseña →"}</button>}

      <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid rgba(217,184,115,.12)",display:"flex",flexDirection:"column",gap:8}}>
        {mode!=="login"&&<button className="gbtn" onClick={()=>{clean();setMode("login");}} style={{width:"100%"}}>Ya tengo cuenta</button>}
        {mode!=="signup"&&mode!=="update"&&<button className="gbtn" onClick={()=>{clean();setMode("signup");}} style={{width:"100%"}}>Crear cuenta nueva</button>}
        {mode!=="forgot"&&mode!=="update"&&<button onClick={()=>{clean();setMode("forgot");}} style={{background:"transparent",border:"none",color:"rgba(201,160,85,.55)",fontFamily:"'Cormorant Garamond',serif",fontSize:".95rem",cursor:"pointer",textDecoration:"underline",marginTop:2}}>Olvidé mi contraseña</button>}
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
  cancionPersonal:"",recuerdo:"",email:""
};

export default function App(){
  const [view,setView]=useState("auth");
  const [step,setStep]=useState(1);
  const [phase,setPhase]=useState(0);
  const [form,setForm]=useState({...EMPTY_FORM});
  const [results,setResults]=useState(null);
  const [checked,setChecked]=useState({});
  const [error,setError]=useState(null);
  const [arquetipo,setArquetipo]=useState(null);
  const [resultToken,setResultToken]=useState(null);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [authNotice,setAuthNotice]=useState("");

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

        if(token){
          remote = await cargarSesionPorToken(token);
        }

        if(!remote){
          remote = await cargarSesionPorUsuario(user.id);
        }

        if(remote?.results){
          setResults(remote.results);
          setForm(f=>({...f,...remote.form,email:remote.email || email}));
          setArquetipo(remote.arquetipo||null);
          setChecked(remote.checked||{});
          setResultToken(remote.result_token||token||null);
          setView("results");

          try{
            localStorage.setItem("bsb_session", JSON.stringify({
              results: remote.results,
              form: {...remote.form,email:remote.email || email},
              arquetipo: remote.arquetipo,
              checked: remote.checked||{},
              result_token: remote.result_token||token||null,
              user_id: user.id
            }));
          }catch(e){}

          if(remote.result_token){
            const newUrl = `${window.location.origin}${window.location.pathname}?r=${remote.result_token}`;
            window.history.replaceState({}, "", newUrl);
          }
        } else {
          setView("guia");
        }
      }catch(e){
        console.error("Error cargando sesión del usuario:", e);
        setView("guia");
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

    const isCatolica=formWithEmail.tipoCeremonia.includes("Religiosa católica");
    const momentosBase=isCatolica?MOMENTOS_CATOLICA:MOMENTOS_CIVIL_SIMBOLICA;
    const momentosStr=formWithEmail.momentosSeleccionados.map(id=>{
      const m=momentosBase.find(x=>x.id===id);
      return m?`${m.nombre}${m.obligatorio?" (litúrgico-obligatorio)":""}`:id;
    }).join(", ");

    const ctx=`Pareja: ${formWithEmail.nombre1} y ${formWithEmail.nombre2}. Ciudad: ${formWithEmail.ciudad||"nd"}. Invitados: ${formWithEmail.invitados||"nd"}. Ceremonias: ${formWithEmail.tipoCeremonia.join(" + ")||"nd"}. Restricciones iglesia: ${formWithEmail.restriccionIglesia||"ninguna"}. Lugar: ${formWithEmail.lugarCeremonia||"nd"}. Duración: ${formWithEmail.duracion||"nd"}. Formato musical: ${formWithEmail.formatoMusical.join(", ")||"nd"}. Arquetipo: ${archData.n}. Objetivo emocional: ${formWithEmail.objetivoEmocional||"nd"}. Géneros: ${formWithEmail.generos.join(", ")||"nd"}. Artistas ref: ${formWithEmail.artistas||"nd"}. Prohibidas: ${formWithEmail.cancionesProhibidas||"ninguna"}. Idioma: ${formWithEmail.idioma||"nd"}. Momentos a cubrir: ${momentosStr}. Canción personal: ${formWithEmail.cancionPersonal||"ninguna"}. Qué quieren que recuerden: ${formWithEmail.recuerdo||"nd"}.`;

    try{
      setPhase(0);
      const p1 = CECI_VOICE + "\nBODA: " + ctx + "\nSOLO JSON COMPACTO EN UNA LINEA sin saltos de linea. Strings sin comillas internas:\n{\"nota\":\"2 oraciones calidas de Ceci para esta pareja mencionando su arquetipo\",\"perfil\":{\"cluster\":\"estilo 3 palabras\",\"desc\":\"2 oraciones sobre universo musical\",\"concepto\":\"1 oracion sobre arco emocional\"}}";
      const r1 = await callAI(p1, 1200);

      setPhase(1);
      const momentosListado = formWithEmail.momentosSeleccionados.map(id => {
        const m = momentosBase.find(x => x.id === id);
        return m ? m.nombre + (m.obligatorio ? " (liturgico)" : "") : null;
      }).filter(Boolean).join(", ");

      const p2 = CECI_VOICE + "\nBODA: " + ctx + ". Arquetipo: " + archData.n + ". Estilo: " + (r1.perfil?.cluster||"romantico") + ".\nMomentos: " + momentosListado + ".\nDevuelve SOLO JSON COMPACTO EN UNA SOLA LINEA. Sin saltos de linea. Strings cortos sin comillas internas:\n{\"guion\":[{\"momento\":\"nombre\",\"icono\":\"emoji\",\"cancion\":\"titulo\",\"artista\":\"artista\",\"version\":\"version\",\"duracion\":\"2:30\",\"razon\":\"razon corta sin comillas\",\"alt\":\"titulo - artista\"}]}\nPara momentos liturgicos usa musica sacra. Incluye TODOS los momentos listados.";
      const r2 = await callAI(p2, 3000);

      setPhase(2);
      const p3 = CECI_VOICE + "\nBODA: " + ctx + ". Arquetipo: " + archData.n + ".\nSOLO JSON COMPACTO EN UNA LINEA sin saltos de linea. Strings cortos sin comillas internas:\n{\"coctel\":[{\"c\":\"cancion\",\"a\":\"artista\",\"d\":\"3:30\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"cena\":[{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"},{\"c\":\"\",\"a\":\"\",\"d\":\"\"}],\"checklist\":{\"dj\":[\"item1\",\"item2\",\"item3\"],\"musicos\":[\"item1\",\"item2\"],\"planner\":[\"item1\",\"item2\"],\"pareja\":[\"consejo1\",\"consejo2\",\"consejo3\"]},\"errores\":[\"error1 con solucion\",\"error2\",\"error3\"]}";
      const r3 = await callAI(p3, 2500);

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
      setError(`Hubo un problema: ${e.message}. Intentá de nuevo.`);
      setView("form");setStep(6);
    }
  };

  if(authLoading) return <div style={{minHeight:"100vh",background:"#0C1721",display:"flex",alignItems:"center",justifyContent:"center",color:C,fontFamily:"'Cormorant Garamond',serif"}}>Cargando acceso...</div>;
  if(recoveryMode) return <AuthScreen initialMode="update" initialError={authNotice} onPasswordUpdated={()=>{
    setRecoveryMode(false);
    setAuthNotice("");
    setUser(null);
    setView("auth");
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }}/>;
  if(!user || view==="auth") return <AuthScreen initialMode="login" initialError={authNotice}/>;
  if(view==="landing") return <Landing onStart={()=>setView("guia")}/>;
  if(view==="guia") return <GuiaCanciones onStart={()=>setView("form")} onBack={()=>setView("landing")}/>;
  if(view==="form") return <Form step={step} setStep={setStep} form={form} setForm={setForm} onSubmit={generate} error={error}/>;
  if(view==="generating") return <Generating names={`${form.nombre1} & ${form.nombre2}`} phase={phase}/>;
  if(view==="results") return <Results results={results} form={form} checked={checked} setChecked={(fn)=>{ const next=typeof fn==='function'?fn(checked):fn; setChecked(next); syncChecked(next); }} arquetipo={arquetipo} resultToken={resultToken} onLogout={logout} onRestart={()=>{
    try{localStorage.removeItem("bsb_session");}catch(e){}
    window.history.replaceState({}, "", window.location.pathname);
    setView("guia");setStep(1);setResults(null);setChecked({});setForm({...EMPTY_FORM,email:user.email||""});setArquetipo(null);setResultToken(null);
  }}/>;

  return <GuiaCanciones onStart={()=>setView("form")} onBack={()=>setView("landing")}/>;
}
