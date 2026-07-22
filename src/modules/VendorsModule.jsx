/* eslint-disable */
// @ts-nocheck
import { useEffect, useState } from "react";

function VendorForm({vendor, onSave, onCancel, budgetCurrency="USD", categories=[], VENDOR_CATS, VENDOR_ESTADOS, THEME, CURRENCIES, getVendorExchangeRateForBudget, getSuggestedExchangeRate, formatExchangeRate, vendorAmountInBudgetCurrency, getCurrencySymbol, num, fmt}){
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

function VendorsModule({user, onBack, dataClient, CATEGORIAS_DEFAULT, calcBudgetFromVendors, budgetCategoriesToVendorOptions, vendorAmountInBudgetCurrency, getCurrencySymbol, getVendorExchangeRateForBudget, getSuggestedExchangeRate, formatExchangeRate, CURRENCIES, num, fmt, showToast, loadPrivateExcelTemplateWorkbook, replaceTemplateTableRows, ensureExcelHowToSheet, openExcelTemplateDownload, useIsMobile, isDemoUser, BackToHome, THEME, VENDOR_CATS, VENDOR_ESTADOS, VENDOR_CATEGORY_EXPORT_LABELS, normalizeSpreadsheetKey, VENDOR_CATEGORY_IMPORT_IDS, VENDOR_STATE_IMPORT_IDS, parseSpreadsheetNumber, loadSheetJS, spreadsheetFileToRows}){
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
  const vendorFormDeps = {
    VENDOR_CATS, VENDOR_ESTADOS, THEME, CURRENCIES, getVendorExchangeRateForBudget,
    getSuggestedExchangeRate, formatExchangeRate, vendorAmountInBudgetCurrency,
    getCurrencySymbol, num, fmt
  };

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
      {adding && editId==="new" && <VendorForm {...vendorFormDeps} budgetCurrency={budgetCurrency} categories={vendorCategoryOptions} onSave={saveVendor} onCancel={()=>{setAdding(false);setEditId(null);}}/>}

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
        if(editId===v.id) return <VendorForm {...vendorFormDeps} key={v.id} vendor={v} budgetCurrency={budgetCurrency} categories={vendorCategoryOptions} onSave={saveVendor} onCancel={()=>setEditId(null)}/>;
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

export default VendorsModule;
