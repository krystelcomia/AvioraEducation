/**
 * AVIORA EDUCATION - MULTI-LANGUAGE INTERNATIONALIZATION (i18n) ENGINE
 * Supports: en-US (English), es-ES (Español), fr-FR (Français),
 *           de-DE (Deutsch), zh-CN (中文), ja-JP (日本語), fil-PH (Filipino)
 */

const I18N_TRANSLATIONS = {
  'en-US': {
    // Navigation
    'nav.home': 'Home',
    'nav.tutors': 'Find Tutors',
    'nav.pricing': 'Pricing',
    'nav.buddy': 'Buddy & Arena',
    'nav.virtual_room': 'Virtual Room',
    'nav.student_portal': 'Student Portal',
    'nav.teacher_portal': 'Teacher Portal',
    'nav.admin_portal': 'Admin Portal',
    'nav.profile': 'Profile & Settings',
    'nav.login': 'Log In',
    'nav.get_started': 'Get Started',
    'nav.logout': 'Log Out',
    'nav.how_it_works': 'How It Works',
    'nav.dashboard': 'Dashboard',

    // Profile & Settings
    'settings.title': 'Settings & Preferences',
    'settings.subtitle': 'Configure display themes, font size, internationalization, session notifications, and account security.',
    'settings.appearance_theme': 'Appearance Theme',
    'settings.light_mode': 'Light Mode',
    'settings.light_mode_desc': 'Warm cream & gold canvas',
    'settings.dark_mode': 'Dark Mode',
    'settings.dark_mode_desc': 'Obsidian & luxury gold',
    'settings.font_size': 'Interface Font Size',
    'settings.font_size_desc': 'Adjust system-wide typography scale for optimal reading comfort.',
    'settings.font_small': 'Small (14px)',
    'settings.font_small_desc': 'Compact & data-dense',
    'settings.font_normal': 'Normal (16px)',
    'settings.font_normal_desc': 'Standard balanced scale',
    'settings.font_large': 'Large (18px)',
    'settings.font_large_desc': 'Enhanced clarity & legibility',
    'settings.language': 'Language',
    'settings.timezone': 'Preferred Timezone',
    'settings.notifications': 'Notification Preferences',
    'settings.notif_lessons': '3-Hour Lesson Reminders',
    'settings.notif_lessons_desc': 'Receive reminder alert 3 hours prior to scheduled 50-minute class',
    'settings.notif_calendar': 'Calendar Sync Alerts',
    'settings.notif_calendar_desc': 'Notify when a tutor confirms, reschedules, or updates session details',
    'settings.notif_messages': 'Direct Educator Messages',
    'settings.notif_messages_desc': 'Instant alerts when an assigned educator sends study notes or messages',
    'settings.notif_reports': 'Weekly Academic Digest',
    'settings.notif_reports_desc': 'Receive weekly performance summaries and remaining lesson credit updates',
    'settings.save_profile': 'Save Profile Changes',
    'settings.saving_profile': 'Saving Changes...',
    'settings.account_security': 'Account Security',
    'settings.security_desc': 'Update your account password to ensure your study history and subscription stay secure.',
    'settings.current_password': 'Current Password',
    'settings.new_password': 'New Password',
    'settings.confirm_password': 'Confirm New Password',
    'settings.update_password': 'Update Password',
    'settings.updating_password': 'Updating Password...',

    // Student Dashboard & Sections
    'dash.welcome': 'Welcome back,',
    'dash.overview': 'Academic Overview',
    'dash.upcoming_lessons': 'Upcoming Lessons',
    'dash.milestones': 'Learning Milestones',
    'dash.total_lessons': 'Total Lessons',
    'dash.remaining_credits': 'Remaining Credits',
    'dash.study_hours': 'Study Hours',
    'dash.grade_level': 'Grade Level',
    'dash.active_plan': 'Active Plan',
    'dash.standard_plan': 'Standard Pay-per-session',
    'dash.all_lessons': 'All Lessons',
    'dash.scheduled': 'Scheduled',
    'dash.completed': 'Completed',
    'dash.pending': 'Pending',
    'dash.cancelled': 'Cancelled',
    'dash.book_lesson': 'Book a Lesson',
    'dash.view_tutors': 'Explore Tutors',
    'dash.join_room': 'Join Virtual Class',
    'dash.review_tutor': 'Review Session',
    'dash.no_lessons': 'No lessons scheduled at this time.',
    'dash.quick_actions': 'Quick Actions',
    'dash.status': 'Status',
    'dash.actions': 'Actions',
    'dash.subject': 'Subject',
    'dash.tutor': 'Tutor',
    'dash.datetime': 'Date & Time',
    'dash.duration': 'Duration',

    // Common UI & Notifications
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.confirm': 'Confirm',
    'common.filter': 'Filter',
    'common.search': 'Search',
    'common.notifications': 'Notifications',
    'common.mark_all_read': 'Mark all as read',
    'common.no_notifications': 'No new notifications.',
    'common.saving': 'Saving preference...',
    'common.saved': 'Preference saved successfully.',

    // Toasts
    'toast.theme_saved': 'Appearance theme saved and applied across the website.',
    'toast.font_saved': 'Font size updated and applied system-wide.',
    'toast.lang_saved': 'Language preference saved and updated across the website.',
    'toast.tz_saved': 'Preferred timezone updated successfully.',
    'toast.notif_saved': 'Notification preference updated and saved to your account.',
    'toast.error_sync': 'Failed to synchronize preferences to server. Using local settings.'
  },

  'es-ES': {
    'nav.home': 'Inicio',
    'nav.tutors': 'Buscar Tutores',
    'nav.pricing': 'Precios',
    'nav.buddy': 'Compañero y Arena',
    'nav.virtual_room': 'Aula Virtual',
    'nav.student_portal': 'Portal de Estudiante',
    'nav.teacher_portal': 'Portal de Profesor',
    'nav.admin_portal': 'Portal de Administrador',
    'nav.profile': 'Perfil y Ajustes',
    'nav.login': 'Iniciar Sesión',
    'nav.get_started': 'Empezar',
    'nav.logout': 'Cerrar Sesión',
    'nav.how_it_works': 'Cómo Funciona',
    'nav.dashboard': 'Panel Principal',

    'settings.title': 'Ajustes y Preferencias',
    'settings.subtitle': 'Configura temas de visualización, tamaño de fuente, internacionalización, notificaciones y seguridad.',
    'settings.appearance_theme': 'Tema de Apariencia',
    'settings.light_mode': 'Modo Claro',
    'settings.light_mode_desc': 'Lienzo crema cálido y oro',
    'settings.dark_mode': 'Modo Oscuro',
    'settings.dark_mode_desc': 'Obsidiana y oro de lujo',
    'settings.font_size': 'Tamaño de Fuente de la Interfaz',
    'settings.font_size_desc': 'Ajusta la escala tipográfica del sistema para una lectura óptima.',
    'settings.font_small': 'Pequeño (14px)',
    'settings.font_small_desc': 'Compacto y denso en datos',
    'settings.font_normal': 'Normal (16px)',
    'settings.font_normal_desc': 'Escala equilibrada estándar',
    'settings.font_large': 'Grande (18px)',
    'settings.font_large_desc': 'Mayor claridad y legibilidad',
    'settings.language': 'Idioma',
    'settings.timezone': 'Zona Horaria Preferida',
    'settings.notifications': 'Preferencias de Notificación',
    'settings.notif_lessons': 'Recordatorios de Clase de 3 Horas',
    'settings.notif_lessons_desc': 'Recibe alerta 3 horas antes de tu clase programada de 50 minutos',
    'settings.notif_calendar': 'Alertas de Sincronización de Calendario',
    'settings.notif_calendar_desc': 'Avisar cuando un tutor confirme, reprograme o modifique la sesión',
    'settings.notif_messages': 'Mensajes Directos del Educador',
    'settings.notif_messages_desc': 'Alertas instantáneas cuando tu tutor envíe notas de estudio o mensajes',
    'settings.notif_reports': 'Resumen Académico Semanal',
    'settings.notif_reports_desc': 'Recibe resúmenes semanales de rendimiento y saldo de clases restantes',
    'settings.save_profile': 'Guardar Cambios del Perfil',
    'settings.saving_profile': 'Guardando Cambios...',
    'settings.account_security': 'Seguridad de la Cuenta',
    'settings.security_desc': 'Actualiza tu contraseña para mantener seguro tu historial y suscripción.',
    'settings.current_password': 'Contraseña Actual',
    'settings.new_password': 'Nueva Contraseña',
    'settings.confirm_password': 'Confirmar Nueva Contraseña',
    'settings.update_password': 'Actualizar Contraseña',
    'settings.updating_password': 'Actualizando Contraseña...',

    'dash.welcome': 'Bienvenido de nuevo,',
    'dash.overview': 'Resumen Académico',
    'dash.upcoming_lessons': 'Próximas Clases',
    'dash.milestones': 'Hitos de Aprendizaje',
    'dash.total_lessons': 'Total de Clases',
    'dash.remaining_credits': 'Créditos Restantes',
    'dash.study_hours': 'Horas de Estudio',
    'dash.grade_level': 'Nivel Académico',
    'dash.active_plan': 'Plan Activo',
    'dash.standard_plan': 'Pago por Sesión Estándar',
    'dash.all_lessons': 'Todas las Clases',
    'dash.scheduled': 'Programada',
    'dash.completed': 'Completada',
    'dash.pending': 'Pendiente',
    'dash.cancelled': 'Cancelada',
    'dash.book_lesson': 'Reservar una Clase',
    'dash.view_tutors': 'Explorar Tutores',
    'dash.join_room': 'Entrar a la Clase Virtual',
    'dash.review_tutor': 'Calificar Sesión',
    'dash.no_lessons': 'No hay clases programadas en este momento.',
    'dash.quick_actions': 'Acciones Rápidas',
    'dash.status': 'Estado',
    'dash.actions': 'Acciones',
    'dash.subject': 'Materia',
    'dash.tutor': 'Tutor',
    'dash.datetime': 'Fecha y Hora',
    'dash.duration': 'Duración',

    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.submit': 'Enviar',
    'common.confirm': 'Confirmar',
    'common.filter': 'Filtrar',
    'common.search': 'Buscar',
    'common.notifications': 'Notificaciones',
    'common.mark_all_read': 'Marcar todo como leído',
    'common.no_notifications': 'No hay notificaciones nuevas.',
    'common.saving': 'Guardando preferencia...',
    'common.saved': 'Preferencia guardada con éxito.',

    'toast.theme_saved': 'Tema de apariencia guardado y aplicado en todo el sitio web.',
    'toast.font_saved': 'Tamaño de fuente actualizado y aplicado a todo el sistema.',
    'toast.lang_saved': 'Preferencia de idioma guardada y actualizada en todo el sitio.',
    'toast.tz_saved': 'Zona horaria preferida actualizada con éxito.',
    'toast.notif_saved': 'Preferencia de notificación guardada en tu cuenta.',
    'toast.error_sync': 'Error al sincronizar con el servidor. Usando ajustes locales.'
  },

  'fr-FR': {
    'nav.home': 'Accueil',
    'nav.tutors': 'Trouver des Tuteurs',
    'nav.pricing': 'Tarifs',
    'nav.buddy': 'Buddy & Arène',
    'nav.virtual_room': 'Salle Virtuelle',
    'nav.student_portal': 'Portail Étudiant',
    'nav.teacher_portal': 'Portail Enseignant',
    'nav.admin_portal': 'Portail Admin',
    'nav.profile': 'Profil & Paramètres',
    'nav.login': 'Connexion',
    'nav.get_started': 'Commencer',
    'nav.logout': 'Déconnexion',
    'nav.how_it_works': 'Comment ça marche',
    'nav.dashboard': 'Tableau de bord',

    'settings.title': 'Paramètres & Préférences',
    'settings.subtitle': 'Configurez les thèmes d’affichage, la taille de police, l’internationalisation, les alertes et la sécurité.',
    'settings.appearance_theme': 'Thème d’Apparence',
    'settings.light_mode': 'Mode Clair',
    'settings.light_mode_desc': 'Crème chaleureuse et touches d’or',
    'settings.dark_mode': 'Mode Sombre',
    'settings.dark_mode_desc': 'Obsidienne et or prestigieux',
    'settings.font_size': 'Taille de Police d’Interface',
    'settings.font_size_desc': 'Ajustez l’échelle typographique globale pour un confort de lecture optimal.',
    'settings.font_small': 'Petite (14px)',
    'settings.font_small_desc': 'Vue compacte et dense',
    'settings.font_normal': 'Normale (16px)',
    'settings.font_normal_desc': 'Échelle standard équilibrée',
    'settings.font_large': 'Grande (18px)',
    'settings.font_large_desc': 'Lisibilité et clarté accrues',
    'settings.language': 'Langue',
    'settings.timezone': 'Fuseau Horaire Préféré',
    'settings.notifications': 'Préférences de Notification',
    'settings.notif_lessons': 'Rappels de cours 3 heures avant',
    'settings.notif_lessons_desc': 'Recevez une notification 3 heures avant votre cours de 50 minutes',
    'settings.notif_calendar': 'Alertes de Calendrier',
    'settings.notif_calendar_desc': 'Notification lorsqu’un tuteur confirme ou met à jour la session',
    'settings.notif_messages': 'Messages Directs de l’Enseignant',
    'settings.notif_messages_desc': 'Alertes immédiates en cas de nouveaux messages ou notes de cours',
    'settings.notif_reports': 'Synthèse Académique Hebdomadaire',
    'settings.notif_reports_desc': 'Recevez un récapitulatif hebdomadaire de vos progrès et crédits restants',
    'settings.save_profile': 'Enregistrer les Modifications',
    'settings.saving_profile': 'Enregistrement...',
    'settings.account_security': 'Sécurité du Compte',
    'settings.security_desc': 'Mettez à jour votre mot de passe pour sécuriser votre historique et abonnement.',
    'settings.current_password': 'Mot de Passe Actuel',
    'settings.new_password': 'Nouveau Mot de Passe',
    'settings.confirm_password': 'Confirmer Nouveau Mot de Passe',
    'settings.update_password': 'Changer le Mot de Passe',
    'settings.updating_password': 'Mise à jour...',

    'dash.welcome': 'Bienvenue,',
    'dash.overview': 'Aperçu Académique',
    'dash.upcoming_lessons': 'Cours à Venir',
    'dash.milestones': 'Étapes d’Apprentissage',
    'dash.total_lessons': 'Total des Cours',
    'dash.remaining_credits': 'Crédits Restants',
    'dash.study_hours': 'Heures d’Étude',
    'dash.grade_level': 'Niveau d’Étude',
    'dash.active_plan': 'Abonnement Actif',
    'dash.standard_plan': 'Paiement par séance standard',
    'dash.all_lessons': 'Tous les Cours',
    'dash.scheduled': 'Planifié',
    'dash.completed': 'Terminé',
    'dash.pending': 'En attente',
    'dash.cancelled': 'Annulé',
    'dash.book_lesson': 'Réserver un Cours',
    'dash.view_tutors': 'Découvrir les Tuteurs',
    'dash.join_room': 'Rejoindre la Classe Virtuelle',
    'dash.review_tutor': 'Évaluer la Session',
    'dash.no_lessons': 'Aucun cours programmé pour le moment.',
    'dash.quick_actions': 'Actions Rapides',
    'dash.status': 'Statut',
    'dash.actions': 'Actions',
    'dash.subject': 'Matière',
    'dash.tutor': 'Tuteur',
    'dash.datetime': 'Date et Heure',
    'dash.duration': 'Durée',

    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.close': 'Fermer',
    'common.submit': 'Soumettre',
    'common.confirm': 'Confirmer',
    'common.filter': 'Filtrer',
    'common.search': 'Rechercher',
    'common.notifications': 'Notifications',
    'common.mark_all_read': 'Tout marquer comme lu',
    'common.no_notifications': 'Aucune nouvelle notification.',
    'common.saving': 'Enregistrement des préférences...',
    'common.saved': 'Préférences enregistrées avec succès.',

    'toast.theme_saved': 'Thème d’apparence enregistré et appliqué à tout le site.',
    'toast.font_saved': 'Taille de police appliquée à l’ensemble du système.',
    'toast.lang_saved': 'Langue enregistrée et mise à jour sur tout le site.',
    'toast.tz_saved': 'Fuseau horaire préféré mis à jour.',
    'toast.notif_saved': 'Préférences de notification enregistrées sur votre compte.',
    'toast.error_sync': 'Échec de synchronisation avec le serveur. Utilisation des données locales.'
  },

  'de-DE': {
    'nav.home': 'Startseite',
    'nav.tutors': 'Tutoren finden',
    'nav.pricing': 'Preise',
    'nav.buddy': 'Buddy & Arena',
    'nav.virtual_room': 'Virtueller Raum',
    'nav.student_portal': 'Studentenportal',
    'nav.teacher_portal': 'Lehrerportal',
    'nav.admin_portal': 'Adminportal',
    'nav.profile': 'Profil & Einstellungen',
    'nav.login': 'Anmelden',
    'nav.get_started': 'Loslegen',
    'nav.logout': 'Abmelden',
    'nav.how_it_works': 'So funktioniert es',
    'nav.dashboard': 'Dashboard',

    'settings.title': 'Einstellungen & Präferenzen',
    'settings.subtitle': 'Passen Sie Anzeigedesigns, Schriftgrößen, Internationalisierung, Benachrichtigungen und Sicherheit an.',
    'settings.appearance_theme': 'Erscheinungsbild',
    'settings.light_mode': 'Heller Modus',
    'settings.light_mode_desc': 'Warme Creme & edles Gold',
    'settings.dark_mode': 'Dunkler Modus',
    'settings.dark_mode_desc': 'Obsidian & Luxusgold',
    'settings.font_size': 'Schriftgröße der Oberfläche',
    'settings.font_size_desc': 'Passen Sie die Typografie für optimalen Lesekomfort an.',
    'settings.font_small': 'Klein (14px)',
    'settings.font_small_desc': 'Kompakt & datendicht',
    'settings.font_normal': 'Normal (16px)',
    'settings.font_normal_desc': 'Ausgewogener Standard',
    'settings.font_large': 'Groß (18px)',
    'settings.font_large_desc': 'Erhöhte Klarheit & Lesbarkeit',
    'settings.language': 'Sprache',
    'settings.timezone': 'Bevorzugte Zeitzone',
    'settings.notifications': 'Benachrichtigungseinstellungen',
    'settings.notif_lessons': '3-Stunden-Unterrichtserinnerung',
    'settings.notif_lessons_desc': 'Erinnerung 3 Stunden vor der geplanten 50-Minuten-Stunde erhalten',
    'settings.notif_calendar': 'Kalendersynchronisierung',
    'settings.notif_calendar_desc': 'Benachrichtigung bei Terminbestätigungen oder -änderungen',
    'settings.notif_messages': 'Direkte Lehrernachrichten',
    'settings.notif_messages_desc': 'Sofortige Benachrichtigung bei neuen Lernnotizen oder Nachrichten',
    'settings.notif_reports': 'Wöchentlicher Lernbericht',
    'settings.notif_reports_desc': 'Wöchentliche Zusammenfassungen und verbleibende Unterrichtsstunden erhalten',
    'settings.save_profile': 'Profiländerungen speichern',
    'settings.saving_profile': 'Speichere Änderungen...',
    'settings.account_security': 'Kontosicherheit',
    'settings.security_desc': 'Aktualisieren Sie Ihr Passwort für maximale Sicherheit Ihres Kontos.',
    'settings.current_password': 'Aktuelles Passwort',
    'settings.new_password': 'Neues Passwort',
    'settings.confirm_password': 'Neues Passwort bestätigen',
    'settings.update_password': 'Passwort aktualisieren',
    'settings.updating_password': 'Wird aktualisiert...',

    'dash.welcome': 'Willkommen zurück,',
    'dash.overview': 'Akademische Übersicht',
    'dash.upcoming_lessons': 'Kommende Stunden',
    'dash.milestones': 'Lernmeilensteine',
    'dash.total_lessons': 'Gesamte Stunden',
    'dash.remaining_credits': 'Verbleibende Guthaben',
    'dash.study_hours': 'Lernstunden',
    'dash.grade_level': 'Klassenstufe',
    'dash.active_plan': 'Aktiver Plan',
    'dash.standard_plan': 'Standard Pay-per-Session',
    'dash.all_lessons': 'Alle Stunden',
    'dash.scheduled': 'Geplant',
    'dash.completed': 'Abgeschlossen',
    'dash.pending': 'Ausstehend',
    'dash.cancelled': 'Storniert',
    'dash.book_lesson': 'Stunde buchen',
    'dash.view_tutors': 'Tutoren entdecken',
    'dash.join_room': 'Klassenzimmer beitreten',
    'dash.review_tutor': 'Sitzung bewerten',
    'dash.no_lessons': 'Derzeit sind keine Stunden geplant.',
    'dash.quick_actions': 'Schnellaktionen',
    'dash.status': 'Status',
    'dash.actions': 'Aktionen',
    'dash.subject': 'Fach',
    'dash.tutor': 'Tutor',
    'dash.datetime': 'Datum & Uhrzeit',
    'dash.duration': 'Dauer',

    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.submit': 'Absenden',
    'common.confirm': 'Bestätigen',
    'common.filter': 'Filtern',
    'common.search': 'Suchen',
    'common.notifications': 'Benachrichtigungen',
    'common.mark_all_read': 'Alle als gelesen markieren',
    'common.no_notifications': 'Keine neuen Benachrichtigungen.',
    'common.saving': 'Einstellung wird gespeichert...',
    'common.saved': 'Einstellung erfolgreich gespeichert.',

    'toast.theme_saved': 'Design gespeichert und auf der gesamten Website angewendet.',
    'toast.font_saved': 'Schriftgröße systemweit aktualisiert.',
    'toast.lang_saved': 'Sprache gespeichert und überall aktualisiert.',
    'toast.tz_saved': 'Bevorzugte Zeitzone erfolgreich aktualisiert.',
    'toast.notif_saved': 'Benachrichtigungseinstellung in Ihrem Konto gespeichert.',
    'toast.error_sync': 'Server-Synchronisation fehlgeschlagen. Lokale Werte werden genutzt.'
  },

  'zh-CN': {
    'nav.home': '首页',
    'nav.tutors': '寻找导师',
    'nav.pricing': '价格方案',
    'nav.buddy': '伙伴与竞技场',
    'nav.virtual_room': '虚拟教室',
    'nav.student_portal': '学生门户',
    'nav.teacher_portal': '教师门户',
    'nav.admin_portal': '管理门户',
    'nav.profile': '个人资料与设置',
    'nav.login': '登录',
    'nav.get_started': '开始使用',
    'nav.logout': '登出',
    'nav.how_it_works': '服务流程',
    'nav.dashboard': '控制台',

    'settings.title': '设置与偏好',
    'settings.subtitle': '自定义系统外观主题、字号大小、多语言环境、通知偏好和账户安全。',
    'settings.appearance_theme': '外观主题',
    'settings.light_mode': '浅色模式',
    'settings.light_mode_desc': '温润米白与暖金质感',
    'settings.dark_mode': '深色模式',
    'settings.dark_mode_desc': '黑曜石沉稳与奢华金',
    'settings.font_size': '界面字体大小',
    'settings.font_size_desc': '调整全站文本排版比例，获得最佳阅读与操作体验。',
    'settings.font_small': '偏小 (14px)',
    'settings.font_small_desc': '紧凑高密视界',
    'settings.font_normal': '标准 (16px)',
    'settings.font_normal_desc': '黄金均衡默认比例',
    'settings.font_large': '偏大 (18px)',
    'settings.font_large_desc': '清晰大字舒畅阅读',
    'settings.language': '显示语言',
    'settings.timezone': '首选时区',
    'settings.notifications': '课程通知偏好',
    'settings.notif_lessons': '开课前 3 小时提醒',
    'settings.notif_lessons_desc': '在 50 分钟专属课程开始前 3 小时接收贴心提醒',
    'settings.notif_calendar': '日历日程同步提醒',
    'settings.notif_calendar_desc': '导师确认、改期或调整安排时第一时间通知',
    'settings.notif_messages': '专属教师私信提醒',
    'settings.notif_messages_desc': '导师发送学习笔记或指导信息时即时推送',
    'settings.notif_reports': '每周学习周报推送',
    'settings.notif_reports_desc': '定期接收课时余额变动与学业成长总结',
    'settings.save_profile': '保存个人资料与偏好',
    'settings.saving_profile': '正在保存设置...',
    'settings.account_security': '账户安全中心',
    'settings.security_desc': '定期更新密码，守护您的课程记录与订阅权益安全。',
    'settings.current_password': '当前密码',
    'settings.new_password': '新密码',
    'settings.confirm_password': '确认新密码',
    'settings.update_password': '更新登录密码',
    'settings.updating_password': '正在更新密码...',

    'dash.welcome': '欢迎回来，',
    'dash.overview': '学术概览',
    'dash.upcoming_lessons': '待上课程',
    'dash.milestones': '学习里程碑',
    'dash.total_lessons': '累计课时',
    'dash.remaining_credits': '剩余课时额度',
    'dash.study_hours': '专注时长',
    'dash.grade_level': '当前年级',
    'dash.active_plan': '当前生效计划',
    'dash.standard_plan': '标准单次课模式',
    'dash.all_lessons': '全部课程',
    'dash.scheduled': '已预约',
    'dash.completed': '已完成',
    'dash.pending': '待确认',
    'dash.cancelled': '已取消',
    'dash.book_lesson': '预约新课程',
    'dash.view_tutors': '浏览名师团队',
    'dash.join_room': '进入在线教室',
    'dash.review_tutor': '评价课程',
    'dash.no_lessons': '当前暂无已预约课程。',
    'dash.quick_actions': '快捷操作',
    'dash.status': '状态',
    'dash.actions': '操作',
    'dash.subject': '学科科目',
    'dash.tutor': '授课导师',
    'dash.datetime': '上课时间',
    'dash.duration': '课时时长',

    'common.save': '保存',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.submit': '提交',
    'common.confirm': '确认',
    'common.filter': '筛选',
    'common.search': '搜索',
    'common.notifications': '通知中心',
    'common.mark_all_read': '全部标为已读',
    'common.no_notifications': '暂无新通知。',
    'common.saving': '正在保存设置...',
    'common.saved': '偏好设置已成功保存。',

    'toast.theme_saved': '外观主题已成功保存并实时应用于全站。',
    'toast.font_saved': '界面字体大小已更新并全局生效。',
    'toast.lang_saved': '显示语言已保存并全站更新。',
    'toast.tz_saved': '首选时区已成功更新。',
    'toast.notif_saved': '通知偏好已同步至您的账户。',
    'toast.error_sync': '同步至服务器失败，当前使用本地设置。'
  },

  'ja-JP': {
    'nav.home': 'ホーム',
    'nav.tutors': '講師を探す',
    'nav.pricing': '料金プラン',
    'nav.buddy': 'バディ＆アリーナ',
    'nav.virtual_room': 'バーチャル教室',
    'nav.student_portal': '受講生ポータル',
    'nav.teacher_portal': '講師ポータル',
    'nav.admin_portal': '管理ポータル',
    'nav.profile': 'プロフィール＆設定',
    'nav.login': 'ログイン',
    'nav.get_started': '今すぐ始める',
    'nav.logout': 'ログアウト',
    'nav.how_it_works': 'ご利用の流れ',
    'nav.dashboard': 'ダッシュボード',

    'settings.title': '設定と環境設定',
    'settings.subtitle': '表示テーマ、文字サイズ、言語設定、通知、アカウントセキュリティを管理できます。',
    'settings.appearance_theme': '表示テーマ',
    'settings.light_mode': 'ライトモード',
    'settings.light_mode_desc': '温かみのあるクリーム＆ゴールド',
    'settings.dark_mode': 'ダークモード',
    'settings.dark_mode_desc': '上質な黒曜石＆ラグジュアリーゴールド',
    'settings.font_size': 'インターフェース文字サイズ',
    'settings.font_size_desc': '画面全体の文字サイズを調整して、快適に閲覧いただけます。',
    'settings.font_small': '小さめ (14px)',
    'settings.font_small_desc': 'コンパクトで見やすい配置',
    'settings.font_normal': '標準 (16px)',
    'settings.font_normal_desc': 'バランスの良い標準設定',
    'settings.font_large': '大きめ (18px)',
    'settings.font_large_desc': '視認性を高めた大きめ表示',
    'settings.language': '表示言語',
    'settings.timezone': '優先タイムゾーン',
    'settings.notifications': '通知の環境設定',
    'settings.notif_lessons': 'レッスン開始3時間前リマインダー',
    'settings.notif_lessons_desc': '50分の個別レッスン開始3時間前に通知を受信します',
    'settings.notif_calendar': 'カレンダー同期アラート',
    'settings.notif_calendar_desc': '講師が予約を確認・変更した際に通知します',
    'settings.notif_messages': '講師からのダイレクトメッセージ',
    'settings.notif_messages_desc': '学習ノートやメッセージが届いた際に即時通知します',
    'settings.notif_reports': '週刊学習ダイジェスト',
    'settings.notif_reports_desc': '週ごとの学習成果と残りレッスン数の更新をお届けします',
    'settings.save_profile': '変更を保存する',
    'settings.saving_profile': '保存中...',
    'settings.account_security': 'アカウントセキュリティ',
    'settings.security_desc': '定期的にパスワードを更新し、受講履歴とプランの安全を保護します。',
    'settings.current_password': '現在のパスワード',
    'settings.new_password': '新しいパスワード',
    'settings.confirm_password': '新しいパスワード（確認）',
    'settings.update_password': 'パスワードを更新',
    'settings.updating_password': '更新中...',

    'dash.welcome': 'お帰りなさい、',
    'dash.overview': '学習概要',
    'dash.upcoming_lessons': '予定されているレッスン',
    'dash.milestones': '学習マイルストーン',
    'dash.total_lessons': '受講済みレッスン数',
    'dash.remaining_credits': '残りレッスン枠',
    'dash.study_hours': '総学習時間',
    'dash.grade_level': '学年',
    'dash.active_plan': '有効なプラン',
    'dash.standard_plan': '標準都度受講プラン',
    'dash.all_lessons': 'すべてのレッスン',
    'dash.scheduled': '予約済み',
    'dash.completed': '完了',
    'dash.pending': '確認待ち',
    'dash.cancelled': 'キャンセル済み',
    'dash.book_lesson': 'レッスンを予約',
    'dash.view_tutors': '講師一覧を見る',
    'dash.join_room': 'バーチャル教室に入室',
    'dash.review_tutor': 'レッスンを評価',
    'dash.no_lessons': '現在予約されたレッスンはありません。',
    'dash.quick_actions': 'クイックアクション',
    'dash.status': 'ステータス',
    'dash.actions': '操作',
    'dash.subject': '科目',
    'dash.tutor': '講師',
    'dash.datetime': '日時',
    'dash.duration': '所要時間',

    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.close': '閉じる',
    'common.submit': '送信',
    'common.confirm': '確認',
    'common.filter': '絞り込み',
    'common.search': '検索',
    'common.notifications': '通知',
    'common.mark_all_read': 'すべて既読にする',
    'common.no_notifications': '新しい通知はありません。',
    'common.saving': '設定を保存しています...',
    'common.saved': '設定が正常に保存されました。',

    'toast.theme_saved': '表示テーマが保存され、サイト全体に適用されました。',
    'toast.font_saved': '文字サイズが更新され、全体に反映されました。',
    'toast.lang_saved': '言語設定が保存され、サイト全体が更新されました。',
    'toast.tz_saved': '優先タイムゾーンが正常に更新されました。',
    'toast.notif_saved': '通知設定がアカウントに保存されました。',
    'toast.error_sync': 'サーバーとの同期に失敗しました。ローカル設定を使用します。'
  },

  'fil-PH': {
    'nav.home': 'Tahanan',
    'nav.tutors': 'Maghanap ng Tutor',
    'nav.pricing': 'Presyo',
    'nav.buddy': 'Kasama at Arena',
    'nav.virtual_room': 'Virtual na Silid',
    'nav.student_portal': 'Portal ng Mag-aaral',
    'nav.teacher_portal': 'Portal ng Guro',
    'nav.admin_portal': 'Portal ng Admin',
    'nav.profile': 'Profile at Mga Setting',
    'nav.login': 'Mag-log In',
    'nav.get_started': 'Magsimula Na',
    'nav.logout': 'Mag-log Out',
    'nav.how_it_works': 'Paano Gumagana',
    'nav.dashboard': 'Dashboard',

    'settings.title': 'Mga Setting at Kagustuhan',
    'settings.subtitle': 'I-configure ang tema ng kulay, laki ng font, wika, mga abiso, at seguridad ng account.',
    'settings.appearance_theme': 'Tema ng Hitsura',
    'settings.light_mode': 'Maliwanag na Mode',
    'settings.light_mode_desc': 'Mainit na krema at ginto',
    'settings.dark_mode': 'Madilim na Mode',
    'settings.dark_mode_desc': 'Obsidian at marangyang ginto',
    'settings.font_size': 'Laki ng Font ng Interface',
    'settings.font_size_desc': 'Isaayos ang laki ng teksto sa buong website para sa mas komportableng pagbasa.',
    'settings.font_small': 'Maliit (14px)',
    'settings.font_small_desc': 'Siksik at marami ang kasya',
    'settings.font_normal': 'Normal (16px)',
    'settings.font_normal_desc': 'Karaniwang balanseng sukat',
    'settings.font_large': 'Malaki (18px)',
    'settings.font_large_desc': 'Mas malinaw at madaling basahin',
    'settings.language': 'Wika',
    'settings.timezone': 'Paboritong Timezone',
    'settings.notifications': 'Mga Kagustuhan sa Abiso',
    'settings.notif_lessons': 'Paalala sa Klase Bago Mag-3 Oras',
    'settings.notif_lessons_desc': 'Makatanggap ng abiso 3 oras bago ang nakatakdang 50-minutong klase',
    'settings.notif_calendar': 'Mga Alerto sa Kalendaryo',
    'settings.notif_calendar_desc': 'Ipaalam kapag kinumpirma o inilipat ng tutor ang iskedyul',
    'settings.notif_messages': 'Direktang Mensahe mula sa Guro',
    'settings.notif_messages_desc': 'Mabilisang alerto kapag nagpadala ang iyong tutor ng mga tala o mensahe',
    'settings.notif_reports': 'Lingguhang Ulat sa Pag-aaral',
    'settings.notif_reports_desc': 'Tumanggap ng lingguhang buod ng grado at natitirang kredito ng klase',
    'settings.save_profile': 'I-save ang Mga Pagbabago',
    'settings.saving_profile': 'Inise-save ang mga pagbabago...',
    'settings.account_security': 'Seguridad ng Account',
    'settings.security_desc': 'Palitan ang iyong password upang mapanatiling ligtas ang iyong subscription at talaan.',
    'settings.current_password': 'Kasalukuyang Password',
    'settings.new_password': 'Bagong Password',
    'settings.confirm_password': 'Kumpirmahin ang Bagong Password',
    'settings.update_password': 'Palitan ang Password',
    'settings.updating_password': 'Pinapalitan ang password...',

    'dash.welcome': 'Maligayang pagbabalik,',
    'dash.overview': 'Pangkalahatang-ideya sa Pag-aaral',
    'dash.upcoming_lessons': 'Paparating na Mga Klase',
    'dash.milestones': 'Mga Tagumpay sa Pag-aaral',
    'dash.total_lessons': 'Kabuuan ng Klase',
    'dash.remaining_credits': 'Natitirang Kredito',
    'dash.study_hours': 'Oras ng Pag-aaral',
    'dash.grade_level': 'Baitang',
    'dash.active_plan': 'Aktibong Plano',
    'dash.standard_plan': 'Karaniwang Bayad Bawat Sesyon',
    'dash.all_lessons': 'Lahat ng Klase',
    'dash.scheduled': 'Nakatakda',
    'dash.completed': 'Tapos Na',
    'dash.pending': 'Naghihintay',
    'dash.cancelled': 'Kinansela',
    'dash.book_lesson': 'Magpa-book ng Klase',
    'dash.view_tutors': 'Tumingin ng Mga Tutor',
    'dash.join_room': 'Pumasok sa Virtual na Klase',
    'dash.review_tutor': 'Suriin ang Sesyon',
    'dash.no_lessons': 'Walang nakatakdang klase sa ngayon.',
    'dash.quick_actions': 'Mabilisang Aksyon',
    'dash.status': 'Katayuan',
    'dash.actions': 'Mga Aksyon',
    'dash.subject': 'Paksa',
    'dash.tutor': 'Tutor',
    'dash.datetime': 'Petsa at Oras',
    'dash.duration': 'Tagal',

    'common.save': 'I-save',
    'common.cancel': 'Kanselahin',
    'common.close': 'Isara',
    'common.submit': 'Isumite',
    'common.confirm': 'Kumpirmahin',
    'common.filter': 'Salain',
    'common.search': 'Maghanap',
    'common.notifications': 'Mga Abiso',
    'common.mark_all_read': 'Markahan lahat bilang nabasa na',
    'common.no_notifications': 'Walang bagong abiso.',
    'common.saving': 'Inise-save ang setting...',
    'common.saved': 'Matagumpay na na-save ang kagustuhan.',

    'toast.theme_saved': 'Tema ng kulay na-save at inilapat sa buong website.',
    'toast.font_saved': 'Laki ng font na-update sa buong sistema.',
    'toast.lang_saved': 'Kagustuhan sa wika na-save at na-update sa buong website.',
    'toast.tz_saved': 'Paboritong timezone matagumpay na na-update.',
    'toast.notif_saved': 'Kagustuhan sa abiso na-save sa iyong account.',
    'toast.error_sync': 'Palyado ang pag-sync sa server. Ginagamit ang lokal na setting.'
  }
};

