const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const backupPath = path.join(process.cwd(), "src", "App.backup-antes-ux.jsx");

if (!fs.existsSync(appPath)) {
  console.error("No se encontró src/App.jsx.");
  console.error("Ejecutá este archivo desde la carpeta principal del proyecto.");
  process.exit(1);
}

let source = fs.readFileSync(appPath, "utf8");

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(appPath, backupPath);
  console.log("✓ Respaldo creado: src/App.backup-antes-ux.jsx");
}

function replaceBlock(content, startMarker, endMarker, replacement) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start);

  if (start === -1) {
    throw new Error("No se encontró el inicio del bloque: " + startMarker);
  }

  if (end === -1) {
    throw new Error("No se encontró el final del bloque: " + endMarker);
  }

  return content.slice(0, start) + replacement + content.slice(end);
}

const NEW_LANDING = String.raw`function Landing({onTry,onLogin,onBuy}){
  const tools = [
    {emoji:"🏛️",title:"Diseño del salón",copy:"Probá distribuciones, mesas, mobiliario y estilos."},
    {emoji:"💰",title:"Presupuesto",copy:"Organizá los gastos y controlá cada categoría."},
    {emoji:"👥",title:"Invitados",copy:"Gestioná la lista, etiquetas y distribución."},
    {emoji:"🏢",title:"Proveedores",copy:"Compará propuestas, contactos y contrataciones."},
    {emoji:"⏰",title:"Cronograma",copy:"Planificá cada momento del gran día."},
    {emoji:"🎵",title:"Música y banda sonora",copy:"Diseñá la emoción musical de cada momento."},
  ];

  return <div className="home-floral-bg" style={{
    minHeight:"100dvh",
    backgroundColor:"#F5EFE0",
    color:"#1A1A14"
  }}>

    {/* Encabezado */}
    <header style={{
      position:"sticky",
      top:0,
      zIndex:100,
      background:"rgba(251,247,239,.88)",
      backdropFilter:"blur(14px)",
      WebkitBackdropFilter:"blur(14px)",
      borderBottom:"0.5px solid rgba(201,169,110,.25)"
    }}>
      <div className="responsive-shell" style={{
        minHeight:72,
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        gap:16
      }}>
        <div>
          <div className="brand-logo">El Violín de Ceci</div>
          <div style={{
            fontFamily:"'Lora',serif",
            fontSize:THEME.text.label,
            color:"rgba(26,26,20,.45)",
            marginTop:3
          }}>
            Organizador de bodas
          </div>
        </div>

        <button
          type="button"
          onClick={onLogin}
          style={{
            background:"transparent",
            border:"none",
            padding:"10px 4px",
            cursor:"pointer",
            fontFamily:"'Lora',serif",
            color:"#4A5E3A",
            fontSize:"clamp(.85rem,2vw,1rem)",
            fontWeight:600,
            textDecoration:"underline",
            textUnderlineOffset:4
          }}
        >
          ¿Ya tenés acceso? Iniciar sesión
        </button>
      </div>
    </header>

    <main>
      {/* Hero */}
      <section className="responsive-shell" style={{
        paddingTop:"clamp(38px,7vw,86px)",
        paddingBottom:"clamp(42px,7vw,82px)"
      }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(min(360px,100%),1fr))",
          gap:"clamp(28px,6vw,72px)",
          alignItems:"center"
        }}>

          <div className="fu">
            <div style={{
              display:"inline-flex",
              alignItems:"center",
              gap:8,
              background:"rgba(74,94,58,.08)",
              border:"0.5px solid rgba(74,94,58,.22)",
              borderRadius:100,
              padding:"8px 14px",
              marginBottom:22,
              fontFamily:"'Cinzel',serif",
              fontSize:THEME.text.label,
              letterSpacing:".13em",
              textTransform:"uppercase",
              color:"#4A5E3A"
            }}>
              ✦ Todo tu evento en un solo lugar
            </div>

            <h1 className="brand-title" style={{
              fontSize:"clamp(2.55rem,7vw,5rem)",
              lineHeight:1.02,
              letterSpacing:"-.025em",
              margin:"0 0 22px",
              maxWidth:720
            }}>
              Organizá tu boda,
              <br/>
              <span className="gold">visualizá cada detalle.</span>
            </h1>

            <p className="brand-copy" style={{
              fontSize:"clamp(1.08rem,2.2vw,1.35rem)",
              lineHeight:1.7,
              margin:"0 0 28px",
              maxWidth:670,
              color:"rgba(26,26,20,.7)"
            }}>
              Diseñá el salón, armá el presupuesto, organizá invitados,
              compará proveedores y planificá cada momento de tu boda.
            </p>

            <div style={{
              display:"flex",
              gap:12,
              alignItems:"center",
              flexWrap:"wrap"
            }}>
              <button className="pbtn" onClick={onTry}>
                Probar el organizador gratis →
              </button>

              <button className="gbtn" onClick={onLogin}>
                Ya compré
              </button>
            </div>

            <p style={{
              fontFamily:"'Lora',serif",
              fontSize:".88rem",
              color:"rgba(26,26,20,.42)",
              margin:"16px 0 0",
              lineHeight:1.5
            }}>
              Sin tarjeta. Los cambios de la prueba son temporales.
            </p>
          </div>

          {/* Preview del producto */}
          <div className="fu2" style={{
            background:"rgba(251,247,239,.96)",
            border:"0.5px solid rgba(201,169,110,.35)",
            borderRadius:26,
            padding:"clamp(18px,4vw,28px)",
            boxShadow:"0 24px 70px rgba(49,39,25,.16)"
          }}>
            <div style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:12,
              marginBottom:18
            }}>
              <div>
                <div className="brand-logo" style={{
                  fontSize:THEME.text.label,
                  letterSpacing:".16em",
                  marginBottom:4
                }}>
                  Tu organizador
                </div>
                <div style={{
                  fontFamily:"'Playfair Display',serif",
                  fontSize:"1.35rem",
                  fontWeight:600
                }}>
                  Todo conectado
                </div>
              </div>

              <div style={{
                borderRadius:100,
                background:"rgba(74,94,58,.08)",
                border:"0.5px solid rgba(74,94,58,.2)",
                color:"#4A5E3A",
                padding:"7px 12px",
                fontFamily:"'Lora',serif",
                fontSize:".78rem",
                fontWeight:700
              }}>
                Modo prueba
              </div>
            </div>

            <button
              type="button"
              onClick={onTry}
              style={{
                width:"100%",
                border:"none",
                borderRadius:18,
                padding:"22px 20px",
                textAlign:"left",
                background:"#4A5E3A",
                cursor:"pointer",
                marginBottom:12,
                boxShadow:"0 12px 28px rgba(74,94,58,.18)"
              }}
            >
              <div style={{fontSize:"1.75rem",marginBottom:8}}>🏛️</div>
              <div style={{
                fontFamily:"'Playfair Display',serif",
                fontSize:"1.25rem",
                fontWeight:600,
                color:"#F5EFE0",
                marginBottom:6
              }}>
                Diseñá tu salón
              </div>
              <div style={{
                fontFamily:"'Lora',serif",
                color:"rgba(245,239,224,.68)",
                fontSize:".9rem",
                lineHeight:1.5,
                marginBottom:12
              }}>
                Probá medidas, mesas, sofás, decoración y distribución.
              </div>
              <div style={{
                fontFamily:"'Lora',serif",
                color:"#D9B86F",
                fontSize:".9rem",
                fontWeight:700
              }}>
                Empezar a diseñar →
              </div>
            </button>

            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(2,minmax(0,1fr))",
              gap:10
            }}>
              {[
                ["💰","Presupuesto"],
                ["👥","Invitados"],
                ["🏢","Proveedores"],
                ["⏰","Cronograma"]
              ].map(([emoji,label])=>
                <div key={label} style={{
                  minHeight:92,
                  background:"#FBF7EF",
                  border:"0.5px solid rgba(201,169,110,.25)",
                  borderRadius:14,
                  padding:"14px 12px"
                }}>
                  <div style={{fontSize:"1.25rem",marginBottom:7}}>{emoji}</div>
                  <div style={{
                    fontFamily:"'Playfair Display',serif",
                    fontSize:".9rem",
                    fontWeight:600
                  }}>
                    {label}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Herramientas */}
      <section style={{
        background:"rgba(251,247,239,.76)",
        borderTop:"0.5px solid rgba(201,169,110,.22)",
        borderBottom:"0.5px solid rgba(201,169,110,.22)"
      }}>
        <div className="responsive-shell" style={{
          paddingTop:"clamp(42px,7vw,78px)",
          paddingBottom:"clamp(42px,7vw,78px)"
        }}>
          <div style={{textAlign:"center",maxWidth:720,margin:"0 auto 34px"}}>
            <div className="brand-logo" style={{marginBottom:12}}>
              Planificá con claridad
            </div>
            <h2 className="brand-title" style={{
              fontSize:"clamp(2rem,5vw,3.35rem)",
              margin:"0 0 14px"
            }}>
              Todo lo que necesitás para organizar tu boda
            </h2>
            <p className="brand-copy" style={{
              fontSize:"clamp(1rem,2vw,1.16rem)",
              margin:0
            }}>
              Probá cada módulo y descubrí cómo se conecta toda la planificación.
            </p>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(min(230px,100%),1fr))",
            gap:14
          }}>
            {tools.map((item)=>
              <button
                key={item.title}
                type="button"
                onClick={onTry}
                style={{
                  background:"#FBF7EF",
                  border:"0.5px solid rgba(201,169,110,.27)",
                  borderRadius:18,
                  padding:"22px 19px",
                  textAlign:"left",
                  cursor:"pointer",
                  minHeight:168,
                  transition:"transform .2s, box-shadow .2s"
                }}
              >
                <div style={{fontSize:"1.7rem",marginBottom:12}}>
                  {item.emoji}
                </div>
                <div style={{
                  fontFamily:"'Playfair Display',serif",
                  fontSize:"1.08rem",
                  fontWeight:600,
                  marginBottom:7,
                  color:"#1A1A14"
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontFamily:"'Lora',serif",
                  fontSize:".9rem",
                  color:"rgba(26,26,20,.55)",
                  lineHeight:1.55
                }}>
                  {item.copy}
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="responsive-shell" style={{
        paddingTop:"clamp(42px,7vw,78px)",
        paddingBottom:"clamp(46px,8vw,92px)"
      }}>
        <div style={{
          background:"#4A5E3A",
          border:"0.5px solid rgba(201,169,110,.4)",
          borderRadius:26,
          padding:"clamp(28px,6vw,58px)",
          textAlign:"center",
          boxShadow:"0 20px 55px rgba(74,94,58,.18)"
        }}>
          <div style={{
            fontFamily:"'Cinzel',serif",
            fontSize:THEME.text.label,
            letterSpacing:".18em",
            textTransform:"uppercase",
            color:"rgba(217,184,111,.8)",
            marginBottom:13
          }}>
            Primero probalo
          </div>

          <h2 style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(2rem,5vw,3.25rem)",
            lineHeight:1.08,
            color:"#F5EFE0",
            margin:"0 0 15px"
          }}>
            Empezá a visualizar tu boda hoy.
          </h2>

          <p style={{
            fontFamily:"'Lora',serif",
            fontSize:"clamp(1rem,2vw,1.18rem)",
            color:"rgba(245,239,224,.7)",
            maxWidth:650,
            margin:"0 auto 26px",
            lineHeight:1.65
          }}>
            Explorá todas las herramientas. Para guardar, publicar, exportar
            y continuar desde cualquier dispositivo, accedé a la versión completa.
          </p>

          <div style={{
            display:"flex",
            justifyContent:"center",
            gap:12,
            flexWrap:"wrap"
          }}>
            <button
              type="button"
              onClick={onTry}
              style={{
                background:"#D9B86F",
                color:"#1A1A14",
                border:"none",
                padding:"15px 28px",
                borderRadius:100,
                cursor:"pointer",
                fontFamily:"'Lora',serif",
                fontWeight:700,
                minHeight:52
              }}
            >
              Probar el organizador →
            </button>

            <button
              type="button"
              onClick={onBuy}
              style={{
                background:"transparent",
                color:"#F5EFE0",
                border:"1px solid rgba(245,239,224,.42)",
                padding:"14px 26px",
                borderRadius:100,
                cursor:"pointer",
                fontFamily:"'Lora',serif",
                fontWeight:600,
                minHeight:52
              }}
            >
              Acceder a la versión completa
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>;
}

`;

