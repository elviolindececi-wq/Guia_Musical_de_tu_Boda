import { useEffect, useMemo, useState } from "react";
import "./ceci-guide.css";

const VIEW_META = {
  home: {
    eyebrow: "Inicio",
    title: "Tu próximo paso",
    intro: "Te ayudo a decidir qué conviene priorizar y cómo aprovechar el sistema sin intentar resolver todo de una vez."
  },
  "checklist-boda": {
    eyebrow: "Plan y checklist",
    title: "Ordená las tareas",
    intro: "Te explico cómo completar, personalizar y priorizar el checklist según el momento de la boda."
  },
  budget: {
    eyebrow: "Presupuesto",
    title: "Tomá decisiones con claridad",
    intro: "Te guío para cargar montos en el orden correcto y entender qué te está mostrando cada categoría."
  },
  vendors: {
    eyebrow: "Proveedores",
    title: "Compará antes de contratar",
    intro: "Te ayudo a registrar propuestas, comparar condiciones y mantener cada decisión conectada con el presupuesto."
  },
  guests: {
    eyebrow: "Invitados",
    title: "Convertí la lista en decisiones",
    intro: "Te guío para cargar invitaciones, resolver confirmaciones y preparar una distribución de mesas manejable."
  },
  "salon-design": {
    eyebrow: "Diseño del salón",
    title: "Diseñá un espacio que funcione",
    intro: "Te explico cómo ordenar ambientes, mesas, invitados y circulación sin perder de vista la comodidad."
  },
  timeline: {
    eyebrow: "Cronograma",
    title: "Coordiná el día con claridad",
    intro: "Te ayudo a ordenar horarios, responsables, música y notas para que los proveedores trabajen sobre el mismo plan."
  },
  guia: {
    eyebrow: "Música",
    title: "Elegí música con intención",
    intro: "Te oriento para entender cada momento musical y completar el test sin necesitar saber canciones de antemano."
  },
  results: {
    eyebrow: "Guion musical",
    title: "Convertí el resultado en un plan operativo",
    intro: "Te explico cómo revisar, coordinar, compartir y guardar el guion musical personalizado."
  },
  "guia-novios": {
    eyebrow: "Guía para novios",
    title: "Encontrá la orientación que necesitás",
    intro: "Te ayudo a ubicar consejos de protocolo, ceremonia, invitados, presupuesto, proveedores y el gran día."
  }
};

const ALL_GUIDE_VIEWS = Object.freeze(Object.keys(VIEW_META));

const normalizeText = (value="") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();

const daysUntil = (dateValue) => {
  if(!dateValue) return null;
  const target = new Date(`${dateValue}T12:00:00`);
  if(Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12,0,0,0);
  return Math.ceil((target.getTime()-today.getTime())/86400000);
};

const asArray = (value) => Array.isArray(value) ? value : [];

const checklistStats = (row={}) => {
  const general = row?.checklist_general || {};
  const custom = row?.checklist_custom || {};
  const generalValues = Object.values(general);
  const customValues = Object.values(custom);
  const total = generalValues.length + customValues.length;
  const done = generalValues.filter(Boolean).length + customValues.filter(value=>value===true || value?.done===true).length;
  return {total,done,pct:total?Math.round((done/total)*100):null};
};

const buildSnapshot = ({row,form,profile}) => {
  const budget = row?.budget || {};
  const categories = asArray(budget?.categorias);
  const vendors = asArray(row?.vendors);
  const guests = asArray(row?.guests);
  const timeline = asArray(row?.timeline);
  const approval = row?.timeline_aprobacion || {};
  const salonLayout = row?.salon_layout || {};
  const checklist = checklistStats(row);
  const totalBudget = Number(budget?.total)||0;
  const estimatedCategories = categories.filter(category=>(Number(category?.estimado)||0)>0).length;
  const quotedCategories = categories.filter(category=>(Number(category?.cotizado)||0)>0).length;
  const paidCategories = categories.filter(category=>(Number(category?.pagado)||0)>0).length;
  const overBudgetCategories = categories.filter(category=>{
    const estimated=Number(category?.estimado)||0;
    const quoted=Number(category?.cotizado)||0;
    return estimated>0 && quoted>estimated;
  }).length;
  const contractedVendors = vendors.filter(vendor=>["contratado","pagado"].includes(vendor?.estado)).length;
  const evaluatingVendors = vendors.filter(vendor=>(vendor?.estado||"evaluando")==="evaluando").length;
  const confirmedGuests = guests.filter(guest=>guest?.confirmacion==="confirmado").length;
  const declinedGuests = guests.filter(guest=>guest?.confirmacion==="no_va").length;
  const pendingGuests = guests.filter(guest=>!["confirmado","no_va"].includes(guest?.confirmacion)).length;
  const unassignedGuests = guests.filter(guest=>guest?.confirmacion!=="no_va" && !String(guest?.mesa||"").trim()).length;
  const timelineApproved = Object.values(approval).filter(Boolean).length;
  const salonTables = asArray(salonLayout?.mesas).length || asArray(salonLayout?.tables).length;
  return {
    days:daysUntil(form?.fechaBoda),
    hasDate:Boolean(form?.fechaBoda),
    city:String(form?.ciudad||"").trim(),
    stage:profile?.stage||"",
    concern:profile?.concern||"",
    totalBudget,
    categories:categories.length,
    estimatedCategories,
    quotedCategories,
    paidCategories,
    overBudgetCategories,
    vendors:vendors.length,
    contractedVendors,
    evaluatingVendors,
    guests:guests.length,
    confirmedGuests,
    declinedGuests,
    pendingGuests,
    unassignedGuests,
    timelineEvents:timeline.length,
    timelineApproved,
    salonTables,
    checklist
  };
};

