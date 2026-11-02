
/*
 * ESTETIC CARS CR
 * GESTION DE CALIDAD - VERSION 1.3
 *
 * Evaluacion, causas raiz, correcciones,
 * validacion de Operaciones y cierre.
 */

import { supabase } from "./config.js";

const ROLES_TECNICOS = ["CALIDAD", "OPERACIONES"];

let casoActual = null;
let rolActual = null;
let causas = [];

const $c = id => document.getElementById(id);

function seguro(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor) {
  return valor === "" || valor == null
    ? null
    : Number(valor);
}

function aviso(mensaje, error = false) {
  const el = $c("gestionMensaje");
  el.textContent = mensaje;
  el.style.color = error ? "#ae2424" : "#147a52";
}

function puedeGestionar() {
  return ROLES_TECNICOS.includes(rolActual);
}

function fecha(valor) {
  if (!valor) return "—";

  const d = new Date(valor);

  return Number.isNaN(d.getTime())
    ? String(valor)
    : d.toLocaleString("es-CR");
}

/* INTEGRACION VISUAL */

const menu = document.getElementById("menu");
const contenedor = document.querySelector(".content");

const botonGestion = document.createElement("button");
botonGestion.dataset.page = "gestion";
botonGestion.textContent = "Gestión técnica";
menu.append(botonGestion);

const seccion = document.createElement("section");
seccion.id = "gestion";
seccion.className = "page hidden";

seccion.innerHTML = `
  <h1>Gestión técnica de Calidad</h1>

  <p class="muted">
    Evaluación, causa raíz, acciones correctivas,
    validaciones y cierre de expedientes.
  </p>

  <div class="panel">
    <h3>Seleccionar expediente</h3>

    <div class="form-grid">
      <div class="field">
        <label for="gestionCaso">
          Expediente
        </label>
        <select id="gestionCaso"></select>
      </div>
    </div>

    <button id="gestionConsultar"
      class="secondary" type="button">
      Consultar expediente
    </button>

    <p id="gestionMensaje"
      class="feedback" role="status"></p>
  </div>

  <div id="gestionDetalle" class="hidden">

    <div class="panel">
      <h3>Información del expediente</h3>
      <div id="gestionResumen"></div>
    </div>

    <div id="panelRevision" class="panel hidden">
      <h3>1. Iniciar revisión</h3>
      <p class="muted">
        Registra formalmente el inicio de la revisión
        por parte de Calidad.
      </p>
      <button id="btnIniciarRevision"
        class="primary" type="button">
        Iniciar revisión
      </button>
    </div>

    <div id="panelEvaluacion" class="panel hidden">
      <h3>2. Evaluación técnica</h3>

      <form id="formEvaluacion">

        <div class="form-grid">

          <div class="field">
            <label for="gestionDecision">
              Decisión técnica
            </label>
            <select id="gestionDecision" required>
              <option value="">Seleccione</option>
              <option value="Aceptado">
                Aceptado
              </option>
              <option value="Parcialmente aceptado">
                Parcialmente aceptado
              </option>
              <option value="No aceptado">
                No aceptado
              </option>
            </select>
          </div>

          <div class="field">
            <label for="gestionCausa">
              Causa raíz
            </label>
            <select id="gestionCausa" required></select>
          </div>

          <div class="field">
            <label for="gestionArea">
              Área responsable
            </label>
            <input id="gestionArea" required>
          </div>

          <div class="field">
            <label for="gestionTecnico">
              Técnico responsable
            </label>
            <input id="gestionTecnico" required>
          </div>

        </div>

        <div class="field">
          <label for="gestionJustificacion">
            Justificación de la decisión
          </label>
          <textarea id="gestionJustificacion"
            rows="3" required></textarea>
        </div>

        <div class="field">
          <label for="gestionAnalisis">
            Análisis de causa raíz
          </label>
          <textarea id="gestionAnalisis"
            rows="4" required></textarea>
        </div>

        <button class="primary" type="submit">
          Guardar evaluación
        </button>

      </form>
    </div>

    <div id="panelCorrecciones" class="panel hidden">
      <h3>3. Acciones correctivas</h3>

      <p class="muted">
        Todas las horas registradas deben corresponder
        a trabajos efectivamente ejecutados.
      </p>

      <div id="listaCorrecciones"></div>

      <form id="formCorreccion">
        <h3>Agregar acción correctiva</h3>

        <div class="field">
          <label for="correccionDescripcion">
            Trabajo por ejecutar
          </label>
          <textarea id="correccionDescripcion"
            rows="3" required></textarea>
        </div>

        <div class="form-grid">

          <div class="field">
            <label for="correccionArea">
              Área
            </label>
            <input id="correccionArea" required>
          </div>

          <div class="field">
            <label for="correccionTecnico">
              Técnico ejecutor
            </label>
            <input id="correccionTecnico" required>
          </div>

        </div>

        <div class="field">
          <label for="correccionNotas">
            Observaciones
          </label>
          <textarea id="correccionNotas"
            rows="2"></textarea>
        </div>

        <button class="primary" type="submit">
          Registrar acción correctiva
        </button>
      </form>

      <form id="formFinalizacion"
        style="margin-top:28px">

        <h3>Finalizar acción correctiva</h3>

        <div class="form-grid">

          <div class="field">
            <label for="accionPendiente">
              Acción pendiente
            </label>
            <select id="accionPendiente" required>
            </select>
          </div>

          <div class="field">
            <label for="accionHoras">
              Horas utilizadas
            </label>
            <input id="accionHoras"
              type="number" min="0"
              step="0.25" required>
          </div>

        </div>

        <div class="field">
          <label for="accionObservaciones">
            Resultado de la corrección
          </label>
          <textarea id="accionObservaciones"
            rows="3" required></textarea>
        </div>

        <button class="primary" type="submit">
          Finalizar corrección
        </button>
      </form>
    </div>

    <div id="panelValidacion" class="panel hidden">
      <h3>4. Validación de Operaciones</h3>

      <p class="muted">
        Exclusiva para reclamos aceptados o
        parcialmente aceptados, una vez solucionados.
      </p>

      <form id="formValidacion">

        <div class="field">
          <label for="validacionResultado">
            Resultado
          </label>
          <select id="validacionResultado" required>
            <option value="">Seleccione</option>
            <option value="Conforme">Conforme</option>
            <option value="No conforme">No conforme</option>
          </select>
        </div>

        <div class="field">
          <label for="validacionObservaciones">
            Observaciones
          </label>
          <textarea id="validacionObservaciones"
            rows="3" required></textarea>
        </div>

        <button class="primary" type="submit">
          Registrar validación
        </button>
      </form>
    </div>

    <div id="panelCierre" class="panel hidden">
      <h3>5. Cierre del expediente</h3>

      <form id="formCierre">
        <div class="field">
          <label for="cierreObservaciones">
            Conclusión y observaciones de cierre
          </label>
          <textarea id="cierreObservaciones"
            rows="3" required></textarea>
        </div>

        <button class="primary" type="submit">
          Cerrar expediente
        </button>
      </form>
    </div>

    <div class="panel">
      <h3>Historial y trazabilidad</h3>
      <div id="gestionHistorial"></div>
    </div>

  </div>
`;

