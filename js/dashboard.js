
/*
 * ESTETIC CARS CR
 * GESTION DE CALIDAD
 * DASHBOARD OPERATIVO V1.4.1
 *
 * Periodo mensual automatico
 * Zona horaria Costa Rica
 * Filtro de sedes
 * Indicadores por etapa
 * Consulta de expedientes
 */

import { supabase } from "./config.js";

const $d = id => document.getElementById(id);

const ETAPAS = [
  "Pendientes de revisión",
  "En evaluación",
  "Pendientes de corrección",
  "Correcciones en proceso",
  "Pendientes de validación",
  "Pendientes de cierre",
  "Requieren revisión de estado",
  "Cerrados"
];

let informacion = null;
let etapaActual = "";
let sedesCargadas = false;
let consultaEnCurso = 0;

/* FECHA ACTUAL EN COSTA RICA */

function mesCostaRica() {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "2-digit"
    }
  ).formatToParts(new Date());

  const anio = partes.find(
    p => p.type === "year"
  ).value;

  const mes = partes.find(
    p => p.type === "month"
  ).value;

  return `${anio}-${mes}`;
}

function fechaVisible(valor) {
  if (!valor) return "—";

  const partes = String(valor)
    .slice(0, 10)
    .split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(valor);
}

function tituloMes(periodo) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return "Periodo no válido";
  }

  const [anio, mes] = periodo.split("-").map(Number);

  return new Intl.DateTimeFormat(
    "es-CR",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }
  ).format(new Date(Date.UTC(anio, mes - 1, 1)));
}

function informar(mensaje, error = false) {
  const elemento = $d("dashMensaje");

  elemento.textContent = mensaje;
  elemento.style.color =
    error ? "#b42318" : "#13754d";
}

/* ESTRUCTURA VISUAL */

const seccionDashboard = $d("dashboard");

$d("resumen")?.classList.add("hidden");
$d("btnActualizar")?.classList.add("hidden");

seccionDashboard
  .querySelector(".muted")
  ?.classList.add("hidden");

const interfaz = document.createElement("div");
interfaz.id = "dashboardOperativo";

interfaz.innerHTML = `
  <div class="panel">

    <h3>Periodo de análisis</h3>

    <div class="form-grid"
      style="grid-template-columns:
             repeat(auto-fit,minmax(190px,1fr))">

      <div class="field">
        <label for="dashPeriodo">
          Seleccionar mes y año
        </label>

        <input
          id="dashPeriodo"
          type="month"
          required>
      </div>

      <div class="field">
        <label for="dashSede">
          Sede
        </label>

        <select id="dashSede">
          <option value="">
            Todas las sedes
          </option>
        </select>
      </div>

    </div>

    <div class="actions">
      <button
        id="dashMesActual"
        class="secondary"
        type="button">
        Volver al mes actual
      </button>
    </div>

    <p id="dashMensaje"
      class="feedback"
      role="status"></p>
  </div>

  <div id="dashResultados" class="hidden">

    <div class="panel">
      <h3 id="dashPeriodoTitulo">
        Resumen mensual
      </h3>
      <p class="muted">
        Expedientes recibidos en el mes
        seleccionado y su estado actual.
      </p>
      <div id="dashTarjetas" class="metrics"></div>
    </div>

    <div class="panel">
      <h3>Expedientes por etapa</h3>
      <p class="muted">
        Seleccione una etapa para consultar
        sus expedientes.
      </p>
      <div id="dashEtapas"></div>
    </div>

    <div class="panel" id="dashListadoPanel">

      <h3 id="dashTituloListado">
        Detalle de expedientes
      </h3>

      <div class="filters">
        <input
          id="dashBuscar"
          placeholder="Buscar por placa o consecutivo">
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Consecutivo</th>
              <th>Placa</th>
              <th>Sede</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Etapa</th>
              <th>Fecha recibida</th>
            </tr>
          </thead>

          <tbody id="dashTabla"></tbody>
        </table>
      </div>

      <p id="dashTotalListado"
        class="muted"></p>

    </div>

  </div>
`;

seccionDashboard.append(interfaz);

$d("dashPeriodo").value = mesCostaRica();

/* CATALOGOS */

async function cargarSedes() {
  if (sedesCargadas) return;

  const { data, error } = await supabase.rpc(
    "obtener_catalogos_calidad"
  );

  if (error) throw error;

  const catalogos = typeof data === "string"
    ? JSON.parse(data)
    : data ?? {};

  const select = $d("dashSede");

  for (const sede of catalogos.sedes ?? []) {
    if (sede.activo === false) continue;

    select.add(
      new Option(sede.nombre, String(sede.id))
    );
  }

  sedesCargadas = true;
}

/* INDICADORES */

function cantidadEtapa(nombre) {
  return Number(
    informacion?.etapas?.find(
      e => e.etapa === nombre
    )?.cantidad ?? 0
  );
}

