
/*
 * ESTETIC CARS CR
 * GESTIÓN DE CALIDAD
 * Versión 1.2
 *
 * Módulo principal:
 * - Autenticación
 * - Perfiles
 * - Catálogos
 * - Registro de incidencias
 * - Consulta y filtros
 * - Dashboard preliminar
 */

import {
  supabase,
  CONFIG,
  PERFILES
} from "./config.js";

const $ = id => document.getElementById(id);

let usuario = null;
let perfil = null;
let catalogos = {};
let pagina = 0;

const POR_PAGINA = CONFIG.registrosPorPagina;

const ROLES_REGISTRO = [
  PERFILES.OPERACIONES,
  PERFILES.CALIDAD,
  PERFILES.SAC
];

const ROLES_GERENCIA = [
  PERFILES.OPERACIONES,
  PERFILES.CALIDAD
];

/* ==================================
   FUNCIONES GENERALES
================================== */

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor) {
  if (valor === "" || valor == null) {
    return null;
  }

  const resultado = Number(valor);

  return Number.isFinite(resultado)
    ? resultado
    : null;
}

function informar(id, contenido, correcto = false) {
  const elemento = $(id);

  elemento.textContent = contenido;
  elemento.className =
    "feedback " + (correcto ? "ok" : "fail");
}

function limpiarSesionVisual(mensaje = "") {
  usuario = null;
  perfil = null;

  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");

  $("loginError").textContent = mensaje;
}

function aplicarVisibilidad(selector, visible) {
  const elemento = document.querySelector(selector);

  if (elemento) {
    elemento.classList.toggle("hidden", !visible);
  }
}

/* ==================================
   NAVEGACIÓN
================================== */

function cambiarPagina(nombre) {
  const boton = document.querySelector(
    `[data-page="${nombre}"]`
  );

  if (
    !boton ||
    boton.classList.contains("hidden")
  ) {
    return;
  }

  document.querySelectorAll(".page")
    .forEach(seccion => {
      seccion.classList.add("hidden");
    });

  $(nombre).classList.remove("hidden");

  document.querySelectorAll("[data-page]")
    .forEach(elemento => {
      elemento.classList.toggle(
        "active",
        elemento.dataset.page === nombre
      );
    });

  if (nombre === "casos") {
    consultarCasos();
  }

  if (nombre === "dashboard") {
    cargarDashboard();
  }
}

/* ==================================
   CATÁLOGOS
================================== */

function obtenerLista(nombre) {
  const datos = catalogos?.[nombre];

  return Array.isArray(datos)
    ? datos
    : [];
}

function llenarSelect(
  id,
  elementos,
  titulo,
  seleccionarUnico = false
) {
  const select = $(id);

  select.replaceChildren();

  const inicial = document.createElement("option");

  inicial.value = "";
  inicial.textContent = titulo;

  select.append(inicial);

  for (const elemento of elementos ?? []) {
    if (elemento.activo === false) {
      continue;
    }

    const opcion = document.createElement("option");

    opcion.value = String(elemento.id);
    opcion.textContent =
      elemento.nombre ??
      elemento.descripcion ??
      String(elemento.id);

    select.append(opcion);
  }

  if (
    seleccionarUnico &&
    select.options.length === 2
  ) {
    select.selectedIndex = 1;
  }
}

async function cargarCatalogos() {
  const { data, error } = await supabase.rpc(
    "obtener_catalogos_calidad"
  );

  if (error) {
    throw new Error(
      "No se pudieron cargar los catálogos: " +
      error.message
    );
  }

  catalogos =
    typeof data === "string"
      ? JSON.parse(data)
      : (data ?? {});

  llenarSelect(
    "sede",
    obtenerLista("sedes"),
    "Seleccione una sede",
    true
  );

  llenarSelect(
    "aseguradora",
    obtenerLista("aseguradoras"),
    "Seleccione aseguradora"
  );

  llenarSelect(
    "filtroSede",
    obtenerLista("sedes"),
    "Todas las sedes"
  );
}

/* ==================================
   CLIENTES Y ASEGURADORAS
================================== */