const timingAdvice = (days) => {
  if(days===null) return {
    title:"Primero definan la fecha o una fecha estimada",
    body:"La fecha permite ordenar prioridades, activar la cuenta regresiva y saber qué decisiones ya son urgentes. Si todavía no está cerrada, pueden marcar que aún no la definieron y seguir usando el planner.",
    action:{label:"Editar datos de la pareja",view:"home"}
  };
  if(days<0) return {
    title:"La fecha guardada ya pasó",
    body:"Revisá la fecha en Inicio antes de continuar. El planner usa ese dato para calcular recomendaciones y próximos pasos.",
    action:{label:"Revisar fecha",view:"home"}
  };
  if(days<=30) return {
    title:"Están en las últimas semanas",
    body:"Priorizá confirmaciones, pagos finales, responsables y cronograma. Evitá abrir decisiones nuevas que no afecten el funcionamiento del día.",
    action:{label:"Revisar pendientes críticos",view:"checklist-boda"}
  };
  if(days<=90) return {
    title:"Es momento de cerrar y coordinar",
    body:"Conviene resolver confirmaciones, distribución de mesas, pagos pendientes y responsables del día. El checklist y el cronograma deberían ser sus pantallas principales.",
    action:{label:"Abrir checklist",view:"checklist-boda"}
  };
  if(days<=180) return {
    title:"Consoliden las decisiones principales",
    body:"Revisen presupuesto, proveedores importantes y lista de invitados. Esta etapa es ideal para detectar diferencias entre lo estimado y lo realmente cotizado.",
    action:{label:"Revisar presupuesto",view:"budget"}
  };
  return {
    title:"Construyan una base clara",
    body:"Empiecen por presupuesto total, cantidad aproximada de invitados y proveedores que condicionan la fecha o el lugar. Después avancen con una decisión concreta por semana.",
    action:{label:"Crear un orden de tareas",view:"checklist-boda"}
  };
};