const NEW_HOME = String.raw`function HomeScreen({ user, hasResults, form, resultToken, onViewResults, onStartNew, onLogout, onGoModule, isDemo=false, onRequestPurchase }){
  const pareja = [form?.nombre1, form?.nombre2].filter(Boolean).join(" & ");
  const link = resultToken && typeof window !== "undefined"
    ? window.location.origin + window.location.pathname + "?r=" + resultToken
    : "";

  const [copied, setCopied] = useState(false);
  const [demoHasChanges, setDemoHasChanges] = useState(
    ()=>Object.keys(readDemoWeddingData() || {}).length > 0
  );

  useEffect(()=>{
    if(!isDemo) return;

    const markChanged = ()=>setDemoHasChanges(true);
    window.addEventListener("ceci-demo-change", markChanged);

    if(Object.keys(readDemoWeddingData() || {}).length > 0){
      setDemoHasChanges(true);
    }

    return ()=>window.removeEventListener("ceci-demo-change", markChanged);
  },[isDemo]);

  const copyLink = async()=>{
    if(!link) return;
    try{
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(()=>setCopied(false),2400);
    }catch(e){}
  };

  const premiumAction = (viewName) => () => onGoModule(viewName);
  const premiumStatus = isDemo ? "Probar →" : "Abrir →";

  const modules = [
    {
      emoji:"🏛️",
      label:"Diseño del salón",
      desc:"Probá distribuciones, medidas, mesas, mobiliario y decoración.",
      action:premiumAction("salon-design"),
      status:isDemo ? "Diseñar mi salón →" : "Abrir diseño →",
      done:false,
      primary:true,
      locked:false
    },
    {
      emoji:"💰",
      label:"Presupuesto",
      desc:"Control de gastos por categoría",
      action:premiumAction("budget"),
      status:premiumStatus,
      done:false,
      locked:false
    },
    {
      emoji:"👥",
      label:"Invitados",
      desc:"Lista, etiquetas y seating recomendado",
      action:premiumAction("guests"),
      status:premiumStatus,
      done:false,
      locked:false
    },
    {
      emoji:"🏢",
      label:"Proveedores",
      desc:"Cotizaciones, contactos y contratos",
      action:premiumAction("vendors"),
      status:premiumStatus,
      done:false,
      locked:false
    },
    {
      emoji:"📋",
      label:"Checklist",
      desc:"Plan completo de la boda",
      action:premiumAction("checklist-boda"),
      status:premiumStatus,
      done:false,
      locked:false
    },
    {
      emoji:"⏰",
      label:"Cronograma",
      desc:"Timeline completo del gran día",
      action:premiumAction("timeline"),
      status:premiumStatus,
      done:false,
      locked:false
    },
    {
      emoji:"🎵",
      label:"Música y banda sonora",
      desc:hasResults
        ? "Tu guion musical personalizado"
        : isDemo
          ? "Probá el test; el resultado se desbloquea al comprar"
          : "Creá tu guion musical con IA",
      action:hasResults ? onViewResults : onStartNew,
      status:hasResults
        ? "Ver resultado →"
        : isDemo
          ? "Probar el test →"
          : "Empezar test →",
      done:hasResults,
      primary:false,
      locked:false
    },
    {
      emoji:"📖",
      label:"Guía para novios",
      desc:"Protocolo, ceremonia y consejos",
      action:premiumAction("guia-novios"),
      status:premiumStatus,
      done:false,
      locked:false
    }
  ];

  return <div style={{
    minHeight:"100svh",
    display:"flex",
    alignItems:"flex-start",
    justifyContent:"center",
    padding:"clamp(16px,4vw,48px)"
  }}>
    <div className="fu home-content-card" style={{
      width:"100%",
      maxWidth:"min(780px,calc(100vw - 24px))"
    }}>

      {/* Indicador discreto del modo prueba */}
      {isDemo&&<div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        gap:14,
        flexWrap:"wrap",
        background:"rgba(74,94,58,.07)",
        border:"0.5px solid rgba(74,94,58,.2)",
        borderRadius:14,
        padding:"12px 14px",
        marginBottom:24
      }}>
        <div style={{
          display:"flex",
          alignItems:"flex-start",
          gap:10,
          flex:"1 1 330px"
        }}>
          <div style={{
            width:9,
            height:9,
            borderRadius:"50%",
            background:"#4A5E3A",
            marginTop:7,
            flexShrink:0
          }}/>

          <div>
            <div style={{
              fontFamily:"'Lora',serif",
              fontSize:".86rem",
              fontWeight:700,
              color:"#4A5E3A",
              marginBottom:2
            }}>
              Modo prueba
            </div>

            <div style={{
              fontFamily:"'Lora',serif",
              fontSize:".78rem",
              color:"rgba(26,26,20,.55)",
              lineHeight:1.45
            }}>
              Podés usar todas las herramientas. Los cambios se borrarán al salir o recargar.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="lbtn"
          onClick={onRequestPurchase}
          style={{fontSize:".78rem",flexShrink:0}}
        >
          Acceder a la versión completa
        </button>
      </div>}

      {/* Encabezado */}
      <div style={{textAlign:"center",marginBottom:26}}>
        <div className="brand-logo" style={{marginBottom:12}}>
          El Violín de Ceci
        </div>

        <h1 className="brand-title" style={{
          fontSize:"clamp(1.85rem,5vw,2.8rem)",
          margin:"0 0 10px",
          lineHeight:1.08
        }}>
          {pareja
            ? "¡Hola, " + pareja + "! 🌸"
            : "Organizá tu boda en un solo lugar"}
        </h1>

        <p className="brand-copy" style={{
          fontSize:"clamp(.95rem,2vw,1.08rem)",
          margin:"0 auto",
          maxWidth:570,
          lineHeight:1.65
        }}>
          {isDemo
            ? "Diseñá el salón, armá tu presupuesto, organizá invitados y recorré cada herramienta antes de acceder a la versión completa."
            : "Elegí el módulo con el que querés trabajar hoy."}
        </p>

        {isDemo&&demoHasChanges&&
          <div style={{
            marginTop:18,
            background:"rgba(201,169,110,.1)",
            border:"0.5px solid rgba(201,169,110,.36)",
            borderRadius:16,
            padding:"14px"
          }}>
            <div style={{
              fontFamily:"'Lora',serif",
              fontSize:".85rem",
              color:"rgba(26,26,20,.62)",
              marginBottom:10
            }}>
              Ya empezaste a crear tu boda. Para conservar estos cambios necesitás publicar tu proyecto.
            </div>

            <button
              className="pbtn"
              onClick={onRequestPurchase}
              style={{padding:"12px 24px",minHeight:48}}
            >
              Guardar y publicar mi boda →
            </button>
          </div>
        }

        {form?.fechaBoda&&(()=>{
          const dias = Math.ceil(
            (new Date(form.fechaBoda)-new Date())/(1000*60*60*24)
          );

          return dias>0
            ? <div style={{
                marginTop:14,
                display:"inline-flex",
                alignItems:"center",
                gap:8,
                background:"rgba(74,94,58,.08)",
                border:"0.5px solid rgba(74,94,58,.2)",
                borderRadius:100,
                padding:"7px 16px",
                flexWrap:"wrap",
                justifyContent:"center"
              }}>
                <span style={{fontSize:"1rem"}}>💍</span>

                <span style={{
                  fontFamily:"'Lora',serif",
                  fontSize:".88rem",
                  color:"#4A5E3A",
                  fontWeight:600
                }}>
                  {dias} días para la boda
                </span>

                <span style={{
                  fontFamily:"'Cinzel',serif",
                  fontSize:THEME.text.tiny,
                  letterSpacing:".08em",
                  textTransform:"uppercase",
                  color:"rgba(74,94,58,.5)"
                }}>
                  {new Date(form.fechaBoda).toLocaleDateString("es",{
                    day:"numeric",
                    month:"long",
                    year:"numeric"
                  })}
                </span>
              </div>
            : dias===0
              ? <div style={{
                  marginTop:14,
                  display:"inline-flex",
                  alignItems:"center",
                  gap:8,
                  background:"rgba(201,169,110,.12)",
                  borderRadius:100,
                  padding:"7px 16px"
                }}>
                  <span>🎉</span>
                  <span style={{
                    fontFamily:"'Lora',serif",
                    fontSize:".88rem",
                    color:"#C9A96E",
                    fontWeight:600
                  }}>
                    ¡Hoy es el gran día!
                  </span>
                </div>
              : null;
        })()}
      </div>

      {/* Acceso al resultado musical */}
      {hasResults&&link&&<div style={{
        background:"rgba(74,94,58,.06)",
        border:"0.5px solid rgba(74,94,58,.2)",
        borderRadius:12,
        padding:"12px 16px",
        marginBottom:20,
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        gap:10,
        flexWrap:"wrap"
      }}>
        <div style={{
          fontFamily:"'Lora',serif",
          fontSize:".85rem",
          color:"rgba(26,26,20,.55)"
        }}>
          🔗 Tu link privado del guion musical
        </div>

        <button
          className="lbtn"
          onClick={copyLink}
          style={{flexShrink:0,fontSize:".8rem"}}
        >
          {copied ? "¡Copiado ✓" : "Copiar link"}
        </button>
      </div>}

      <GlobalProgress user={user} hasResults={hasResults}/>

      {/* Módulos */}
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        gap:12,
        marginBottom:14
      }}>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:THEME.text.label,
          letterSpacing:".2em",
          textTransform:"uppercase",
          color:"#4A5E3A"
        }}>
          Herramientas para tu boda
        </div>

        <div style={{
          fontFamily:"'Lora',serif",
          fontSize:".78rem",
          color:"rgba(26,26,20,.35)",
          flexShrink:0
        }}>
          {modules.filter(m=>m.done).length}/{modules.length}
        </div>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(min(165px,45vw),1fr))",
        gap:12,
        marginBottom:24
      }}>
        {modules.map(({emoji,label,desc,action,status,done,primary,locked})=>
          <button
            key={label}
            type="button"
            onClick={action}
            style={{
              background:done
                ? "rgba(74,94,58,.08)"
                : primary
                  ? "#4A5E3A"
                  : locked
                    ? "rgba(251,247,239,.72)"
                    : "#FBF7EF",
              border:"0.5px solid " + (
                done
                  ? "rgba(74,94,58,.28)"
                  : primary
                    ? "#4A5E3A"
                    : locked
                      ? "rgba(26,26,20,.12)"
                      : "rgba(201,169,110,.25)"
              ),
              borderRadius:16,
              padding:primary ? "20px 18px" : "16px 14px",
              textAlign:"left",
              cursor:"pointer",
              transition:"all .2s",
              outline:"none",
              opacity:locked ? .78 : 1,
              gridColumn:primary ? "1 / -1" : "auto",
              boxShadow:primary
                ? "0 12px 28px rgba(74,94,58,.17)"
                : "none"
            }}
          >
            <div style={{
              display:"flex",
              alignItems:"flex-start",
              justifyContent:"space-between",
              gap:8
            }}>
              <div>
                <div style={{
                  fontSize:primary ? "1.8rem" : "1.3rem",
                  marginBottom:primary ? 8 : 5
                }}>
                  {emoji}
                </div>

                <div style={{
                  fontFamily:"'Playfair Display',serif",
                  fontWeight:600,
                  fontSize:primary ? "1.2rem" : ".92rem",
                  color:primary ? "#F5EFE0" : "#1A1A14",
                  lineHeight:1.2,
                  marginBottom:5
                }}>
                  {label}
                </div>

                <div style={{
                  fontFamily:"'Lora',serif",
                  fontSize:primary ? ".86rem" : ".78rem",
                  color:primary
                    ? "rgba(245,239,224,.68)"
                    : "rgba(26,26,20,.45)",
                  lineHeight:1.4,
                  marginBottom:12,
                  maxWidth:primary ? 560 : "none"
                }}>
                  {desc}
                </div>
              </div>
            </div>

            <div style={{
              display:"inline-block",
              fontFamily:"'Lora',serif",
              fontSize:primary ? ".9rem" : ".82rem",
              fontWeight:700,
              color:primary
                ? "#D9B86F"
                : done
                  ? "#4A5E3A"
                  : "rgba(74,94,58,.75)"
            }}>
              {status}
            </div>
          </button>
        )}
      </div>

      {/* Pie */}
      <div style={{
        display:"flex",
        gap:10,
        justifyContent:"center",
        alignItems:"center",
        flexWrap:"wrap",
        paddingTop:16,
        borderTop:"0.5px solid rgba(201,169,110,.15)"
      }}>
        {hasResults&&
          <button
            className="gbtn"
            onClick={onStartNew}
            style={{fontSize:".85rem",padding:"9px 18px"}}
          >
            Hacer el test de nuevo
          </button>
        }

        <button
          className="gbtn"
          onClick={onLogout}
          style={{fontSize:".85rem",padding:"9px 18px"}}
        >
          {isDemo ? "Salir de la prueba" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  </div>;
}

`;