function actualizarTipoCliente() {
  const requiereAseguradora =
    $("tipoCliente").value === "Aseguradora";

  $("campoAseguradora").classList.toggle(
    "hidden",
    !requiereAseguradora
  );

  $("aseguradora").required = requiereAseguradora;

  if (!requiereAseguradora) {
    $("aseguradora").value = "";
  }
}

/* ==================================
   PERFIL DEL USUARIO
================================== */

async function obtenerPerfil(user) {
  const { data, error } = await supabase
    .from("usuarios")
    .select(`
      nombre,
      activo,
      perfiles (
        codigo,
        nombre,
        activo
      )
    `)
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      "No se pudo consultar el perfil autorizado."
    );
  }

  if (
    !data.activo ||
    !data.perfiles ||
    !data.perfiles.activo
  ) {
    throw new Error(
      "La cuenta no dispone de un perfil activo."
    );
  }

  const codigo = data.perfiles.codigo;

  const permitidos = Object.values(PERFILES);

  if (!permitidos.includes(codigo)) {
    throw new Error(
      "El perfil de usuario no está autorizado."
    );
  }

  return {
    nombre: data.nombre,
    codigo,
    puesto: data.perfiles.nombre
  };
}

async function activarSesion(user) {
  const perfilConsultado =
    await obtenerPerfil(user);

  usuario = user;
  perfil = perfilConsultado;

  $("usuarioActual").textContent =
    perfil.nombre + " · " + perfil.puesto;

  $("perfilNombre").textContent =
    perfil.nombre;

  $("perfilCorreo").textContent =
    user.email ?? "";

  $("perfilRol").textContent =
    perfil.puesto;

  const puedeRegistrar =
    ROLES_REGISTRO.includes(perfil.codigo);

  const puedeVerDashboard =
    ROLES_GERENCIA.includes(perfil.codigo);

  aplicarVisibilidad(
    '[data-page="registro"]',
    puedeRegistrar
  );

  aplicarVisibilidad(
    '[data-page="dashboard"]',
    puedeVerDashboard
  );

  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");

  try {
    await cargarCatalogos();
  } catch (error) {
    console.error(error);

    informar(
      "casosMensaje",
      error.message
    );
  }

  cambiarPagina(
    puedeVerDashboard
      ? "dashboard"
      : "casos"
  );
}

/* ==================================
   INICIO DE SESIÓN
================================== */

$("loginForm").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const boton = $("btnLogin");

    boton.disabled = true;
    boton.textContent = "Verificando acceso...";

    $("loginError").textContent = "";

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: texto($("correo").value),
          password: $("clave").value
        });

      if (error) {
        throw error;
      }

      await activarSesion(data.user);

      $("clave").value = "";

    } catch (error) {
      await supabase.auth.signOut();

      limpiarSesionVisual(
        "No fue posible iniciar sesión: " +
        error.message
      );

    } finally {
      boton.disabled = false;
      boton.textContent = "Iniciar sesión";
    }
  }
);

/* ==================================
   CIERRE DE SESIÓN
================================== */

$("btnLogout").addEventListener(
  "click",
  async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      alert(
        "No fue posible cerrar la sesión: " +
        error.message
      );

      return;
    }

    $("clave").value = "";
    limpiarSesionVisual();
  }
);

/* ==================================
   MENÚ DE NAVEGACIÓN
================================== */

document.querySelectorAll("[data-page]")
  .forEach(boton => {
    boton.addEventListener("click", () => {
      if (
        !perfil ||
        boton.classList.contains("hidden")
      ) {
        return;
      }

      cambiarPagina(boton.dataset.page);
    });
  });

$("tipoCliente").addEventListener(
  "change",
  actualizarTipoCliente
);

/* ==================================
   REGISTRO DE INCIDENCIAS
================================== */

