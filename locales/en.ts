// FIX: Corrected the type definition to allow for proper key inference by TypeScript.
export const en = {
  // Common
  common_cancel: 'Cancel',
  common_save: 'Save',
  common_add: 'Add',
  common_new: 'New',
  common_delete: 'Delete',
  common_rename: 'Rename',
  common_edit: 'Edit',
  common_confirm: 'Confirm',
  common_discard: 'Discard',
  common_yes: 'Yes',
  common_no: 'No',
  common_save_changes: 'Save Changes',

  // Navigation
  nav_train: 'Train',
  nav_history: 'History',
  nav_exercises: 'Exercises',
  nav_profile: 'Profile',

  // Train Page
  train_routines_title: 'My Routines',
  train_start_empty: 'Start Empty Workout',
  train_latest_workouts: 'Latest Workouts',
  train_my_templates: 'My Templates',
  train_example_templates: 'Example Templates',
  train_empty_workout_name: 'Empty Workout',
  train_empty_workout_desc: 'An empty workout to build on the fly.',
  train_new_custom_template_name: 'New Custom Template',

  // History Page
  history_no_data: 'No workout history found for this exercise.',
  history_page_no_workouts: 'No workout history found. Complete a workout to see it here!',
  history_page_unknown_exercise: 'Unknown Exercise',
  history_total_time: 'Total Time',
  history_total_volume: 'Total Volume',
  history_prs: 'Personal Records',
  history_best_set: 'Best Set',
  history_menu_edit: 'Edit Workout',
  history_menu_save_template: 'Save as Template',
  history_menu_repeat: 'Repeat Workout',
  history_menu_delete: 'Delete Workout',
  history_save_template_title: 'Save as Template',
  history_template_name_label: 'Template Name',
  history_template_name_placeholder: 'e.g., My Awesome Workout',
  history_delete_confirm_title: 'Delete Workout?',
  history_delete_confirm_message: 'Are you sure you want to permanently delete this workout session?',
  history_workout_editor_title: 'Edit Workout',


  // Exercises Page
  search_placeholder: 'Search for an exercise...',
  filter_body_part: 'Body Part',
  filter_category: 'Category',
  exercises_no_match: 'No exercises match your criteria.',

  // Profile Page
  profile_title: 'Profile & Settings',
  profile_settings: 'Settings',
  profile_language: 'Language',
  profile_weight_unit: 'Weight Unit',
  profile_default_timers: 'Default Rest Timers',
  profile_default_timers_desc: 'Set the default rest time when adding new exercises.',
  profile_localized_names: 'Localized Exercise Names',
  profile_localized_names_desc: 'Display exercise names in the selected language.',
  profile_app_behaviour: 'App Behaviour',
  profile_keep_screen_awake: 'Keep Screen Awake',
  profile_keep_screen_awake_desc: 'Prevents the screen from locking during a workout.',
  profile_enable_notifications: 'Enable Notifications',
  profile_enable_notifications_desc: 'Get an alert when your rest timer is complete.',
  profile_notifications_blocked: 'Notifications blocked. Please enable them in your browser settings.',

  // Active Workout
  workout_set: 'Set',
  workout_sets: 'Sets',
  workout_kg: 'kg',
  workout_lbs: 'lbs',
  workout_reps: 'reps',
  workout_finish: 'Finish',
  workout_timer_sub: '-10s',
  workout_timer_add: '+10s',
  active_workout_no_active: 'No active workout.',
  active_workout_add_exercise: 'Add Exercise',
  active_workout_empty_title: 'This workout is empty.',
  active_workout_empty_desc: 'Add an exercise to get started!',
  active_workout_edit_details_aria: 'Edit workout details',
  active_workout_minimize_aria: 'Minimize workout',
  
  // Set Type Modal
  set_type_modal_title: 'Set Type',
  set_type_normal: 'Normal',
  set_type_warmup: 'Warmup',
  set_type_drop: 'Drop Set',
  set_type_failure: 'Failure',
  set_type_warmup_desc_title: 'What is a Warmup Set?',
  set_type_warmup_desc: 'A lighter set performed before your main working sets to prepare muscles and joints for heavier loads, reducing injury risk.',
  set_type_drop_desc_title: 'What is a Drop Set?',
  set_type_drop_desc: 'An advanced technique where you perform a set to failure, then immediately reduce the weight and continue for more reps without rest to maximize muscle fatigue.',
  set_type_failure_desc_title: 'What is a Failure Set?',
  set_type_failure_desc: 'A set where you perform as many repetitions as possible with good form until you can no longer complete another rep on your own.',

  // Exercise Details Modal
  tab_description: 'Description',
  tab_history: 'History',
  tab_graphs: 'Graphs',
  tab_records: 'Records',
  exercise_edit: 'Edit',
  description_instructions: 'Instructions',
  history_volume: 'Vol',
  history_1rm: 'e1RM',
  graphs_total_volume: 'Total Volume Over Time',
  graphs_max_reps: 'Max Reps Over Time',
  records_pr: 'Personal Records',
  records_max_weight: 'Max Weight',
  records_max_reps: 'Max Reps',
  records_max_volume: 'Max Volume',
  records_achieved_on: 'on {date}',

  // Routine Preview Modal
  routine_preview_exercises: 'Exercises',
  routine_preview_view_exercise_details: 'View exercise details',
  routine_start_workout: 'Start Workout',

  // Finish Workout Confirmation
  finish_workout_confirm_title: 'Finish Workout?',
  finish_workout_confirm_message: 'You can finish and save your progress, or discard this session entirely. Any incomplete sets will not be saved.',
  finish_workout_confirm_cancel: 'Continue Workout',
  finish_workout_confirm_finish: 'Finish & Save',
  finish_workout_confirm_discard: 'Discard Workout',

  // Confirm New Workout Modal
  confirm_new_workout_title: 'Workout in Progress',
  confirm_new_workout_message: 'You already have an active workout. What would you like to do?',
  confirm_new_workout_start_new: 'Start New',
  confirm_new_workout_continue: 'Continue Current',
  confirm_new_workout_cancel: 'Cancel',

  // Confirm Discard Modal
  confirm_discard_title: 'Discard Changes?',
  confirm_discard_message: 'You have unsaved changes. Are you sure you want to discard them?',

  // Exercise Header Menu
  bar_type: 'Bar Type',
  weight_unit: 'Weight Unit',
  timer_normal: 'Work Set',
  timer_warmup: 'Warm-up Set',
  timer_drop: 'Drop Set',
  exercise_header_focus_total_volume: 'Total volume',
  exercise_header_focus_volume_increase: 'Volume increase',
  exercise_header_focus_total_reps: 'Total reps',
  exercise_header_focus_weight_by_rep: 'Weight by rep',
  exercise_header_menu_add_note: 'Add Note',
  exercise_header_menu_add_warmup: 'Add Warmup Sets',
  exercise_header_menu_change_timer: 'Change Timer',
  exercise_header_menu_replace: 'Replace Exercise',

  // Timer Modal
  timer_modal_title: 'Add rest timers',
  timer_modal_subtitle_1: 'Completed timers will not be affected.',
  timer_modal_subtitle_2: 'Durations will be saved for next time.',
  timer_modal_none: 'None',
  timer_modal_update_button: 'Add rest timers',
  
  // Edit Set Timer Modal
  edit_set_timer_modal_title: 'Edit Rest Timer',
  edit_set_timer_modal_desc: 'Set a custom rest time for this set or reset to the default ({time}).',
  edit_set_timer_modal_save_button: 'Save Custom Timer',
  edit_set_timer_modal_reset_button: 'Reset to Default',

  // Timer Controls
  timer_resume: 'RESUME',
  timer_pause: 'PAUSE',
  timer_reset: 'RESET',
  timer_skip: 'SKIP',
  timer_hide: 'HIDE',
  
  // Set Row
  set_row_delete_button: 'Delete',
  
  // Routine Panel
  routine_panel_delete_confirm: 'Are you sure you want to delete "{name}"?',
  routine_panel_delete_confirm_title: 'Delete Template?',
  routine_panel_no_exercises: 'No exercises yet.',
  routine_panel_last_used: 'Last used: {date}',
  routine_panel_edit_exercises: 'Edit Exercises',
  routine_panel_edit_note: 'Edit Note',
  routine_panel_rename_title: 'Rename Template',
  routine_panel_edit_note_title: 'Edit Note',
  routine_panel_note_placeholder: 'Add a description for your template...',
  
  // Routine Section
  routine_section_create_prompt: 'Create a template to see it here.',
  routine_section_no_items: 'No {title} yet.',
  
  // Template Editor
  template_editor_edit_title: 'Edit Template',
  template_editor_create_title: 'Create Template',
  template_editor_name_label: 'Template Name',
  template_editor_name_placeholder: 'e.g., Push Day',
  template_editor_description_label: 'Description',
  template_editor_description_placeholder: 'Add some notes about this template...',
  template_editor_exercises_title: 'Exercises',
  template_editor_empty: 'This template is empty.',
  template_editor_add_exercises: 'Add Exercises',
  template_editor_name_empty_alert: 'Template name cannot be empty.',
  template_card_add_edit_note: 'Add/Edit Note',
  template_card_edit_timers: 'Edit Default Timers',
  template_card_remove_exercise: 'Remove Exercise',
  
  // Exercise Editor
  exercise_editor_add_title: 'Add Exercise',
  exercise_editor_edit_title: 'Edit Exercise',
  exercise_editor_name_label: 'Name',
  exercise_editor_notes_label: 'Description / Notes',
  exercise_editor_category_locked: '(cannot be changed)',
  exercise_editor_notes_placeholder: 'Add instructions or personal notes...',
  exercise_editor_no_instructions: 'No instructions available for this exercise.',
  exercise_editor_name_empty_alert: 'Exercise name cannot be empty.',
  
  // Add/Replace Exercise Modal
  add_exercises_modal_title: 'Add Exercises',
  add_exercises_button_empty: 'Add Exercise(s)',
  add_exercises_button_single: 'Add 1 Exercise',
  add_exercises_button_plural: 'Add {count} Exercises',
  replace_exercise_modal_title: 'Replace Exercise',
  replace_exercise_modal_button: 'Replace',
  replace_exercise_modal_no_match: 'No exercises match.',
  replace_exercise_modal_confirm_title: 'Replace Exercise?',
  replace_exercise_modal_confirm_message: 'Are you sure you want to replace this exercise? Current sets will be kept.',
  
  // Workout Details Modal
  workout_details_modal_title: 'Edit Workout Details',
  workout_details_modal_name_label: 'Workout Name',
  workout_details_modal_auto_timer_label: 'Automatic Timer',
  workout_details_modal_auto_timer_desc: 'Track duration automatically.',
  workout_details_modal_duration_label: 'Duration',
  workout_details_modal_end_date_label: 'End Date',
  workout_details_modal_active_now: 'Active Now',
  workout_details_modal_start_date_label: 'Start Date',
  workout_details_modal_save_button: 'Save Changes',
  workout_details_modal_invalid_date_alert: 'Invalid date format.',
  workout_details_modal_end_before_start_alert: 'End time cannot be before start time.',
  
  // Body Parts
  body_part_all: 'All Body Parts',
  body_part_chest: 'Chest',
  body_part_back: 'Back',
  body_part_legs: 'Legs',
  body_part_glutes: 'Glutes',
  body_part_shoulders: 'Shoulders',
  body_part_biceps: 'Biceps',
  body_part_triceps: 'Triceps',
  body_part_core: 'Core',
  body_part_full_body: 'Full Body',
  body_part_calves: 'Calves',
  body_part_forearms: 'Forearms',
  body_part_mobility: 'Mobility',
  body_part_cardio: 'Cardio',

  // Categories
  category_all: 'All Categories',
  category_barbell: 'Barbell',
  category_dumbbell: 'Dumbbell',
  category_machine: 'Machine',
  category_cable: 'Cable',
  category_bodyweight: 'Bodyweight',
  category_assisted_bodyweight: 'Assisted Bodyweight',
  category_kettlebell: 'Kettlebell',
  category_plyometrics: 'Plyometrics',
  category_reps_only: 'Reps Only',
  category_cardio: 'Cardio',
  category_duration: 'Duration',
  
  // Notifications
  notification_timer_finished_title: 'Rest Over!',
  notification_timer_finished_body: 'Time to start your next set of {exercise}. Let\'s go!',
};