function crearTarjeta(titulo, cantidad, filtro) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "metric";
  boton.style.textAlign = "left";
  boton.style.cursor = "pointer";

  const etiqueta = document.createElement("span");
  etiqueta.textContent = titulo;

  const valor = document.createElement("strong");
  valor.textContent = String(cantidad);

  boton.append(etiqueta, valor);

  boton.addEventListener("click", () => {
    etapaActual = filtro;
    renderizarCasos();

    $d("dashListadoPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  return boton;
}

function renderizarTarjetas() {
  const panel = $d("dashTarjetas");
  panel.replaceChildren();

  const tarjetas = [
    [
      "Expedientes recibidos",
      informacion?.total ?? 0,
      ""
    ],
    [
      "Expedientes activos",
      informacion?.activos ?? 0,
      "ACTIVOS"
    ],
    [
      "Pendientes de revisión",
      cantidadEtapa("Pendientes de revisión"),
      "Pendientes de revisión"
    ],
    [
      "Pendientes de corrección",
      cantidadEtapa("Pendientes de corrección"),
      "Pendientes de corrección"
    ],
    [
      "En proceso",
      cantidadEtapa("Correcciones en proceso"),
      "Correcciones en proceso"
    ],
    [
      "Pendientes de validación",
      cantidadEtapa("Pendientes de validación"),
      "Pendientes de validación"
    ],
    [
      "Pendientes de cierre",
      cantidadEtapa("Pendientes de cierre"),
      "Pendientes de cierre"
    ],
    [
      "Cerrados",
      informacion?.cerrados ?? 0,
      "Cerrados"
    ]
  ];

  for (const [titulo, cantidad, filtro] of tarjetas) {
    panel.append(
      crearTarjeta(titulo, cantidad, filtro)
    );
  }
}

/* DISTRIBUCION POR ETAPAS */

function renderizarEtapas() {
  const panel = $d("dashEtapas");
  panel.replaceChildren();

  for (const etapa of ETAPAS) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "secondary";

    boton.style.display = "flex";
    boton.style.width = "100%";
    boton.style.justifyContent = "space-between";
    boton.style.gap = "12px";
    boton.style.marginBottom = "8px";

    const nombre = document.createElement("span");
    nombre.textContent = etapa;

    const cantidad = document.createElement("strong");
    cantidad.textContent = String(cantidadEtapa(etapa));

    boton.append(nombre, cantidad);

    boton.addEventListener("click", () => {
      etapaActual = etapa;
      renderizarCasos();

      $d("dashListadoPanel").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    panel.append(boton);
  }
}

/* DETALLE DE CASOS */

function renderizarCasos() {
  const tabla = $d("dashTabla");
  tabla.replaceChildren();

  let casos = informacion?.casos ?? [];

  if (etapaActual === "ACTIVOS") {
    casos = casos.filter(
      c => c.estado !== "Cerrado"
    );

  } else if (etapaActual) {
    casos = casos.filter(
      c => c.etapa === etapaActual
    );
  }

  const buscar = $d("dashBuscar")
    .value.trim().toLowerCase();

  if (buscar) {
    casos = casos.filter(c =>
      String(c.placa ?? "")
        .toLowerCase().includes(buscar) ||
      String(c.consecutivo ?? "")
        .toLowerCase().includes(buscar)
    );
  }

  const titulo =
    etapaActual === "ACTIVOS"
      ? "Expedientes activos"
      : etapaActual || "Todos los expedientes del mes";

  $d("dashTituloListado").textContent = titulo;

  for (const caso of casos) {
    const fila = document.createElement("tr");

    const datos = [
      caso.consecutivo,
      caso.placa,
      caso.sede,
      caso.tipo,
      caso.estado,
      caso.etapa,
      fechaVisible(caso.fecha)
    ];

    for (const dato of datos) {
      const celda = document.createElement("td");
      celda.textContent = String(dato ?? "—");
      fila.append(celda);
    }

    tabla.append(fila);
  }

  $d("dashTotalListado").textContent =
    `${casos.length} expedientes encontrados`;
}

/* CONSULTA A SUPABASE */

async function consultarDashboard() {
  const periodo = $d("dashPeriodo").value;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    informar("Seleccione un mes válido.", true);
    return;
  }

  const [anio, mes] =
    periodo.split("-").map(Number);

  const secuencia = ++consultaEnCurso;

  informar("Consultando información del periodo...");

  try {
    await cargarSedes();

    const { data, error } = await supabase.rpc(
      "dashboard_operativo_mes",
      {
        p_anio: anio,
        p_mes: mes,
        p_sede_id: $d("dashSede").value
          ? Number($d("dashSede").value)
          : null
      }
    );

    if (secuencia !== consultaEnCurso) return;

    if (error) throw error;

    informacion = data;
    etapaActual = "";

    $d("dashBuscar").value = "";
    $d("dashResultados")
      .classList.remove("hidden");

    const nombre = tituloMes(periodo);

    $d("dashPeriodoTitulo").textContent =
      "Resumen: " +
      nombre.charAt(0).toUpperCase() +
      nombre.slice(1);

    renderizarTarjetas();
    renderizarEtapas();
    renderizarCasos();

    informar("Indicadores actualizados.", false);

  } catch (error) {
    if (secuencia !== consultaEnCurso) return;

    console.error(error);
    informacion = null;

    $d("dashResultados").classList.add("hidden");

    informar(
      "No se pudieron consultar los indicadores: " +
      error.message,
      true
    );
  }
}

/* EVENTOS */

$d("dashPeriodo").addEventListener(
  "change",
  consultarDashboard
);

$d("dashSede").addEventListener(
  "change",
  consultarDashboard
);

$d("dashMesActual").addEventListener(
  "click",
  () => {
    $d("dashPeriodo").value = mesCostaRica();
    consultarDashboard();
  }
);

$d("dashBuscar").addEventListener(
  "input",
  renderizarCasos
);

document.addEventListener(
  "ec:dashboard-visible",
  () => {
    // Al ingresar se carga el mes actual.
    // Si el usuario cambia de sección y regresa,
    // conserva el periodo seleccionado.
    consultarDashboard();
  }
);

/* MI PERFIL SIEMPRE AL FINAL */

function ordenarMenu() {
  const menu = document.getElementById("menu");
  const perfil = menu?.querySelector(
    '[data-page="perfil"]'
  );

  if (menu && perfil) {
    menu.append(perfil);
  }
}

ordenarMenu();