contenedor.append(seccion);

/* AUTENTICACION Y CATALOGOS */

async function consultarRol() {
  const { data: sesion, error: authError } =
    await supabase.auth.getUser();

  if (authError || !sesion.user) {
    throw new Error("Debe iniciar sesión.");
  }

  const { data, error } =
    await supabase.rpc("mi_perfil");

  if (error || !data) {
    throw new Error(
      "No se pudo comprobar el perfil autorizado."
    );
  }

  rolActual = data;
}

async function cargarCausas() {
  const { data, error } =
    await supabase.rpc("obtener_catalogos_calidad");

  if (error) throw error;

  const catalogos = typeof data === "string"
    ? JSON.parse(data)
    : (data ?? {});

  causas =
    catalogos.causas_raiz ??
    catalogos.causas ??
    [];

  const select = $c("gestionCausa");
  select.replaceChildren();

  const inicial = new Option(
    "Seleccione una causa", ""
  );
  select.add(inicial);

  for (const causa of causas) {
    if (causa.activo === false) continue;

    select.add(new Option(
      causa.nombre ??
      causa.descripcion ??
      String(causa.id),
      String(causa.id)
    ));
  }
}

/* SELECCIONAR CASOS */

async function cargarCasos() {
  const { data, error } = await supabase
    .from("incidencias")
    .select(
      "id,consecutivo,placa,estado,tipo_incidencia"
    )
    .order("id", { ascending:false })
    .limit(200);

  if (error) throw error;

  const select = $c("gestionCaso");
  const anterior = select.value;

  select.replaceChildren();
  select.add(new Option(
    "Seleccione expediente", ""
  ));

  for (const caso of data ?? []) {
    const titulo =
      `${caso.consecutivo} | ${caso.placa} | ` +
      `${caso.estado}`;

    select.add(new Option(titulo, String(caso.id)));
  }

  if ([...select.options].some(
    o => o.value === anterior
  )) {
    select.value = anterior;
  }
}