const buildTopics = ({view,snapshot}) => {
  const timing = timingAdvice(snapshot.days);

  const saveAdvice = {
    home:["Los datos principales de la pareja se guardan al confirmar el formulario de edición.","Los módulos muestran sus propios estados o botones de guardado cuando corresponde."],
    "checklist-boda":["Al marcar tareas vas a ver “Guardando” o “Guardado”.","Para notas, responsables, fechas o proveedores, abrí el detalle con + y presioná Guardar cambios."],
    budget:["Usá el botón Guardar para confirmar el presupuesto.","El total y varios campos también se guardan al salir de ellos, pero el estado del encabezado es la referencia más clara."],
    vendors:["Cada proveedor se guarda cuando presionás Guardar proveedor.","Al editar una ficha, confirmá el cambio antes de salir."],
    guests:["Los cambios de confirmación, mesa, restricciones y notas se guardan al editarlos o al presionar Guardar dentro del detalle.","Después de una importación, revisá el resumen antes de confirmar."],
    "salon-design":["El plano se guarda en la cuenta mientras modificás el diseño.","Después de mover muchas mesas o elementos, esperá un instante antes de cerrar la pantalla."],
    timeline:["Usá Guardar en el encabezado para conservar el cronograma.","Las ediciones de cada evento también se actualizan al salir de los campos."],
    guia:["La guía de canciones es informativa. El resultado personalizado se guarda cuando completás el test y generás el guion."],
    results:["El guion queda asociado a tu cuenta y podés volver a abrirlo.","Las tareas del checklist de coordinación se conservan al marcarlas."],
    "guia-novios":["La guía es contenido de consulta y no necesita guardado.","La descarga completa se prepara de forma privada para cuentas con acceso."]
  };

  const common = [
    {
      id:"general-save",
      views:ALL_GUIDE_VIEWS,
      question:"¿Cómo se guardan los cambios?",
      keywords:"guardar guardado cambios datos cuenta nube",
      answer:saveAdvice[view]||["Los datos se guardan dentro de la cuenta cuando confirmás la acción correspondiente."]
    },
    {
      id:"general-method",
      views:ALL_GUIDE_VIEWS,
      question:"¿Cómo conviene usar el planner?",
      keywords:"usar planner orden metodo empezar modulos",
      answer:[
        "No intentes completar todos los módulos el mismo día.",
        "Elegí una decisión concreta, usá la herramienta correspondiente y volvé a Inicio para definir el siguiente paso. El sistema funciona mejor como una secuencia de decisiones, no como una lista infinita."
      ]
    }
  ];

  const home = [
    {
      id:"home-now",
      views:["home"],
      question:"¿Qué deberíamos hacer ahora?",
      keywords:"ahora prioridad siguiente paso que hacer hoy",
      answer:[timing.body],
      title:timing.title,
      action:timing.action
    },
    {
      id:"home-stage",
      views:["home"],
      question:"¿Para qué sirve definir nuestra etapa?",
      keywords:"etapa recorrido preguntas prioridad preocupacion",
      answer:[
        "Las dos preguntas de etapa y preocupación principal convierten el menú de módulos en una recomendación concreta.",
        "Podés actualizarlas cuando la organización cambie. No eliminan datos ni reinician la planificación."
      ],
      action:{label:"Actualizar mi etapa",view:"start"}
    },
    {
      id:"home-countdown",
      views:["home"],
      question:"¿Cómo funciona la cuenta regresiva?",
      keywords:"cuenta regresiva fecha dias boda editar",
      answer:[
        "La cuenta usa la fecha guardada en los datos de la pareja y se actualiza automáticamente cada día.",
        "Desde Inicio podés editar la fecha y la ciudad. Ese cambio también mejora las recomendaciones del planner."
      ]
    },
    {
      id:"home-modules",
      views:["home"],
      question:"¿Qué módulo conviene abrir primero?",
      keywords:"modulo primero presupuesto invitados checklist proveedores",
      answer:[
        snapshot.totalBudget===0
          ? "Como todavía no aparece un presupuesto total cargado, Presupuesto es un buen primer paso."
          : snapshot.checklist.pct!==null && snapshot.checklist.pct<35
            ? "Tu checklist todavía está en una etapa inicial. Abrilo y elegí solo tres tareas para esta semana."
            : "Usá la recomendación destacada en Inicio. Está basada en la etapa elegida y en el tiempo que falta para la boda."
      ],
      action:{
        label:snapshot.totalBudget===0?"Abrir Presupuesto":"Abrir Checklist",
        view:snapshot.totalBudget===0?"budget":"checklist-boda"
      }
    }
  ];

  const checklist = [
    {
      id:"checklist-start",
      views:["checklist-boda"],
      question:"¿Cómo empiezo a usar el checklist?",
      keywords:"checklist empezar tareas marcar completar etapa",
      answer:[
        "Abrí una etapa y marcá únicamente las tareas que ya estén realmente resueltas.",
        "Después elegí tres pendientes cercanos. Podés filtrar por Pendientes para trabajar sin distraerte con lo ya completado."
      ]
    },
    {
      id:"checklist-details",
      views:["checklist-boda"],
      question:"¿Para qué sirve el botón + de cada tarea?",
      keywords:"boton mas nota responsable fecha limite proveedor detalle",
      answer:[
        "El botón + abre los detalles de la tarea.",
        "Ahí podés agregar una nota, asignar responsable, definir una fecha límite y vincular un proveedor. Después presioná Guardar cambios."
      ]
    },
    {
      id:"checklist-custom",
      views:["checklist-boda"],
      question:"¿Cómo agrego una tarea propia?",
      keywords:"agregar tarea personalizada nueva propia",
      answer:[
        "Dentro de cada etapa tocá “Agregar tarea personalizada a esta etapa”.",
        "Escribí la tarea y presioná Enter o el botón Agregar. Las tareas personalizadas se pueden mover con los botones de flecha y eliminar con la X."
      ]
    },
    {
      id:"checklist-order",
      views:["checklist-boda"],
      question:"¿Cómo ordeno o filtro las tareas?",
      keywords:"ordenar reordenar arrastrar filtro pendientes completadas responsable",
      answer:[
        "Usá Todas, Pendientes o Completadas para cambiar la vista. También podés filtrar por responsable.",
        "Las tareas predeterminadas se reordenan arrastrando el ícono de movimiento. Las personalizadas usan las flechas hacia arriba y abajo."
      ]
    },
    {
      id:"checklist-priority",
      views:["checklist-boda"],
      question:"¿Qué tareas deberían ser prioridad?",
      keywords:"prioridad urgente tareas ahora tiempo falta",
      title:timing.title,
      answer:[
        timing.body,
        snapshot.checklist.pct===null
          ? "Elegí tres tareas concretas y asignales una fecha límite."
          : `El avance guardado del checklist es de aproximadamente ${snapshot.checklist.pct}%. No hace falta llevarlo a 100% hoy: trabajá primero en lo que condiciona otras decisiones.`
      ]
    }
  ];

  const budget = [
    {
      id:"budget-start",
      views:["budget"],
      question:"¿En qué orden completo el presupuesto?",
      keywords:"presupuesto empezar orden total estimado cotizado pagado",
      answer:[
        "Primero cargá el presupuesto total y la cantidad aproximada de invitados.",
        "Después completá el estimado de cada categoría. Cuando recibas propuestas, actualizá Cotizado. Usá Pagado solamente cuando el dinero ya haya sido entregado."
      ]
    },
    {
      id:"budget-columns",
      views:["budget"],
      question:"¿Qué significan Estimado, Cotizado y Pagado?",
      keywords:"estimado cotizado pagado diferencia columnas",
      answer:[
        "Estimado es cuánto decidieron destinar a una categoría.",
        "Cotizado es el valor real de las propuestas de proveedores. Pagado es lo que efectivamente ya abonaron. Comparar esos tres montos permite detectar desvíos antes de que se conviertan en un problema."
      ]
    },
    {
      id:"budget-distribution",
      views:["budget"],
      question:"¿Cómo uso la distribución sugerida?",
      keywords:"distribucion sugerida calculadora aplicar categorias porcentaje",
      answer:[
        "Cargá primero el presupuesto total y la cantidad de invitados.",
        "Abrí “Sugerir distribución por categoría”, respondé las preguntas y revisá la propuesta antes de aplicarla. Es un punto de partida: ajustá cada monto según sus prioridades y cotizaciones reales."
      ]
    },
    {
      id:"budget-category",
      views:["budget"],
      question:"¿Puedo agregar o eliminar categorías?",
      keywords:"agregar categoria eliminar editar otros personalizada",
      answer:[
        "Sí. Usá “Agregar categoría” para crear una categoría que no esté en la lista.",
        "Podés editar sus montos y notas. Si una categoría ya tiene proveedores vinculados, primero tendrás que reasignarlos o eliminarlos antes de quitarla."
      ]
    },
    {
      id:"budget-alerts",
      views:["budget"],
      question:"¿Cómo interpreto las alertas?",
      keywords:"alertas sobre presupuesto sin proveedor sin estimado rojo aviso",
      answer:[
        "Las alertas comparan estimados, cotizaciones y proveedores.",
        "Una categoría puede aparecer porque supera lo estimado, porque tiene presupuesto sin proveedor cotizado o porque ya tiene una cotización pero todavía no definiste cuánto querías destinarle."
      ]
    },
    {
      id:"budget-priority",
      views:["budget"],
      question:"¿Qué deberíamos corregir primero?",
      keywords:"corregir primero prioridad presupuesto analisis",
      answer:[
        snapshot.totalBudget===0
          ? "Primero definan el presupuesto total. Sin ese dato, los porcentajes y alertas no pueden mostrar una comparación completa."
          : snapshot.estimatedCategories===0
            ? "El total ya está cargado. El siguiente paso es asignar un estimado a las categorías principales."
            : snapshot.overBudgetCategories>0
              ? `${snapshot.overBudgetCategories} categoría${snapshot.overBudgetCategories===1?" está":"s están"} cotizada por encima de lo estimado. Revisen esas diferencias antes de sumar nuevos gastos.`
              : snapshot.quotedCategories===0
                ? "Ya tienen una distribución estimada. Ahora carguen las propuestas reales en Proveedores para comparar."
                : "El presupuesto tiene una base útil. Revisen pagos pendientes y mantengan un margen para cambios e imprevistos."
      ]
    }
  ];

  const vendors = [
    {
      id:"vendors-start",
      views:["vendors"],
      question:"¿Qué datos conviene cargar de cada proveedor?",
      keywords:"proveedor datos nombre contacto precio moneda estado link notas categoria",
      answer:[
        "Cargá categoría, nombre, contacto, precio y moneda. Después completá el estado, el enlace de referencia y notas sobre lo que incluye, forma de pago o condiciones.",
        "Una ficha clara sirve para comparar propuestas sin volver a buscar conversaciones dispersas."
      ]
    },
    {
      id:"vendors-status",
      views:["vendors"],
      question:"¿Qué significa cada estado?",
      keywords:"evaluando contratado pagado descartado estado",
      answer:[
        "Evaluando es una opción todavía abierta. Contratado indica que ya tomaron la decisión. Pagado señala que el monto fue abonado y Descartado conserva la referencia sin mezclarla con las opciones activas.",
        "No marques Pagado solo porque recibiste una cotización. Usalo cuando el dinero ya haya sido entregado."
      ]
    },
    {
      id:"vendors-budget",
      views:["vendors"],
      question:"¿Cómo se conecta con Presupuesto?",
      keywords:"presupuesto cotizado pagado moneda cambio categoria sincroniza",
      answer:[
        "Los importes de proveedores alimentan Cotizado y, según su estado, Pagado dentro de la categoría correspondiente del presupuesto.",
        "Si el proveedor usa otra moneda, revisá la moneda y el tipo de cambio para que la comparación sea correcta."
      ],
      action:{label:"Abrir Presupuesto",view:"budget"}
    },
    {
      id:"vendors-excel",
      views:["vendors"],
      question:"¿Cómo uso la plantilla de Excel?",
      keywords:"excel importar exportar plantilla archivo proveedores",
      answer:[
        "Podés descargar la plantilla, completarla fuera de la app e importarla desde este módulo. También podés exportar los datos ya cargados.",
        "El archivo y la app no se sincronizan solos: después de cambiar el Excel tenés que importarlo nuevamente. Revisá categorías y estados antes de confirmar."
      ]
    },
    {
      id:"vendors-priority",
      views:["vendors"],
      question:"¿Qué proveedor deberíamos resolver primero?",
      keywords:"prioridad urgente contratar proveedor primero",
      title:timing.title,
      answer:[
        snapshot.vendors===0
          ? "Todavía no hay proveedores cargados. Empezá por los que condicionan fecha, lugar o experiencia: salón, catering, fotografía y música, según sus prioridades."
          : snapshot.evaluatingVendors>0
            ? `Tenés ${snapshot.evaluatingVendors} proveedor${snapshot.evaluatingVendors===1?"":"es"} en evaluación. Compará alcance, condiciones, plan B y forma de pago antes de decidir por precio solamente.`
            : "La lista ya tiene decisiones avanzadas. Revisá contratos, saldos y responsables antes de sumar nuevas opciones.",
        timing.body
      ]
    }
  ];

  const guests = [
    {
      id:"guests-start",
      views:["guests"],
      question:"¿Cómo conviene armar la lista?",
      keywords:"invitados lista empezar familia cantidad lado parentesco",
      answer:[
        "Podés cargar una invitación por persona, pareja o familia y usar Personas para indicar cuántos lugares representa.",
        "Completá lado, parentesco, confirmación, restricciones y notas. Eso después facilita los filtros y la distribución de mesas."
      ]
    },
    {
      id:"guests-confirmations",
      views:["guests"],
      question:"¿Cómo manejo las confirmaciones?",
      keywords:"confirmado pendiente no va rsvp confirmacion",
      answer:[
        "Usá Pendiente mientras no tengas una respuesta definitiva, Confirmado cuando la invitación asiste y No va cuando rechazó.",
        snapshot.pendingGuests>0
          ? `Ahora hay ${snapshot.pendingGuests} invitación${snapshot.pendingGuests===1?"":"es"} pendiente${snapshot.pendingGuests===1?"":"s"}. Evitá cerrar definitivamente las mesas hasta resolver las más importantes.`
          : "No aparecen confirmaciones pendientes en los datos cargados. Revisá que la cantidad de personas de cada invitación también sea correcta."
      ]
    },
    {
      id:"guests-tables",
      views:["guests"],
      question:"¿Cómo asigno y organizo las mesas?",
      keywords:"mesa asignar banco espera grupos distribuir invitados",
      answer:[
        "Podés escribir un número de mesa en la ficha o trabajar desde la vista de mesas. Las invitaciones sin mesa quedan en el Banco de espera.",
        "Mantené juntos a los grupos que deben sentarse juntos y verificá la cantidad de personas, no solo la cantidad de invitaciones."
      ],
      action:{label:"Abrir Diseño del salón",view:"salon-design"}
    },
    {
      id:"guests-excel",
      views:["guests"],
      question:"¿Cómo importo invitados desde Excel?",
      keywords:"excel importar plantilla invitados revisar archivo",
      answer:[
        "Descargá la plantilla, respetá los encabezados y guardala como XLSX. Después usá Importar Excel.",
        "La app muestra una revisión antes de aplicar los datos. Verificá nombres, cantidad de personas, mesas y confirmaciones para evitar duplicados o distribuciones incorrectas."
      ]
    },
    {
      id:"guests-priority",
      views:["guests"],
      question:"¿Qué deberíamos corregir primero?",
      keywords:"prioridad corregir invitados pendientes sin mesa",
      answer:[
        snapshot.guests===0
          ? "Primero cargá una lista inicial, aunque todavía no sea definitiva. El presupuesto y el salón necesitan una cantidad aproximada."
          : snapshot.pendingGuests>0
            ? `Resolvé primero las ${snapshot.pendingGuests} invitación${snapshot.pendingGuests===1?"":"es"} pendiente${snapshot.pendingGuests===1?"":"s"} que puedan cambiar catering o mesas.`
            : snapshot.unassignedGuests>0
              ? `Las confirmaciones están avanzadas, pero quedan ${snapshot.unassignedGuests} invitación${snapshot.unassignedGuests===1?"":"es"} activa${snapshot.unassignedGuests===1?"":"s"} sin mesa. Trabajá ahora en la distribución.`
              : "La lista está operativa. Hacé una revisión final de restricciones, cantidad de personas y nombres antes de compartirla con catering o coordinación."
      ]
    }
  ];

  const salon = [
    {
      id:"salon-start",
      views:["salon-design"],
      question:"¿Por dónde empiezo el diseño?",
      keywords:"salon empezar plano dimensiones ambiente estilo preset",
      answer:[
        "Empezá definiendo los ambientes y las medidas reales o aproximadas. Después elegí una propuesta visual o comenzá con un plano vacío.",
        "Ubicá primero los elementos fijos: accesos, escenario, pista, barra, baños, cocina y salidas. Las mesas vienen después."
      ]
    },
    {
      id:"salon-tables",
      views:["salon-design"],
      question:"¿Cómo agrego y edito mesas?",
      keywords:"agregar mesa editar capacidad nombre mover arrastrar",
      answer:[
        "Si ya asignaste números de mesa en Invitados, el módulo te muestra cuáles faltan por agregar al canvas. Podés incorporarlas de a una, varias o todas.",
        "Tocá una mesa para editar su nombre, forma y capacidad. Para moverla, mantené presionado y arrastrá."
      ]
    },
    {
      id:"salon-waiting",
      views:["salon-design"],
      question:"¿Qué es el Banco de espera?",
      keywords:"banco espera sin mesa asignar invitado",
      answer:[
        "El Banco de espera reúne invitaciones activas que todavía no tienen mesa.",
        "Usalo para buscar una invitación y asignarla a una mesa sin volver a la lista. Si la retirás de una mesa, vuelve al banco y no se elimina."
      ]
    },
    {
      id:"salon-elements",
      views:["salon-design"],
      question:"¿Cómo agrego decoración y servicios?",
      keywords:"elemento decoracion pista barra escenario baños salida ambiente",
      answer:[
        "El botón Elemento permite sumar objetos como pista, escenario, barra, cabina, guardarropa o servicios.",
        "Usalos para representar obstáculos y zonas importantes, no para decorar cada detalle. El objetivo principal es comprobar circulación y funcionamiento."
      ]
    },
    {
      id:"salon-priority",
      views:["salon-design"],
      question:"¿Qué debería revisar antes de cerrar el plano?",
      keywords:"revisar cerrar plano circulacion capacidad seguridad",
      answer:[
        snapshot.unassignedGuests>0
          ? `Todavía hay ${snapshot.unassignedGuests} invitación${snapshot.unassignedGuests===1?"":"es"} activa${snapshot.unassignedGuests===1?"":"s"} sin mesa. El plano puede avanzar, pero no lo cierres como definitivo.`
          : "La distribución de invitados no muestra pendientes sin mesa. Ahora podés concentrarte en el espacio.",
        "Verificá capacidad cómoda, caminos hacia baños y salidas, acceso de mozos, distancia de la pista y visibilidad de la mesa principal."
      ],
      action:{label:"Revisar Invitados",view:"guests"}
    }
  ];

  const timeline = [
    {
      id:"timeline-start",
      views:["timeline"],
      question:"¿Qué información lleva cada evento?",
      keywords:"cronograma evento hora duracion lugar responsable proveedor notas cancion",
      answer:[
        "Cada evento puede incluir hora, duración, lugar, canción, responsable o proveedor y notas operativas.",
        "Escribí instrucciones que otra persona pueda ejecutar sin preguntarle a la pareja. Eso convierte el cronograma en una herramienta de coordinación."
      ]
    },
    {
      id:"timeline-order",
      views:["timeline"],
      question:"¿Cómo calculo los tiempos?",
      keywords:"tiempo duracion margen retraso horario orden",
      answer:[
        "Usá duraciones realistas y agregá márgenes entre bloques que impliquen traslado, fotos, maquillaje o cambios de ambiente.",
        "Un cronograma con pequeños colchones funciona mejor que uno perfecto en papel pero imposible de cumplir."
      ]
    },
    {
      id:"timeline-music",
      views:["timeline"],
      question:"¿Cómo conecto el cronograma con la música?",
      keywords:"musica cancion guion sugerencia dj ceremonia",
      answer:[
        "Podés escribir una canción en cada evento. Cuando ya existe un guion musical, algunos momentos muestran una sugerencia para mantener ambos módulos alineados.",
        "Confirmá siempre duración, versión y señal de inicio con DJ, músicos y coordinación."
      ],
      action:{label:"Abrir Música",view:"results"}
    },
    {
      id:"timeline-approval",
      views:["timeline"],
      question:"¿Para qué sirve la confirmación de la pareja?",
      keywords:"confirmar aprobar pareja ambos cronograma",
      answer:[
        "La aprobación sirve como control final para saber que ambos revisaron la secuencia.",
        snapshot.timelineApproved>=2
          ? "Los dos estados de aprobación aparecen confirmados. El siguiente paso es compartir la misma versión con proveedores."
          : "Antes de compartir, revisen juntos horarios sensibles, responsables y momentos que dependen de música o fotografía."
      ]
    },
    {
      id:"timeline-share",
      views:["timeline"],
      question:"¿Cómo lo comparto con proveedores?",
      keywords:"compartir descargar pdf imprimir coordinadora dj fotografo",
      answer:[
        "Usá Descargar PDF del cronograma. En el diálogo de impresión elegí Guardar como PDF.",
        "Compartí una única versión con coordinación, fotografía, DJ, músicos y responsables. Si cambiás algo después, avisá que reemplaza la versión anterior."
      ]
    },
    {
      id:"timeline-priority",
      views:["timeline"],
      question:"¿Qué falta revisar primero?",
      keywords:"prioridad revisar cronograma ahora",
      answer:[
        snapshot.timelineEvents===0
          ? "Todavía no aparecen eventos guardados. Empezá por ceremonia, recepción, entrada, cena, brindis, torta y apertura de pista."
          : `Hay ${snapshot.timelineEvents} evento${snapshot.timelineEvents===1?"":"s"} en el cronograma. Revisá primero los que no tengan responsable, duración o lugar claro.`,
        timing.body
      ]
    }
  ];

  const musicGuide = [
    {
      id:"music-moments",
      views:["guia"],
      question:"¿Para qué sirve la guía por momentos?",
      keywords:"momento llegada entrada ceremonia salida coctel cena guia canciones",
      answer:[
        "Cada bloque explica qué emoción necesita un momento, qué errores conviene evitar y ofrece ejemplos de canciones.",
        "No hace falta elegir todos los ejemplos. Usalos para entender el criterio y después adaptalo a su historia y al tipo de ceremonia."
      ]
    },
    {
      id:"music-test",
      views:["guia"],
      question:"¿Qué hace el test personalizado?",
      keywords:"test personalizado resultado guion perfil musical",
      answer:[
        "El test combina datos de la ceremonia, gustos, restricciones y recuerdos para preparar un guion musical personalizado.",
        "Cuanto más específicas sean las respuestas, más fácil será que el resultado refleje a la pareja en lugar de parecer una playlist genérica."
      ],
      action:{label:"Empezar el test",view:"form"}
    },
    {
      id:"music-no-songs",
      views:["guia"],
      question:"¿Qué pasa si todavía no sabemos qué canciones elegir?",
      keywords:"no sabemos canciones ideas dudas elegir",
      answer:[
        "No es un problema. Podés describir artistas, estilos, recuerdos o la emoción buscada aunque todavía no exista una canción definida.",
        "También podés dejar momentos abiertos y usar el resultado como punto de partida para conversar con DJ o músicos."
      ]
    },
    {
      id:"music-restrictions",
      views:["guia"],
      question:"¿Dónde indico restricciones o canciones prohibidas?",
      keywords:"restriccion iglesia prohibidas no tocar sacerdote ceremonia",
      answer:[
        "En el test podés registrar restricciones de la iglesia o ceremonia, artistas preferidos y canciones que no quieren escuchar.",
        "Anotá las restricciones con claridad y confirmalas con quien oficie la ceremonia antes de cerrar el repertorio."
      ]
    },
    {
      id:"music-story",
      views:["guia"],
      question:"¿Qué conviene contar sobre nuestra historia?",
      keywords:"historia recuerdo cancion personal pareja emoción",
      answer:[
        "Contá recuerdos concretos: un viaje, una canción compartida, cómo se conocieron o qué quieren sentir al entrar.",
        "No hace falta escribir algo perfecto. Esos detalles ayudan más que una lista extensa de géneros."
      ]
    }
  ];

  const musicResults = [
    {
      id:"results-read",
      views:["results"],
      question:"¿Cómo conviene revisar el resultado?",
      keywords:"resultado resumen perfil guion revisar empezar",
      answer:[
        "Empezá por Resumen de su boda y Perfil musical para entender el criterio general.",
        "Después abrí el Guion musical y escuchá cada momento en orden. No evalúes una canción aislada: revisá cómo funciona dentro de toda la secuencia."
      ]
    },
    {
      id:"results-checklist",
      views:["results"],
      question:"¿Para qué sirve el checklist de coordinación?",
      keywords:"checklist coordinacion tareas dj fotografo músicos",
      answer:[
        "Transforma el guion en acciones para la pareja, coordinación, fotografía y músicos.",
        "Marcá una tarea solo cuando esté confirmada. Así el resultado no queda como una idea bonita, sino como un plan ejecutable."
      ]
    },
    {
      id:"results-share",
      views:["results"],
      question:"¿Cómo lo comparto con proveedores?",
      keywords:"compartir whatsapp proveedor dj fotografo link privado",
      answer:[
        "La sección Compartir con proveedores incluye mensajes preparados para cada profesional.",
        "También podés copiar el link privado. Antes de enviarlo, confirmá que la versión del guion sea la definitiva."
      ]
    },
    {
      id:"results-pdf",
      views:["results"],
      question:"¿Cómo lo guardo como PDF?",
      keywords:"guardar exportar pdf imprimir",
      answer:[
        "Abrí Guardar o exportar y elegí Guardar como PDF.",
        "En el diálogo de impresión del navegador seleccioná Guardar como PDF. Ese archivo sirve para imprimir o compartir."
      ]
    },
    {
      id:"results-change",
      views:["results"],
      question:"¿Qué hago si el resultado no nos representa?",
      keywords:"cambiar resultado rehacer test no representa",
      answer:[
        "Primero identificá qué parte no encaja: estilo, emoción, restricciones o una canción específica.",
        "Usá Volver a hacer el test para ajustar las respuestas. Evitá rehacerlo muchas veces sin definir qué quieren cambiar."
      ],
      action:{label:"Volver al test",view:"guia"}
    }
  ];

  const coupleGuide = [
    {
      id:"couple-sections",
      views:["guia-novios"],
      question:"¿Qué temas incluye esta guía?",
      keywords:"temas secciones mesas protocolo ceremonia invitaciones presupuesto proveedores gran dia dress code",
      answer:[
        "La guía está organizada en Mesas y protocolo, Ceremonia, Invitaciones y regalos, Presupuesto, El gran día, Dress code y Proveedores.",
        "Usá las pestañas para ir directamente al tema que estás resolviendo."
      ]
    },
    {
      id:"couple-tables",
      views:["guia-novios"],
      question:"¿Dónde encuentro consejos para las mesas?",
      keywords:"mesas protocolo familia amigos niños capacidad",
      answer:[
        "Abrí Mesas y protocolo. Vas a encontrar orientación sobre mesa principal, cercanía de familiares, afinidad de grupos, niños y capacidades cómodas.",
        "Tomalo como criterio de organización y adaptalo a la dinámica real de sus familias."
      ],
      action:{label:"Abrir Invitados",view:"guests"}
    },
    {
      id:"couple-ceremony",
      views:["guia-novios"],
      question:"¿La guía reemplaza lo que indique la iglesia o el Registro Civil?",
      keywords:"iglesia civil registro requisitos ceremonia legal",
      answer:[
        "No. La guía ofrece orientación general sobre cortejo, alianzas, lados y testigos.",
        "Los requisitos y costumbres pueden cambiar según país, oficina, religión y celebrante. Confirmá siempre los detalles oficiales con la institución correspondiente."
      ]
    },
    {
      id:"couple-download",
      views:["guia-novios"],
      question:"¿Cómo descargo la guía completa?",
      keywords:"descargar guia completa 55 paginas pdf",
      answer:[
        "Usá Descargar guía completa dentro del módulo. La app prepara el archivo mediante tu sesión activa.",
        "Si la sesión venció, volvé a ingresar antes de intentar la descarga nuevamente."
      ]
    },
    {
      id:"couple-next",
      views:["guia-novios"],
      question:"¿Cómo llevo un consejo a la práctica?",
      keywords:"aplicar consejo modulo accion",
      answer:[
        "Después de leer una sección, convertí el consejo en una acción dentro del módulo correspondiente.",
        "Por ejemplo: protocolo de mesas en Invitados o Salón, señas en Proveedores y Presupuesto, y tiempos del día en Cronograma."
      ],
      action:{label:"Abrir Checklist",view:"checklist-boda"}
    }
  ];

  return [
    ...common,
    ...home,
    ...checklist,
    ...budget,
    ...vendors,
    ...guests,
    ...salon,
    ...timeline,
    ...musicGuide,
    ...musicResults,
    ...coupleGuide
  ].filter(topic=>topic.views.includes(view));
};