try {
  source = replaceBlock(
    source,
    "function Landing({onTry,onLogin,onBuy}){",
    "function EmailCapture",
    NEW_LANDING
  );

  source = replaceBlock(
    source,
    "function HomeScreen(",
    "const EMPTY_FORM=",
    NEW_HOME
  );

  source = source.replace(
    '"Entrar a mi producto"',
    '"Entrar a mi organizador"'
  );

  source = source.replace(
    '"Iniciá sesión para ver o crear tu guion musical."',
    '"Iniciá sesión para continuar organizando tu boda y recuperar tus proyectos guardados."'
  );

  fs.writeFileSync(appPath, source, "utf8");

  console.log("");
  console.log("✓ UI actualizada correctamente.");
  console.log("✓ Diseño del salón ahora es el módulo destacado.");
  console.log("✓ El login aparece en la portada.");
  console.log("✓ La propuesta ahora es un organizador integral de bodas.");
  console.log("✓ El modo prueba muestra el CTA de guardado después de realizar cambios.");
  console.log("");
  console.log("Ahora ejecutá: npm run dev");
} catch (error) {
  console.error("");
  console.error("No se pudo aplicar el ajuste:");
  console.error(error.message);
  console.error("");
  console.error("Tu archivo original sigue disponible en:");
  console.error("src/App.backup-antes-ux.jsx");
  process.exit(1);
}