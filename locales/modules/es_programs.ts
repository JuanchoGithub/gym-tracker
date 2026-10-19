
export const es_programs = {
  // Shell / hub
  programs_title: "Programas de Calistenia",
  programs_section_active: "Activos",
  programs_section_start: "Empezar un programa",
  programs_section_past: "Pasados",
  programs_unknown: "Programa desconocido",
  programs_back: "Volver",
  programs_back_to_hub: "Volver al inicio",
  programs_not_found: "No encontrado.",

  // Plan editor
  programs_plan_title: "Mi plan",
  programs_plan_sub: "Los programas van uno detrás del otro, en orden",
  programs_plan_empty: "Vacío — agregá tus programas activos abajo para armar un solo entrenamiento continuo.",
  programs_plan_none_active: "Los programas del plan no están activos ahora (en pausa, completados o cancelados).",
  programs_plan_add: "+ {name}",
  programs_plan_start_many: "Iniciar plan ({count} programas)",
  programs_paused: "en pausa",
  programs_move_up: "Subir",
  programs_move_down: "Bajar",
  programs_remove_plan: "Quitar del plan",
  programs_col_n: "col {column}",

  // Active row
  programs_last: "Último: {summary}",
  programs_paused_14: "14+ días en pausa — hacé el retest para continuar o abandoná.",
  programs_retest_ph_reps: "Reps del retest",
  programs_retest_ph_seconds: "Segundos del retest",
  programs_retest_continue: "Retest y continuar",
  programs_drop: "Abandonar",
  programs_cancel: "Cancelar",
  programs_cancel_confirm: "¿Cancelar este programa? El historial se conserva.",
  programs_show_recent: "Mostrar en Recientes",
  programs_settings: "Ajustes",
  programs_target: "Objetivo",
  programs_days_wk: "Días/sem",
  programs_past_view: "Ver",
  programs_past_row: "{id} · {status} · objetivo {target}",

  // Program cards
  programs_card_meta: "Objetivo {target} {unit} · {days} días/sem por defecto",
  programs_take_test: "Hacer test y empezar",
  programs_retest_to_continue: "Retest para continuar",
  programs_continue: "Continuar",
  programs_unit_reps: "reps",
  programs_unit_seconds: "segundos",

  // Statuses
  programs_status_active: "activo",
  programs_status_needs_retest: "en pausa",
  programs_status_done: "completado",
  programs_status_cancelled: "cancelado",
  programs_status_dropped: "abandonado",

  // Initial test view
  programs_test_title: "Test inicial — {name}",
  programs_test_desc: "{cue} Hacé una serie al máximo con buena forma, descansado. Anotá el resultado.",
  programs_test_max_reps: "Reps máximas",
  programs_test_max_seconds: "Aguante máximo (segundos)",
  programs_test_ph_reps: "ej. 12",
  programs_test_ph_seconds: "ej. 45",
  programs_test_target: "Objetivo ({unit})",
  programs_test_days: "Días / semana",
  programs_test_start: "Empezar según mi test",
  programs_test_retest: "Retest y ubicarme",

  // Player
  programs_session_n: "Sesión {n}",
  programs_plan_button: "Plan",
  programs_rest_sets: "Descanso de {rest}s entre series. La última es al máximo (≥ {min}).",
  programs_rest_holds: "Descanso de {rest}s entre aguantes. La última es al máximo (≥ {min}s).",
  programs_goal: "Meta",
  programs_set_n: "Serie {n}",
  programs_rest_button: "Descanso",
  programs_time_it: "Cronometrar",
  programs_pause: "Pausar",
  programs_resume: "Reanudar",
  programs_on_target: "En objetivo — vas a avanzar.",
  programs_below_target: "Debajo del objetivo — repetís este día (canon).",
  programs_finish_day: "Terminar día",
  programs_finish_exercise: "Terminar ejercicio",
  programs_exit_no_save: "Salir sin guardar",
  programs_exit_confirm: "Los programas completados ya registraron su día. ¿Salir ahora? (La entrada combinada del historial no se guardará.)",
  programs_skip_notice: "Programa no disponible (en pausa, completado o eliminado). Pasando al siguiente.",
  programs_next_program: "Siguiente programa",
  programs_status_is: "{name} está {status} — se salta en esta tanda.",
  programs_retest_hint: "Hacé el retest desde el inicio para retomarlo.",
  programs_plan_complete: "Plan completo. Buen trabajo.",

  // Detail / grid
  programs_detail_meta: "{id} · col {column} · objetivo {target} {unit}",
  programs_detail_stats: "Semanas totales {weeks} · {logged} días registrados · {status}",
  programs_week_n: "Semana {n}",
  programs_detail_min: "(≥{min})",
  programs_no_sessions: "No hay sesiones registradas.",
  programs_pass: "pasa",
  programs_repeat: "repetir",

  // Train-page cards
  programs_card_plan_label: "Mi plan — continuo",
  programs_card_plan_sub_one: "1 programa va en orden",
  programs_card_plan_sub_many: "{count} programas van en orden, uno detrás del otro",
  programs_card_start_plan: "Iniciar plan",
  programs_card_paused: "Programa en pausa — retest para continuar",
  programs_card_continue: "Continuar {name}",

  // Program content: pushup-100
  "programs_pushup-100_name": "Flexiones 100",
  "programs_pushup-100_desc": "Progresión a las cien flexiones: columnas por test, última serie al máximo.",
  "programs_pushup-100_cue": "Buena forma: pecho a la altura del puño, extensión completa. La última serie es al máximo (mínimo el mínimo).",
  // Program content: situp-200
  "programs_situp-200_name": "Abdominales 200",
  "programs_situp-200_desc": "Progresión a las doscientos abdominales con columnas y retests.",
  "programs_situp-200_cue": "Pies fijos, manos en cruz sobre el pecho, escápulas tocando el piso y torso vertical. Respirá natural.",
  // Program content: squat-200
  "programs_squat-200_name": "Sentadillas 200",
  "programs_squat-200_desc": "Progresión de resistencia de sentadillas con el peso del cuerpo.",
  "programs_squat-200_cue": "Pies a la anchura de los hombros, caderas bajo las rodillas, pecho arriba. La última serie es al máximo.",
  // Program content: pullup-25
  "programs_pullup-25_name": "Dominadas 25",
  "programs_pullup-25_desc": "Progresión de dominadas estrictas con negativas para principiantes.",
  "programs_pullup-25_cue": "De brazos extendidos a mentón sobre la barra, sin impulso. Usá negativas/saltos si todavía no podés hacer una repetición completa.",
  // Program content: dip-150
  "programs_dip-150_name": "Fondos 150",
  "programs_dip-150_desc": "Progresión de fondos en paralelas (tablas de flexiones escaladas 1.5x).",
  "programs_dip-150_cue": "Hombros por debajo de los codos abajo, extensión completa arriba. La última serie es al máximo.",
  // Program content: plank-300
  "programs_plank-300_name": "Plancha 5:00",
  "programs_plank-300_desc": "Plancha de cinco minutos: aguantes diarios simples/divididos desde :20.",
  "programs_plank-300_cue": "Codos bajo los hombros, línea recta de cabeza a pies, respirá natural. Descansá 60-80s entre series divididas.",
};