$("formIncidencia").addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    if (
      !perfil ||
      !ROLES_REGISTRO.includes(perfil.codigo)
    ) {
      informar(
        "registroMensaje",
        "No tiene autorización para registrar incidencias."
      );

      return;
    }

    const placa = texto($("placa").value)
      .toUpperCase()
      .replace(/\s+/g, "");

    const descripcion =
      texto($("descripcion").value);

    const sedeId =
      numero($("sede").value);

    const tipoCliente =
      $("tipoCliente").value;

    const aseguradoraId =
      numero($("aseguradora").value);

    if (!placa || !descripcion || !sedeId) {
      informar(
        "registroMensaje",
        "Complete todos los campos obligatorios."
      );

      return;
    }

    if (
      tipoCliente === "Aseguradora" &&
      !aseguradoraId
    ) {
      informar(
        "registroMensaje",
        "Debe seleccionar una aseguradora."
      );

      return;
    }

    const anio =
      numero($("anio").value);

    const datos = {
      p_sede_id: sedeId,
      p_placa: placa,
      p_marca: texto($("marca").value) || null,
      p_modelo: texto($("modelo").value) || null,
      p_anio: anio,
      p_tipo_cliente: tipoCliente,
      p_aseguradora_id:
        tipoCliente === "Aseguradora"
          ? aseguradoraId
          : null,
      p_tipo_incidencia: $("tipo").value,
      p_descripcion: descripcion
    };

    const boton = $("btnGuardar");

    boton.disabled = true;
    boton.textContent = "Guardando expediente...";

    informar(
      "registroMensaje",
      "Registrando incidencia..."
    );

    try {
      const { data, error } =
        await supabase.rpc(
          "registrar_incidencia",
          datos
        );

      if (error) {
        throw error;
      }

      if (data == null) {
        throw new Error(
          "La función no devolvió el ID del expediente."
        );
      }

      const idRegistrado = data;

      /* CONSULTAR CONSECUTIVO ASIGNADO */

      const respuesta = await supabase
        .from("incidencias")
        .select("consecutivo")
        .eq("id", idRegistrado)
        .single();

      const consecutivo =
        !respuesta.error
          ? respuesta.data?.consecutivo
          : null;

      $("formIncidencia").reset();

      actualizarTipoCliente();

      informar(
        "registroMensaje",
        consecutivo
          ? "Expediente registrado correctamente: " +
            consecutivo
          : "Expediente registrado. ID: " +
            idRegistrado,
        true
      );

    } catch (error) {
      console.error(error);

      informar(
        "registroMensaje",
        "Error al registrar incidencia: " +
        error.message
      );

    } finally {
      boton.disabled = false;

      boton.textContent =
        "Registrar incidencia";
    }
  }
);

/* ==================================
   CONTROL Y CONSULTA DE CASOS
================================== */

async function consultarCasos() {
  if (!usuario) {
    return;
  }

  $("tablaCasos").replaceChildren();

  informar(
    "casosMensaje",
    "Consultando expedientes..."
  );

  let consulta = supabase
    .from("incidencias")
    .select(
      "id,consecutivo,fecha_recibido," +
      "sede_id,placa,tipo_incidencia," +
      "estado,decision_tecnica",
      { count: "exact" }
    )
    .order("id", {
      ascending: false
    });

  const sede =
    numero($("filtroSede").value);

  const tipo =
    $("filtroTipo").value;

  const buscar =
    texto($("buscar").value);

  if (sede) {
    consulta = consulta.eq(
      "sede_id",
      sede
    );
  }

  if (tipo) {
    consulta = consulta.eq(
      "tipo_incidencia",
      tipo
    );
  }

  if (buscar) {
    const termino = buscar
      .replace(/[%_,()]/g, "")
      .slice(0, 50);

    if (termino) {
      consulta = consulta.or(
        `placa.ilike.%${termino}%,` +
        `consecutivo.ilike.%${termino}%`
      );
    }
  }

  const inicio =
    pagina * POR_PAGINA;

  const fin =
    inicio + POR_PAGINA - 1;

  const { data, error, count } =
    await consulta.range(
      inicio,
      fin
    );

  if (error) {
    informar(
      "casosMensaje",
      "Error consultando expedientes: " +
      error.message
    );

    return;
  }

  const total =
    count ?? 0;

  const paginas =
    Math.max(
      1,
      Math.ceil(total / POR_PAGINA)
    );

  $("paginacion").textContent =
    "Página " + (pagina + 1) +
    " de " + paginas +
    " · " + total + " expedientes";

  $("btnAnterior").disabled =
    pagina === 0;

  $("btnSiguiente").disabled =
    pagina >= paginas - 1;

  const sedes = new Map(
    obtenerLista("sedes").map(
      sede => [
        String(sede.id),
        sede.nombre
      ]
    )
  );

  for (const caso of data ?? []) {
    const fila =
      document.createElement("tr");

    let fecha = "—";

    if (caso.fecha_recibido) {
      const fechaOriginal =
        String(caso.fecha_recibido);

      const soloFecha =
        fechaOriginal.slice(0, 10);

      const partes =
        soloFecha.split("-");

      if (partes.length === 3) {
        fecha =
          partes[2] + "/" +
          partes[1] + "/" +
          partes[0];
      }
    }

    const valores = [
      caso.consecutivo,
      fecha,
      sedes.get(
        String(caso.sede_id)
      ) ?? "—",
      caso.placa,
      caso.tipo_incidencia,
      caso.estado,
      caso.decision_tecnica ?? "Pendiente"
    ];

    for (const valor of valores) {
      const celda =
        document.createElement("td");

      celda.textContent =
        String(valor ?? "—");

      fila.append(celda);
    }

    $("tablaCasos").append(fila);
  }

  informar(
    "casosMensaje",
    total === 0
      ? "No existen expedientes para los filtros seleccionados."
      : "Consulta completada correctamente.",
    true
  );
}