/* CONSULTAR EXPEDIENTE DETALLADO */

async function cargarDetalle() {
  const id = numero($c("gestionCaso").value);

  if (!id) {
    aviso("Seleccione un expediente.", true);
    return;
  }

  const { data, error } = await supabase.rpc(
    "detalle_calidad",
    { p_incidencia_id:id }
  );

  if (error) throw error;

  casoActual = data;

  const i = data.incidencia;
  const acciones = data.acciones ?? [];
  const validaciones = data.validaciones ?? [];
  const historial = data.historial ?? [];

  $c("gestionDetalle").classList.remove("hidden");

  $c("gestionResumen").innerHTML = `
    <p><b>Consecutivo:</b>
      ${seguro(i.consecutivo)}</p>
    <p><b>Placa:</b>
      ${seguro(i.placa)}</p>
    <p><b>Clasificación:</b>
      ${seguro(i.tipo_incidencia)}</p>
    <p><b>Estado:</b>
      ${seguro(i.estado)}</p>
    <p><b>Decisión:</b>
      ${seguro(i.decision_tecnica || "Pendiente")}</p>
    <p><b>Justificación:</b>
      ${seguro(i.justificacion_tecnica || "Pendiente")}</p>
    <p><b>Análisis de causa raíz:</b>
      ${seguro(i.analisis_causa_raiz || "Pendiente")}</p>
    <p><b>Horas registradas:</b>
      ${acciones.reduce(
        (sum, a) =>
          sum + Number(a.horas_utilizadas || 0), 0
      ).toFixed(2)}</p>
    <p><b>Validaciones de Operaciones:</b>
      ${validaciones.length}</p>
  `;

  const gestion = puedeGestionar();
  const cerrado = i.estado === "Cerrado";

  const requiereCorreccion = [
    "Aceptado",
    "Parcialmente aceptado"
  ].includes(i.decision_tecnica);

  const necesitaValidacion =
    i.tipo_incidencia === "Reclamo" &&
    requiereCorreccion &&
    i.estado === "Solucionado";

  const pendienteRevision =
    i.estado === "Registrado";

  $c("panelRevision").classList.toggle(
    "hidden",
    !gestion || !pendienteRevision
  );

  $c("panelEvaluacion").classList.toggle(
    "hidden",
    !gestion || cerrado
  );

  $c("panelCorrecciones").classList.toggle(
    "hidden",
    !gestion || cerrado || !requiereCorreccion
  );

  $c("panelValidacion").classList.toggle(
    "hidden",
    rolActual !== "OPERACIONES" ||
    !necesitaValidacion
  );

  $c("panelCierre").classList.toggle(
    "hidden",
    !gestion || cerrado ||
    !i.decision_tecnica
  );

  mostrarCorrecciones(acciones);
  mostrarHistorial(historial);

  aviso("Expediente consultado correctamente.");
}

function mostrarCorrecciones(acciones) {
  const lista = $c("listaCorrecciones");
  const select = $c("accionPendiente");

  lista.replaceChildren();
  select.replaceChildren();

  select.add(new Option(
    "Seleccione acción pendiente", ""
  ));

  if (!acciones.length) {
    lista.textContent =
      "Todavía no existen acciones correctivas.";
  }

  for (const accion of acciones) {
    const registro = document.createElement("p");

    registro.textContent =
      `#${accion.id} — ${accion.descripcion} | ` +
      `${accion.estado} | ` +
      `${accion.horas_utilizadas ?? 0} horas`;

    lista.append(registro);

    if (
      accion.estado !== "Finalizada" &&
      accion.estado !== "Cancelada"
    ) {
      select.add(new Option(
        `#${accion.id} — ${accion.descripcion}`,
        String(accion.id)
      ));
    }
  }

  $c("formFinalizacion").classList.toggle(
    "hidden",
    select.options.length <= 1
  );
}

function mostrarHistorial(historial) {
  const contenedor = $c("gestionHistorial");
  contenedor.replaceChildren();

  if (!historial.length) {
    contenedor.textContent =
      "Sin movimientos registrados.";
    return;
  }

  for (const movimiento of historial) {
    const p = document.createElement("p");

    p.style.borderBottom = "1px solid #e3e9ef";
    p.style.padding = "10px 0";

    const tipo =
      movimiento.tipo_evento ??
      movimiento.accion ??
      "Movimiento";

    const momento =
      movimiento.creado_en ??
      movimiento.fecha ??
      movimiento.fecha_evento;

    p.textContent =
      `${fecha(momento)} — ${tipo}`;

    contenedor.append(p);
  }
}

