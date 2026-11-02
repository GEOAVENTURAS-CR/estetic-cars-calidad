
/*
 * ESTETIC CARS CR
 * SISTEMA DE GESTIÓN DE CALIDAD
 *
 * Archivo: js/app.js
 * Versión: 1.4.3
 *
 * Funcionalidades:
 * - Autenticación Supabase
 * - Control de perfiles
 * - Gestión de navegación
 * - Registro de incidencias
 * - Consulta de expedientes
 * - Filtros y paginación
 * - Dashboard mensual automático
 * - Integración Gestión Técnica
 */

/* ==========================================
   MÓDULOS DEL SISTEMA
========================================== */

import "./calidad.js";
import "./dashboard.js";

import {
  supabase,
  CONFIG,
  PERFILES
} from "./config.js";

/* ==========================================
   VARIABLES GENERALES
========================================== */

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

/* ==========================================
   FUNCIONES GENERALES
========================================== */

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor) {
  if (valor === "" || valor === null ||
      valor === undefined) {
    return null;
  }

  const resultado = Number(valor);

  return Number.isFinite(resultado)
    ? resultado
    : null;
}

function informar(id, contenido, correcto = false) {
  const elemento = $(id);

  if (!elemento) return;

  elemento.textContent = contenido;

  elemento.className =
    "feedback " + (correcto ? "ok" : "fail");
}

function aplicarVisibilidad(selector, visible) {
  const elemento = document.querySelector(selector);

  if (!elemento) return;

  elemento.classList.toggle("hidden", !visible);
}

function limpiarSesionVisual(mensaje = "") {
  usuario = null;
  perfil = null;

  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");

  $("loginError").textContent = mensaje;
}

/* ==========================================
   ORDEN DEL MENÚ
========================================== */

function ordenarMenu() {
  const menu = document.getElementById("menu");

  if (!menu) return;

  const miPerfil = menu.querySelector(
    '[data-page="perfil"]'
  );

  if (miPerfil) {
    menu.appendChild(miPerfil);
  }
}

/* ==========================================
   NAVEGACIÓN
========================================== */

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

  const seccion = $(nombre);

  if (!seccion) return;

  seccion.classList.remove("hidden");

  document.querySelectorAll("[data-page]")
    .forEach(elemento => {
      elemento.classList.toggle(
        "active",
        elemento.dataset.page === nombre
      );
    });

  if (nombre === "casos") {
    pagina = 0;
    consultarCasos();
  }

  /*
   * IMPORTANTE:
   * El dashboard V1.4 administra sus propias
   * consultas mediante este evento.
   *
   * No llamamos al dashboard antiguo.
   */

  if (nombre === "dashboard") {
    document.dispatchEvent(
      new CustomEvent("ec:dashboard-visible")
    );
  }

  /*
   * Mantener Mi perfil al final.
   */

  ordenarMenu();
}

/* ==========================================
   CATÁLOGOS DE SUPABASE
========================================== */

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

  if (!select) return;

  select.replaceChildren();

  const opcionInicial =
    document.createElement("option");

  opcionInicial.value = "";
  opcionInicial.textContent = titulo;

  select.append(opcionInicial);

  for (const elemento of elementos ?? []) {
    if (elemento.activo === false) {
      continue;
    }

    const opcion =
      document.createElement("option");

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
      "No se pudieron consultar los catálogos: " +
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

/* ==========================================
   CLIENTES Y ASEGURADORAS
========================================== */

function actualizarTipoCliente() {
  const requiereAseguradora =
    $("tipoCliente").value === "Aseguradora";

  $("campoAseguradora").classList.toggle(
    "hidden",
    !requiereAseguradora
  );

  $("aseguradora").required =
    requiereAseguradora;

  if (!requiereAseguradora) {
    $("aseguradora").value = "";
  }
}

/* ==========================================
   CONSULTAR PERFIL DEL USUARIO
========================================== */

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
      "No fue posible consultar el perfil autorizado."
    );
  }

  if (
    !data.activo ||
    !data.perfiles ||
    !data.perfiles.activo
  ) {
    throw new Error(
      "El usuario no tiene un perfil activo."
    );
  }

  const codigo = data.perfiles.codigo;

  if (!Object.values(PERFILES).includes(codigo)) {
    throw new Error(
      "Perfil no autorizado para ingresar."
    );
  }

  return {
    nombre: data.nombre,
    codigo: codigo,
    puesto: data.perfiles.nombre
  };
}

/* ==========================================
   ACTIVAR SESIÓN
========================================== */

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

  /*
   * Ajustar orden del menú antes
   * de mostrar la primera sección.
   */

  ordenarMenu();

  /*
   * OPERACIONES y CALIDAD:
   * Abren directamente en Dashboard.
   *
   * SAC y TALLER:
   * Abren en Control de casos.
   */

  cambiarPagina(
    puedeVerDashboard
      ? "dashboard"
      : "casos"
  );
}

/* ==========================================
   INICIO DE SESIÓN
========================================== */

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

      if (!data.user) {
        throw new Error(
          "Supabase no devolvió un usuario válido."
        );
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

/* ==========================================
   CIERRE DE SESIÓN
========================================== */

$("btnLogout").addEventListener(
  "click",
  async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      alert(
        "No fue posible cerrar sesión: " +
        error.message
      );

      return;
    }

    $("clave").value = "";
    limpiarSesionVisual();
  }
);

/* ==========================================
   EVENTOS DEL MENÚ
========================================== */

/*
 * Se utiliza delegación de eventos
 * para permitir nuevos módulos dinámicos,
 * como Gestión Técnica.
 */

document.getElementById("menu")
  .addEventListener("click", evento => {
    const boton = evento.target.closest(
      "[data-page]"
    );

    if (
      !boton ||
      !perfil ||
      boton.classList.contains("hidden")
    ) {
      return;
    }

    cambiarPagina(boton.dataset.page);
  }
);

/* ==========================================
   ACTUALIZAR TIPO DE CLIENTE
========================================== */

$("tipoCliente").addEventListener(
  "change",
  actualizarTipoCliente
);

/* ==========================================
   REGISTRO DE INCIDENCIAS
========================================== */

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
          "La función no devolvió el identificador."
        );
      }

      const idRegistrado = data;

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

/* ==========================================
   CONSULTA DE EXPEDIENTES
========================================== */

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

  const total = count ?? 0;

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
      ? "No existen expedientes para estos filtros."
      : "Consulta completada correctamente.",
    true
  );
}

/* ==========================================
   FILTROS Y PAGINACIÓN
========================================== */

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

/* ==========================================
   INICIALIZACIÓN
========================================== */

async function iniciarAplicacion() {
  actualizarTipoCliente();
  ordenarMenu();

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

iniciarAplicacion();