/* ==================================
   FILTROS Y PAGINACIÓN
================================== */

$("btnBuscar").addEventListener(
  "click",
  () => {
    pagina = 0;
    consultarCasos();
  }
);

$("btnAnterior").addEventListener(
  "click",
  () => {
    if (pagina > 0) {
      pagina--;
      consultarCasos();
    }
  }
);

$("btnSiguiente").addEventListener(
  "click",
  () => {
    pagina++;
    consultarCasos();
  }
);

/* ==================================
   DASHBOARD PRELIMINAR
================================== */

async function cargarDashboard() {
  if (
    !perfil ||
    !ROLES_GERENCIA.includes(perfil.codigo)
  ) {
    return;
  }

  const contenedor =
    $("resumen");

  contenedor.textContent =
    "Consultando indicadores...";

  const { data, error } =
    await supabase
      .from("incidencias")
      .select(
        "id,estado,tipo_incidencia"
      )
      .limit(1000);

  if (error) {
    contenedor.textContent =
      "Error al cargar los indicadores: " +
      error.message;

    return;
  }

  const registros =
    data ?? [];

  const indicadores = [
    [
      "Incidencias consultadas",
      registros.length
    ],
    [
      "Reclamos",
      registros.filter(
        r => r.tipo_incidencia === "Reclamo"
      ).length
    ],
    [
      "Garantías",
      registros.filter(
        r => r.tipo_incidencia === "Garantía"
      ).length
    ],
    [
      "Reprocesos",
      registros.filter(
        r => r.tipo_incidencia === "Reproceso"
      ).length
    ]
  ];

  contenedor.replaceChildren();

  for (const [nombre, valor] of indicadores) {
    const tarjeta =
      document.createElement("div");

    tarjeta.className = "metric";

    const etiqueta =
      document.createElement("span");

    etiqueta.textContent = nombre;

    const cifra =
      document.createElement("strong");

    cifra.textContent =
      String(valor);

    tarjeta.append(
      etiqueta,
      cifra
    );

    contenedor.append(tarjeta);
  }

  if (registros.length === 1000) {
    const aviso =
      document.createElement("p");

    aviso.className = "muted";

    aviso.textContent =
      "Vista preliminar limitada a 1.000 registros. " +
      "No utilizar como total gerencial.";

    contenedor.append(aviso);
  }
}

$("btnActualizar").addEventListener(
  "click",
  cargarDashboard
);

/* ==================================
   RECUPERACIÓN DE SESIÓN
================================== */

async function iniciarAplicacion() {
  actualizarTipoCliente();

  try {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data.user) {
      limpiarSesionVisual();
      return;
    }

    await activarSesion(data.user);

  } catch (error) {
    console.error(error);

    await supabase.auth.signOut();

    limpiarSesionVisual(
      "No se pudo restaurar la sesión. " +
      "Ingrese nuevamente."
    );
  }
}

/* INICIALIZACIÓN */

iniciarAplicacion();