/* EJECUCION CONTROLADA DE FUNCIONES */

async function ejecutar(funcion, parametros) {
  if (!casoActual) {
    aviso("Seleccione un expediente.", true);
    return;
  }

  const controles = $c("gestionDetalle")
    .querySelectorAll("button");

  controles.forEach(b => b.disabled = true);

  aviso("Procesando operación...");

  try {
    const { data, error } = await supabase.rpc(
      funcion,
      parametros
    );

    if (error) throw error;

    await cargarDetalle();
    await cargarCasos();

    aviso("Operación completada correctamente.");

    return data;

  } catch (error) {
    console.error(error);
    aviso(
      "Operación rechazada: " + error.message,
      true
    );
    return null;

  } finally {
    controles.forEach(b => b.disabled = false);
  }
}

/* 1. REVISION */

$c("btnIniciarRevision").addEventListener(
  "click",
  async () => {
    await ejecutar(
      "iniciar_revision_calidad",
      {
        p_incidencia_id:
          casoActual.incidencia.id
      }
    );
  }
);

/* 2. EVALUACION */

$c("formEvaluacion").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const i = casoActual.incidencia;

    await ejecutar("evaluar_incidencia", {
      p_incidencia_id: i.id,
      p_decision: $c("gestionDecision").value,
      p_justificacion:
        texto($c("gestionJustificacion").value),
      p_causa_raiz_id:
        numero($c("gestionCausa").value),
      p_analisis:
        texto($c("gestionAnalisis").value),
      p_area: texto($c("gestionArea").value),
      p_tecnico: texto($c("gestionTecnico").value)
    });
  }
);

/* 3. REGISTRAR CORRECCION */

$c("formCorreccion").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const resultado = await ejecutar(
      "registrar_correccion",
      {
        p_incidencia_id:
          casoActual.incidencia.id,
        p_descripcion:
          texto($c("correccionDescripcion").value),
        p_area:
          texto($c("correccionArea").value),
        p_tecnico:
          texto($c("correccionTecnico").value),
        p_observaciones:
          texto($c("correccionNotas").value)
      }
    );

    if (resultado !== null) {
      e.target.reset();
    }
  }
);

/* 4. FINALIZAR CORRECCION */

$c("formFinalizacion").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const horas =
      numero($c("accionHoras").value);

    if (
      !Number.isFinite(horas) ||
      horas < 0
    ) {
      aviso("Ingrese horas válidas.", true);
      return;
    }

    const idAccion =
      numero($c("accionPendiente").value);

    await ejecutar("finalizar_correccion", {
      p_accion_id: idAccion,
      p_horas: horas,
      p_observaciones:
        texto($c("accionObservaciones").value)
    });
  }
);

/* 5. VALIDACION DE OPERACIONES */

$c("formValidacion").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    if (rolActual !== "OPERACIONES") {
      aviso("Operación no autorizada.", true);
      return;
    }

    await ejecutar("validar_operaciones", {
      p_incidencia_id:
        casoActual.incidencia.id,
      p_resultado:
        $c("validacionResultado").value,
      p_observaciones:
        texto($c("validacionObservaciones").value)
    });
  }
);

/* 6. CIERRE */

$c("formCierre").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const confirmado = window.confirm(
      "¿Confirma el cierre del expediente? " +
      "Esta acción quedará registrada."
    );

    if (!confirmado) return;

    await ejecutar("cerrar_incidencia", {
      p_incidencia_id:
        casoActual.incidencia.id,
      p_observaciones:
        texto($c("cierreObservaciones").value)
    });
  }
);

/* APERTURA DEL MODULO */

botonGestion.addEventListener(
  "click",
  async () => {

    aviso("Cargando gestión técnica...");

    try {
      await consultarRol();
      await cargarCausas();
      await cargarCasos();

      aviso("Seleccione el expediente.");

    } catch (error) {
      console.error(error);
      aviso(error.message, true);
    }
  }
);

$c("gestionConsultar").addEventListener(
  "click",
  async () => {
    try {
      await cargarDetalle();
    } catch (error) {
      console.error(error);
      aviso(error.message, true);
    }
  }
);