const GuideIcon = ({type="spark"}) => {
  if(type==="close") return <span aria-hidden="true">×</span>;
  if(type==="search") return <span aria-hidden="true">⌕</span>;
  if(type==="send") return <span aria-hidden="true">→</span>;
  return <span aria-hidden="true">✦</span>;
};

export default function CeciGuideModule({
  view,
  form,
  user,
  profile,
  isDemo=false,
  dataClient,
  onNavigate,
  trackEvent,
  purchaseVisible=false
}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [row,setRow]=useState(null);
  const [loading,setLoading]=useState(false);
  const [messages,setMessages]=useState([]);

  const meta=VIEW_META[view]||VIEW_META.home;
  const snapshot=useMemo(()=>buildSnapshot({row:row||{},form:form||{},profile:profile||{}}),[row,form,profile]);
  const topics=useMemo(()=>buildTopics({view,snapshot}),[view,snapshot]);

  useEffect(()=>{
    setOpen(false);
    setQuery("");
    setMessages([]);
  },[view]);

  useEffect(()=>{
    if(!open || !user?.id || typeof dataClient!=="function") return;
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      try{
        const client=dataClient(user);
        const {data,error}=await client
          .from("wedding_data")
          .select("budget,vendors,guests,checklist_general,checklist_custom,timeline,timeline_aprobacion,salon_layout")
          .eq("user_id",user.id)
          .maybeSingle();
        if(error) throw error;
        if(!cancelled) setRow(data||null);
      }catch(error){
        if(!cancelled) setRow(null);
      }finally{
        if(!cancelled) setLoading(false);
      }
    };
    load();
    return()=>{cancelled=true;};
  },[open,user?.id,view,dataClient]);

  useEffect(()=>{
    if(!open) return;
    const onKey=(event)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",onKey);
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{
      window.removeEventListener("keydown",onKey);
      document.body.style.overflow=previous;
    };
  },[open]);

  const normalizedQuery=normalizeText(query);
  const results=useMemo(()=>{
    if(!normalizedQuery) return [];
    return topics
      .map(topic=>{
        const haystack=normalizeText(`${topic.question} ${topic.keywords||""} ${(topic.answer||[]).join(" ")}`);
        const words=normalizedQuery.split(" ").filter(Boolean);
        const score=words.reduce((total,word)=>total+(haystack.includes(word)?1:0),0);
        return {...topic,score};
      })
      .filter(topic=>topic.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);
  },[normalizedQuery,topics]);

  const openGuide=()=>{
    setOpen(true);
    trackEvent?.("ceci_guide_opened",{module:view,is_demo:isDemo});
  };

  const ask=(topic)=>{
    setMessages(current=>[
      ...current.slice(-3),
      {id:`${topic.id}-${Date.now()}`,question:topic.question,topic}
    ]);
    setQuery("");
    trackEvent?.("ceci_guide_topic_opened",{module:view,topic_id:topic.id,is_demo:isDemo});
  };

  const navigate=(action)=>{
    if(!action?.view) return;
    trackEvent?.("ceci_guide_action_clicked",{module:view,target:action.view,is_demo:isDemo});
    setOpen(false);
    onNavigate?.(action.view);
  };

  const firstName=String(form?.nombre1||"").trim();
  const quickTopics=topics.filter(topic=>!topic.id.startsWith("general-")).slice(0,5);

  return <>
    <button
      type="button"
      className={`ceci-guide-launcher no-print${purchaseVisible?" has-purchase-cta":""}`}
      onClick={openGuide}
      aria-label={`Abrir Ceci te guía en ${meta.eyebrow}`}
    >
      <span className="ceci-guide-launcher-icon"><GuideIcon/></span>
      <span><strong>Ceci te guía</strong><small>Ayuda para esta pantalla</small></span>
    </button>

    {open&&<div className="ceci-guide-overlay no-print" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <aside className="ceci-guide-panel" role="dialog" aria-modal="true" aria-labelledby="ceci-guide-title">
        <header className="ceci-guide-header">
          <div className="ceci-guide-avatar"><GuideIcon/></div>
          <div className="ceci-guide-heading">
            <span>{meta.eyebrow}</span>
            <h2 id="ceci-guide-title">Ceci te guía</h2>
            <p>Wedding planner digital · respuestas preparadas</p>
          </div>
          <button type="button" className="ceci-guide-close" onClick={()=>setOpen(false)} aria-label="Cerrar Ceci te guía"><GuideIcon type="close"/></button>
        </header>

        <div className="ceci-guide-body">
          <div className="ceci-guide-message is-assistant">
            <div className="ceci-guide-bubble">
              <strong>{firstName?`Hola, ${firstName}. `:""}{meta.title}</strong>
              <p>{meta.intro}</p>
              {loading&&<small>Estoy revisando el avance guardado…</small>}
            </div>
          </div>

          {messages.map(message=><div className="ceci-guide-exchange" key={message.id}>
            <div className="ceci-guide-message is-user"><div className="ceci-guide-bubble"><p>{message.question}</p></div></div>
            <div className="ceci-guide-message is-assistant">
              <div className="ceci-guide-bubble">
                {message.topic.title&&<strong>{message.topic.title}</strong>}
                {(message.topic.answer||[]).map((paragraph,index)=><p key={`${message.topic.id}-${index}`}>{paragraph}</p>)}
                {message.topic.action&&<button type="button" className="ceci-guide-inline-action" onClick={()=>navigate(message.topic.action)}>{message.topic.action.label} <GuideIcon type="send"/></button>}
              </div>
            </div>
          </div>)}

          {messages.length===0&&<section className="ceci-guide-quick">
            <span className="ceci-guide-section-label">Preguntas rápidas</span>
            <div className="ceci-guide-quick-list">
              {quickTopics.map(topic=><button type="button" key={topic.id} onClick={()=>ask(topic)}>
                <span>{topic.question}</span><GuideIcon type="send"/>
              </button>)}
            </div>
          </section>}

          {messages.length>0&&<section className="ceci-guide-followup">
            <span className="ceci-guide-section-label">También puede ayudarte</span>
            <div className="ceci-guide-followup-list">
              {quickTopics.filter(topic=>!messages.some(message=>message.topic.id===topic.id)).slice(0,3).map(topic=><button type="button" key={topic.id} onClick={()=>ask(topic)}>{topic.question}</button>)}
            </div>
          </section>}

          <section className="ceci-guide-search">
            <label htmlFor="ceci-guide-search-input">Buscar en la guía</label>
            <div className="ceci-guide-search-box">
              <GuideIcon type="search"/>
              <input
                id="ceci-guide-search-input"
                value={query}
                onChange={event=>setQuery(event.target.value)}
                placeholder={`Ej.: ${view==="vendors"?"contratado o Excel":view==="guests"?"confirmación o mesa":view==="salon-design"?"mesa o circulación":view==="timeline"?"PDF o responsable":view==="guia"?"test o restricciones":view==="results"?"compartir o PDF":view==="guia-novios"?"ceremonia o protocolo":"guardar o prioridad"}`}
                autoComplete="off"
              />
              {query&&<button type="button" onClick={()=>setQuery("")} aria-label="Limpiar búsqueda">×</button>}
            </div>
            {normalizedQuery&&<div className="ceci-guide-search-results">
              {results.length?results.map(topic=><button type="button" key={topic.id} onClick={()=>ask(topic)}>
                <span>{topic.question}</span><GuideIcon type="send"/>
              </button>):<p>No encontré una respuesta preparada con esas palabras. Probá con el nombre de una acción visible en esta pantalla, como “guardar”, “mesa”, “PDF”, “proveedor” o “prioridad”.</p>}
            </div>}
          </section>
        </div>

        <footer className="ceci-guide-footer">
          <span><GuideIcon/> Método de Ceci</span>
          <p>No es un chat abierto: las respuestas fueron preparadas para esta herramienta y no generan costo por consulta.</p>
        </footer>
      </aside>
    </div>}
  </>;
}
