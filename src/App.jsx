/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef, createContext, useContext } from "react";
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
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Great+Vibes&display=swap');
*,*::before,*::after{box-sizing:border-box}
html{font-size:clamp(17px,1.15vw,20px);scroll-behavior:smooth;-webkit-text-size-adjust:100%;background:#F5EFE0;background-image:url('/bg-mobile.jpg');background-size:cover;background-position:center;background-attachment:fixed}
body{margin:0;background:transparent;color:#1A1A14;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden;font-size:18px;font-weight:500}
button,input,textarea{font:inherit}
button{-webkit-tap-highlight-color:transparent}
#root{min-height:100vh;background:transparent}
@media(max-width:480px){html{font-size:17px}}
@media(min-width:601px){html{background-image:url('/bg-desktop.jpg') !important}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.fu{animation:fadeUp .5s ease both}
.fu1{animation:fadeUp .5s .07s ease both;opacity:0}
.fu2{animation:fadeUp .5s .14s ease both;opacity:0}
.fu3{animation:fadeUp .5s .21s ease both;opacity:0}
.fu4{animation:fadeUp .5s .28s ease both;opacity:0}
.fu5{animation:fadeUp .5s .35s ease both;opacity:0}
input,textarea{background:transparent;border:none;border-bottom:1px solid rgba(74,94,58,.28);color:#1A1A14;font-family:'Lora',serif;font-weight:500;font-size:1.15rem;padding:12px 2px;width:100%;outline:none;transition:border-color .3s;-webkit-appearance:none}
input:focus,textarea:focus{border-bottom-color:#4A5E3A;outline:none}
input[type="date"]{color-scheme:light;color:#1A1A14}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.25) sepia(1) saturate(4) hue-rotate(75deg);cursor:pointer;opacity:0.7}
input::placeholder,textarea::placeholder{color:rgba(26,26,20,.35);font-style:italic;font-weight:400}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#D9B86F;border-radius:2px}
.tag{display:inline-block;padding:9px 16px;border:1px solid rgba(74,94,58,.3);border-radius:100px;cursor:pointer;font-family:'Lora',serif;font-weight:600;font-size:1rem;color:rgba(26,26,20,.65);transition:all .2s;user-select:none;margin:3px 3px 3px 0}
.tag:hover:not(.sel){border-color:#4A5E3A;color:#1A1A14}
.tag.sel{background:#4A5E3A;border-color:#4A5E3A;color:#F5EFE0}
.pill{display:flex;align-items:center;gap:10px;padding:14px 18px;border:1px solid rgba(74,94,58,.25);border-radius:12px;cursor:pointer;font-family:'Lora',serif;font-weight:600;font-size:1.05rem;color:rgba(26,26,20,.65);transition:all .2s;user-select:none;width:100%;margin-bottom:9px;background:#FBF7EF;text-align:left;line-height:1.4}
.pill:hover:not(.sel){border-color:#4A5E3A;color:#1A1A14;background:rgba(74,94,58,.05)}
.pill.sel{background:#4A5E3A;border-color:#4A5E3A;color:#F5EFE0}
.pbtn{background:#4A5E3A;color:#F5EFE0;border:none;padding:16px 38px;font-family:'Lora',serif;font-size:1.1rem;font-weight:600;letter-spacing:.04em;border-radius:100px;cursor:pointer;transition:all .3s;min-height:54px;white-space:nowrap}
.pbtn:active{transform:scale(.98)}
.pbtn:disabled{opacity:.28;cursor:not-allowed;transform:none}
.gbtn{background:transparent;color:rgba(26,26,20,.55);border:1px solid rgba(74,94,58,.3);padding:13px 24px;font-family:'Lora',serif;font-weight:600;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;min-height:52px}
.gbtn:hover{border-color:#4A5E3A;color:#4A5E3A}
.wbtn{background:rgba(37,211,102,.1);color:#2ECC71;border:1px solid rgba(37,211,102,.28);padding:13px 20px;font-family:'Lora',serif;font-weight:600;font-size:1rem;border-radius:100px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;text-decoration:none;line-height:1.3}
.wbtn:hover{background:rgba(37,211,102,.18);border-color:rgba(37,211,102,.5)}
.scard{background:#FBF7EF;border:0.5px solid rgba(201,169,110,.25);border-radius:14px;padding:20px;margin-bottom:12px}
.lbtn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border:1px solid rgba(74,94,58,.35);border-radius:100px;color:#4A5E3A;font-family:'Lora',serif;font-weight:600;font-size:.95rem;cursor:pointer;background:transparent;transition:all .2s;text-decoration:none;white-space:nowrap}
.lbtn:hover{background:rgba(74,94,58,.08)}
.ci{display:flex;align-items:flex-start;gap:12px;padding:14px 0;cursor:pointer;border-bottom:0.5px solid rgba(74,94,58,.1)}
.ci:last-child{border-bottom:none}
.cb{width:22px;height:22px;min-width:22px;border:1px solid rgba(74,94,58,.3);border-radius:4px;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.cb.ck{background:#4A5E3A;border-color:#4A5E3A}
.divider{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.divider::before,.divider::after{content:'';flex:1;height:1px}
.divider::before{background:linear-gradient(to right,transparent,rgba(201,169,110,.28))}
.divider::after{background:linear-gradient(to left,transparent,rgba(201,169,110,.28))}
.fl{font-family:'Cinzel',serif;font-weight:500;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:#4A5E3A;margin-top:26px;margin-bottom:10px}
.sl-n{font-family:'Cinzel',serif;font-weight:500;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:#4A5E3A;margin-bottom:8px}
.sl-t{font-family:'Playfair Display',serif;font-size:clamp(1.7rem,5vw,2rem);font-weight:600;color:#1A1A14;margin:0 0 6px;line-height:1.15}
.sl-s{font-family:'Lora',serif;font-weight:400;font-size:1.02rem;color:rgba(26,26,20,.55);margin:0;font-style:italic;line-height:1.55}
.song-item{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:0.5px solid rgba(245,239,224,.15)}
.song-item:last-child{border-bottom:none}
.song-num{width:24px;height:24px;min-width:24px;border-radius:50%;background:rgba(201,169,110,.15);border:1px solid rgba(201,169,110,.4);display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-weight:600;font-size:.8rem;color:#C9A96E;margin-top:2px;flex-shrink:0}
.song-ceci{font-family:'Lora',serif;font-size:.9rem;color:rgba(201,169,110,.8);font-style:italic;margin-top:4px;line-height:1.5}
.guide-sec{background:#4A5E3A;border:0.5px solid rgba(201,169,110,.3);border-radius:18px;padding:clamp(22px,3vw,34px);margin-bottom:14px}
.guide-sec-title{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:600;color:#E6C76A;margin:0 0 4px}
.guide-sec-sub{font-family:'Lora',serif;font-size:.9rem;color:rgba(201,169,110,.75);font-style:italic;margin:0 0 14px}
.tab{padding:10px 18px;font-family:'Lora',serif;font-weight:600;font-size:.95rem;border-radius:100px;cursor:pointer;border:1px solid rgba(74,94,58,.2);color:rgba(26,26,20,.45);background:transparent;transition:all .2s;white-space:nowrap;min-height:42px}
.tab.act{background:#4A5E3A;border-color:#4A5E3A;color:#F5EFE0}
.moment-card{border:0.5px solid rgba(74,94,58,.18);border-radius:13px;padding:17px 18px;margin-bottom:10px;background:#FBF7EF;cursor:pointer;transition:border-color .2s}
.moment-card:hover{border-color:#4A5E3A;background:rgba(74,94,58,.05)}
.moment-card.sel{border-color:#4A5E3A;background:rgba(74,94,58,.1);box-shadow:inset 0 0 0 1px #4A5E3A}
.info-box{background:rgba(74,94,58,.05);border:0.5px solid rgba(74,94,58,.18);border-radius:10px;padding:14px 16px;margin-top:10px}
.arch-badge{display:inline-flex;align-items:center;gap:9px;background:rgba(74,94,58,.08);border:0.5px solid rgba(74,94,58,.25);border-radius:100px;padding:8px 18px;margin-bottom:14px}
@media(max-width:680px){
  .generating-notes{grid-template-columns:1fr!important}
}
@media(max-width:480px){
  .pbtn{width:100%;justify-content:center;display:flex;align-items:center}
  .tag{font-size:.92rem;padding:8px 13px}
  .lbtn{font-size:.88rem;padding:7px 13px}
}

/* ══ THEME utilities (Bloque 1) ══ */
select{font-family:'Lora',serif;font-weight:500;color:#1A1A14;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5E3A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:26px!important;cursor:pointer}
button{touch-action:manipulation}
:focus-visible{outline:2px solid rgba(74,94,58,.55);outline-offset:2px;border-radius:4px}
input:focus-visible,textarea:focus-visible{outline:none}
.tag:active,.pill:active,.tab:active,.lbtn:active,.gbtn:active,.wbtn:active{transform:scale(.97)}
.tag,.pill,.tab,.lbtn,.gbtn,.wbtn,.pbtn{-webkit-tap-highlight-color:transparent;position:relative}
@media(pointer:coarse){
  .tag{min-height:44px;display:inline-flex;align-items:center;padding:10px 16px}
  .tab{min-height:44px}
  .lbtn{min-height:44px;padding:10px 16px}
  .gbtn{min-height:48px}
  .cb::after{content:'';position:absolute;inset:-11px}
  .cb{position:relative}
  select,input,textarea{min-height:44px}
  input[type=checkbox],input[type=radio]{min-height:auto}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
}
html,body{overscroll-behavior-y:none}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes expandIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.guest-expand{animation:expandIn .2s ease both}
.sheet-overlay{animation:fadeIn .15s ease both}
.sheet-panel{animation:sheetUp .25s cubic-bezier(.32,.72,.35,1) both}
.canvas-viewport{touch-action:none;overscroll-behavior:contain}

.brand-logo{font-family:'Cinzel',serif;font-size:clamp(.7rem,1vw,.92rem);letter-spacing:.32em;text-transform:uppercase;color:#4A5E3A;font-weight:500}
.brand-title{font-family:'Playfair Display',serif;font-weight:600;color:#1A1A14;letter-spacing:.02em;line-height:1.15;text-wrap:balance}
.brand-title .gold{color:#D9B86F}
.brand-subtitle{font-family:'Lora',serif;color:rgba(26,26,20,.75);font-weight:600;text-wrap:balance}
.brand-copy{font-family:'Lora',serif;color:rgba(26,26,20,.68);line-height:1.75}
.responsive-shell{width:100%;max-width:1120px;margin:0 auto;padding-left:clamp(18px,4vw,48px);padding-right:clamp(18px,4vw,48px)}
.home-floral-bg{
  background: url('/bg-mobile.jpg') center center / cover no-repeat fixed, #F5EFE0;
}
@media(min-width:600px){
  .home-floral-bg{
    background: url('/bg-desktop.jpg') center center / cover no-repeat fixed, #F5EFE0;
  }
}
.home-content-card{
  background: rgba(251,247,239,.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 0.5px solid rgba(201,169,110,.3);
  border-radius: 24px;
  padding: clamp(28px,5vw,52px) clamp(24px,5vw,48px);
  box-shadow: 0 12px 48px rgba(26,20,14,.14);
}
.auth-floral-bg{
  background: url('/bg-mobile.jpg') center center / cover no-repeat, #F5EFE0;
}
@media(min-width:600px){
  .auth-floral-bg{
    background: url('/bg-desktop.jpg') center center / cover no-repeat, #F5EFE0;
  }
}
.auth-card{width:100%;max-width:min(460px,calc(100vw - 32px));background:rgba(251,247,239,.96)!important;backdrop-filter:blur(12px);border:0.5px solid rgba(201,169,110,.4)!important;border-radius:24px!important;padding:clamp(24px,5vw,38px)!important;box-shadow:0 12px 48px rgba(26,20,14,.18)}
.auth-card input{background:transparent!important;color:#1A1A14!important;border:none!important;border-bottom:1.5px solid rgba(74,94,58,.3)!important;border-radius:0!important;padding:13px 4px!important;font-family:'Lora',serif!important;font-weight:500;box-shadow:none!important}
.auth-card input::placeholder{color:rgba(26,26,20,.35)!important}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;min-height:min(760px,100svh);padding-top:clamp(54px,9vw,112px);padding-bottom:clamp(54px,9vw,112px);text-align:center}
.hero-title{font-size:clamp(2.7rem,9vw,6.2rem);max-width:980px;margin:0 auto 28px}
.hero-kicker{margin-bottom:clamp(34px,7vw,72px)}
.hero-sub{font-size:clamp(1.35rem,3vw,2rem);font-style:italic;margin:0 0 12px}
.hero-line{font-family:'Lora',serif;font-size:clamp(1rem,2vw,1.35rem);font-weight:700;letter-spacing:.02em;color:rgba(26,26,20,.85);margin:0}
@media(min-width:900px){
  .desktop-two-col{display:grid!important;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
  .results-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}
  .results-container{max-width:900px!important}
}

@media(min-width:901px){
  .desktop-guide-grid{grid-template-columns:1.15fr .85fr!important;gap:36px!important}
  .tabs-scroll-container{justify-content:center!important;overflow:hidden!important}
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
.accordion-open{border-color:rgba(74,94,58,.35)!important}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  html,body{background:#fff!important;color:#1a1a1a!important;font-size:13px!important}
  body{padding:0!important;margin:0!important}
  .no-print,.pbtn,.gbtn,.wbtn,.lbtn{display:none!important}
  .print-page{page-break-before:always;padding:0}
  @page{margin:1.8cm;size:A4}
  @page:first{margin-top:2.4cm}

  /* Portada */
  .pdf-cover{background:#4A5E3A!important;color:#F5EFE0!important;padding:48px 40px!important;min-height:200px!important;border-radius:0!important;text-align:center;margin-bottom:24px;border-bottom:3px solid #C9A96E}
  .pdf-cover h1{color:#F5EFE0!important;font-size:28px!important;margin:0 0 6px!important}
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
    {Array.from({length:6}).map((_,i)=>(<div key={i} style={{width:i===step-1?24:6,height:5,borderRadius:3,background:i<step?G:"rgba(74,94,58,.08)",transition:"all .35s"}}/>))}
  </div>;
}

function Landing({onStart}){
  return <div style={{background:"rgba(245,239,224,.88)",minHeight:"100dvh",overflow:"hidden"}}>
    <section className="responsive-shell hero-grid" style={{position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 18%, rgba(74,94,58,.08), transparent 38%), radial-gradient(circle at 50% 100%, rgba(74,94,58,.025), transparent 48%)",pointerEvents:"none"}}/>
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
        <div style={{background:"#FBF7EF",border:"1px solid rgba(74,94,58,.14)",borderRadius:22,padding:"clamp(22px,4vw,34px)"}}>
          <div className="brand-logo" style={{fontSize:THEME.text.label,letterSpacing:".18em",marginBottom:14}}>El problema que nadie habla</div>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0 0 14px"}}>Podés tener el mejor salón, el vestido perfecto y una decoración impecable — pero si la música no está pensada, el momento puede no sentirse como lo imaginaste.</p>
          <p className="brand-copy" style={{fontSize:"clamp(1.05rem,2vw,1.25rem)",margin:"0",color:G,fontStyle:"italic"}}>La música no es un detalle. Es lo que transforma una boda bonita en un recuerdo inolvidable.</p>
        </div>
        <div style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.25)",borderRadius:22,padding:"clamp(28px,4vw,42px)",boxShadow:"0 24px 80px rgba(0,0,0,.32)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:"3.5rem",color:"rgba(74,94,58,.08)",lineHeight:1,marginBottom:12,userSelect:"none"}}>"</div>
          <p style={{fontFamily:"'Lora',serif",fontSize:"clamp(1.2rem,2.2vw,1.55rem)",color:C,lineHeight:1.75,fontStyle:"italic",margin:"0 0 24px"}}>Lo que la gente recuerda de tu boda no es el vestido ni el salón. Recuerdan cómo se sintieron cuando empezó la música.</p>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:2,height:40,background:"rgba(74,94,58,.35)",borderRadius:1}}/>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:G}}>Ceci</div>
              <div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:DIMSOFT}}>El Violín de Ceci · +200 bodas en Paraguay y Brasil</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{marginTop:"clamp(36px,6vw,64px)"}}>
        <div className="brand-logo" style={{textAlign:"center",fontSize:".74rem",letterSpacing:".18em",marginBottom:22}}>Lo que recibís al comprar</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(220px,100%),1fr))",gap:14}}>
          {[
            {e:"📖",t:"Guía de canciones",d:"Las más pedidas en bodas reales, con criterio de Ceci para cada momento."},
            {e:"🎯",t:"Test + Arquetipo musical",d:"El perfil que define el estilo de toda la banda sonora."},
            {e:"🎼",t:"Guion personalizado",d:"Canciones para cada momento de la ceremonia, según su historia."},
            {e:"✅",t:"Checklist para proveedores",d:"DJ, músicos, wedding planner, iglesia y pareja, todo coordinado."},
            {e:"📤",t:"WhatsApp listo",d:"Mensajes adaptados para compartir con cada proveedor."},
            {e:"📄",t:"PDF premium",d:"Documento para guardar, imprimir o compartir."}
          ].map((item,i)=>(
            <div key={i} style={{background:"#FBF7EF",border:"0.5px solid rgba(201,169,110,.2)",borderRadius:18,padding:"20px 18px"}}>
              <div style={{fontSize:"1.65rem",marginBottom:10}}>{item.e}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.08rem",color:C,marginBottom:6}}>{item.t}</div>
              <div className="brand-copy" style={{fontSize:".98rem",lineHeight:1.6}}>{item.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:"clamp(36px,6vw,64px)",background:"linear-gradient(135deg,#EAE4D2,#F5EFE0)",border:"1px solid rgba(201,169,110,.24)",borderRadius:24,padding:"clamp(28px,5vw,46px)",textAlign:"center"}}>
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

  return <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(245,239,224,.88)",padding:"clamp(16px,3vw,32px) clamp(12px,2.5vw,24px)"}}>
    <div style={{maxWidth:440,width:"100%",textAlign:"center"}} className="fu">
      <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",letterSpacing:".2em",textTransform:"uppercase",color:G,marginBottom:18}}>El Violín de Ceci</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.85rem",fontWeight:700,color:C,margin:"0 0 12px"}}>Tu guion musical está listo.</h2>
      <p style={{fontFamily:"'Lora',serif",fontSize:"1.05rem",color:DIM,lineHeight:1.7,margin:"0 0 10px"}}>Dejá tu email para guardar tu resultado y poder acceder desde cualquier dispositivo.</p>
      <p style={{fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(201,169,110,.5)",fontStyle:"italic",margin:"0 0 28px"}}>📧 Tu resultado queda guardado en tu cuenta y podés volver a verlo cuando quieras.</p>
      <input type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setNotFound(false);}} style={{textAlign:"center",fontSize:"1.15rem",marginBottom:16}}/>
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


function Form({step,setStep,form,setForm,onSubmit,error,onGoHome}){
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
        :<button className="pbtn" disabled={!ok()} style={{marginLeft:"auto"}} onClick={onSubmit}>✨ Crear mi guion</button>
      }
    </div>
    {error&&<p style={{color:"#ff8080",fontFamily:"'Lora',serif",textAlign:"center",fontSize:".95rem",marginTop:8,lineHeight:1.5}}>{error}</p>}
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
      <div style={{fontFamily:"'Lora',serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:G,marginBottom:8}}>Denominación religiosa</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {["Católica","Cristiana","Ortodoxa","Otra religión"].map(v=><Tag key={v} label={v} selected={(form.denominacionReligiosa||"")===v} onClick={()=>set("denominacionReligiosa",v)}/>)}
      </div>
      {(form.denominacionReligiosa==="Católica")&&<p style={{fontFamily:"'Lora',serif",fontSize:".93rem",color:DIM,margin:"12px 0 0",lineHeight:1.6}}>
        ⚠️ La misa católica tiene momentos litúrgicos con música obligatoria (Aleluya, Comunión, Ofertorio). Muchas iglesias solo permiten música sacra. Siempre consultá con el sacerdote antes de definir el repertorio.
      </p>}
      <FL>¿Hay restricciones musicales específicas?</FL>
      <input placeholder="ej: Solo música sacra, el sacerdote eligió el Aleluya..." value={form.restriccionIglesia||""} onChange={e=>set("restriccionIglesia",e.target.value)}/>

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
    <input placeholder="ej: Coldplay, La Oreja de Van Gogh, Hans Zimmer" value={form.artistas} onChange={e=>set("artistas",e.target.value)}/>
    <FL>¿Alguna canción que definitivamente NO quieren en su boda?</FL>
    <div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.12)",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
      <p style={{fontFamily:"'Lora',serif",fontSize:".92rem",color:DIM,margin:"0 0 6px",lineHeight:1.6}}>
        Esto es más común de lo que parece — y es muy útil para nosotras.
      </p>
      <p style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.35)",margin:0,lineHeight:1.6,fontStyle:"italic"}}>
        Puede ser una canción muy repetida en bodas, una que los recuerde de algo que no quieren traer, o simplemente una que no los representa. El guion no va a incluirla ni versiones de ella.
      </p>
    </div>
    <input placeholder="ej: La Bamba, Despacito, la canción del ex — anotá todo lo que se les ocurra" value={form.cancionesProhibidas} onChange={e=>set("cancionesProhibidas",e.target.value)}/>
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
    <textarea rows={2} placeholder="ej: una canción que escucharon juntos en un viaje, o que sonaba cuando se conocieron..." value={form.cancionPersonal} onChange={e=>set("cancionPersonal",e.target.value)} style={{resize:"none"}}/>
    <FL>¿Qué querés que la gente sienta o recuerde musicalmente? *</FL>
    <textarea rows={3} placeholder="Contanos con tus palabras, sin filtros — esto es lo que más importa..." value={form.recuerdo} onChange={e=>set("recuerdo",e.target.value)} style={{resize:"none"}}/>
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

function AuthScreen({ initialMode="signup", initialError="", onPasswordUpdated }={}){
  const [mode,setMode]=useState(initialMode);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState(initialError || "");

  useEffect(()=>{
    setMode(initialMode || "signup");
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
    if(!supabase) return setErr("No está configurada la conexión con Supabase.");
    if(!email || !password) return setErr("Completá email y contraseña.");
    if(password.length<6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options:{ emailRedirectTo: redirectUrl }
    });
    setLoading(false);
    if(error){
      console.error("Supabase signUp error:", error);
      const msg = error.message?.toLowerCase() || "";
      if(msg.includes("already") || msg.includes("registered")) return setErr("Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.");
      if(msg.includes("redirect") || msg.includes("url")) return setErr("El dominio de la app no está autorizado en Supabase. Agregá https://tu-boda-organizada.vercel.app/** en Auth → URL Configuration → Redirect URLs.");
      if(msg.includes("signup") || msg.includes("disabled")) return setErr("El registro está desactivado en Supabase. Revisá Auth → Providers → Email.");
      return setErr(error.message || "No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.");
    }
    if(data?.session){
      setMsg("Cuenta creada. Ya podés continuar en la app.");
      return;
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
    // Clear any saved session so the user starts fresh after recovery
    try { localStorage.removeItem("bsb_session"); } catch(e) {}
    try { localStorage.removeItem("bsb_form"); } catch(e) {}
    try { localStorage.removeItem("bsb_step"); } catch(e) {}
    setMsg("Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.");
    try { await supabase.auth.signOut(); } catch(e) {}
    setMode("login");
    if(onPasswordUpdated) onPasswordUpdated();
  };

  const title = mode==="signup" ? "Crear mi cuenta" : mode==="forgot" ? "Recuperar contraseña" : mode==="update" ? "Crear nueva contraseña" : "Entrar a mi producto";
  const subtitle = mode==="signup" ? "Usá el mismo email con el que compraste el producto." : mode==="forgot" ? "Te enviaremos un link para crear una nueva contraseña." : mode==="update" ? "Definí una nueva contraseña para volver a entrar." : "Iniciá sesión para ver o crear tu guion musical.";

  return <div style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(18px,4vw,42px)"}}>
    <div className="fu auth-card" style={{textAlign:"center",position:"relative",zIndex:1}}>
      <div className="brand-logo" style={{marginBottom:14}}>El Violín de Ceci</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.85rem,6vw,2.35rem)",fontWeight:600,color:"#1A1A14",margin:"0 0 8px",lineHeight:1.15}}>{title}</h1>
      <p className="brand-copy" style={{fontSize:"clamp(1rem,3vw,1.12rem)",margin:"0 0 22px"}}>{subtitle}</p>

      {mode!=="update"&&<>
        <input type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={{textAlign:"center",marginBottom:12}} />
        {mode!=="forgot"&&<input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} style={{textAlign:"center",marginBottom:18}} />}
      </>}

      {mode==="update"&&<input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{textAlign:"center",marginBottom:18}} />}

      {err&&<p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"#ff8b8b",lineHeight:1.5,margin:"0 0 12px"}}>{err}</p>}
      {msg&&<p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"rgba(201,169,110,.85)",lineHeight:1.5,margin:"0 0 12px"}}>{msg}</p>}

      {mode==="login"&&<button className="pbtn" disabled={loading} onClick={signIn} style={{width:"100%"}}>{loading?"Entrando...":"Entrar →"}</button>}
      {mode==="signup"&&<button className="pbtn" disabled={loading} onClick={signUp} style={{width:"100%"}}>{loading?"Creando...":"Crear cuenta →"}</button>}
      {mode==="forgot"&&<button className="pbtn" disabled={loading} onClick={forgot} style={{width:"100%"}}>{loading?"Enviando...":"Enviar recuperación →"}</button>}
      {mode==="update"&&<button className="pbtn" disabled={loading} onClick={updatePassword} style={{width:"100%"}}>{loading?"Guardando...":"Guardar nueva contraseña →"}</button>}

      <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid rgba(201,169,110,.12)",display:"flex",flexDirection:"column",gap:8}}>
        {mode!=="login"&&<button className="gbtn" onClick={()=>{clean();setMode("login");}} style={{width:"100%"}}>Ya tengo cuenta</button>}
        {mode!=="signup"&&mode!=="update"&&<button className="gbtn" onClick={()=>{clean();setMode("signup");}} style={{width:"100%"}}>Crear cuenta nueva</button>}
        {mode!=="forgot"&&mode!=="update"&&<button onClick={()=>{clean();setMode("forgot");}} style={{background:"transparent",border:"none",color:"rgba(201,169,110,.6)",fontFamily:"'Lora',serif",fontSize:".95rem",cursor:"pointer",textDecoration:"underline",marginTop:2}}>Olvidé mi contraseña</button>}
      </div>
    </div>
  </div>;
}


function GlobalProgress({ user, hasResults }){
  const [pct, setPct] = useState(0);
  const [breakdown, setBreakdown] = useState([]);

  useEffect(()=>{
    if(!user || !supabase) return;
    let cancelled = false;
    const compute = async () => {
      const scores = [];

      // 1. Banda Sonora (test IA completado)
      scores.push({ label:"Banda sonora", done: !!hasResults });

      // Cargamos todo de wedding_data en una sola consulta
      let row = null;
      try {
        const { data } = await supabase
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
        const { data: trow } = await supabase.from("wedding_data").select("timeline_aprobacion").eq("user_id", user.id).maybeSingle();
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

function HomeScreen({ user, hasResults, form, resultToken, onViewResults, onStartNew, onLogout, onGoModule }){
  const pareja = [form?.nombre1, form?.nombre2].filter(Boolean).join(" & ");
  const link = resultToken && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?r=${resultToken}` : "";
  const [copied, setCopied] = useState(false);
  const copyLink = async()=>{
    if(!link) return;
    try{ await navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),2400); }catch(e){}
  };

  const modules = [
    {emoji:"🎵", label:"Banda sonora", desc:hasResults?`${pareja} · Test completado`:"Creá tu guion musical con IA",
     action:hasResults?onViewResults:onStartNew, status:hasResults?"Ver resultado →":"Empezar test →",
     done:hasResults, primary:true},
    {emoji:"💰", label:"Presupuesto", desc:"Control de gastos por categoría",
     action:()=>onGoModule("budget"), status:"Abrir →", done:false},
    {emoji:"🏢", label:"Proveedores", desc:"Cotizaciones y contratos",
     action:()=>onGoModule("vendors"), status:"Abrir →", done:false},
    {emoji:"📋", label:"Checklist", desc:"Plan completo de la boda",
     action:()=>onGoModule("checklist-boda"), status:"Abrir →", done:false},
    {emoji:"👥", label:"Invitados", desc:"Lista, etiquetas y seating recomendado",
     action:()=>onGoModule("guests"), status:"Abrir →", done:false},
    {emoji:"🏛️", label:"Diseño del salón", desc:"Plano, decoración y circulación del evento",
     action:()=>onGoModule("salon-design"), status:"Abrir →", done:false},
    {emoji:"⏰", label:"Cronograma", desc:"Timeline del día",
     action:()=>onGoModule("timeline"), status:"Abrir →", done:false},
    {emoji:"📖", label:"Guía para novios", desc:"Protocolo, ceremonia y consejos",
     action:()=>onGoModule("guia-novios"), status:"Abrir →", done:false},
  ];

  return <div style={{minHeight:"100svh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"clamp(20px,4vw,48px)"}}>
    <div className="fu home-content-card" style={{width:"100%",maxWidth:"min(720px,calc(100vw - 32px))"}}>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:28}}>
        <div className="brand-logo" style={{marginBottom:12}}>El Violín de Ceci</div>
        <h1 className="brand-title" style={{fontSize:"clamp(1.6rem,4vw,2.4rem)",margin:"0 0 8px"}}>
          {pareja ? `¡Hola, ${pareja}! 🌸` : "Tu boda, organizada"}
        </h1>
        <p className="brand-copy" style={{fontSize:"clamp(.9rem,2vw,1.05rem)",margin:"0 auto",maxWidth:480,lineHeight:1.6}}>
          Elegí el módulo con el que querés trabajar hoy.
        </p>
        {form?.fechaBoda&&(()=>{
          const dias = Math.ceil((new Date(form.fechaBoda)-new Date())/(1000*60*60*24));
          return dias>0
            ? <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.08)",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:100,padding:"6px 16px"}}>
                <span style={{fontSize:"1rem"}}>💍</span>
                <span style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"#4A5E3A",fontWeight:600}}>{dias} días para la boda</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>{new Date(form.fechaBoda).toLocaleDateString("es",{day:"numeric",month:"long",year:"numeric"})}</span>
              </div>
            : dias===0
              ? <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:8,background:"rgba(201,169,110,.12)",borderRadius:100,padding:"6px 16px"}}>
                  <span style={{fontSize:"1rem"}}>🎉</span>
                  <span style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"#C9A96E",fontWeight:600}}>¡Hoy es el gran día!</span>
                </div>
              : null;
        })()}
      </div>

      {/* Quick access to guion link if has results */}
      {hasResults && link && <div style={{background:"rgba(74,94,58,.06)",border:"0.5px solid rgba(74,94,58,.2)",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:"rgba(26,26,20,.55)"}}>
          🔗 Tu link privado del guion musical
        </div>
        <button className="lbtn" onClick={copyLink} style={{flexShrink:0,fontSize:".8rem"}}>
          {copied?"¡Copiado ✓":"Copiar link"}
        </button>
      </div>}

      {/* Progreso global */}
      <GlobalProgress user={user} hasResults={hasResults} />

      {/* Module grid */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"#4A5E3A"}}>Módulos de planificación</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:"rgba(26,26,20,.35)"}}>{modules.filter(m=>m.done).length}/{modules.length} completados</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(160px,45vw),1fr))",gap:12,marginBottom:24}}>
        {modules.map(({emoji,label,desc,action,status,done,primary})=>
          <button key={label} onClick={action} style={{
            background:done?"rgba(74,94,58,.08)":primary&&!done?"#4A5E3A":"#FBF7EF",
            border:`0.5px solid ${done?"rgba(74,94,58,.28)":primary&&!done?"#4A5E3A":"rgba(201,169,110,.25)"}`,
            borderRadius:16,padding:"16px 14px",textAlign:"left",cursor:"pointer",
            transition:"all .2s",outline:"none",
            gridColumn: primary && !done ? "1 / -1" : "auto"
          }}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
              <div>
                <div style={{fontSize:primary&&!done?"1.6rem":"1.3rem",marginBottom:5}}>{emoji}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:primary&&!done?"1.05rem":".92rem",color:primary&&!done?"#F5EFE0":"#1A1A14",lineHeight:1.2,marginBottom:3}}>{label}</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:".78rem",color:primary&&!done?"rgba(245,239,224,.65)":"rgba(26,26,20,.42)",lineHeight:1.3,marginBottom:10}}>{desc}</div>
              </div>
            </div>
            <div style={{display:"inline-block",fontFamily:"'Lora',serif",fontSize:".82rem",fontWeight:600,
              color:primary&&!done?"#C9A96E":done?"#4A5E3A":"rgba(74,94,58,.7)"}}>{status}</div>
          </button>
        )}
      </div>

      {/* Footer actions */}
      <div style={{display:"flex",gap:10,justifyContent:"center",paddingTop:16,borderTop:"0.5px solid rgba(201,169,110,.15)"}}>
        {hasResults&&<button className="gbtn" onClick={onStartNew} style={{fontSize:".85rem",padding:"9px 18px"}}>Hacer el test de nuevo</button>}
        <button className="gbtn" onClick={onLogout} style={{fontSize:".85rem",padding:"9px 18px"}}>Cerrar sesión</button>
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


// ─── SYNC: calcula cotizado+pagado del budget a partir de vendors ─────────────
function calcBudgetFromVendors(budgetData, vendorsList){
  if(!budgetData || !vendorsList) return budgetData;
  const next = {
    ...budgetData,
    categorias: (budgetData.categorias||[]).map(cat => {
      const catVendors = vendorsList.filter(v => v.cat === cat.id && v.estado !== "descartado");
      const cotizado = catVendors.reduce((s,v) => s + parseFloat(v.precio||0), 0);
      const pagado   = vendorsList.filter(v => v.cat===cat.id && v.estado==="pagado")
                                  .reduce((s,v) => s + parseFloat(v.precio||0), 0);
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
function GuiaModule({onBack}){
  const [sec, setSec] = useState("mesas");
  const actual = GUIA_SECCIONES.find(s=>s.id===sec)||GUIA_SECCIONES[0];
  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    <div style={{background:THEME.color.sage,padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Guía</div>
        <h1 style={{fontFamily:THEME.font.display,fontSize:"clamp(1.35rem,4vw,2.6rem)",color:THEME.color.cream,margin:"0 0 4px",lineHeight:1.1}}>📖 Guía para novios</h1>
        <p style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(245,239,224,.65)",margin:0}}>Protocolo, ceremonia, presupuesto y todo lo que se preguntan los novios</p>
      </div>
    </div>
    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0",width:"100%",boxSizing:"border-box"}}>
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
        const {data:row} = await supabase.from("wedding_data").select("budget,currency,vendors,guests").eq("user_id",user.id).maybeSingle();
        const vendors = Array.isArray(row?.vendors) ? row.vendors : [];
        let budget = (row?.budget && row.budget.categorias?.length > 0)
          ? row.budget
          : {total:0, categorias:CATEGORIAS_DEFAULT.map(c=>({...c}))};
        // Auto-sync cotizado + pagado from vendors
        budget = calcBudgetFromVendors(budget, vendors);
        setData(budget);
        if(row?.currency) setCurrency(row.currency);
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
      await supabase.from("wedding_data").upsert({
        user_id: user.id,
        budget: newData || data,
        currency: newCurrency || currency,
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
    if(!newCatName.trim()) return;
    const next = {...data, categorias:[...data.categorias, {id:"c_"+Date.now(),emoji:"📌",nombre:newCatName.trim(),estimado:0,cotizado:0,pagado:0,notas:""}]};
    setData(next);
    setNewCatName("");
    setAddingCat(false);
    save(next);
  };

  const removeCategoria = (id)=>{
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
              <input type="number" value={val} onChange={e=>set(e.target.value)} placeholder="0"
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
        <input type="text" value={localNota} onChange={e=>setLocalNota(e.target.value)} placeholder="Notas (proveedor, fecha de pago, etc.)"
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
            <div style={{fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(245,239,224,.45)",marginTop:6}}>🔗 Cotizado y pagado se sincronizan automáticamente desde Proveedores</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"flex-start"}}>
            <select value={currency} onChange={e=>{setCurrency(e.target.value);save(data,e.target.value);}} style={{fontFamily:"'Lora',serif",fontSize:".85rem",padding:"8px 12px",borderRadius:100,border:"1px solid rgba(201,169,110,.4)",background:"rgba(245,239,224,.9)",color:"#1A1A14",cursor:"pointer",maxWidth:"min(220px,60vw)"}}>
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
            <input type="number" value={data.total||""} onChange={e=>updateTotal(e.target.value)}
              onBlur={()=>save()} placeholder="0"
              style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.8rem,4vw,2.4rem)",fontWeight:700,color:"#1A1A14",border:"none",borderBottom:"2px solid #4A5E3A",background:"transparent",padding:"4px 0",width:"100%",outline:"none"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.45)"}}>👥</span>
            <input type="number" value={invitados} onChange={e=>setInvitados(e.target.value)}
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
        <input autoFocus type="text" value={newCatName} onChange={e=>setNewCatName(e.target.value)}
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
  {id:"otro",     emoji:"📌", label:"Otro"},
];
const VENDOR_ESTADOS = [
  {id:"evaluando", label:"Evaluando",  color:"rgba(201,169,110,.8)",  bg:"rgba(201,169,110,.1)"},
  {id:"contratado",label:"Contratado", color:"rgba(74,94,58,.8)",     bg:"rgba(74,94,58,.1)"},
  {id:"pagado",    label:"Pagado",     color:"#4A5E3A",               bg:"rgba(74,94,58,.15)"},
  {id:"descartado",label:"Descartado", color:"rgba(26,26,20,.35)",    bg:"rgba(26,26,20,.05)"},
];

function VendorForm({vendor, onSave, onCancel}){
  const [v, setV] = useState(vendor || {id:Date.now()+"",cat:"salon",nombre:"",contacto:"",precio:"",estado:"evaluando",link:"",notas:""});
  const set = (k,val) => setV(x=>({...x,[k]:val}));
  return <div style={{background:"#FBF7EF",border:"1px solid rgba(74,94,58,.25)",borderRadius:16,padding:"20px",marginBottom:12}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Categoría</div>
        <select value={v.cat} onChange={e=>set("cat",e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
          {VENDOR_CATS.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Estado</div>
        <select value={v.estado} onChange={e=>set("estado",e.target.value)} style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
          {VENDOR_ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Nombre / Empresa</div>
        <input type="text" value={v.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="ej: Salón Los Pinos"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Contacto</div>
        <input type="text" value={v.contacto} onChange={e=>set("contacto",e.target.value)} placeholder="Tel / email / Instagram"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Precio cotizado</div>
        <input type="number" value={v.precio} onChange={e=>set("precio",e.target.value)} placeholder="0"
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Link (web / Instagram)</div>
        <input type="text" value={v.link} onChange={e=>set("link",e.target.value)} placeholder="https://..."
          style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".95rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
      </div>
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginBottom:6}}>Notas</div>
      <textarea value={v.notas} onChange={e=>set("notas",e.target.value)} rows={2} placeholder="Incluye vajilla, requiere depósito del 30%, etc."
        style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"9px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14",resize:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{display:"flex",gap:10}}>
      <button onClick={()=>onSave(v)} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"10px 22px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".9rem",cursor:"pointer"}}>✓ Guardar</button>
      <button onClick={onCancel} style={{background:"transparent",border:"1px solid rgba(74,94,58,.25)",borderRadius:100,padding:"10px 18px",fontFamily:"'Lora',serif",fontSize:".9rem",color:"rgba(26,26,20,.5)",cursor:"pointer"}}>Cancelar</button>
    </div>
  </div>;
}

function VendorsModule({user, onBack}){
  const [vendors, setVendors] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [filterEst, setFilterEst] = useState("all");
  const [searchVendor, setSearchVendor] = useState("");

  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await supabase.from("wedding_data").select("vendors").eq("user_id",user.id).maybeSingle();
        setVendors(Array.isArray(row?.vendors) ? row.vendors : []);
      }catch(e){ setVendors([]); }
    };
    load();
  },[user]);

  const save = async(list) => {
    setSaving(true);
    try{
      const vendorList = list || vendors;
      // Load current budget to sync cotizado/pagado
      const {data:row} = await supabase.from("wedding_data").select("budget").eq("user_id",user.id).maybeSingle();
      const currentBudget = row?.budget || {total:0, categorias:CATEGORIAS_DEFAULT.map(c=>({...c}))};
      const updatedBudget = calcBudgetFromVendors(currentBudget, vendorList);
      await supabase.from("wedding_data").upsert({
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

  const catMap = Object.fromEntries(VENDOR_CATS.map(c=>[c.id,c]));
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
  const totalCotizado = vendors.reduce((s,v)=>s+parseFloat(v.precio||0),0);

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:80}}>
    {/* Header */}
    <div style={{background:"#4A5E3A",padding:"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:960,margin:"0 auto"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.35rem,4vw,2.6rem)",color:"#F5EFE0",margin:0,lineHeight:1.1}}>🏢 Proveedores</h1>
          </div>
          <button onClick={()=>{setAdding(true);setEditId("new");}} style={{background:"#C9A96E",color:"#1A1A14",border:"none",padding:"10px 20px",fontFamily:"'Lora',serif",fontWeight:700,fontSize:".9rem",borderRadius:100,cursor:"pointer",marginTop:8}}>+ Agregar</button>
        </div>
        {/* Summary pills */}
        <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
          {[{label:`${vendors.length} en total`,color:"rgba(245,239,224,.7)"},{label:`${contratados} contratados`,color:"rgba(201,169,110,.85)"},{label:`USD ${num(totalCotizado).toLocaleString()} cotizado`,color:"rgba(245,239,224,.6)"}].map(p=>
            <div key={p.label} style={{fontFamily:"'Lora',serif",fontSize:".85rem",color:p.color}}>{p.label}</div>
          )}
        </div>
      </div>
    </div>

    <div style={{maxWidth:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0"}}>
      {/* Add form */}
      {adding && editId==="new" && <VendorForm onSave={saveVendor} onCancel={()=>{setAdding(false);setEditId(null);}}/>}

      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center",width:"100%"}}>
        <div style={{position:"relative",flex:1,minWidth:160,marginBottom:8}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:".85rem",pointerEvents:"none",opacity:.4}}>🔍</span>
          <input value={searchVendor} onChange={e=>setSearchVendor(e.target.value)} placeholder="Buscar proveedor..."
            style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".85rem",padding:"7px 10px 7px 30px",borderRadius:100,border:"1px solid rgba(74,94,58,.18)",background:"#FBF7EF",color:"#1A1A14",boxSizing:"border-box",outline:"none"}}/>
          {searchVendor&&<button onClick={()=>setSearchVendor("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(26,26,20,.4)"}}>×</button>}
        </div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".14em",textTransform:"uppercase",color:"#4A5E3A",marginRight:4}}>Filtrar:</div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".88rem",padding:"7px 12px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.25)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
          <option value="all">Todas las categorías</option>
          {VENDOR_CATS.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={filterEst} onChange={e=>setFilterEst(e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".88rem",padding:"7px 12px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.25)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
          <option value="all">Todos los estados</option>
          {VENDOR_ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        {(filterCat!=="all"||filterEst!=="all")&&<button onClick={()=>{setFilterCat("all");setFilterEst("all");}} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.4)",fontFamily:"'Lora',serif",fontSize:".85rem",cursor:"pointer"}}>✕ Limpiar</button>}
      </div>

      {filtered.length===0 && !adding && <div style={{textAlign:"center",padding:"clamp(20px,4vw,48px) clamp(12px,2vw,20px)",background:"#FBF7EF",borderRadius:18,border:"0.5px solid rgba(201,169,110,.2)"}}>
        <div style={{fontSize:"2.5rem",marginBottom:12}}>🏢</div>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",color:"#1A1A14",marginBottom:8}}>Aún no hay proveedores</p>
        <p style={{fontFamily:"'Lora',serif",fontSize:".95rem",color:"rgba(26,26,20,.45)",margin:"0 0 20px"}}>Agregá tu primer proveedor con el botón de arriba</p>
        <button onClick={()=>{setAdding(true);setEditId("new");}} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"12px 24px",fontFamily:"'Lora',serif",fontWeight:700,cursor:"pointer"}}>+ Agregar proveedor</button>
      </div>}

      {filtered.map(v=>{
        const cat = catMap[v.cat]||{emoji:"📌",label:"Otro"};
        const est = estMap[v.estado]||VENDOR_ESTADOS[0];
        if(editId===v.id) return <VendorForm key={v.id} vendor={v} onSave={saveVendor} onCancel={()=>setEditId(null)}/>;
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
                {v.precio&&<div style={{fontFamily:"'Lora',serif",fontSize:".88rem",color:"rgba(26,26,20,.65)",fontWeight:600}}>USD {parseFloat(v.precio).toLocaleString()}</div>}
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
const LADOS = ["Novio","Novia","Ambos"];

function GuestsModule({user, onBack, onGoDesigner}){
  const [guests, setGuests]     = useState(null);
  const [tableSize, setTableSize] = useState(10);
  const [viewMode, setViewMode] = useState("lista");
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
  const [movingGuest, setMovingGuest]     = useState(null); // vista Mesas: invitado en movimiento
  const [guia, setGuia]                   = useState(null); // sección de la guía abierta (o null)
  const isMobile = useIsMobile();

  useEffect(()=>{
    const h=()=>setShowGuestMenu(false);
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    if(!user) return;
    supabase.from("wedding_data").select("guests,table_size,budget").eq("user_id",user.id).maybeSingle()
      .then(({data:row})=>{
        setGuests(Array.isArray(row?.guests)?row.guests:[]);
        if(row?.table_size) setTableSize(row.table_size);
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
        const {data:brow} = await supabase.from("wedding_data").select("budget").eq("user_id",user.id).maybeSingle();
        if(brow?.budget) budgetUpdate = {...brow.budget, invitados: String(totalPersonas)};
      }catch(e){}
      const upsertData = {user_id:user.id,guests:gList,table_size:tSize,updated_at:new Date().toISOString()};
      if(budgetUpdate) upsertData.budget = budgetUpdate;
      await supabase.from("wedding_data").upsert(upsertData,{onConflict:"user_id"});
      setSaved(true); setTimeout(()=>setSaved(false),1500);
    }catch(e){}
    setSaving(false);
  };

  const exportToExcel = async() => {
    if(!guests || guests.length===0) return;
    // Load SheetJS from CDN if not already loaded
    if(!window.XLSX){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const XL = window.XLSX;
    const wb = XL.utils.book_new();

    // ── HOJA 1: Lista completa ──
    const confLabel = c => c==="confirmado"?"Confirmado":c==="no_va"?"No va":"Pendiente";
    const listData = [
      ["Nombre","Personas","Mesa","Lado","Parentesco","Confirmación","Restricción alimentaria","Notas"],
      ...guests.map(g=>[
        g.nombre||"",
        parseInt(g.cantidadInvitados||1),
        g.mesa ? parseInt(g.mesa) : "",
        g.lado||"",
        g.parentesco||"",
        confLabel(g.confirmacion),
        g.restriccion||"Ninguna",
        g.notas||""
      ])
    ];
    const ws1 = XL.utils.aoa_to_sheet(listData);
    ws1["!cols"] = [{wch:28},{wch:11},{wch:10},{wch:12},{wch:14},{wch:24},{wch:32}];
    // Freeze header row
    ws1["!freeze"] = {xSplit:0, ySplit:1};
    XL.utils.book_append_sheet(wb, ws1, "Lista de invitados");

    // ── HOJA 2: Por mesas ──
    const maxMesa = guests.reduce((m,g)=>Math.max(m,parseInt(g.mesa)||0),0);
    const mesasData = [["Mesa","Nombre","Personas","Confirmación","Restricción"]];
    for(let i=1;i<=maxMesa;i++){
      const guestsAtTable = guests.filter(g=>parseInt(g.mesa)===i);
      const personas = guestsAtTable.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
      if(guestsAtTable.length===0){
        mesasData.push([i,"(Sin invitados)","","",""]);
      } else {
        guestsAtTable.forEach((g,idx)=>{
          mesasData.push([
            idx===0?i:"",
            g.nombre||"",
            parseInt(g.cantidadInvitados||1),
            confLabel(g.confirmacion),
            g.restriccion||"Ninguna"
          ]);
        });
        mesasData.push([`Subtotal mesa ${i}`,`${guestsAtTable.length} invitaciones`,personas+" personas","",""]);
        mesasData.push(["","","","",""]);
      }
    }
    // Sin mesa asignada
    const sinMesa = guests.filter(g=>!g.mesa||g.mesa==="");
    if(sinMesa.length>0){
      mesasData.push(["SIN MESA",`${sinMesa.length} invitaciones`,sinMesa.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0)+" personas","",""]);
      sinMesa.forEach(g=>mesasData.push(["",g.nombre||"",parseInt(g.cantidadInvitados||1),confLabel(g.confirmacion),g.restriccion||"Ninguna"]));
    }
    const ws2 = XL.utils.aoa_to_sheet(mesasData);
    ws2["!cols"] = [{wch:10},{wch:28},{wch:11},{wch:14},{wch:22}];
    ws2["!freeze"] = {xSplit:0, ySplit:1};
    XL.utils.book_append_sheet(wb, ws2, "Por mesas");

    // ── HOJA 3: Resumen ──
    const totalInv  = guests.length;
    const totalPers = guests.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
    const confPers  = guests.filter(g=>g.confirmacion==="confirmado").reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
    const noVaPers  = guests.filter(g=>g.confirmacion==="no_va").reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0);
    const pendPers  = totalPers - confPers - noVaPers;
    const restrMap  = {};
    guests.forEach(g=>{ if(g.restriccion&&g.restriccion!=="Ninguna") restrMap[g.restriccion]=(restrMap[g.restriccion]||0)+parseInt(g.cantidadInvitados||1); });
    const resData = [
      ["RESUMEN GENERAL",""],
      ["",""],
      ["Total invitaciones enviadas", totalInv],
      ["Total personas", totalPers],
      ["",""],
      ["CONFIRMACIONES","Personas"],
      ["Confirmados", confPers],
      ["Pendientes", pendPers],
      ["No van", noVaPers],
      ["",""],
      ["RESTRICCIONES ALIMENTARIAS","Personas"],
      ...Object.entries(restrMap).map(([r,n])=>[r,n]),
      ...(Object.keys(restrMap).length===0?[["(Sin restricciones especiales)",""]]:[]),
      ["",""],
      ["MESAS",""],
      ["Total mesas asignadas", maxMesa],
      ["Personas por mesa (configuración)", tableSize],
      ["Invitados sin mesa asignada", sinMesa.length],
    ];
    const ws3 = XL.utils.aoa_to_sheet(resData);
    ws3["!cols"] = [{wch:32},{wch:14}];
    XL.utils.book_append_sheet(wb, ws3, "Resumen");

    // Download
    XL.writeFile(wb, "invitados_boda.xlsx");
  };

  // ── Descargar plantilla CSV ──
  const downloadTemplate = () => {
    const headers = ["Nombre","Personas","Mesa","Lado","Parentesco","Confirmacion","Restriccion","Notas"];
    const instrucciones = [
      "INSTRUCCIONES - Borrar estas filas antes de importar",
      "Lado: Novio / Novia / Ambos",
      "Parentesco: Familia directa / Familia / Amigos / Trabajo / Ninos / Otro",
      "Confirmacion: Pendiente / Confirmado / No va",
      "Restriccion: Ninguna / Vegetariano / Vegano / Sin gluten / Sin lactosa / Kosher / Halal / Alergia / Otra",
      "Personas: numero entero - cuantas personas por invitacion",
      "Mesa: numero opcional"
    ];
    const ejemplos = [
      ["Garcia Juan y Maria","2","3","Novio","Familia","Confirmado","Ninguna",""],
      ["Lopez Ana","1","","Novia","Amigos","Pendiente","Vegetariano","Alergica a nueces"],
      ["Familia Rodriguez","5","7","Ambos","Familia directa","Confirmado","Sin gluten",""]
    ];
    const toCSV = (row) => row.map(c => String(c).includes(",") ? '"'+c+'"' : c).join(",");
    const lines = [
      ...instrucciones.map(i => [i,"","","","","","",""].map(c=>c).join(",")),
      toCSV(headers),
      ...ejemplos.map(toCSV)
    ];
    const csv = lines.join("\r\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_invitados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = async(e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    e.target.value = "";
    const isXLSX = file.name.slice(-5) === ".xlsx" || file.name.slice(-4) === ".xls";
    let rows = [];
    if(isXLSX){
      if(!window.XLSX){
        await new Promise(function(res,rej){
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const data = await file.arrayBuffer();
      const wb = window.XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = window.XLSX.utils.sheet_to_json(ws, {header:1, defval:""});
    } else {
      const text = await file.text();
      rows = text.split(/[\r\n]+/).map(function(r){
        const result = [];
        let cur = "";
        let inQ = false;
        for(let i = 0; i < r.length; i++){
          if(r[i] === '"'){ inQ = !inQ; }
          else if(r[i] === "," && !inQ){ result.push(cur.trim()); cur = ""; }
          else { cur += r[i]; }
        }
        result.push(cur.trim());
        return result;
      });
    }
    const HEADER_KEYS = ["nombre","personas","mesa","lado","parentesco","confirmacion","confirmación","restriccion","restricción","notas"];
    let headerIdx = -1;
    for(let i = 0; i < rows.length; i++){
      const row = rows[i].map(function(c){ return String(c).toLowerCase().trim(); });
      if(row.some(function(c){ return HEADER_KEYS.indexOf(c) >= 0; })){ headerIdx = i; break; }
    }
    if(headerIdx < 0){
      showToast("No se encontró la fila de encabezados en el archivo","error");
      return;
    }
    const headers2 = rows[headerIdx].map(function(c){
      return String(c).toLowerCase().trim().replace("confirmación","confirmacion").replace("restricción","restriccion");
    });
    const col = function(name){ return headers2.indexOf(name); };
    const iN = col("nombre"), iP = col("personas"), iM = col("mesa");
    const iL = col("lado"), iC = col("confirmacion"), iR = col("restriccion"), iNt = col("notas"), iPar = col("parentesco");
    if(iN < 0){ showToast("Falta la columna Nombre en el archivo","error"); return; }
    const LADOS = ["novio","novia","ambos"];
    const CONFS = ["pendiente","confirmado","no va"];
    const RESTRS = ["ninguna","vegetariano","vegano","sin gluten","sin lactosa","kosher","halal","alergia","otra"];
    const SKIP = ["instrucciones","lado:","confirmacion:","confirmación:","restriccion:","restricción:","personas:","mesa:","──","--"];
    const newGuests = [];
    const errs = [];
    for(let i = headerIdx + 1; i < rows.length; i++){
      const row = rows[i];
      if(!row || row.every(function(c){ return !c; })) continue;
      const first = String(row[0] || "").toLowerCase();
      if(SKIP.some(function(s){ return first.indexOf(s) === 0; })) continue;
      const nombre = String(row[iN] || "").trim();
      if(!nombre) continue;
      const personas = parseInt(row[iP] || 1) || 1;
      const mesa = row[iM] ? String(row[iM]).trim() : "";
      const ladoRaw = String(row[iL] || "ambos").trim().toLowerCase();
      const confRaw = String(row[iC] || "pendiente").trim().toLowerCase();
      const restrRaw = String(row[iR] || "ninguna").trim().toLowerCase();
      const notas = String(row[iNt] || "").trim();
      const parRaw = iPar >= 0 ? String(row[iPar] || "").trim().toLowerCase().replace("niños","ninos") : "";
      const parentesco = parRaw ? (PARENTESCOS.find(p=>p.toLowerCase().replace("niños","ninos")===parRaw) || "Otro") : "Otro";
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
    const warn = errs.length > 0 ? " Advertencias: " + errs.slice(0,3).join(". ") : "";
    showToast(`✓ ${newGuests.length} invitados importados`+(warn?". "+warn:""),"success",4000);
    const next = (guests || []).concat(newGuests);
    setGuests(next);
    save(next);
  };


    const asignarMesasAuto = () => {
    if(!guests || guests.length === 0) return;
    setAutoMesaLoading(true);
    // Distribuir invitados en mesas según tableSize, respetando grupos familiares juntos
    let mesaActual = 1;
    let personasEnMesa = 0;
    const next = guests.map(g => {
      const cant = parseInt(g.cantidadInvitados||1);
      // Si el grupo no cabe en la mesa actual, pasar a la siguiente
      if(personasEnMesa > 0 && personasEnMesa + cant > tableSize){
        mesaActual++;
        personasEnMesa = 0;
      }
      personasEnMesa += cant;
      return {...g, mesa: String(mesaActual)};
    });
    setGuests(next);
    save(next);
    setAutoMesaLoading(false);
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
      try{ const s=localStorage.getItem("ceci_salon_layout_v1"); L=s?JSON.parse(s):null; }catch(err){}
      try{
        const {data:row}=await supabase.from("wedding_data").select("salon_layout").eq("user_id",user.id).maybeSingle();
        if(row?.salon_layout) L=row.salon_layout;
      }catch(err){}
      if(!alive) return;
      salonLayoutRef.current = L;
      setSalonMesas(Array.isArray(L?.mesas)?L.mesas:null);
    })();
    return ()=>{alive=false;};
  },[]);
  // Al entrar a la vista Mesas, releer el layout (SalonView pudo haberlo cambiado)
  useEffect(()=>{
    if(viewMode!=="mesas") return;
    try{
      const s=localStorage.getItem("ceci_salon_layout_v1");
      if(s){
        const L=JSON.parse(s);
        salonLayoutRef.current=L;
        if(Array.isArray(L.mesas)) setSalonMesas(L.mesas);
      }
    }catch(err){}
  },[viewMode]);

  const guardarSalonMesas = (nuevas) => {
    const base = salonLayoutRef.current || {salonW:20,salonH:15,salonShape:"cuadrado",estiloDistrib:"banquet",elementos:[
      {id:"novios-1",tipo:"novios",mx:8.5,my:1,ew:3,eh:0.9},
      {id:"pista-1",tipo:"pista",mx:6,my:8,ew:8,eh:6},
      {id:"entrada-1",tipo:"entrada",mx:8,my:13,ew:3,eh:0.8},
    ]};
    const layout = {...base, mesas:nuevas};
    salonLayoutRef.current = layout;
    setSalonMesas(nuevas);
    try{ localStorage.setItem("ceci_salon_layout_v1", JSON.stringify(layout)); }catch(err){}
    supabase.from("wedding_data")
      .upsert({user_id:user.id,salon_layout:layout,updated_at:new Date().toISOString()},{onConflict:"user_id"})
      .then((res)=>{if(res&&res.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
  };
  const agregarMesaVista = () => {
    const ms = salonMesas||[];
    const maxId = Math.max(0, guests.reduce((m,g)=>Math.max(m,parseInt(g.mesa)||0),0), ...ms.map(m=>m.id));
    const id = maxId+1;
    const cols = Math.ceil(Math.sqrt(id+1));
    guardarSalonMesas([...ms, {id, mx:3+((id-1)%cols)*3.5, my:3+Math.floor((id-1)/cols)*3.5, tipo:"round", etiqueta:"", cap:tableSize}]);
  };
  const setCapMesaVista = (num, n) => {
    const cap = Math.max(2, Math.min(80, parseInt(n)||tableSize));
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
  const totalMesasVista = Math.max(maxMesa, ...((salonMesas||[]).map(m=>m.id)), 0);
  const tables = Array.from({length:totalMesasVista},(_,i)=>{
    const sm=(salonMesas||[]).find(m=>m.id===i+1);
    const gs=guests.filter(g=>parseInt(g.mesa)===i+1);
    return {num:i+1, cap:sm?.cap||tableSize, etiqueta:sm?.etiqueta||"", guests:gs,
      personas:gs.reduce((s,g)=>s+parseInt(g.cantidadInvitados||1),0)};
  });
  const sinMesa = guests.filter(g=>!g.mesa||g.mesa==="");

  // ── Menú Opciones: contenido compartido (dropdown desktop / bottom sheet mobile) ──
  const menuItemStyle = {display:"flex",alignItems:"center",gap:10,width:"100%",background:"transparent",border:"none",borderRadius:10,padding:"12px",minHeight:THEME.tap.comfortable,fontFamily:THEME.font.body,fontSize:"max(14px,.92rem)",color:THEME.color.ink,cursor:"pointer",textAlign:"left"};
  const guestMenuContent = <>
    <div style={{padding:"10px 12px",borderBottom:"0.5px solid rgba(74,94,58,.1)",marginBottom:6}}>
      <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:8}}>Personas por mesa</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[6,8,10,12,14].map(n=><button key={n} onClick={()=>{setTableSize(n);save(guests,n);}} style={{background:tableSize===n?THEME.color.sage:"transparent",color:tableSize===n?THEME.color.cream:"rgba(26,26,20,.6)",border:`1px solid ${tableSize===n?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"8px 14px",minHeight:THEME.tap.min,minWidth:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:tableSize===n?700:400,cursor:"pointer"}}>{n}</button>)}
      </div>
    </div>
    {guests&&guests.length>0&&guests.some(g=>!g.mesa||g.mesa==="")&&<button onClick={()=>{asignarMesasAuto();setShowGuestMenu(false);}} style={menuItemStyle}>🪑 Asignar mesas automáticamente</button>}
    <button onClick={()=>{exportToExcel();setShowGuestMenu(false);}} style={menuItemStyle}>↓ Exportar a Excel</button>
    <button onClick={()=>{downloadTemplate();setShowGuestMenu(false);}} style={menuItemStyle}>↓ Descargar plantilla</button>
    <label style={menuItemStyle}>
      ↑ Importar lista
      <input type="file" accept=".csv,.xlsx,.xls" onChange={e=>{importFromFile(e);setShowGuestMenu(false);}} style={{display:"none"}}/>
    </label>
    <button onClick={()=>{setGuia("ceremonia");setShowGuestMenu(false);}} style={menuItemStyle}>📖 Guía nupcial (ceremonia, invitaciones...)</button>
  </>;

  return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",paddingBottom:"calc(88px + env(safe-area-inset-bottom))"}}>
    {showGuestMenu&&isMobile&&<BottomSheet title="Opciones de invitados" onClose={()=>setShowGuestMenu(false)}>{guestMenuContent}</BottomSheet>}
    <GuiaNupcial abierta={!!guia} seccionInicial={guia||"mesas"} onClose={()=>setGuia(null)}/>
    {confirmDelete&&<ConfirmModal
      msg={`¿Eliminar a ${guests.find(g=>g.id===confirmDelete)?.nombre}?`}
      onConfirm={()=>{removeGuest(confirmDelete);setConfirmDelete(null);}}
      onCancel={()=>setConfirmDelete(null)}/>}
    <div style={{background:THEME.color.sage,padding:isMobile?"10px 12px 12px":"clamp(12px,3vw,28px) clamp(12px,4vw,48px)"}}>
      <div style={{maxWidth:viewMode==="salon"?1760:960,margin:"0 auto",transition:"max-width .25s ease"}}>
        <button onClick={onBack} style={{display:"none"}}>← Inicio</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:isMobile?"max(10px,.6rem)":THEME.text.label,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(201,169,110,.75)",marginBottom:isMobile?3:8}}>Módulo · Planning</div>
            <h1 style={{fontFamily:THEME.font.display,fontSize:isMobile?"1.35rem":"clamp(1.8rem,4vw,2.6rem)",color:THEME.color.cream,margin:"0 0 4px",lineHeight:1.1}}>👥 Invitados</h1>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {/* Acción principal siempre visible */}
            <button onClick={()=>setAddMode(true)} style={{background:THEME.color.gold,color:THEME.color.ink,border:"none",padding:isMobile?"8px 14px":"11px 22px",minHeight:isMobile?40:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:700,fontSize:isMobile?"13px":"max(14px,.95rem)",borderRadius:THEME.radius.pill,cursor:"pointer",boxShadow:"0 2px 8px rgba(201,169,110,.4)",whiteSpace:"nowrap"}}>+ Agregar</button>
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

    <div style={{maxWidth:viewMode==="salon"?1760:960,margin:"0 auto",padding:"clamp(12px,3vw,28px) clamp(10px,4vw,48px) 0",width:"100%",boxSizing:"border-box",transition:"max-width .25s ease"}}>
      {addMode&&<div style={{background:THEME.color.cream2,border:"1.5px solid rgba(74,94,58,.3)",borderRadius:16,padding:"clamp(14px,4vw,20px)",marginBottom:14,boxShadow:"0 4px 20px rgba(74,94,58,.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:THEME.font.display,fontSize:"1.05rem",fontWeight:700,color:THEME.color.ink}}>Nuevo invitado</div>
          <button onClick={()=>setAddMode(false)} style={{background:"transparent",border:"none",fontSize:"1.2rem",cursor:"pointer",color:"rgba(26,26,20,.3)",lineHeight:1}}>×</button>
        </div>
        {/* Nombre — campo principal, más grande */}
        <div style={{marginBottom:10}}>
          <input autoFocus type="text" value={newGuest.nombre} onChange={e=>setNewGuest(x=>({...x,nombre:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addGuest()}
            placeholder="Nombre completo del invitado o familia..."
            style={{width:"100%",fontFamily:THEME.font.display,fontSize:"1.05rem",padding:"10px 14px",borderRadius:10,border:"1.5px solid rgba(74,94,58,.3)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",outline:"none"}}/>
        </div>
        {/* Fila secundaria */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8,marginBottom:10}}>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Personas</div>
            <input type="number" value={newGuest.cantidadInvitados} onChange={e=>setNewGuest(x=>({...x,cantidadInvitados:e.target.value}))} min="1"
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Mesa Nº</div>
            <input type="number" value={newGuest.mesa} onChange={e=>setNewGuest(x=>({...x,mesa:e.target.value}))} placeholder="—" min="1"
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Lado</div>
            <select value={newGuest.lado} onChange={e=>setNewGuest(x=>({...x,lado:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {LADOS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Parentesco</div>
            <select value={newGuest.parentesco} onChange={e=>setNewGuest(x=>({...x,parentesco:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {PARENTESCOS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Restricción</div>
            <select value={newGuest.restriccion} onChange={e=>setNewGuest(x=>({...x,restriccion:e.target.value}))} style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream,color:THEME.color.ink}}>
              {RESTRICCIONES.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        {/* Sugerencia de mesa según parentesco */}
        {!newGuest.mesa&&guests&&guests.length>0&&(()=>{
          const s=sugerirMesa(newGuest.parentesco||"Otro",newGuest.lado,newGuest.cantidadInvitados);
          return <button onClick={()=>setNewGuest(x=>({...x,mesa:String(s.mesa)}))}
            style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(201,169,110,.1)",border:"1px dashed rgba(201,169,110,.5)",borderRadius:16,padding:"9px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(139,107,40,.95)",cursor:"pointer",marginBottom:10,textAlign:"left",maxWidth:"100%"}}>
            💡 Sugerida: <strong>Mesa {s.mesa}</strong> · {s.motivo} — tocá para usar
          </button>;
        })()}
        <div style={{display:"flex",gap:8}}>
          <button onClick={addGuest} disabled={!newGuest.nombre.trim()} style={{background:newGuest.nombre.trim()?THEME.color.sage:"rgba(74,94,58,.3)",color:THEME.color.cream,border:"none",borderRadius:100,padding:"10px 24px",fontFamily:THEME.font.body,fontWeight:700,fontSize:".9rem",cursor:newGuest.nombre.trim()?"pointer":"default",transition:"background .2s"}}>
            + Agregar
          </button>
          <button onClick={()=>setAddMode(false)} style={{background:"transparent",border:"1px solid rgba(74,94,58,.2)",borderRadius:100,padding:"10px 16px",fontFamily:THEME.font.body,fontSize:".88rem",color:"rgba(26,26,20,.4)",cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>}

      {/* Tabs de vista */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",background:THEME.color.cream2,borderRadius:100,padding:3,border:"0.5px solid rgba(201,169,110,.2)"}}>
          {[{id:"lista",label:"📋 Lista"},{id:"mesas",label:"🪑 Mesas"},{id:"salon",label:"⚪ Plano de mesas"}].map(v=>
            <button key={v.id} onClick={()=>setViewMode(v.id)} style={{padding:isMobile?"8px 12px":"10px 16px",minHeight:isMobile?40:THEME.tap.min,borderRadius:THEME.radius.pill,border:"none",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:viewMode===v.id?700:500,cursor:"pointer",background:viewMode===v.id?THEME.color.sage:"transparent",color:viewMode===v.id?THEME.color.cream:"rgba(26,26,20,.45)",transition:"all .2s",whiteSpace:"nowrap"}}>{v.label}</button>
          )}
        </div>
        <div style={{marginLeft:"auto",fontFamily:THEME.font.body,fontSize:".78rem",color:"rgba(26,26,20,.35)"}}>{filtered.length} de {guests.length}</div>
      </div>

      {/* Barra búsqueda + filtros — solo en lista */}
      {viewMode==="lista"&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:".9rem",pointerEvents:"none",opacity:.4}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, lado o mesa..."
            style={{width:"100%",fontFamily:THEME.font.body,fontSize:".88rem",padding:"8px 10px 8px 34px",borderRadius:100,border:"1px solid rgba(74,94,58,.18)",background:THEME.color.cream2,color:THEME.color.ink,boxSizing:"border-box",outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",fontSize:".9rem",cursor:"pointer",color:"rgba(26,26,20,.4)",lineHeight:1}}>×</button>}
        </div>
        <select value={filter.conf} onChange={e=>setFilter(f=>({...f,conf:e.target.value}))} style={{fontFamily:THEME.font.body,fontSize:".82rem",padding:"7px 10px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:THEME.color.cream2,color:filter.conf?THEME.color.sage:"rgba(26,26,20,.5)",cursor:"pointer"}}>
          <option value="">Confirmación</option>{CONFIRMACIONES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={filter.lado} onChange={e=>setFilter(f=>({...f,lado:e.target.value}))} style={{fontFamily:THEME.font.body,fontSize:".82rem",padding:"7px 10px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:THEME.color.cream2,color:filter.lado?THEME.color.sage:"rgba(26,26,20,.5)",cursor:"pointer"}}>
          <option value="">Lado</option>{LADOS.map(l=><option key={l}>{l}</option>)}
        </select>
        {(search||filter.conf||filter.lado)&&<button onClick={()=>{setSearch("");setFilter({lado:"",conf:"",mesa:""}); }} style={{background:"transparent",border:"none",fontFamily:THEME.font.body,fontSize:".78rem",color:"rgba(200,60,60,.6)",cursor:"pointer",whiteSpace:"nowrap"}}>✕ Limpiar</button>}
      </div>}

      {viewMode==="lista"&&<>
        {filtered.length===0&&!addMode&&<div style={{textAlign:"center",padding:"clamp(16px,3.5vw,40px) clamp(10px,2vw,20px)",background:THEME.color.cream2,borderRadius:16,border:"0.5px solid rgba(201,169,110,.2)"}}>
          <div style={{fontSize:"2rem",marginBottom:10}}>👥</div>
          <p style={{fontFamily:THEME.font.display,fontSize:"1.05rem",color:THEME.color.ink,margin:"0 0 6px"}}>Aún no hay invitados</p>
          <p style={{fontFamily:THEME.font.body,fontSize:".88rem",color:"rgba(26,26,20,.45)",margin:"0 0 18px"}}>Podés agregarlos uno a uno o importar una lista desde Excel/CSV</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setAddMode(true)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:100,padding:"11px 22px",fontFamily:THEME.font.body,fontWeight:700,cursor:"pointer"}}>+ Agregar invitado</button>
            <button onClick={downloadTemplate} style={{background:"transparent",border:"1px solid rgba(74,94,58,.3)",borderRadius:THEME.radius.pill,padding:"11px 20px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:600,color:THEME.color.sage,cursor:"pointer"}}>↓ Descargar plantilla Excel</button>
            <label style={{background:"transparent",border:"1px solid rgba(74,94,58,.3)",borderRadius:THEME.radius.pill,padding:"11px 20px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:600,color:THEME.color.sage,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>
              ↑ Importar lista
              <input type="file" accept=".csv,.xlsx,.xls" onChange={importFromFile} style={{display:"none"}}/>
            </label>
          </div>
        </div>}
        {filtered.length===0&&search&&<div style={{textAlign:"center",padding:"clamp(16px,3vw,32px) clamp(12px,2vw,20px)",background:THEME.color.cream2,borderRadius:14,border:"0.5px solid rgba(201,169,110,.2)"}}>
          <div style={{fontSize:"1.8rem",marginBottom:8}}>🔍</div>
          <p style={{fontFamily:THEME.font.display,fontSize:"1rem",color:THEME.color.ink,margin:"0 0 4px"}}>Sin resultados para "{search}"</p>
          <p style={{fontFamily:THEME.font.body,fontSize:".85rem",color:"rgba(26,26,20,.4)",margin:0}}>Probá con otro nombre o limpiar los filtros</p>
        </div>}
        {filtered.map(g=>{
          const c=confMap[g.confirmacion]||CONFIRMACIONES[0];
          const isExpanded=expandedId===g.id;
          const cant=parseInt(g.cantidadInvitados||1);
          return <div key={g.id} style={{background:THEME.color.cream2,border:`0.5px solid ${isExpanded?"rgba(74,94,58,.3)":"rgba(201,169,110,.18)"}`,borderRadius:14,marginBottom:6,overflow:"hidden",transition:"border-color .2s"}}>
            <>
                  {/* Fila principal — siempre visible */}
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",minHeight:56}}
                    onClick={()=>setExpandedId(isExpanded?null:g.id)}>
                    {/* Avatar inicial */}
                    <div style={{width:36,height:36,borderRadius:"50%",background:c.bg||"rgba(74,94,58,.1)",border:`1.5px solid ${c.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontFamily:THEME.font.display,fontSize:"1rem",fontWeight:700,color:c.color}}>{g.nombre?.charAt(0)?.toUpperCase()||"?"}</span>
                    </div>
                    {/* Info principal */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontFamily:THEME.font.display,fontSize:".95rem",fontWeight:600,color:THEME.color.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{g.nombre}</span>
                        {cant>1&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",background:"rgba(74,94,58,.1)",color:THEME.color.sage,borderRadius:100,padding:"2px 6px",flexShrink:0}}>×{cant}</span>}
                      </div>
                      <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontFamily:THEME.font.body,fontSize:".74rem",color:"rgba(26,26,20,.4)"}}>{g.lado}{g.parentesco&&g.parentesco!=="Otro"?` · ${g.parentesco}`:""}</span>
                        {g.mesa&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".06em",background:"rgba(201,169,110,.12)",color:"rgba(201,169,110,.8)",borderRadius:100,padding:"1px 6px"}}>Mesa {g.mesa}</span>}
                        {g.restriccion&&g.restriccion!=="Ninguna"&&<span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(200,130,0,.7)"}}>⚠️ {g.restriccion}</span>}
                      </div>
                    </div>
                    {/* Chip de confirmación — clickable */}
                    <div style={{flexShrink:0}}>
                      <select value={g.confirmacion} onChange={e=>{e.stopPropagation();updateGuest(g.id,"confirmacion",e.target.value);}} onClick={e=>e.stopPropagation()}
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
                        <input type="number" key={`mesa-${g.id}-${g.mesa||""}`} defaultValue={g.mesa||""} onBlur={e=>updateGuest(g.id,"mesa",e.target.value)} placeholder="Sin asignar" min="1"
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
                        <button onClick={()=>{const s=sugerirMesa(g.parentesco||"Otro",g.lado,g.cantidadInvitados);updateGuest(g.id,"mesa",String(s.mesa));}}
                          style={{background:"transparent",border:"none",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(139,107,40,.85)",cursor:"pointer",padding:"6px 2px",textAlign:"left"}}>💡 Sugerir según parentesco</button>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Personas</div>
                        <input type="number" defaultValue={g.cantidadInvitados||1} onBlur={e=>updateGuest(g.id,"cantidadInvitados",e.target.value)} min="1"
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Lado</div>
                        <select defaultValue={g.lado} onBlur={e=>updateGuest(g.id,"lado",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {LADOS.map(l=><option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Parentesco</div>
                        <select defaultValue={g.parentesco||"Otro"} onBlur={e=>updateGuest(g.id,"parentesco",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {PARENTESCOS.map(p=><option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",marginBottom:4}}>Restricción</div>
                        <select defaultValue={g.restriccion} onBlur={e=>updateGuest(g.id,"restriccion",e.target.value)}
                          style={{width:"100%",fontFamily:THEME.font.body,fontSize:".9rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink}}>
                          {RESTRICCIONES.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Notas */}
                    <input type="text" defaultValue={g.notas||""} onBlur={e=>updateGuest(g.id,"notas",e.target.value)} placeholder="Notas (opcional)..."
                      style={{width:"100%",fontFamily:THEME.font.body,fontSize:".88rem",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,color:THEME.color.ink,boxSizing:"border-box",marginBottom:10}}/>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={()=>setExpandedId(null)} style={{background:THEME.color.sage,color:THEME.color.cream,border:"none",borderRadius:THEME.radius.pill,padding:"11px 24px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontWeight:700,fontSize:"max(13px,.85rem)",cursor:"pointer"}}>✓ Guardar</button>
                      <button onClick={()=>setConfirmDelete(g.id)} style={{background:"transparent",border:"none",borderRadius:THEME.radius.sm,padding:"11px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(200,60,60,.65)",cursor:"pointer",marginLeft:"auto"}}>🗑 Eliminar</button>
                    </div>
                  </div>}
                </>
          </div>
        })}
      </>}

      {viewMode==="mesas"&&<>
        {/* Barra de movimiento activo */}
        {movingGuest&&(()=>{const mg=guests.find(g=>g.id===movingGuest);return mg?<div style={{position:"sticky",top:8,zIndex:50,display:"flex",alignItems:"center",gap:10,background:THEME.color.sage,color:THEME.color.cream,borderRadius:THEME.radius.pill,padding:"10px 16px",marginBottom:12,boxShadow:THEME.shadow.pop}}>
          <span style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",flex:1}}>Moviendo a <strong>{mg.nombre}</strong> — tocá la mesa destino</span>
          <button onClick={()=>setMovingGuest(null)} style={{background:"rgba(245,239,224,.2)",border:"none",borderRadius:THEME.radius.pill,padding:"8px 14px",minHeight:36,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:THEME.color.cream,cursor:"pointer"}}>✕ Cancelar</button>
        </div>:null;})()}
        {/* Zona Sin mesa — también es destino para desasignar */}
        {(sinMesa.length>0||movingGuest||dragMG)&&<div data-mesa-drop=""
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("guestId");if(id){updateGuest(id,"mesa","");setMovingGuest(null);}}}
          onClick={()=>{if(movingGuest){updateGuest(movingGuest,"mesa","");setMovingGuest(null);}}}
          style={{background:dragMG?.over===""?"rgba(74,94,58,.12)":"rgba(201,169,110,.08)",border:`${(movingGuest||dragMG)?"1.5px dashed rgba(74,94,58,.5)":"0.5px solid rgba(201,169,110,.3)"}`,borderRadius:12,padding:"12px 16px",marginBottom:14,cursor:movingGuest?"pointer":"default",transition:"border .15s, background .15s"}}>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.65)",marginBottom:sinMesa.length>0?8:0}}>Sin mesa asignada ({sinMesa.length}){movingGuest?" — tocá acá para quitar de la mesa":""}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {sinMesa.map(g=><div key={g.id} draggable
              onDragStart={e=>{e.dataTransfer.setData("guestId",g.id);setMovingGuest(g.id);}}
              onDragEnd={()=>setMovingGuest(null)}
              onClick={e=>{e.stopPropagation();setMovingGuest(movingGuest===g.id?null:g.id);}}
              style={{display:"flex",alignItems:"center",gap:4,background:movingGuest===g.id?"rgba(74,94,58,.18)":"rgba(201,169,110,.08)",border:movingGuest===g.id?"1px solid rgba(74,94,58,.5)":"1px solid transparent",borderRadius:100,padding:"5px 12px 5px 4px",minHeight:38,cursor:"grab",userSelect:"none"}}>
              <span onMouseDown={e=>beginDragMG(e,g)} onTouchStart={e=>beginDragMG(e,g)} onClick={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}
                style={{cursor:"grab",touchAction:"none",padding:"8px 6px",color:"rgba(26,26,20,.35)",fontSize:".85rem",lineHeight:1,flexShrink:0,userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}>⠿</span>
              <span style={{fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(26,26,20,.7)"}}>{g.nombre}{parseInt(g.cantidadInvitados||1)>1?` ×${g.cantidadInvitados}`:""}</span>
            </div>)}
          </div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(240px,100%),1fr))",gap:10}}>
          {tables.map(t=>{
            const pct=Math.round(t.personas/t.cap*100);
            const over=t.personas>t.cap;
            const esDestino=movingGuest&&!t.guests.some(g=>g.id===movingGuest);
            const hoverDrag=dragMG?.over===String(t.num);
            return <div key={t.num} data-mesa-drop={String(t.num)}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("guestId");if(id){updateGuest(id,"mesa",String(t.num));setMovingGuest(null);}}}
              onClick={()=>{if(esDestino){updateGuest(movingGuest,"mesa",String(t.num));setMovingGuest(null);}}}
              style={{background:hoverDrag?"rgba(74,94,58,.08)":THEME.color.cream2,border:(esDestino||hoverDrag)?"1.5px dashed rgba(74,94,58,.55)":`0.5px solid ${over?"rgba(200,80,60,.4)":"rgba(201,169,110,.22)"}`,borderRadius:14,padding:"14px",cursor:esDestino?"pointer":"default",transition:"border .15s, transform .15s, background .15s",transform:(esDestino||hoverDrag)?"scale(1.01)":"none"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:8}}>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:THEME.font.display,fontWeight:700,fontSize:"1.05rem",color:THEME.color.ink}}>Mesa {t.num}</div>
                  {t.etiqueta&&<div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.6)"}}>{t.etiqueta}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <span style={{fontFamily:THEME.font.body,fontSize:".82rem",color:over?"rgba(200,80,60,.8)":pct>=80?"rgba(201,169,110,.8)":"rgba(74,94,58,.6)"}}>{t.personas}{over&&" ⚠️"} /</span>
                  <input type="number" min="2" max="80" key={`cap-${t.num}-${t.cap}`} defaultValue={t.cap}
                    onBlur={e=>{const v=parseInt(e.target.value); if(v&&v!==t.cap) setCapMesaVista(t.num,v);}}
                    onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}
                    title="Personas por mesa"
                    style={{width:44,fontFamily:THEME.font.body,fontSize:".85rem",fontWeight:600,padding:"5px 3px",borderRadius:7,border:"1px solid rgba(74,94,58,.25)",background:THEME.color.cream,color:THEME.color.ink,textAlign:"center"}}/>
                </div>
              </div>
              <div style={{height:4,background:"rgba(74,94,58,.1)",borderRadius:4,overflow:"hidden",marginBottom:10}}>
                <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:over?"rgba(200,80,60,.5)":pct>=80?THEME.color.gold:THEME.color.sage,borderRadius:4,transition:"width .3s"}}/>
              </div>
              {t.guests.map(g=>{
                const c=confMap[g.confirmacion]||CONFIRMACIONES[0];
                const enMov=movingGuest===g.id;
                return <div key={g.id} draggable
                  onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("guestId",g.id);setMovingGuest(g.id);}}
                  onDragEnd={()=>setMovingGuest(null)}
                  onClick={e=>{e.stopPropagation();setMovingGuest(enMov?null:g.id);}}
                  title="Arrastrá desde ⠿ (o tocá y elegí mesa)"
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 6px 8px 0",minHeight:THEME.tap.min,borderBottom:"0.5px solid rgba(74,94,58,.06)",borderRadius:8,background:enMov?"rgba(74,94,58,.12)":"transparent",cursor:"grab",userSelect:"none",transition:"background .15s"}}>
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
            <span style={{fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.4)"}}>Mesa {totalMesasVista+1} · {tableSize} personas</span>
          </button>
        </div>
        {/* Ghost flotante durante el drag */}
        {dragMG&&<div style={{position:"fixed",left:dragMG.x-12,top:dragMG.y-42,zIndex:9999,pointerEvents:"none",background:THEME.color.sage,color:THEME.color.cream,borderRadius:THEME.radius.pill,padding:"9px 16px",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.35)",whiteSpace:"nowrap"}}>↔ {dragMG.nombre}</div>}
      </>}
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
  const [tableSize, setTableSize] = useState(10);
  const [budgetInvitados, setBudgetInvitados] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(()=>{
    let alive = true;
    if(!user){ setGuests([]); setLoading(false); return; }
    (async()=>{
      try{
        const {data:row} = await supabase
          .from("wedding_data")
          .select("guests,table_size,budget")
          .eq("user_id",user.id)
          .maybeSingle();
        if(!alive) return;
        const list = Array.isArray(row?.guests) ? row.guests : [];
        setGuests(list);
        if(row?.table_size) setTableSize(row.table_size);
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
        const {data:brow} = await supabase.from("wedding_data").select("budget").eq("user_id",user.id).maybeSingle();
        if(brow?.budget) budgetUpdate = {...brow.budget, invitados:String(totalPersonas)};
      }catch(err){}
      const upsertData = {user_id:user.id,guests:next,table_size:ts,updated_at:new Date().toISOString()};
      if(budgetUpdate) upsertData.budget = budgetUpdate;
      await supabase.from("wedding_data").upsert(upsertData,{onConflict:"user_id"});
      setBudgetInvitados(totalPersonas);
    }catch(err){
      console.warn("⚠️ No se pudieron guardar los invitados desde Diseño del salón:", err?.message||err);
    }
  };

  if(loading){
    return <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:THEME.font.body,color:"rgba(26,26,20,.55)"}}>Cargando diseño del salón...</div>;
  }

  return <div style={{minHeight:"100vh",background:THEME.color.cream,padding:isMobile?"12px":"24px"}}>
    <div style={{maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".16em",textTransform:"uppercase",color:"rgba(74,94,58,.58)",marginBottom:4}}>Diseño del salón</div>
          <h1 style={{fontFamily:THEME.font.display,fontSize:"clamp(1.55rem,3vw,2.35rem)",lineHeight:1.05,margin:0,color:THEME.color.ink}}>Plano, decoración y circulación</h1>
          <p style={{fontFamily:THEME.font.body,fontSize:".9rem",color:"rgba(26,26,20,.52)",margin:"6px 0 0",maxWidth:720}}>Acá diseñás el salón completo. Las mesas se comparten con Invitados, pero la decoración queda fuera del canvas limpio de seating.</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {onGoGuests&&<button onClick={onGoGuests} style={{background:"white",border:"1px solid rgba(74,94,58,.18)",borderRadius:10,padding:"10px 14px",fontFamily:THEME.font.body,color:THEME.color.sage,cursor:"pointer"}}>👥 Volver a invitados</button>}
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
  {v:"round",   l:"⭕", desc:"Redonda",  ew:undefined, eh:undefined, cap:10},
  {v:"square",  l:"◻",  desc:"Cuadrada", ew:2.0, eh:2.0, cap:10},
  {v:"rect_h",  l:"▬",  desc:"Rect. H",  ew:5.4, eh:0.9, cap:20},
  {v:"rect_v",  l:"▮",  desc:"Rect. V",  ew:0.9, eh:5.4, cap:20},
  {v:"imperial",l:"═",  desc:"Imperial", ew:8.4, eh:1.1, cap:30},
];

// Capacidades seleccionables por tipo de mesa
const CAP_OPCIONES = {
  round:    [6,8,10,12],
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
const SALON_LS_KEY = "ceci_salon_layout_v1";
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
const tableDiameterForGuests = (tableSize=10) => (Number(tableSize)||10) <= 8 ? 1.50 : 1.80;
const isNormalizedSalonLayout = (L) => !!L && ((Number(L.salonW)||0) >= 80 || (Number(L.salonH)||0) >= 80);
const convertNormalizedLayoutToMeters = (L, totalPeople=150, tableSize=10) => {
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

const mesasRedondas = (coords, offset=1) => coords.map(([mx,my],i)=>mesa(i+offset,mx,my,"round",{cap:10}));


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
      locked: true,
      presetFixed: true,
      presetKey: raw.key,
      labelOverride: humanizePresetKey(raw.key),
    }
  );
};

const presetTableToCanvas = (raw, index, tableSize=10, room={w:22,h:16}) => {
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

const selectPresetTablesByGuests = (tablePattern=[], totalPeople=0, tableSize=10, room={w:22,h:16}) => {
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

const buildReferenceWeddingPreset = (presetId, totalPeople=150, tableSize=10) => {
  const p = REFERENCE_WEDDING_PRESETS.find(x=>x.id===presetId) || REFERENCE_WEDDING_PRESETS[0];
  const room = getRoomSizeForGuests(totalPeople || 150);
  const picked = selectPresetTablesByGuests(p.tables || [], totalPeople, tableSize || 10, room);
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
  REFERENCE_WEDDING_PRESETS.map(p => [p.id, (_decor, totalPeople=0, tableSize=10) => buildReferenceWeddingPreset(p.id, totalPeople, tableSize)])
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
const SALON_MODELO = () => PRESET_BUILDERS.jardin_romantico_central(null, 150, 10);


// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 · Motor de presets profesionales sin tocar escala del canvas
// Mantiene el canvas en metros reales. Los elementos se ubican en metros y el
// render existente los escala visualmente una sola vez con PX.
// ─────────────────────────────────────────────────────────────────────────────
const GUEST_COUNT_OPTIONS = [100,150,200,250,300];
const ROOM_SIZE_OPTIONS = {
  100: {
    compact: { W: 16, H: 12, area: 192, label: "Compacto 16 x 12 m" },
    recommended: { W: 18, H: 14, area: 252, label: "Recomendado 18 x 14 m" },
    spacious: { W: 22, H: 16, area: 352, label: "Amplio 22 x 16 m" },
    premium: { W: 26, H: 18, area: 468, label: "Premium 26 x 18 m" }
  },
  150: {
    compact: { W: 20, H: 14, area: 280, label: "Compacto 20 x 14 m" },
    recommended: { W: 22, H: 16, area: 352, label: "Recomendado 22 x 16 m" },
    spacious: { W: 24, H: 18, area: 432, label: "Amplio 24 x 18 m" },
    premium: { W: 28, H: 20, area: 560, label: "Premium 28 x 20 m" }
  },
  200: {
    compact: { W: 22, H: 16, area: 352, label: "Compacto 22 x 16 m" },
    recommended: { W: 24, H: 18, area: 432, label: "Recomendado 24 x 18 m" },
    spacious: { W: 28, H: 20, area: 560, label: "Amplio 28 x 20 m" },
    premium: { W: 32, H: 22, area: 704, label: "Premium 32 x 22 m" }
  },
  250: {
    compact: { W: 26, H: 18, area: 468, label: "Compacto 26 x 18 m" },
    recommended: { W: 28, H: 20, area: 560, label: "Recomendado 28 x 20 m" },
    spacious: { W: 30, H: 22, area: 660, label: "Amplio 30 x 22 m" },
    premium: { W: 36, H: 24, area: 864, label: "Premium 36 x 24 m" }
  },
  300: {
    compact: { W: 28, H: 20, area: 560, label: "Compacto 28 x 20 m" },
    recommended: { W: 30, H: 20, area: 600, label: "Recomendado 30 x 20 m" },
    spacious: { W: 34, H: 24, area: 816, label: "Amplio 34 x 24 m" },
    premium: { W: 40, H: 25, area: 1000, label: "Premium 40 x 25 m" }
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
    locked:true,
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

const stage2TableCollisionItem = (m={}) => ({
  id: m.id,
  type: m.tipo || m.type || "table",
  x: Number(m.mx)||0,
  y: Number(m.my)||0,
  width: m.operationalWidth || m.ew || m.realDiameter || 1,
  height: m.operationalHeight || m.eh || m.realDiameter || 1,
  operationalWidth: m.operationalWidth || m.ew || m.realDiameter || 1,
  operationalHeight: m.operationalHeight || m.eh || m.realDiameter || 1,
});
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
  return mesa(id, +slot.x.toFixed(2), +slot.y.toFixed(2), round ? "round" : "rect_h", {
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

const PRESET_STAGE2_ORDER = ["jardin_romantico_central","luxury_ballroom_simetrico","boho_garden_asimetrico","minimal_chic_blanco","mediterraneo_familiar","glam_black_gold","rustic_elegance","cabaret_wedding","cocktail_lounge_wedding","classic_family_reception","festival_outdoor_wedding","garden_tent_formal","urban_industrial","romantic_circular_flow","premium_experience_wedding"];
const getRecommendedTableTypeForPreset = (presetId, guestCount=150, roomSizeOption="recommended") => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
  const chosen = roomSizeOption === "compact" && cfg.compact ? cfg.compact : (cfg.recommended || "round_180_comfort");
  return {...TABLE_TYPES[chosen], id: chosen};
};
const getStage2TablePlan = (presetId, guestCount=150, roomSizeOption="recommended", tableTypeId="auto") => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
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
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
  return (cfg.fixed?.({W,H,guestCount,roomSizeOption}) || []).map(el=>({
    ...el,
    mx:+clampStage2Box(el.mx,0,Math.max(0,W-(el.ew||0))).toFixed(2),
    my:+clampStage2Box(el.my,0,Math.max(0,H-(el.eh||0))).toFixed(2)
  }));
};

const stage2MarginByType = {
  pista:1.5, banios:4, entrada:3, bar:2, buffet:2, escenario:2,
  novios:1.5, torta:1.5, photobooth:1.5, living:1.5, activacion:1.5,
  cabina360:1.5, guardarropa:1.2, proveedores:1.2, mozos:1.2
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
  return {id:"dj_sightline",type:"forbidden",source:"corredor_visual_dj",x:pc.x,y:(dc.y+pc.y)/2,width:Math.max(dj.ew||0,pista.ew||0)+1.5,height:Math.max(1,Math.abs(pc.y-dc.y))};
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
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
  const base = (cfg.zones?.({W,H,fixedElements}) || []).filter(z=>z.xMax>z.xMin && z.yMax>z.yMin).map((z,idx)=>({
    ...z,
    priority: z.priority ?? (idx+1),
    align: z.align || cfg.pattern || "grid",
    pattern: z.pattern || cfg.pattern || "grid"
  }));
  // La zona de desborde queda última. Solo se usa si faltan mesas.
  const fallbackAlign = cfg.pattern === "ring" ? "ring" : (cfg.pattern === "banquet_rows" ? "banquet_rows" : (cfg.pattern === "symmetric" ? "symmetric" : "organic"));
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
const generateTableSlots = (tableZones=[], tableType=TABLE_TYPES.round_180_comfort, W=22, H=16, fixedElements=[], opts={}) => {
  const spacing=opts.spacing ?? 1.5;
  const zones=[...tableZones].sort((a,b)=>(a.priority||9)-(b.priority||9));
  const slots=[];
  for(const z of zones){
    if(z.align==="ring" || z.pattern==="ring") slots.push(...generateRingSlots(z,tableType,W,H,fixedElements,spacing));
    else slots.push(...generateGridSlots(z,tableType,W,H,spacing));
  }
  return slots.map((s,idx)=>({...s,id:s.id||`${s.zoneId}_${idx}`,centerBias:Math.abs((s.x||0)-W/2)}));
};
const generateDenseFallbackSlots = (W,H,tableType,fixedElements=[]) => {
  const zones=[{id:"desborde_exterior",xMin:1.2,xMax:W-1.2,yMin:1.2,yMax:H-1.2,priority:80,align:"organic",pattern:"organic",fallback:true}];
  return generateTableSlots(zones,tableType,W,H,fixedElements,{spacing:1.2});
};
const sortSlotsByPresetLogic = (slots=[], presetId="jardin_romantico_central", W=22) => {
  const cfg=STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
  const pattern=cfg.pattern || "grid";
  const base=[...slots];
  if(pattern==="symmetric" || ["luxury_ballroom_simetrico","glam_black_gold","garden_tent_formal","romantic_circular_flow"].includes(presetId)){
    return base.sort((a,b)=>(a.priority||9)-(b.priority||9) || Math.round(a.y*2)-Math.round(b.y*2) || Math.abs(a.x-W/2)-Math.abs(b.x-W/2) || (a.x-b.x));
  }
  if(pattern==="ring") return base.sort((a,b)=>(a.ring||0)-(b.ring||0) || (a.angle||0)-(b.angle||0));
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
  const cfg=STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
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
  const presetId=opts.presetId || "jardin_romantico_central";
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
const generateWeddingLayout = ({presetId="jardin_romantico_central",guestCount=150,roomSizeOption="recommended",tableType="auto",format="dinner",musicType="dj",coupleTableType="sweetheart"}={}) => {
  const cfg = STAGE2_PRESET_CONFIGS[presetId] || STAGE2_PRESET_CONFIGS.jardin_romantico_central;
  const room=getRoomSize(guestCount,roomSizeOption);
  const W=room.W, H=room.H;
  const fixedElements=generateFixedElements(presetId,W,H,guestCount,roomSizeOption);
  const zones=generateTableZonesForPreset(presetId,W,H,fixedElements);
  const plan=getStage2TablePlan(presetId,guestCount,roomSizeOption,tableType);
  let allTables=[];
  const placementWarnings=[];
  for(const part of plan){
    const forbidden=generateForbiddenZones({salonW:W,salonH:H,elementos:fixedElements,mesas:allTables,guestCount});
    const slots=generateTableSlots(zones,part.type,W,H,fixedElements,{spacing:1.5});
    let result=placeTablesInSlots(part.count,slots,forbidden,part.type,W,H,allTables.length+1,part.label||"",{presetId,existingTables:allTables});
    if(!result.success){
      const relaxedSlots=generateTableSlots(zones,part.type,W,H,fixedElements,{spacing:1.2});
      result=placeTablesInSlots(part.count,relaxedSlots,forbidden,part.type,W,H,allTables.length+1,part.label||"",{presetId,existingTables:allTables});
    }
    if(!result.success){
      const extraSlots=generateDenseFallbackSlots(W,H,part.type,fixedElements);
      result=placeTablesInSlots(part.count,extraSlots,forbidden,part.type,W,H,allTables.length+1,part.label||"",{presetId,existingTables:allTables});
    }
    allTables=[...allTables,...(result.placed||[])];
    if(!result.success) placementWarnings.push(`Faltan ${result.missingTables} mesas de ${part.type.label} para este preset.`);
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

function SalonView({ mode="guests", user, guests, tableSize, budgetInvitados=0, onAssign, onAssignMany, onRemove, onOpenGuia, onGoDesigner, onGoGuests }){
  // Layout guardado de sesiones anteriores (se lee una sola vez)
  const totalInvitadosInicial = budgetInvitados>0 ? budgetInvitados : (guests||[]).reduce((s,g)=>s+(parseInt(g.cantidadInvitados||1)||1),0);
  const salonInitRef = useRef();
  if(salonInitRef.current===undefined) salonInitRef.current = convertNormalizedLayoutToMeters(cargarSalon(), totalInvitadosInicial || 150, tableSize || 10);
  const S0 = salonInitRef.current;
  const M0 = SALON_MODELO(); // default: salón proporcional 22×16 para 150 personas
  const isDesignerMode = mode === "designer";
  const isGuestMode = mode !== "designer";

  // ── Estado general ──
  const [salonW, setSalonW]       = useState(S0?.salonW ?? M0.salonW);
  const [salonH, setSalonH]       = useState(S0?.salonH ?? M0.salonH);
  const [salonShape, setSalonShape] = useState(S0?.salonShape ?? M0.salonShape);
  const [salonShapeConfig, setSalonShapeConfig] = useState(()=>normalizeSalonShapeConfig(S0?.salonShape ?? M0.salonShape, S0?.salonShapeConfig));
  const [zoom, setZoom]           = useState(1);
  const [mesas, setMesas]         = useState(()=> (S0?.mesas&&Array.isArray(S0.mesas)&&S0.mesas.length>0) ? S0.mesas : M0.mesas);
  const [elementos, setElementos] = useState(()=> (S0?.elementos&&Array.isArray(S0.elementos)) ? S0.elementos : M0.elementos);
  const [estiloDistrib, setEstiloDistrib] = useState(NORMALIZE_DISTRIB(S0?.estiloDistrib ?? M0.estiloDistrib ?? "banquet"));
  const [estiloDecor, setEstiloDecor] = useState(S0?.estiloDecor ?? M0.estiloDecor ?? "romantico_floral");

  // Estado de Etapa 2: debe declararse ANTES del autoguardado.
  // El error "Cannot access 'ia' before initialization" venía de que el
  // useEffect de guardado armaba su dependency array con estas variables
  // antes de que existieran en el cuerpo de SalonView.
  const [selectedSalonType, setSelectedSalonType] = useState(S0?.selectedSalonType || "jardin_romantico_central");
  const [selectedGuestCount, setSelectedGuestCount] = useState(nearestGuestOption(S0?.selectedGuestCount || totalInvitadosInicial || 150));
  const [roomSizeOption, setRoomSizeOption] = useState(S0?.roomSizeOption || "recommended");
  const [selectedTableTypeId, setSelectedTableTypeId] = useState(S0?.selectedTableTypeId || "auto");
  const [layoutSummary, setLayoutSummary] = useState(S0?.layoutSummary || null);

  // Guardado dual: localStorage (instantáneo, por dispositivo) + Supabase (sincronizado).
  // remoteLoaded evita que el autoguardado con defaults pise el layout remoto
  // antes de que termine de cargar en un dispositivo nuevo.
  const remoteLoaded = useRef(false);
  useEffect(()=>{
    const t=setTimeout(()=>{
      const layout={salonW,salonH,salonShape,salonShapeConfig,estiloDistrib,estiloDecor,mesas,elementos,selectedGuestCount,roomSizeOption,selectedTableTypeId,selectedSalonType,layoutSummary};
      try { localStorage.setItem(SALON_LS_KEY, JSON.stringify(layout)); } catch(err){}
      if(user&&remoteLoaded.current){
        supabase.from("wedding_data")
          .upsert({user_id:user.id,salon_layout:layout,updated_at:new Date().toISOString()},{onConflict:"user_id"})
          .then((res)=>{if(res&&res.error)console.warn("⚠️ No se pudo guardar el salón en Supabase:",res.error.message);});
      }
    },800);
    return ()=>clearTimeout(t);
  },[salonW,salonH,salonShape,salonShapeConfig,estiloDistrib,estiloDecor,mesas,elementos,selectedGuestCount,roomSizeOption,selectedTableTypeId,selectedSalonType,layoutSummary]);

  // Flush al desmontar: el debounce de arriba se cancela al salir de la vista,
  // así que guardamos el estado final de forma inmediata para no perder el último cambio
  const layoutFlushRef = useRef(null);
  layoutFlushRef.current = {salonW,salonH,salonShape,salonShapeConfig,estiloDistrib,estiloDecor,mesas,elementos,selectedGuestCount,roomSizeOption,selectedTableTypeId,selectedSalonType,layoutSummary};
  useEffect(()=>()=>{
    try { localStorage.setItem(SALON_LS_KEY, JSON.stringify(layoutFlushRef.current)); } catch(err){}
    if(user&&remoteLoaded.current){
      supabase.from("wedding_data")
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
        const {data:row}=await supabase.from("wedding_data").select("salon_layout").eq("user_id",user.id).maybeSingle();
        if(!alive) return;
        const L=convertNormalizedLayoutToMeters(row?.salon_layout, totalInvitadosInicial || 150, tableSize || 10);
        if(L){
          if(L.salonW) setSalonW(L.salonW);
          if(L.salonH) setSalonH(L.salonH);
          if(L.salonShape){ setSalonShape(L.salonShape); setSelectedSalonShape(L.salonShape); }
          if(L.salonShapeConfig){ const cfg=normalizeSalonShapeConfig(L.salonShape||salonShape,L.salonShapeConfig); setSalonShapeConfig(cfg); setSelectedShapeConfig(cfg); }
          if(L.estiloDistrib) setEstiloDistrib(NORMALIZE_DISTRIB(L.estiloDistrib));
          if(L.estiloDecor) setEstiloDecor(L.estiloDecor);
          if(L.selectedGuestCount) setSelectedGuestCount(nearestGuestOption(L.selectedGuestCount));
          if(L.roomSizeOption) setRoomSizeOption(L.roomSizeOption);
          if(L.selectedTableTypeId) setSelectedTableTypeId(L.selectedTableTypeId);
          if(L.selectedSalonType) setSelectedSalonType(L.selectedSalonType);
          if(L.layoutSummary) setLayoutSummary(L.layoutSummary);
          if(Array.isArray(L.elementos)) setElementos(L.elementos);
          if(Array.isArray(L.mesas)&&L.mesas.length>0){
            // Completar mesas faltantes referidas por invitados
            const maxM=Math.max(0,...(guests||[]).filter(g=>g.mesa).map(g=>parseInt(g.mesa)||0));
            const ids=new Set(L.mesas.map(m=>m.id));
            const faltan=[]; for(let i=1;i<=maxM;i++) if(!ids.has(i)) faltan.push(i);
            const cols=Math.ceil(Math.sqrt(Math.max(maxM,1)+1));
            setMesas([...L.mesas,...faltan.map(id=>({id,mx:3+((id-1)%cols)*3.5,my:3+Math.floor((id-1)/cols)*3.5,tipo:"round",etiqueta:""}))]);
          }
          setTimeout(fitToScreen,150);
        }
      }catch(err){}
      remoteLoaded.current=true;
    })();
    return ()=>{alive=false;};
  },[]);

  // Si hay invitados asignados a números de mesa que no existen en el
  // layout guardado (p. ej. sugeridos desde la Lista), crearlas al entrar
  useEffect(()=>{
    const maxM=Math.max(0,...(guests||[]).filter(g=>g.mesa).map(g=>parseInt(g.mesa)||0));
    if(maxM===0) return;
    setMesas(ms=>{
      const ids=new Set(ms.map(m=>m.id));
      const faltan=[];
      for(let i=1;i<=maxM;i++) if(!ids.has(i)) faltan.push(i);
      if(faltan.length===0) return ms;
      // Etiquetar la mesa nueva según el parentesco dominante de sus invitados
      const etiquetaDe=(id)=>{
        const cnt={};
        (guests||[]).filter(g=>parseInt(g.mesa)===id).forEach(g=>{
          const p=g.parentesco||"Otro";
          cnt[p]=(cnt[p]||0)+(parseInt(g.cantidadInvitados||1)||1);
        });
        const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
        if(!top||top[0]==="Otro") return "";
        return top[0]==="Familia directa"?"Familia":top[0];
      };
      const cols=Math.ceil(Math.sqrt(maxM+1));
      return [...ms,...faltan.map(id=>({id,mx:3+((id-1)%cols)*3.5,my:3+Math.floor((id-1)/cols)*3.5,tipo:"round",etiqueta:etiquetaDe(id)}))];
    });
  },[]);

  // ── Selección e interacción ──
  const [selectedMesa, setSelectedMesa]   = useState(null);
  const [selectedElem, setSelectedElem]   = useState(null);
  const [dragging, setDragging]           = useState(null);
  const dragMoved = useRef(false); // true si el mouse se movió durante el drag
  const [hoveredMesa, setHoveredMesa]     = useState(null);
  const [pinch, setPinch]                 = useState(null);
  const [showSheet, setShowSheet]         = useState(false); // mobile bottom sheet
  const [prevAsignacion, setPrevAsignacion] = useState(null); // snapshot para deshacer protocolo
  const [searchSinMesa, setSearchSinMesa] = useState("");
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showElemMenu, setShowElemMenu]   = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [selectedSalonShape, setSelectedSalonShape] = useState(S0?.salonShape ?? M0.salonShape);
  const [selectedShapeConfig, setSelectedShapeConfig] = useState(()=>normalizeSalonShapeConfig(S0?.salonShape ?? M0.salonShape, S0?.salonShapeConfig));
  const [selectedGuestForAssign, setSelectedGuestForAssign] = useState(null); // mobile/tablet: invitado elegido para sentar con tap
  const isMobile = useIsMobile();
  const isTouchAssignment = useIsMobile(1024); // smartphones y tablets: tocar invitado → tocar mesa
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
  const CONF_COLORS = isGuestMode
    ? {confirmado:"#1A1A14",pendiente:"#777",no_va:"rgba(26,26,20,.28)"}
    : {confirmado:THEME.color.sage,pendiente:THEME.color.gold,no_va:"rgba(26,26,20,.3)"};
  const MESA_R_M    = 0.90;
  const ASIENTO_R_M = 0.28;
  const BASE_PX     = 30;
  const PX          = BASE_PX*zoom;
  const CW          = salonW*PX;
  const CH          = salonH*PX;

  const circlePts=(n,r)=>Array.from({length:n},(_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
  const mesaPersonas=(id)=>personas.filter(p=>p.mesa===id);
  const selectedMesaObj = mesas.find(m=>m.id===selectedMesa);
  const selectedPersonas = selectedMesa?mesaPersonas(selectedMesa):[];

  const selectGuestForTapAssign=(p)=>{
    if(!p) return;
    setSelectedGuestForAssign({guestId:p.guestId,nombre:p.nombre});
    setSelectedElem(null);
    setSelectedMesa(null);
    if(typeof showToast==="function") showToast(`Ahora tocá la mesa donde querés sentar a ${p.nombre}`,"success",2600);
  };

  const assignSelectedGuestToMesa=(mesaId)=>{
    if(!selectedGuestForAssign) return false;
    onAssign(selectedGuestForAssign.guestId,mesaId);
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
    const needed=Math.max(6,Math.min(16,Math.ceil((totalInvWarn||90)/(tableSize||10))||10));
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
    const effectivePreset = presetId || selectedSalonType || "jardin_romantico_central";
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
      const ok=window.confirm("Esto reemplaza el plano actual por un preset profesional. Los elementos fijos quedan bloqueados; solo las mesas se adaptan según invitados. ¿Querés continuar?");
      if(!ok) return;
    }

    setSalonW(P.salonW); setSalonH(P.salonH); setSalonShape(P.salonShape || "rectangulo"); setSelectedSalonShape(P.salonShape || "rectangulo");
    setSalonShapeConfig(P.salonShapeConfig||DEFAULT_SALON_SHAPE_CONFIG); setSelectedShapeConfig(P.salonShapeConfig||DEFAULT_SALON_SHAPE_CONFIG);
    setEstiloDistrib(NORMALIZE_DISTRIB(P.estiloDistrib||effectivePreset)); setEstiloDecor(P.estiloDecor||effectivePreset);
    if(effectivePreset!=="desde_cero") setSelectedSalonType(effectivePreset);
    setMesas(P.mesas||[]); setElementos(P.elementos||[]);
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

  const aplicarModelo=()=>aplicarPreset("jardin_romantico_central",{skipConfirm:true});

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
      if(item.locked) return;
      setDragging({type,id,ox:pos.x/PX-item.mx,oy:pos.y/PX-item.my});
    } else if(type==="rotate"){
      // Rotar mesa rectangular
      const item=mesas.find(m=>m.id===id); if(!item) return;
      const cx=item.mx*PX, cy=item.my*PX;
      const angle0=item.angle||0;
      setDragging({type:"rotate",id,cx,cy,angle0,startAng:Math.atan2(pos.y-cy,pos.x-cx)});
    } else if(type==="resize"){
      const item=elementos.find(el=>el.id===id); if(!item || item.locked) return;
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
    const pos=getCanvasPos(e);
    setDragging({type:"guest",id:guestId,cx:pos.x,cy:pos.y});
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
      setDragging(d=>({...d,cx:pos.x,cy:pos.y}));
      // Radio de detección generoso para touch: extra margen
      const isTouchEvt=!!e.touches;
      const detectR=(MESA_R_M+ASIENTO_R_M*2+(isTouchEvt?1.0:0.5))*PX;
      const over=mesas.find(m=>{const dx=m.mx*PX-pos.x,dy=m.my*PX-pos.y;return Math.sqrt(dx*dx+dy*dy)<detectR;});
      setHoveredMesa(over?over.id:null);
    }
  };
  const onUp=()=>{
    if(dragging?.type==="guest"&&hoveredMesa) onAssign(dragging.id,hoveredMesa);
    setDragging(null);setHoveredMesa(null);
  };

  const addMesa=()=>{
    const newId=Math.max(0,...mesas.map(m=>m.id))+1;
    setMesas(ms=>[...ms,{id:newId,mx:salonW/2,my:salonH/2,tipo:"round",etiqueta:""}]);
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
  const capDe=(m)=>m?.cap||tableSize;

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
    updateMesa(mesa.id,{ew:w,eh:h,cap:capPorMedidas(t,w,h)});
  };
  const setCapacidadA=(mesa,n)=>{
    if(!mesa) return;
    updateMesa(mesa.id,{cap:n,...medidasPorCap(mesa.tipo||"round",n)});
  };
  const medidaDe=(m)=>{
    if(!m) return "";
    const t=m.tipo||"round";
    if(t==="round") return `Ø ${(m.ew||MESA_R_M*2).toFixed(1)} m`;
    return `${(m.ew||0).toFixed(1)} × ${(m.eh||0).toFixed(1)} m`;
  };

  const renderMesaSVG=(mesa)=>{
    const ps=mesaPersonas(mesa.id);
    const isSelected=selectedMesa===mesa.id,isHovered=hoveredMesa===mesa.id;
    const tipoM=mesa.tipo||"round";
    const capM=capDe(mesa);
    const over=ps.length>capM;
    const libres=Math.max(0,capM-ps.length);
    const fillC=isGuestMode
      ? (isSelected?"#1A1A14":isHovered?"#E8E8E8":"#F7F7F7")
      : (isSelected?THEME.color.sage:isHovered?"#5a7a48":"#D4C4A0");
    const strokeC=isGuestMode
      ? (isSelected?"#1A1A14":over?"rgba(200,60,60,.8)":"rgba(26,26,20,.55)")
      : (isSelected?"#2D3D1C":over?"rgba(200,60,60,.8)":"rgba(90,78,62,.6)");
    const dh={
      onMouseDown:e=>{
        e.stopPropagation();
        if(selectedGuestForAssign) return;
        startDrag(e,"mesa",mesa.id);
      },
      // En touch/tablet: tap selecciona/asigna; mantener y arrastrar mueve la mesa.
      onTouchStart:e=>{ e.stopPropagation(); beginMesaTouchDrag(e,mesa); }
    };

    if(tipoM==="round"){
      const R=(((mesa.ew||MESA_R_M*2))/2)*PX,AR=ASIENTO_R_M*PX,ts=Math.max(ps.length,capM);
      const pts=circlePts(ts,R+AR),sv=(R+AR*2+6)*2,cx=sv/2,cy=sv/2;
      return{w:sv,h:sv,jsx:<svg width={sv} height={sv} style={{overflow:"visible",display:"block"}}>
        <circle cx={cx+2} cy={cy+2} r={R} fill="rgba(0,0,0,.18)"/>
        <circle cx={cx} cy={cy} r={R} fill={fillC} stroke={strokeC} strokeWidth={isSelected?2.5:1.5} style={{cursor:"grab"}} {...dh}/>
        {isHovered&&dragging?.type==="guest"&&<text x={cx} y={cy+4} textAnchor="middle" fontSize={Math.max(8,R*0.22)} fill="#fff" fontFamily="'Lora',serif" fontWeight="600" style={{pointerEvents:"none"}}>soltar</text>}
        {mesa.etiqueta
          ?<><text x={cx} y={cy-R*0.2} textAnchor="middle" fontSize={Math.max(6,R*0.18)} fill={isSelected?"rgba(245,239,224,.8)":"rgba(74,94,58,.6)"} fontFamily="'Cinzel',serif" fontWeight="600" style={{pointerEvents:"none"}}>{mesa.etiqueta}</text>
            <text x={cx} y={cy+R*0.3} textAnchor="middle" fontSize={Math.max(9,R*0.4)} fill={isSelected?THEME.color.cream:THEME.color.ink} fontFamily="'Playfair Display',serif" fontWeight="700" style={{pointerEvents:"none"}}>{mesa.id}</text></>
          :<><text x={cx} y={cy-R*0.1} textAnchor="middle" fontSize={Math.max(7,R*0.24)} fill={isSelected?THEME.color.cream:THEME.color.sage} fontFamily="'Cinzel',serif" fontWeight="600" style={{pointerEvents:"none"}}>Mesa</text>
            <text x={cx} y={cy+R*0.38} textAnchor="middle" fontSize={Math.max(9,R*0.44)} fill={isSelected?THEME.color.cream:THEME.color.ink} fontFamily="'Playfair Display',serif" fontWeight="700" style={{pointerEvents:"none"}}>{mesa.id}</text></>
        }
        {!isSelected&&<text x={cx} y={cy+R*0.72} textAnchor="middle" fontSize={Math.max(7,R*0.21)} fill={over?"rgba(200,60,60,.9)":libres===0?"rgba(74,94,58,.85)":"rgba(74,94,58,.6)"} fontFamily="'Lora',serif" fontWeight="600" style={{pointerEvents:"none"}}>{ps.length}/{capM}</text>}
        {pts.map((pt,i)=>{const p=ps[i];const hitR=Math.max(AR+4,16);return<g key={i} style={{cursor:p?"grab":"default",touchAction:"none"}} onMouseDown={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onTouchStart={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onClick={p?e=>{e.stopPropagation(); if(dragMoved.current){dragMoved.current=false;return;} if(isTouchAssignment) selectGuestForTapAssign(p);}:undefined}>
          {/* Hit area invisible más grande */}
          {p&&<circle cx={cx+pt.x} cy={cy+pt.y} r={hitR} fill="transparent"/>}
          <circle cx={cx+pt.x} cy={cy+pt.y} r={AR} fill={p?(CONF_COLORS[p.confirmacion]||"#999"):"rgba(255,255,255,.45)"} stroke={p?"rgba(255,255,255,.8)":"rgba(90,78,62,.25)"} strokeWidth="1.5"/>
          {p&&<text x={cx+pt.x} y={cy+pt.y+AR*0.38} textAnchor="middle" fontSize={Math.max(6,AR*0.62)} fill="#fff" fontWeight="700" fontFamily="Calibri" style={{pointerEvents:"none"}}>{p.nombre.charAt(0)}</text>}
        </g>;})}
      </svg>};
    }

    // Mesa rectangular
    const rW=(mesa.ew||2.4)*PX, rH=(mesa.eh||0.8)*PX;
    const isV=rH>rW, AR=ASIENTO_R_M*PX, pad=AR+5;
    const wD=rW+pad*2, hD=rH+pad*2;
    const mira=mesa.miraSide||"both";
    // Sillas alrededor de los 4 lados: ~1 cada 55 cm de borde (cabeceras incluidas)
    const SILLA_PASO=0.55*PX;
    const nH=Math.max(rW>=rH?1:0,Math.floor(rW/SILLA_PASO));
    const nV=Math.max(rH>rW?1:0,Math.floor(rH/SILLA_PASO));
    let seatPts=[];
    const addT=()=>{for(let i=0;i<nH;i++)seatPts.push({x:pad+rW/(nH+1)*(i+1),y:pad-AR-1});};
    const addB=()=>{for(let i=0;i<nH;i++)seatPts.push({x:pad+rW/(nH+1)*(i+1),y:pad+rH+AR+1});};
    const addL=()=>{for(let i=0;i<nV;i++)seatPts.push({x:pad-AR-1,y:pad+rH/(nV+1)*(i+1)});};
    const addR=()=>{for(let i=0;i<nV;i++)seatPts.push({x:pad+rW+AR+1,y:pad+rH/(nV+1)*(i+1)});};
    if(mira==="both"){addT();addR();addB();addL();}
    else if(mira==="left"){ if(isV) addR(); else addB(); }
    else { if(isV) addL(); else addT(); }
    seatPts=seatPts.slice(0,Math.max(ps.length,capM));
    const angle=mesa.angle||0;
    return{w:wD,h:hD,angle,jsx:<svg width={wD} height={hD} style={{overflow:"visible",display:"block"}}>
      <rect x={pad+2} y={pad+2} width={rW} height={rH} rx="3" fill="rgba(0,0,0,.18)"/>
      <rect x={pad} y={pad} width={rW} height={rH} rx="3" fill={fillC} stroke={strokeC} strokeWidth={isSelected?2.5:1.5} style={{cursor:"grab"}} {...dh}/>
      <text x={pad+rW/2} y={pad+rH/2+(isV?0:4)} textAnchor="middle" fontSize={Math.max(7,Math.min(rW,rH)*0.22)} fill={isSelected?THEME.color.cream:THEME.color.ink} fontFamily="'Playfair Display',serif" fontWeight="700" transform={isV?`rotate(-90,${pad+rW/2},${pad+rH/2})`:undefined} style={{pointerEvents:"none"}}>{mesa.etiqueta||mesa.id}</text>
      {/* Sillas alrededor de los 4 lados */}
      {seatPts.map((pt,i)=>{const p=ps[i];return<g key={"s"+i} style={{cursor:p?"grab":"default",touchAction:"none"}} onMouseDown={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onTouchStart={p?e=>{e.stopPropagation(); startDragGuest(e,p.guestId);}:undefined} onClick={p?e=>{e.stopPropagation(); if(dragMoved.current){dragMoved.current=false;return;} if(isTouchAssignment) selectGuestForTapAssign(p);}:undefined}>
        {p&&<circle cx={pt.x} cy={pt.y} r={Math.max(AR+4,14)} fill="transparent"/>}
        <circle cx={pt.x} cy={pt.y} r={AR} fill={p?(CONF_COLORS[p.confirmacion]||"#999"):"rgba(255,255,255,.45)"} stroke={p?"rgba(255,255,255,.8)":"rgba(90,78,62,.25)"} strokeWidth="1.5"/>
        {p&&<text x={pt.x} y={pt.y+AR*0.38} textAnchor="middle" fontSize={Math.max(5,AR*0.58)} fill="#fff" fontWeight="700" style={{pointerEvents:"none"}}>{p.nombre.charAt(0)}</text>}
      </g>;})}
          {/* Handle rotación ↻ — esquina inferior izq */}
          <circle cx={pad/2+2} cy={hD-pad/2-2} r={9} fill="rgba(201,169,110,.85)" stroke="#FBF7EF" strokeWidth="1.5"
            style={{cursor:"crosshair"}}
            onMouseDown={e=>{e.stopPropagation();startDrag(e,"rotate",mesa.id);}}
            onTouchStart={e=>{e.stopPropagation();startDrag(e,"rotate",mesa.id);}}/>
          <text x={pad/2+2} y={hD-pad/2+2} textAnchor="middle" fontSize="10" fill="#FFF" fontWeight="bold" style={{pointerEvents:"none",userSelect:"none"}}>↻</text>
    </svg>};
  };

  // Estilo de los controles flotantes sobre el canvas
  const fabStyle={width:THEME.tap.min,height:THEME.tap.min,borderRadius:"50%",border:"1px solid rgba(245,239,224,.25)",background:"rgba(26,26,20,.55)",color:THEME.color.cream,fontSize:"1.25rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",padding:0,lineHeight:1};

  return <div style={{display:"flex",flexDirection:"column",gap:0}}>

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
          <input type="number" key={`sw-${salonW}`} defaultValue={salonW} min="5" max="100" onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} onBlur={e=>{const v=Math.max(5,Math.min(100,parseInt(e.target.value)||salonW));setSalonW(v);if(salonShape==="cuadrado")setSalonH(v);setTimeout(fitToScreen,60);}} style={{width:48,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",minHeight:40,borderRadius:8,border:"1px solid rgba(74,94,58,.2)",textAlign:"center"}}/>
          <span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(26,26,20,.4)"}}>×</span>
          <input type="number" key={`sh-${salonH}`} defaultValue={salonH} min="5" max="100" onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} onBlur={e=>{const v=Math.max(5,Math.min(100,parseInt(e.target.value)||salonH));setSalonH(v);if(salonShape==="cuadrado")setSalonW(v);setTimeout(fitToScreen,60);}} style={{width:48,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",minHeight:40,borderRadius:8,border:"1px solid rgba(74,94,58,.2)",textAlign:"center"}}/>
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
        <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(74,94,58,.55)",padding:"5px 8px 8px"}}>Presets reales de boda</div>
        <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)"}}>
          Preset de boda
          <select value={selectedSalonType} onChange={e=>{setSelectedSalonType(e.target.value);setSelectedTableTypeId("auto");}} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
            {PRESET_STAGE2_ORDER.map(id=>{const p=STAGE2_PRESET_CONFIGS[id]; return <option key={id} value={id}>{p?.emoji||"✨"} {p?.label||id}</option>;})}
          </select>
        </label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
          <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)"}}>
            Invitados
            <select value={selectedGuestCount} onChange={e=>setSelectedGuestCount(parseInt(e.target.value)||150)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
              {GUEST_COUNT_OPTIONS.map(n=><option key={n} value={n}>{n} invitados</option>)}
            </select>
          </label>
          <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)"}}>
            Tamaño salón
            <select value={roomSizeOption} onChange={e=>setRoomSizeOption(e.target.value)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
              {Object.entries(ROOM_SIZE_OPTION_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <label style={{display:"grid",gap:4,fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.48)",marginTop:8}}>
          Tipo de mesa
          <select value={selectedTableTypeId} onChange={e=>setSelectedTableTypeId(e.target.value)} style={{width:"100%",fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(74,94,58,.22)",background:"white",color:THEME.color.ink,outline:"none"}}>
            <option value="auto">Automático recomendado</option>
            {Object.entries(TABLE_TYPES).filter(([id,t])=>id!=="high_cocktail").map(([id,t])=><option key={id} value={id}>{t.label} · {t.capacity} pers.</option>)}
          </select>
        </label>
        <div style={{background:"rgba(74,94,58,.06)",border:"1px solid rgba(74,94,58,.12)",borderRadius:11,padding:"10px 12px",marginTop:10}}>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.62)",lineHeight:1.35}}>
            Preset: <strong style={{color:THEME.color.sage}}>{STAGE2_PRESET_CONFIGS[selectedSalonType]?.label}</strong>
          </div>
          <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)",lineHeight:1.35,marginTop:4}}>
            {getRoomSize(selectedGuestCount,roomSizeOption).label} · Mesa recomendada: {getRecommendedTableTypeForPreset(selectedSalonType,selectedGuestCount,roomSizeOption).label}. Los elementos fijos no se mueven; solo se calculan mesas en slots válidos.
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
        {salonMuyChico?"El salón es muy chico":"El salón podría quedar justo"} · {totalInvWarn} inv · capacidad recomendada ~{capacidadMax} (1.5m²/persona)
      </span>
    </div>}


    {isDesignerMode&&layoutSummary&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,minmax(0,1fr))",gap:8,background:"rgba(251,247,239,.96)",border:"1px solid rgba(74,94,58,.18)",borderRadius:12,padding:"10px 12px",marginBottom:8,boxShadow:"0 4px 14px rgba(0,0,0,.04)"}}>
      <div style={{gridColumn:isMobile?"auto":"span 2",fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.72)",lineHeight:1.35}}><strong style={{color:THEME.color.sage}}>Preset:</strong> {layoutSummary.preset}<br/><span style={{color:"rgba(26,26,20,.48)"}}>{layoutSummary.salon} · {layoutSummary.medidas} · {layoutSummary.area} m²</span></div>
      <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:"rgba(26,26,20,.72)",lineHeight:1.35}}><strong style={{color:THEME.color.sage}}>Invitados:</strong> {layoutSummary.invitados}<br/><span style={{color:"rgba(26,26,20,.48)"}}>Mesas {layoutSummary.mesasGeneradas}/{layoutSummary.mesasRequeridas}</span></div>
      <div style={{fontFamily:THEME.font.body,fontSize:"max(12px,.8rem)",color:layoutSummary.estado==="válido"?"rgba(74,94,58,.9)":"rgba(180,90,50,.9)",lineHeight:1.35}}><strong>Estado:</strong> {layoutSummary.estado}<br/><span style={{color:"rgba(26,26,20,.48)"}}>Capacidad {layoutSummary.capacidadSentada}</span></div>
      <div style={{gridColumn:"1 / -1",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.52)",lineHeight:1.4}}>Mesa: {layoutSummary.tipoMesa}</div>
      {layoutSummary.alertas?.length>0&&<div style={{gridColumn:"1 / -1",background:"rgba(200,90,50,.07)",border:"1px solid rgba(200,90,50,.22)",borderRadius:9,padding:"8px 10px",fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(170,70,40,.9)",lineHeight:1.45}}>⚠️ {layoutSummary.alertas.slice(0,4).join(" · ")}{layoutSummary.alertas.length>4?` · +${layoutSummary.alertas.length-4} alertas más`:""}</div>}
    </div>}

    {/* ── TIP MOBILE: recomendar pantalla grande ── */}
    {isMobile&&!hideDesktopTip&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(74,94,58,.07)",border:"1px solid rgba(74,94,58,.2)",borderRadius:10,padding:"8px 6px 8px 12px",marginBottom:8}}>
      <span style={{fontSize:"1rem",flexShrink:0}}>💻</span>
      <span style={{fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",color:"rgba(26,26,20,.62)",flex:1,lineHeight:1.45}}>Podés armar el salón desde el celu, pero en una compu o tablet lo vas a ver más grande y trabajar más cómodo.</span>
      <button onClick={()=>{setHideDesktopTip(true);try{localStorage.setItem("ceci_salon_desktop_tip","1");}catch(err){}}} aria-label="Cerrar aviso" style={{background:"transparent",border:"none",color:"rgba(26,26,20,.35)",fontSize:"1.1rem",cursor:"pointer",padding:"10px 12px",minHeight:THEME.tap.min,lineHeight:1,flexShrink:0}}>×</button>
    </div>}

    {/* ── LAYOUT PRINCIPAL: Canvas + Panel ── */}
    <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-start",width:"100%"}}>

      {/* ── CANVAS ── */}
      <div style={{flex:"1 1 300px",minWidth:0}}>
        <div style={{position:"relative"}}>
        <div ref={viewportRef} className="canvas-viewport"
          style={{width:"100%",height:isMobile?"clamp(320px,55vh,480px)":"clamp(540px,78vh,1040px)",background:isGuestMode?"#EDEDED":"repeating-linear-gradient(45deg,#7C9B5A 0,#7C9B5A 16px,#759354 16px,#759354 32px)",borderRadius:12,overflow:"auto",position:"relative",cursor:dragging?.type==="guest"?"crosshair":"default",touchAction:"pan-x pan-y",WebkitUserSelect:"none",userSelect:"none",WebkitOverflowScrolling:"touch"}}
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
                  <rect width={PX} height={PX} fill="#F0EAD8"/>
                  <rect width={PX/2} height={PX/2} fill="#E8E0C8"/>
                  <rect x={PX/2} y={PX/2} width={PX/2} height={PX/2} fill="#E8E0C8"/>
                </pattern>
                <clipPath id="sClipS4"><path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)}/></clipPath>
              </defs>
              <path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)} fill="#8a7e6e" transform="translate(3,3)"/>
              <path d={salonShapePath(salonShape,CW,CH,salonShapeConfig)} fill="url(#pisoS4)" stroke="#5a4e3e" strokeWidth="2.5"/>
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

            {/* Elementos fijos */}
            {isDesignerMode&&elementos.map(el=>{
              const def=ELEMENTOS_FIJOS.find(e=>e.id===el.tipo); if(!def) return null;
              const elW=el.ew*PX,elH=el.eh*PX,isSel=selectedElem===el.id;
              return <div key={el.id}
                onClick={e=>{e.stopPropagation();setSelectedElem(el.id);setSelectedMesa(null);}}
                onMouseDown={e=>{e.stopPropagation();startDrag(e,"elem",el.id);}}
                onTouchStart={e=>{e.stopPropagation();startDrag(e,"elem",el.id);}}
                style={{position:"absolute",left:30+el.mx*PX,top:30+el.my*PX,width:elW,height:elH,boxSizing:"border-box",background:`${def.color}cc`,border:`2px solid ${isSel?THEME.color.cream:def.color}`,borderRadius:Math.min(8,elW*0.08),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:el.locked?"not-allowed":"grab",zIndex:isSel?8:3,touchAction:"none",boxShadow:isSel?"0 0 0 2px rgba(245,239,224,.4),0 3px 12px rgba(0,0,0,.3)":"0 2px 6px rgba(0,0,0,.2)"}}>
                <span style={{fontSize:Math.max(10,Math.min(22,elH*0.38))+"px",pointerEvents:"none"}}>{def.emoji}</span>
                {elH>20&&<span style={{fontFamily:THEME.font.label,fontSize:Math.max(6,Math.min(9,elH*0.13))+"px",letterSpacing:".04em",textTransform:"uppercase",color:"rgba(255,255,255,.9)",textAlign:"center",lineHeight:1.2,padding:"0 3px",pointerEvents:"none"}}>{def.label}</span>}
                {isSel&&!el.locked&&<>
                  <button onClick={e=>{e.stopPropagation();removeElemento(el.id);}} style={{position:"absolute",top:-8,right:-8,background:"rgba(200,60,60,.9)",border:"none",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:"10px",zIndex:10}}>×</button>
                  <div onMouseDown={e=>{e.stopPropagation();startDrag(e,"resize",el.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,"resize",el.id);}} style={{position:"absolute",bottom:-7,right:-7,width:16,height:16,background:THEME.color.cream,border:`1.5px solid ${def.color}`,borderRadius:3,cursor:"nwse-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="7" height="7" viewBox="0 0 7 7"><line x1="1" y1="6" x2="6" y2="1" stroke={def.color} strokeWidth="1.5"/><line x1="3.5" y1="6" x2="6" y2="3.5" stroke={def.color} strokeWidth="1.5"/></svg>
                  </div>
                </>}
              </div>;
            })}

            {/* Mesas */}
            {mesas.map(mesa=>{
              const {w,h,angle,jsx}=renderMesaSVG(mesa);
              const isSelected=selectedMesa===mesa.id;
              return <div key={mesa.id}
                style={{position:"absolute",left:30+mesa.mx*PX-w/2,top:30+mesa.my*PX-h/2,width:w,height:h,zIndex:isSelected?6:4,cursor:"pointer",transform:angle?`rotate(${angle}deg)`:undefined,transformOrigin:"center center",touchAction:"none"}}
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
                  return;
                }
                if(isTouchAssignment && selectedGuestForAssign){
                  assignSelectedGuestToMesa(mesa.id);
                  return;
                }
                setSelectedMesa(isSelected?null:mesa.id);
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

      {/* ── PANEL LATERAL ── (desktop) */}
      <div style={{flex:"1 1 200px",minWidth:0,maxWidth:320,display:"flex",flexDirection:"column",gap:8}}>

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
            {el.locked&&<p style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(74,94,58,.72)",margin:"0 0 9px",fontStyle:"italic"}}>Elemento fijo del preset: no se mueve ni se redimensiona. Solo las mesas se adaptan a la cantidad de invitados.</p>}
            {!el.locked&&<>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Medidas</span>
                <input type="number" step="0.1" min="0.4" key={`ew-${el.id}-${el.ew}`} defaultValue={(el.ew||1).toFixed(1)}
                  onBlur={e=>setElDims(e.target.value,el.eh)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:56,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"6px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                <span style={{color:"rgba(26,26,20,.35)",fontSize:".75rem"}}>×</span>
                <input type="number" step="0.1" min="0.4" key={`eh-${el.id}-${el.eh}`} defaultValue={(el.eh||1).toFixed(1)}
                  onBlur={e=>setElDims(el.ew,e.target.value)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:56,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"6px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)"}}>m</span>
              </div>
              <p style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.35)",margin:0,fontStyle:"italic"}}>También podés estirar la esquina ◲ en el plano</p>
              <button onClick={()=>removeElemento(el.id)} style={{width:"100%",marginTop:10,background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:7,padding:"8px",fontFamily:THEME.font.body,fontSize:"max(12px,.75rem)",color:"rgba(200,60,60,.65)",cursor:"pointer"}}>Eliminar elemento</button>
            </>}
          </div>;
        })()}

        {/* Info mesa seleccionada — solo desktop; en mobile se usa el bottom sheet */}
        {!isMobile&&(selectedMesaObj
          ?<div style={{background:THEME.color.cream2,border:"1px solid rgba(74,94,58,.25)",borderRadius:12,padding:"12px",overflow:"hidden"}}>
            {/* Header */}
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
                <input type="number" step="0.1" min="0.6" key={`mw-${selectedMesa}-${selectedMesaObj.ew||""}`} defaultValue={(selectedMesaObj.ew||MESA_R_M*2).toFixed(1)}
                  onBlur={e=>setMedidas(selectedMesaObj,e.target.value,selectedMesaObj.eh)} onMouseDown={e=>e.stopPropagation()}
                  style={{width:52,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"5px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                {(selectedMesaObj.tipo||"round")!=="round"&&(selectedMesaObj.tipo!=="square")&&<>
                  <span style={{color:"rgba(26,26,20,.35)",fontSize:".75rem"}}>×</span>
                  <input type="number" step="0.1" min="0.6" key={`mh-${selectedMesa}-${selectedMesaObj.eh||""}`} defaultValue={(selectedMesaObj.eh||0.8).toFixed(1)}
                    onBlur={e=>setMedidas(selectedMesaObj,selectedMesaObj.ew,e.target.value)} onMouseDown={e=>e.stopPropagation()}
                    style={{width:52,fontFamily:THEME.font.body,fontSize:"max(12px,.78rem)",padding:"5px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
                </>}
                <span style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(26,26,20,.45)"}}>m</span>
              </div>
              <div style={{fontFamily:THEME.font.body,fontSize:"max(10px,.68rem)",color:"rgba(74,94,58,.55)",textAlign:"right",marginTop:3,fontStyle:"italic"}}>Sillas recomendadas: {capPorMedidas(selectedMesaObj.tipo||"round",selectedMesaObj.ew||MESA_R_M*2,selectedMesaObj.eh||MESA_R_M*2)}</div>
            </div>

            {/* Etiqueta */}
            <div style={{marginBottom:8}}>
              <input type="text" defaultValue={selectedMesaObj.etiqueta||""} placeholder="Nombre de la mesa (se ve en el plano)"
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
            <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:160,overflowY:"auto",marginBottom:8}}>
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
                  <button onClick={e=>{e.stopPropagation();onRemove(p.guestId); if(selectedGuestForAssign?.guestId===p.guestId) setSelectedGuestForAssign(null);}} style={{background:"transparent",border:"none",color:"rgba(200,60,60,.4)",cursor:"pointer",fontSize:".8rem",padding:0,flexShrink:0}}>×</button>
                </div>
              ))}
              {selectedPersonas.length===0&&<div style={{fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Arrastrá personas acá</div>}
            </div>

            <button onClick={()=>removeMesa(selectedMesa)} style={{width:"100%",background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:7,padding:"6px",fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(200,60,60,.65)",cursor:"pointer"}}>
              Eliminar esta mesa
            </button>
          </div>

          :<div style={{background:"rgba(74,94,58,.04)",border:"0.5px dashed rgba(74,94,58,.18)",borderRadius:12,padding:"20px 12px",textAlign:"center"}}>
            <div style={{fontSize:"1.4rem",marginBottom:6}}>👆</div>
            <div style={{fontFamily:THEME.font.body,fontSize:".8rem",color:"rgba(26,26,20,.38)",lineHeight:1.6}}>Tocá una mesa para editarla. Para moverla, mantené presionado y arrastrá.</div>
          </div>
        )}

        {/* Lista sin mesa */}
        <div style={{background:THEME.color.cream2,border:"0.5px solid rgba(201,169,110,.2)",borderRadius:12,padding:"10px",flex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.7)"}}>Sin mesa ({sinMesa.length})</div>
            {sinMesa.length>0&&<span style={{fontFamily:THEME.font.body,fontSize:THEME.text.label,color:"rgba(201,169,110,.6)",fontStyle:"italic"}}>{isTouchAssignment?"tocá o arrastrá":"← arrastrá al canvas"}</span>}
          </div>
          {sinMesa.length>0&&<div style={{position:"relative",marginBottom:6}}>
            <input value={searchSinMesa} onChange={e=>setSearchSinMesa(e.target.value)} placeholder="Buscar..."
              style={{width:"100%",fontFamily:THEME.font.body,fontSize:".78rem",padding:"4px 8px 4px 24px",borderRadius:100,border:"1px solid rgba(201,169,110,.25)",background:"rgba(201,169,110,.06)",outline:"none",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:".75rem",opacity:.4}}>🔍</span>
            {searchSinMesa&&<button onClick={()=>setSearchSinMesa("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(26,26,20,.4)",fontSize:".8rem"}}>×</button>}
          </div>}
          {sinMesa.length===0
            ?<div style={{fontFamily:THEME.font.body,fontSize:".75rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Todos asignados ✓</div>
            :<div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:"min(200px,25vh)",overflowY:"auto"}}>
              {sinMesaFilt.map(p=>{
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
                  <span style={{fontFamily:THEME.font.body,fontSize:".76rem",color:THEME.color.ink,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</span>
                  {isGuestSelected&&<span style={{fontFamily:THEME.font.label,fontSize:THEME.text.micro,color:THEME.color.sage,letterSpacing:".08em",textTransform:"uppercase"}}>mesa?</span>}
                </div>;
              })}
              {sinMesaFilt.length===0&&searchSinMesa&&<div style={{fontFamily:THEME.font.body,fontSize:".74rem",color:"rgba(26,26,20,.3)",fontStyle:"italic"}}>Sin resultados</div>}
            </div>
          }
        </div>

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
          <input type="number" step="0.1" min="0.6" key={`smw-${selectedMesa}-${selectedMesaObj.ew||""}`} defaultValue={(selectedMesaObj.ew||MESA_R_M*2).toFixed(1)}
            onBlur={e=>setMedidas(selectedMesaObj,e.target.value,selectedMesaObj.eh)}
            style={{width:64,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
          {(selectedMesaObj.tipo||"round")!=="round"&&(selectedMesaObj.tipo!=="square")&&<>
            <span style={{color:"rgba(26,26,20,.35)"}}>×</span>
            <input type="number" step="0.1" min="0.6" key={`smh-${selectedMesa}-${selectedMesaObj.eh||""}`} defaultValue={(selectedMesaObj.eh||0.8).toFixed(1)}
              onBlur={e=>setMedidas(selectedMesaObj,selectedMesaObj.ew,e.target.value)}
              style={{width:64,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",padding:"8px 4px",borderRadius:6,border:"1px solid rgba(74,94,58,.2)",background:THEME.color.cream,textAlign:"center"}}/>
          </>}
          <span style={{fontFamily:THEME.font.body,fontSize:"max(12px,.75rem)",color:"rgba(26,26,20,.45)"}}>m</span>
        </div>
        <div style={{fontFamily:THEME.font.body,fontSize:"max(11px,.72rem)",color:"rgba(74,94,58,.55)",textAlign:"right",marginTop:4,fontStyle:"italic"}}>Sillas recomendadas: {capPorMedidas(selectedMesaObj.tipo||"round",selectedMesaObj.ew||MESA_R_M*2,selectedMesaObj.eh||MESA_R_M*2)}</div>
      </div>
      {/* Etiquetas rápidas */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {["Familia","Amigos","Presidencial","Padrinos","Testigos"].map(et=>(
          <button key={et} onClick={()=>updateMesa(selectedMesa,{etiqueta:et})}
            style={{background:selectedMesaObj.etiqueta===et?"rgba(74,94,58,.15)":"rgba(74,94,58,.06)",border:`1px solid ${selectedMesaObj.etiqueta===et?THEME.color.sage:"rgba(74,94,58,.2)"}`,borderRadius:THEME.radius.pill,padding:"10px 14px",minHeight:THEME.tap.min,fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(74,94,58,.85)",cursor:"pointer"}}>
            {et}
          </button>
        ))}
      </div>
      <input type="text" defaultValue={selectedMesaObj.etiqueta||""} placeholder="Nombre de la mesa (se ve en el plano)"
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
            <button onClick={e=>{e.stopPropagation();onRemove(p.guestId); if(selectedGuestForAssign?.guestId===p.guestId) setSelectedGuestForAssign(null);}} style={{background:"transparent",border:"none",color:"rgba(200,60,60,.55)",cursor:"pointer",fontSize:"1.05rem",padding:"8px 12px",minHeight:THEME.tap.min,lineHeight:1,flexShrink:0}}>×</button>
          </div>
        ))}
        {selectedPersonas.length===0&&<div style={{fontFamily:THEME.font.body,fontSize:"max(13px,.82rem)",color:"rgba(26,26,20,.3)",fontStyle:"italic",padding:"8px 0"}}>Sin invitados asignados todavía · Arrastralos desde "Sin mesa" en el canvas</div>}
      </div>
      <button onClick={()=>removeMesa(selectedMesa)} style={{width:"100%",marginTop:14,background:"rgba(200,60,60,.06)",border:"1px solid rgba(200,60,60,.2)",borderRadius:THEME.radius.sm,padding:"12px",minHeight:THEME.tap.comfortable,fontFamily:THEME.font.body,fontSize:"max(13px,.85rem)",color:"rgba(200,60,60,.7)",cursor:"pointer"}}>
        🗑 Eliminar mesa {selectedMesa}
      </button>
    </BottomSheet>}
  </div>;
}


// ─── SEATING CIRCLE VIEW ─────────────────────────────────────────────────────
function SeatingCircleView({ guests, tableSize, onAssign, onRemove }){
  const [dragging, setDragging] = useState(null); // {guestId, personIdx}
  const [dragOver, setDragOver] = useState(null); // {tableNum, seatIdx}

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
        borderRadius:14,padding:"14px 16px",marginBottom:16,transition:"all .2s"
      }}
    >
      <div style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(201,169,110,.7)",marginBottom:10}}>
        Sin mesa asignada ({sinMesa.length} {sinMesa.length===1?"persona":"personas"})
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {sinMesa.map((p,i)=>{
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

function TimelineModule({user, form, results, onBack}){
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
    supabase.from("wedding_data").select("timeline,timeline_aprobacion,vendors").eq("user_id",user.id).maybeSingle()
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
      await supabase.from("wedding_data").upsert({user_id:user.id,timeline:list||events,timeline_aprobacion:aprobacion,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      setSaved(true); setTimeout(()=>setSaved(false),1500);
    }catch(e){}
    setSaving(false);
  };

  const sorted = [...(events||[])].sort((a,b)=>a.hora.localeCompare(b.hora));

  const aprobar = async (quien) => {
    const next = {...aprobacion, [quien]: !aprobacion[quien]};
    setAprobacion(next);
    try{
      await supabase.from("wedding_data").upsert({user_id:user.id,timeline_aprobacion:next,updated_at:new Date().toISOString()},{onConflict:"user_id"});
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
              <input type={f.type} value={newEv[f.key]} onChange={e=>setNewEv(x=>({...x,[f.key]:e.target.value}))} placeholder={f.placeholder||""}
                style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)"}}>
            <input type="checkbox" checked={"cancion" in newEv} onChange={e=>setNewEv(x=>{
              if(e.target.checked)return{...x,cancion:"",esVivo:false,quienToca:""};
              const{cancion,esVivo,quienToca,...rest}=x;return rest;
            })} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
            🎵 Tiene música
          </label>
        </div>
        {"cancion" in newEv && <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:6}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="text" value={newEv.cancion||""} onChange={e=>setNewEv(x=>({...x,cancion:e.target.value}))} placeholder="Canción (opcional)"
              style={{flex:1,fontFamily:"'Lora',serif",fontSize:".9rem",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14"}}/>
            <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0,fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)",whiteSpace:"nowrap"}}>
              <input type="checkbox" checked={!!newEv.esVivo} onChange={e=>setNewEv(x=>({...x,esVivo:e.target.checked}))} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
              En vivo
            </label>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",flexShrink:0}}>🎻 Quién toca:</span>
            {vendorsMusica.length>0
              ? <select value={newEv.quienToca||""} onChange={e=>setNewEv(x=>({...x,quienToca:e.target.value}))}
                  style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}>
                  <option value="">Sin asignar</option>
                  {vendorsMusica.map(v=><option key={v.id} value={v.nombre||v.id}>{v.nombre||"Sin nombre"}</option>)}
                  <option value="DJ">DJ</option>
                  <option value="Música grabada">Música grabada</option>
                </select>
              : <input type="text" value={newEv.quienToca||""} onChange={e=>setNewEv(x=>({...x,quienToca:e.target.value}))}
                  placeholder="ej: DJ, Violín de Ceci, Banda..."
                  style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}/>
            }
          </div>
        </div>}
        <textarea value={newEv.notas} onChange={e=>setNewEv(x=>({...x,notas:e.target.value}))} rows={2} placeholder="Notas para proveedores..."
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
                  <input type="time" defaultValue={ev.hora} onBlur={e=>updateEv(ev.id,"hora",e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",width:90}}/>
                  <input type="text" defaultValue={ev.titulo} onBlur={e=>updateEv(ev.id,"titulo",e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",flex:1,minWidth:120}}/>
                  <input type="number" defaultValue={ev.duracion} onBlur={e=>updateEv(ev.id,"duracion",e.target.value)} placeholder="min" title="Duración en minutos" style={{fontFamily:"'Lora',serif",fontSize:".9rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.22)",background:"#F5EFE0",color:"#1A1A14",width:70}}/>
                  <button onClick={()=>setEditId(null)} style={{background:"#4A5E3A",color:"#F5EFE0",border:"none",borderRadius:100,padding:"7px 14px",fontFamily:"'Lora',serif",fontSize:".82rem",cursor:"pointer"}}>✓</button>
                </div>
                <input type="text" defaultValue={ev.lugar||""} onBlur={e=>updateEv(ev.id,"lugar",e.target.value)} placeholder="Lugar" style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box",marginBottom:5}}/>
                {/* Toggle música */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Lora',serif",fontSize:".82rem",color:"rgba(26,26,20,.6)"}}>
                    <input type="checkbox" checked={"cancion" in ev} onChange={e=>{
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
                      <input type="text" defaultValue={ev.cancion||""} onBlur={e=>updateEv(ev.id,"cancion",e.target.value)}
                        placeholder={getSugerencia(ev.id) ? "Sugerencia del guion abajo ↓" : "Canción (ej: Can't Help Falling in Love)"}
                        style={{width:"100%",fontFamily:"'Lora',serif",fontSize:".88rem",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14",boxSizing:"border-box"}}/>
                      {!ev.cancion && getSugerencia(ev.id) && <button onClick={()=>updateEv(ev.id,"cancion",getSugerencia(ev.id))}
                        style={{background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:".75rem",color:"rgba(74,94,58,.6)",cursor:"pointer",textAlign:"left",padding:"0 2px"}}>
                        💡 Usar del guion: {getSugerencia(ev.id)}
                      </button>}
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0,fontFamily:"'Lora',serif",fontSize:".8rem",color:"rgba(26,26,20,.6)",whiteSpace:"nowrap"}}>
                      <input type="checkbox" defaultChecked={!!ev.esVivo} onChange={e=>updateEv(ev.id,"esVivo",e.target.checked)} style={{width:15,height:15,accentColor:"#4A5E3A",cursor:"pointer"}}/>
                      En vivo
                    </label>
                  </div>
                  {/* Quién toca */}
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)",flexShrink:0}}>🎻 Quién toca:</span>
                    {vendorsMusica.length>0
                      ? <select defaultValue={ev.quienToca||""} onBlur={e=>updateEv(ev.id,"quienToca",e.target.value)}
                          style={{flex:1,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(74,94,58,.18)",background:"#F5EFE0",color:"#1A1A14"}}>
                          <option value="">Sin asignar</option>
                          {vendorsMusica.map(v=><option key={v.id} value={v.nombre||v.id}>{v.nombre||"Proveedor sin nombre"}</option>)}
                          <option value="DJ">DJ</option>
                          <option value="Música grabada">Música grabada</option>
                        </select>
                      : <input type="text" defaultValue={ev.quienToca||""} onBlur={e=>updateEv(ev.id,"quienToca",e.target.value)}
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
  const timerRef    = useRef(null);

  useEffect(()=>{
    if(!user) return;
    const load = async()=>{
      try{
        const {data:row} = await supabase.from("wedding_data")
          .select("checklist_general,checklist_custom,checklist_order")
          .eq("user_id",user.id).maybeSingle();
        setChecked(row?.checklist_general || {});
        setCustom(row?.checklist_custom || {});
        setOrder(row?.checklist_order || {});
        setNotas(row?.checklist_notas || {});
        setResp(row?.checklist_resp || {});
        // Cargar vendors para vincular tareas
        try{
          const {data:vrow} = await supabase.from("wedding_data").select("vendors").eq("user_id",user.id).maybeSingle();
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
        await supabase.from("wedding_data").upsert({
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
        await supabase.from("wedding_data").upsert({
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
        await supabase.from("wedding_data").upsert({
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
      try { await supabase.from("wedding_data").upsert({user_id:user.id,checklist_notas:next,updated_at:new Date().toISOString()},{onConflict:"user_id"}); } catch(e){}
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
      try { await supabase.from("wedding_data").upsert({user_id:user.id,checklist_notas:next,updated_at:new Date().toISOString()},{onConflict:"user_id"}); } catch(e){}
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
  
  const handleDragStart = (ei, idx) => { dragItem.current = {ei, idx}; };
  const handleDragEnter = (ei, idx) => { dragOver.current = {ei, idx}; };
  const handleDrop = (ei) => {
    if(!dragItem.current || dragItem.current.ei !== ei) return;
    const from = dragItem.current.idx;
    const to   = dragOver.current?.idx;
    if(to===undefined || from===to) return;
    const ord = [...getOrder(ei)];
    const [moved] = ord.splice(from, 1);
    ord.splice(to, 0, moved);
    const next = {...order, [ei]: ord};
    setOrder(next); persist(null, null, next);
    dragItem.current = null; dragOver.current = null;
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
        <select value={filtroRes} onChange={e=>setFiltroRes(e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".82rem",padding:"6px 12px",borderRadius:100,border:"0.5px solid rgba(74,94,58,.2)",background:"#FBF7EF",color:"#1A1A14",cursor:"pointer"}}>
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
            }).map((ii,dragIdx)=>{
              const item = etapa.items[ii];
              const done = !!checked[`${ei}_${ii}`];
              return <div key={ii}
                draggable
                onDragStart={()=>handleDragStart(ei,dragIdx)}
                onDragEnter={()=>handleDragEnter(ei,dragIdx)}
                onDragEnd={()=>handleDrop(ei)}
                onDragOver={e=>e.preventDefault()}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"0.5px solid rgba(74,94,58,.08)",cursor:"default",userSelect:"none",flexDirection:"column"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%"}}>
                  <span style={{color:"rgba(74,94,58,.25)",cursor:"grab",fontSize:"1rem",marginTop:2,flexShrink:0}} title="Arrastrar para reordenar">⠿</span>
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
                  <select value={resp[`${ei}_${ii}`]||""} onChange={e=>setResponsable(`${ei}_${ii}`,e.target.value)} style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.25)",background:"#F5EFE0",color:"#1A1A14"}}>
                    <option value="">Sin responsable</option>
                    {RESPONSABLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <input type="text" value={notas[`${ei}_${ii}`]||""} onChange={e=>setNota(`${ei}_${ii}`,e.target.value)} placeholder="Nota (proveedor, recordatorio...)" style={{flex:1,minWidth:120,fontFamily:"'Lora',serif",fontSize:".85rem",padding:"4px 10px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Límite:</span>
                    <input type="date" value={getFecha(`${ei}_${ii}`)} onChange={e=>setFecha(`${ei}_${ii}`,e.target.value)}
                      style={{fontFamily:"'Lora',serif",fontSize:".8rem",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(74,94,58,.2)",background:"#F5EFE0",color:"#1A1A14",width:"min(130px,100%)",boxSizing:"border-box"}}/>
                    {getFecha(`${ei}_${ii}`)&&<button onClick={()=>setFecha(`${ei}_${ii}`,"")} style={{background:"transparent",border:"none",color:"rgba(26,26,20,.3)",cursor:"pointer",fontSize:".9rem",padding:"0 2px",lineHeight:1}}>×</button>}
                  </div>
                  {vendors4Chk.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:THEME.text.tiny,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(74,94,58,.5)"}}>Proveedor:</span>
                    <select value={getVendorId(`${ei}_${ii}`)} onChange={e=>setVendorId(`${ei}_${ii}`,e.target.value)}
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
                  <input autoFocus type="text" value={newText} onChange={e=>setNewText(e.target.value)}
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

// ─── GLOBAL NAV BAR ───────────────────────────────────────────────────────────
function GlobalNav({view, setView, hasResults}){
  const items = [
    {id:"home",          icon:"🏠", label:"Inicio"},
    {id:"results",       icon:"🎵", label:"Música",       disabled:!hasResults},
    {id:"budget",        icon:"💰", label:"Presupuesto"},
    {id:"vendors",       icon:"🏢", label:"Proveedores"},
    {id:"checklist-boda",icon:"📋", label:"Checklist"},
    {id:"guests",        icon:"👥", label:"Invitados"},
    {id:"salon-design",  icon:"🏛️", label:"Salón"},
    {id:"timeline",      icon:"⏰", label:"Cronograma"},
    {id:"guia-novios",   icon:"📖", label:"Guía"},
  ];
  return <nav style={{
    position:"fixed",bottom:0,left:0,right:0,zIndex:100,
    background:"rgba(251,247,239,.97)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
    borderTop:"0.5px solid rgba(201,169,110,.25)",
    boxShadow:"0 -4px 24px rgba(26,20,14,.06)",
    overflowX:"auto",overflowY:"visible",
    scrollbarWidth:"none",WebkitOverflowScrolling:"touch",
  }} className="no-print">
    <div style={{
      display:"inline-flex",alignItems:"stretch",
      minWidth:"100%",
      paddingBottom:"max(4px,env(safe-area-inset-bottom))",
    }}>
      {items.map(item=>{
        const active = view===item.id;
        return <button key={item.id} onClick={()=>!item.disabled&&setView(item.id)} disabled={item.disabled} style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:2,background:"transparent",border:"none",
          cursor:item.disabled?"default":"pointer",
          padding:"10px 12px 8px",
          minHeight:THEME.tap.comfortable,
          flexShrink:0,flexGrow:1,
          opacity:item.disabled?.35:1,
          borderTop:active?"2.5px solid #4A5E3A":"2.5px solid transparent",
          minWidth:64,
        }}>
          <span style={{fontSize:"1.2rem",lineHeight:1}}>{item.icon}</span>
          <span style={{
            fontFamily:"'Cinzel',serif",fontSize:THEME.text.micro,letterSpacing:".06em",
            textTransform:"uppercase",color:active?"#4A5E3A":"rgba(26,26,20,.4)",
            fontWeight:active?700:400,whiteSpace:"nowrap",marginTop:3,lineHeight:1
          }}>{item.label}</span>
        </button>;
      })}
    </div>
  </nav>;
}

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
  const hydrateFromSession = (remote, email, tokenFromUrl=null, goToResults=false) => {
    const safeForm = {...EMPTY_FORM, ...(remote.form || {}), email: remote.email || email || remote.form?.email || ""};
    setResults(remote.results);
    setForm(safeForm);
    setArquetipo(remote.arquetipo || null);
    setChecked(remote.checked || {});
    setResultToken(remote.result_token || tokenFromUrl || null);
    setView(goToResults ? "results" : "home");

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
              setView("home"); // returning users go to dashboard
              return;
            }
          }
        }catch(e){}

        // Si no existe resultado, limpiamos la URL y mostramos tablero limpio
        window.history.replaceState({}, "", window.location.pathname);
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
  const hasHydrated = useRef(false);
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

  if(authLoading) return <div style={{minHeight:"100dvh",background:"rgba(245,239,224,.88)",display:"flex",alignItems:"center",justifyContent:"center",color:C,fontFamily:"'Lora',serif"}}>Cargando acceso...</div>;
  if(recoveryMode) return <AuthScreen initialMode="update" initialError={authNotice} onPasswordUpdated={()=>{
    // Clear all local data so the user starts completely fresh
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
  const showNav = !!user && !['auth','landing','form','generating'].includes(view);

  if(!user || view==="auth") return <AuthScreen initialMode="signup" initialError={authNotice}/>;
  if(view==="home") return <><HomeScreen
    user={user}
    hasResults={!!results}
    form={form}
    resultToken={resultToken}
    onGoModule={(m)=>setView(m)}
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
  />{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="landing") return <Landing onStart={()=>setView("guia")}/>;
  if(view==="guia") return <GuiaCanciones onStart={()=>setView("form")} onBack={()=>setView("home")}/>
  if(view==="guia-novios") return <><GuiaModule onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="budget") return <><BudgetModule user={user} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="vendors") return <><VendorsModule user={user} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="guests") return <><GuestsModule user={user} onBack={()=>setView("home")} onGoDesigner={()=>setView("salon-design")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="salon-design") return <><SalonDesignerModule user={user} onBack={()=>setView("home")} onGoGuests={()=>setView("guests")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="timeline") return <><TimelineModule user={user} form={form} results={results} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="checklist-boda") return <><ChecklistModule user={user} form={form} results={results} onGoMusic={()=>setView(results?"results":"guia")} onBack={()=>setView("home")}/>{showNav&&<GlobalNav view={view} setView={setView} hasResults={!!results}/>}</>
  if(view==="form") return <Form step={step} setStep={setStep} form={form} setForm={setForm} onSubmit={generate} error={error} onGoHome={()=>setView("home")}/>;
  if(view==="generating") return <Generating names={`${form.nombre1} & ${form.nombre2}`} phase={phase}/>;
  if(view==="results") return <><Results results={results} form={form} checked={checked} setChecked={(fn)=>{ const next=typeof fn==='function'?fn(checked):fn; setChecked(next); syncChecked(next); }} arquetipo={arquetipo} resultToken={resultToken} onGoHome={()=>setView("home")} onLogout={logout} onRestart={()=>{
    try{localStorage.removeItem("bsb_session");}catch(e){}
    window.history.replaceState({}, "", window.location.pathname);
    setView("guia");setStep(1);setResults(null);setChecked({});setForm({...EMPTY_FORM,email:user.email||""});setArquetipo(null);setResultToken(null);
  }}/><GlobalNav view={view} setView={setView} hasResults={!!results}/><InstallPrompt/></>;

  return <><HomeScreen user={user} hasResults={!!results} form={form} resultToken={resultToken} onGoModule={(m)=>setView(m)} onViewResults={()=>setView("results")} onStartNew={()=>setView("guia")} onLogout={logout}/><GlobalNav view={view} setView={setView} hasResults={!!results}/><InstallPrompt/></>;
}

function AppWithProviders(){
  return <ToastProvider><App/></ToastProvider>;
}
