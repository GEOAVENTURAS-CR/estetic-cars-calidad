
/*
 * ESTETIC CARS CR
 * DASHBOARD OPERATIVO V1.4
 * Control mensual y pendientes por etapa
 */

import { supabase } from "./config.js";

const el = id => document.getElementById(id);

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril",
  "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre",
  "Diciembre"
];

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
let etapaSeleccionada = "";
let sedesCargadas = false;

const actual = new Date();

/* CREAR INTERFAZ */

const dashboard = el("dashboard");

const contenidoAnterior = [
  el("resumen"),
  el("btnActualizar")
];

contenidoAnterior.forEach(nodo => {
  if (nodo) nodo.classList.add("hidden");
});

const encabezado = dashboard.querySelector(".muted");
if (encabezado) encabezado.classList.add("hidden");

const interfaz = document.createElement("div");
interfaz.id = "operativoV14";

interfaz.innerHTML = `
  <div class="panel">
    <h3>Periodo de análisis</h3>

    <div class="form-grid">
      <div class="field">
        <label for="dashMes">Mes</label>
        <select id="dashMes"></select>
      </div>

      <div class="field">
        <label for="dashAnio">Año</label>
        <select id="dashAnio"></select>
      </div>

      <div class="field">
        <label for="dashSede">Sede</label>
        <select id="dashSede">
          <option value="">Todas las sedes</option>
        </select>
      </div>
    </div>

    <button id="dashConsultar"
      class="primary" type="button">
      Consultar periodo
    </button>

    <p id="dashMensaje"
      class="feedback" role="status"></p>
  </div>

  <div id="dashResultados" class="hidden">

    <div id="dashTarjetas" class="metrics"></div>

    <div class="panel">
      <h3>Control de etapas operativas</h3>

      <p class="muted">
        Seleccione una etapa para visualizar
        los expedientes correspondientes.
      </p>

      <div id="dashEtapas"></div>
    </div>

    <div class="panel">
      <h3 id="dashTituloListado">
        Detalle de expedientes
      </h3>

      <div class="filters">
        <input id="dashBuscar"
          placeholder="Filtrar por placa o consecutivo">
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
              <th>Etapa operativa</th>
              <th>Fecha de ingreso</th>
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

dashboard.append(interfaz);

/* CARGAR MESES */

MESES.forEach((nombre, indice) => {
  const opcion = new Option(
    nombre,
    String(indice + 1)
  );

  el("dashMes").add(opcion);
});

el("dashMes").value =
  String(actual.getMonth() + 1);

/* CARGAR AÑOS */

for (
  let anio = Math.max(2026, actual.getFullYear());
  anio >= 2026;
  anio--
) {
  el("dashAnio").add(
    new Option(String(anio), String(anio))
  );
}

el("dashAnio").value =
  String(actual.getFullYear());

function informar(texto, error = false) {
  const elemento = el("dashMensaje");

  elemento.textContent = texto;
  elemento.style.color =
    error ? "#b42318" : "#13754d";
}

/* CARGAR SEDES */

async function cargarSedes() {
  if (sedesCargadas) return;

  const { data, error } = await supabase.rpc(
    "obtener_catalogos_calidad"
  );

  if (error) throw error;

  const catalogos = typeof data === "string"
    ? JSON.parse(data)
    : data;

  for (const sede of catalogos?.sedes ?? []) {
    if (sede.activo === false) continue;

    el("dashSede").add(new Option(
      sede.nombre,
      String(sede.id)
    ));
  }

  sedesCargadas = true;
}

/* CONSULTA CENTRAL */

async function consultarDashboard() {
  el("dashConsultar").disabled = true;

  informar("Consultando datos del periodo...");

  try {
    await cargarSedes();

    const { data, error } = await supabase.rpc(
      "dashboard_operativo_mes",
      {
        p_anio: Number(el("dashAnio").value),
        p_mes: Number(el("dashMes").value),
        p_sede_id: el("dashSede").value
          ? Number(el("dashSede").value)
          : null
      }
    );

    if (error) throw error;

    informacion = data;

    el("dashResultados")
      .classList.remove("hidden");

    etapaSeleccionada = "";

    renderizarTarjetas();
    renderizarEtapas();
    renderizarCasos();

    informar(
      "Periodo actualizado correctamente.",
      false
    );

  } catch (error) {
    console.error(error);

    informar(
      "Error al consultar: " + error.message,
      true
    );

  } finally {
    el("dashConsultar").disabled = false;
  }
}

/* TARJETAS DE CONTROL */

function tarjeta(titulo, valor, etapa = "") {
  const boton = document.createElement("button");

  boton.type = "button";
  boton.className = "metric";
  boton.style.textAlign = "left";
  boton.style.cursor = "pointer";

  const etiqueta = document.createElement("span");
  etiqueta.textContent = titulo;

  const cantidad = document.createElement("strong");
  cantidad.textContent = String(valor);

  boton.append(etiqueta, cantidad);

  boton.addEventListener("click", () => {
    etapaSeleccionada = etapa;
    renderizarCasos();

    el("dashTituloListado")
      .scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
  });

  return boton;
}

function cantidadEtapa(nombre) {
  const item = (informacion?.etapas ?? [])
    .find(d => d.etapa === nombre);

  return Number(item?.cantidad ?? 0);
}

function renderizarTarjetas() {
  const contenedor = el("dashTarjetas");
  contenedor.replaceChildren();

  const indicadores = [
    ["Expedientes recibidos",
      informacion?.total ?? 0, ""],
    ["Expedientes activos",
      informacion?.activos ?? 0, "ACTIVOS"],
    ["Pendientes de validación",
      cantidadEtapa("Pendientes de validación"),
      "Pendientes de validación"],
    ["Pendientes de cierre",
      cantidadEtapa("Pendientes de cierre"),
      "Pendientes de cierre"],
    ["Pendientes de corrección",
      cantidadEtapa("Pendientes de corrección"),
      "Pendientes de corrección"],
    ["En evaluación",
      cantidadEtapa("En evaluación"),
      "En evaluación"],
    ["Correcciones en proceso",
      cantidadEtapa("Correcciones en proceso"),
      "Correcciones en proceso"],
    ["Cerrados",
      informacion?.cerrados ?? 0,
      "Cerrados"]
  ];

  indicadores.forEach(item => {
    contenedor.append(
      tarjeta(item[0], item[1], item[2])
    );
  });
}

/* DESGLOSE POR ETAPAS */

function renderizarEtapas() {
  const contenedor = el("dashEtapas");
  contenedor.replaceChildren();

  const total =
    Number(informacion?.activos ?? 0);

  for (const nombre of ETAPAS) {
    const cantidad = cantidadEtapa(nombre);

    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "secondary";
    fila.style.display = "flex";
    fila.style.width = "100%";
    fila.style.justifyContent = "space-between";
    fila.style.marginBottom = "9px";
    fila.style.gap = "12px";

    const etiqueta = document.createElement("span");
    etiqueta.textContent = nombre;

    const valor = document.createElement("strong");
    valor.textContent = String(cantidad);

    fila.append(etiqueta, valor);

    fila.addEventListener("click", () => {
      etapaSeleccionada = nombre;
      renderizarCasos();
    });

    contenedor.append(fila);
  }
}

/* FORMATEAR FECHA */

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const partes = String(fecha)
    .slice(0, 10)
    .split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(fecha);
}

/* MOSTRAR CASOS SEGUN ETAPA */

function renderizarCasos() {
  const tabla = el("dashTabla");
  tabla.replaceChildren();

  let casos = informacion?.casos ?? [];

  if (etapaSeleccionada === "ACTIVOS") {
    casos = casos.filter(c =>
      c.estado !== "Cerrado"
    );

  } else if (etapaSeleccionada) {
    casos = casos.filter(c =>
      c.etapa === etapaSeleccionada
    );
  }

  const buscar = el("dashBuscar")
    .value.trim().toLowerCase();

  if (buscar) {
    casos = casos.filter(c =>
      String(c.placa ?? "")
        .toLowerCase().includes(buscar) ||
      String(c.consecutivo ?? "")
        .toLowerCase().includes(buscar)
    );
  }

  const titulo = etapaSeleccionada === "ACTIVOS"
    ? "Expedientes activos"
    : etapaSeleccionada ||
      "Todos los expedientes del periodo";

  el("dashTituloListado").textContent = titulo;

  for (const caso of casos) {
    const fila = document.createElement("tr");

    const valores = [
      caso.consecutivo,
      caso.placa,
      caso.sede,
      caso.tipo,
      caso.estado,
      caso.etapa,
      formatearFecha(caso.fecha)
    ];

    valores.forEach(valor => {
      const celda = document.createElement("td");
      celda.textContent = String(valor ?? "—");
      fila.append(celda);
    });

    tabla.append(fila);
  }

  el("dashTotalListado").textContent =
    `${casos.length} expedientes encontrados.`;
}

/* EVENTOS */

el("dashConsultar").addEventListener(
  "click",
  consultarDashboard
);

el("dashBuscar").addEventListener(
  "input",
  renderizarCasos
);

document.querySelector(
  '[data-page="dashboard"]'
)?.addEventListener("click", () => {
  consultarDashboard();
});

/* ORDEN DEL MENU */

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
