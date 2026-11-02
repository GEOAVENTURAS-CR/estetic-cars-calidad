
/*
 * ESTETIC CARS CR
 * SISTEMA DE GESTIÓN DE CALIDAD
 *
 * Archivo: js/config.js
 * Versión: 1.2
 *
 * Configuración de conexión a Supabase.
 */

import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

/* CONFIGURACIÓN DEL PROYECTO */

const SUPABASE_URL =
  "https://plqtustbwfyyvotfnmmi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_LPboivdqilTgHbeq721G3g_5gelR9A5";

/* CLIENTE DE SUPABASE */

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

/* CONFIGURACIÓN GENERAL */

export const CONFIG = {
  nombreEmpresa: "Estetic Cars CR",
  nombreSistema: "Gestión de Calidad",
  version: "1.2",
  entorno: "PRUEBAS",
  valorHoraReferencia: 15000,
  moneda: "CRC",
  registrosPorPagina: 15
};

/* PERFILES DEL SISTEMA */

export const PERFILES = {
  OPERACIONES: "OPERACIONES",
  CALIDAD: "CALIDAD",
  SAC: "SAC",
  TALLER: "TALLER"
};

/*
 * SEGURIDAD
 *
 * Este archivo contiene exclusivamente
 * una clave pública de Supabase.
 *
 * Nunca colocar aquí:
 * - Secret Key
 * - Service Role Key
 * - Contraseñas
 * - Tokens privados
 *
 * Los permisos de acceso se deben
 * validar en Supabase, no solamente
 * mediante el código del navegador.
 */