const I18n = {
  currentLanguage: 'en-US',

  init() {
    let saved = 'en-US';
    try {
      const user = Storage.getUser();
      const userPrefs = user ? Storage.getUserPreferences(user.id) : null;
      saved = (userPrefs && userPrefs.language) || localStorage.getItem('aviora_language') || 'en-US';
    } catch (e) {}

    this.applyLanguage(saved, false);
  },

  t(key, fallback = '') {
    const lang = this.currentLanguage || 'en-US';
    const dict = I18N_TRANSLATIONS[lang] || I18N_TRANSLATIONS['en-US'];
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const defaultDict = I18N_TRANSLATIONS['en-US'];
    if (defaultDict && defaultDict[key] !== undefined) {
      return defaultDict[key];
    }
    return fallback || key;
  },

  applyLanguage(lang, dispatchEvent = true) {
    if (!I18N_TRANSLATIONS[lang]) {
      lang = 'en-US';
    }
    this.currentLanguage = lang;
    document.documentElement.setAttribute('lang', lang);

    try {
      const user = Storage.getUser();
      if (user && user.id) {
        localStorage.setItem(`aviora_language_${user.id}`, lang);
      }
      localStorage.setItem('aviora_language', lang);
    } catch (e) {}

    // Translate DOM elements marked with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.t(key);
        if (text) {
          // If element has icon children, preserve icons or update only text node
          const icon = el.querySelector('svg, i, span.badge-gold, span.badge-secondary');
          if (icon && !el.classList.contains('preserve-no-icon')) {
            // Find text node
            let foundText = false;
            for (let i = 0; i < el.childNodes.length; i++) {
              if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].textContent.trim().length > 0) {
                el.childNodes[i].textContent = ' ' + text;
                foundText = true;
                break;
              }
            }
            if (!foundText) {
              el.appendChild(document.createTextNode(' ' + text));
            }
          } else {
            el.textContent = text;
          }
        }
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    // Translate Core Nav Links
    this.translateStandardElements();

    if (dispatchEvent) {
      window.dispatchEvent(new CustomEvent('aviora-language-changed', { detail: { language: lang } }));
    }
  },

  translateStandardElements() {
    // Navigation items
    const navMap = {
      'nav-link-tutors': 'nav.tutors',
      'nav-link-pricing': 'nav.pricing',
      'nav-link-buddy': 'nav.buddy',
      'nav-link-room': 'nav.virtual_room',
      'nav-link-portal': 'nav.student_portal',
      'nav-user-profile-btn': 'nav.profile',
      'user-logout-btn': 'nav.logout'
    };

    Object.keys(navMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = this.t(navMap[id]);
      }
    });

    // Settings Profile Card Header
    const profCardTitle = document.querySelector('.profile-card-title');
    if (profCardTitle) {
      const svg = profCardTitle.querySelector('svg');
      const text = this.t('settings.title');
      if (svg) {
        profCardTitle.innerHTML = '';
        profCardTitle.appendChild(svg);
        profCardTitle.appendChild(document.createTextNode(text));
      } else {
        profCardTitle.textContent = text;
      }
    }
    const profCardSub = document.querySelector('.profile-card-sub');
    if (profCardSub) profCardSub.textContent = this.t('settings.subtitle');

    // Save Profile button
    const btnSaveProf = document.getElementById('btn-save-profile');
    if (btnSaveProf && !btnSaveProf.disabled) {
      btnSaveProf.textContent = this.t('settings.save_profile');
    }

    // Password submit button
    const btnSavePass = document.getElementById('btn-save-password');
    if (btnSavePass && !btnSavePass.disabled) {
      btnSavePass.textContent = this.t('settings.update_password');
    }

    // Notification toggles descriptions and titles
    const notifTitle1 = document.querySelector('#notif-lessons')?.closest('.setting-switch-row')?.querySelector('.setting-switch-title');
    if (notifTitle1) {
      const svg = notifTitle1.querySelector('svg');
      if (svg) notifTitle1.innerHTML = `${svg.outerHTML} ${this.t('settings.notif_lessons')}`;
    }
    const notifDesc1 = document.querySelector('#notif-lessons')?.closest('.setting-switch-row')?.querySelector('.setting-switch-desc');
    if (notifDesc1) notifDesc1.textContent = this.t('settings.notif_lessons_desc');

    const notifTitle2 = document.querySelector('#notif-calendar')?.closest('.setting-switch-row')?.querySelector('.setting-switch-title');
    if (notifTitle2) {
      const svg = notifTitle2.querySelector('svg');
      if (svg) notifTitle2.innerHTML = `${svg.outerHTML} ${this.t('settings.notif_calendar')}`;
    }
    const notifDesc2 = document.querySelector('#notif-calendar')?.closest('.setting-switch-row')?.querySelector('.setting-switch-desc');
    if (notifDesc2) notifDesc2.textContent = this.t('settings.notif_calendar_desc');

    const notifTitle3 = document.querySelector('#notif-messages')?.closest('.setting-switch-row')?.querySelector('.setting-switch-title');
    if (notifTitle3) {
      const svg = notifTitle3.querySelector('svg');
      if (svg) notifTitle3.innerHTML = `${svg.outerHTML} ${this.t('settings.notif_messages')}`;
    }
    const notifDesc3 = document.querySelector('#notif-messages')?.closest('.setting-switch-row')?.querySelector('.setting-switch-desc');
    if (notifDesc3) notifDesc3.textContent = this.t('settings.notif_messages_desc');

    const notifTitle4 = document.querySelector('#notif-reports')?.closest('.setting-switch-row')?.querySelector('.setting-switch-title');
    if (notifTitle4) {
      const svg = notifTitle4.querySelector('svg');
      if (svg) notifTitle4.innerHTML = `${svg.outerHTML} ${this.t('settings.notif_reports')}`;
    }
    const notifDesc4 = document.querySelector('#notif-reports')?.closest('.setting-switch-row')?.querySelector('.setting-switch-desc');
    if (notifDesc4) notifDesc4.textContent = this.t('settings.notif_reports_desc');
  }
};

window.I18n = I18n;
