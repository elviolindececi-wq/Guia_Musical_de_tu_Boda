/* eslint-disable */
// @ts-nocheck
import { useState, useRef } from "react";

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

export default function GuiaCancionesModule({
  onStart,
  onBack,
  theme,
  AudioButtonComponent,
  BackToHomeComponent
}){
  const THEME = theme;
  const AudioButton = AudioButtonComponent;
  const BackToHome = BackToHomeComponent;
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
