/* eslint-disable */
// @ts-nocheck
import { useEffect, useState } from "react";

export default function BudgetModule({
  user,
  onBack,
  dataClient,
  CATEGORIAS_DEFAULT,
  calcBudgetFromVendors,
  normalizeBudgetCategoryName,
  showToast,
  THEME,
  CURRENCIES,
  getCurrencySymbol,
  fmt,
  num,
  BackToHome
}){
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
