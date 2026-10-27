/**
 * AVIORA EDUCATION - MULTI-LANGUAGE INTERNATIONALIZATION (i18n) ENGINE
 * Supports: en-US (English), es-ES (Español), fr-FR (Français),
 *           de-DE (Deutsch), zh-CN (中文), ja-JP (日本語), fil-PH / tl-PH (Filipino)
 */

const I18N_TRANSLATIONS = {
  'en-US': {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.tutors': 'Find Tutors',
    'nav.pricing': 'Subscription',
    'nav.subscriptions': 'Subscription',
    'nav.buddy': 'Aviora Buddy',
    'nav.virtual_room': 'Virtual Room',
    'nav.student_portal': 'Student Portal',
    'nav.teacher_portal': 'Teacher Portal',
    'nav.admin_portal': 'Admin Portal',
    'nav.profile': 'Profile',
    'nav.login': 'Log In',
    'nav.signup': 'Sign Up',
    'nav.get_started': 'Get Started',
    'nav.logout': 'Log Out',
    'nav.how_it_works': 'How It Works',
    'nav.dashboard': 'Dashboard',
    'nav.class': 'Class',
    'nav.students': 'Students',
    'nav.schedule': 'Schedule',

    // Profile & Settings
    'settings.title': 'Settings & Preferences',
    'settings.subtitle': 'Configure display themes, internationalization, session notifications, and account security.',
    'settings.appearance_theme': 'Appearance Theme',
    'settings.light_mode': 'Light Mode',
    'settings.light_mode_desc': 'Warm cream & gold canvas',
    'settings.dark_mode': 'Dark Mode',
    'settings.dark_mode_desc': 'Obsidian & luxury gold',
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
    // Auth & Confirmation
    'auth.confirm_logout_title': 'Confirm Log Out',
    'auth.confirm_logout_msg': 'Are you sure you want to log out of your Aviora Education account? This prevents accidental session loss.',

    // Toasts
    'toast.theme_saved': 'Appearance theme saved and applied across the website.',
    'toast.lang_saved': 'Language preference saved and updated across the website.',
    'toast.tz_saved': 'Preferred timezone updated successfully.',
    'toast.notif_saved': 'Notification preference updated and saved to your account.',
    'toast.error_sync': 'Failed to synchronize preferences to server. Using local settings.'
  },

  'es-ES': {
    'nav.home': 'Inicio',
    'nav.about': 'Acerca de',
    'nav.tutors': 'Buscar Tutores',
    'nav.pricing': 'Suscripción',
    'nav.subscriptions': 'Suscripción',
    'nav.buddy': 'Aviora Buddy',
    'nav.virtual_room': 'Aula Virtual',
    'nav.student_portal': 'Portal de Estudiante',
    'nav.teacher_portal': 'Portal de Profesor',
    'nav.admin_portal': 'Portal de Administrador',
    'nav.profile': 'Perfil',
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Registrarse',
    'nav.get_started': 'Empezar',
    'nav.logout': 'Cerrar Sesión',
    'nav.how_it_works': 'Cómo Funciona',
    'nav.dashboard': 'Panel Principal',
    'nav.class': 'Clases',
    'nav.students': 'Estudiantes',
    'nav.schedule': 'Horario',

    'settings.title': 'Ajustes y Preferencias',
    'settings.subtitle': 'Configura temas de visualización, internacionalización, notificaciones y seguridad.',
    'settings.appearance_theme': 'Tema de Apariencia',
    'settings.light_mode': 'Modo Claro',
    'settings.light_mode_desc': 'Lienzo crema cálido y oro',
    'settings.dark_mode': 'Modo Oscuro',
    'settings.dark_mode_desc': 'Obsidiana y oro de lujo',
    'settings.language': 'Idioma',
    'settings.timezone': 'Zona Horaria Preferida',
    'settings.notifications': 'Preferencias de Notificación',
    'settings.notif_lessons': 'Recordatorios de Clase de 3 Horas',
    'settings.notif_lessons_desc': 'Recibe alerta 3 horas antes de tu clase programada de 50 minutos',
    'settings.notif_calendar': 'Alertas de Sincronización de Calendario',
    'settings.notif_calendar_desc': 'Avisar cuando un tutor confirme, reprograme o actualice los detalles de la sesión',
    'settings.notif_messages': 'Mensajes Directos del Educador',
    'settings.notif_messages_desc': 'Alertas instantáneas cuando un tutor asignado envíe notas de estudio o mensajes',
    'settings.notif_reports': 'Resumen Académico Semanal',
    'settings.notif_reports_desc': 'Recibe resúmenes semanales de rendimiento y créditos de clase restantes',
    'settings.save_profile': 'Guardar Cambios de Perfil',
    'settings.saving_profile': 'Guardando Cambios...',
    'settings.account_security': 'Seguridad de la Cuenta',
    'settings.security_desc': 'Actualiza tu contraseña para asegurar que tu historial y suscripción estén protegidos.',
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
    'dash.grade_level': 'Nivel de Grado',
    'dash.active_plan': 'Plan Activo',
    'dash.standard_plan': 'Pago por sesión estándar',
    'dash.all_lessons': 'Todas las Clases',
    'dash.scheduled': 'Programada',
    'dash.completed': 'Completada',
    'dash.pending': 'Pendiente',
    'dash.cancelled': 'Cancelada',
    'dash.book_lesson': 'Reservar una Clase',
    'dash.view_tutors': 'Explorar Tutores',
    'dash.join_room': 'Entrar a la Clase Virtual',
    'dash.review_tutor': 'Evaluar Sesión',
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
    'common.no_notifications': 'No hay nuevas notificaciones.',
    'common.saving': 'Guardando preferencia...',
    'common.saved': 'Preferencia guardada con éxito.',
    'auth.confirm_logout_title': 'Confirmar Cierre de Sesión',
    'auth.confirm_logout_msg': '¿Está seguro de que desea cerrar la sesión de su cuenta de Aviora Education? Esto ayuda a prevenir el cierre accidental.',

    'toast.theme_saved': 'Tema de apariencia guardado y aplicado en todo el sitio web.',
    'toast.lang_saved': 'Preferencia de idioma guardada y actualizada en todo el sitio web.',
    'toast.tz_saved': 'Zona horaria preferida actualizada con éxito.',
    'toast.notif_saved': 'Preferencia de notificación guardada en tu cuenta.',
    'toast.error_sync': 'Error al sincronizar con el servidor. Usando ajustes locales.'
  },

  'fr-FR': {
    'nav.home': 'Accueil',
    'nav.about': 'À propos',
    'nav.tutors': 'Trouver des Tuteurs',
    'nav.pricing': 'Abonnement',
    'nav.subscriptions': 'Abonnement',
    'nav.buddy': 'Aviora Buddy',
    'nav.virtual_room': 'Salle Virtuelle',
    'nav.student_portal': 'Portail Étudiant',
    'nav.teacher_portal': 'Portail Enseignant',
    'nav.admin_portal': 'Portail Admin',
    'nav.profile': 'Profil',
    'nav.login': 'Connexion',
    'nav.signup': 'Inscription',
    'nav.get_started': 'Commencer',
    'nav.logout': 'Déconnexion',
    'nav.how_it_works': 'Comment ça marche',
    'nav.dashboard': 'Tableau de bord',
    'nav.class': 'Cours',
    'nav.students': 'Étudiants',
    'nav.schedule': 'Emploi du temps',

    'settings.title': 'Paramètres & Préférences',
    'settings.subtitle': 'Configurez les thèmes d’affichage, l’internationalisation, les alertes et la sécurité.',
    'settings.appearance_theme': 'Thème d’Apparence',
    'settings.light_mode': 'Mode Clair',
    'settings.light_mode_desc': 'Crème chaleureuse et touches d’or',
    'settings.dark_mode': 'Mode Sombre',
    'settings.dark_mode_desc': 'Obsidienne et or prestigieux',
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
    'auth.confirm_logout_title': 'Confirmer la Déconnexion',
    'auth.confirm_logout_msg': 'Êtes-vous sûr de vouloir vous déconnecter de votre compte Aviora Education ? Cela évite les déconnexions accidentelles.',

    'toast.theme_saved': 'Thème d’apparence enregistré et appliqué à tout le site.',
    'toast.lang_saved': 'Langue enregistrée et mise à jour sur tout le site.',
    'toast.tz_saved': 'Fuseau horaire préféré mis à jour.',
    'toast.notif_saved': 'Préférences de notification enregistrées sur votre compte.',
    'toast.error_sync': 'Échec de synchronisation avec le serveur. Utilisation des données locales.'
  },

  'de-DE': {
    'nav.home': 'Startseite',
    'nav.about': 'Über uns',
    'nav.tutors': 'Tutoren finden',
    'nav.pricing': 'Abonnement',
    'nav.subscriptions': 'Abonnement',
    'nav.buddy': 'Aviora Buddy',
    'nav.virtual_room': 'Virtueller Raum',
    'nav.student_portal': 'Studentenportal',
    'nav.teacher_portal': 'Lehrerportal',
    'nav.admin_portal': 'Adminportal',
    'nav.profile': 'Profil',
    'nav.login': 'Anmelden',
    'nav.signup': 'Registrieren',
    'nav.get_started': 'Loslegen',
    'nav.logout': 'Abmelden',
    'nav.how_it_works': 'So funktioniert es',
    'nav.dashboard': 'Dashboard',
    'nav.class': 'Unterricht',
    'nav.students': 'Schüler',
    'nav.schedule': 'Zeitplan',

    'settings.title': 'Einstellungen & Präferenzen',
    'settings.subtitle': 'Passen Sie Anzeigedesigns, Internationalisierung, Benachrichtigungen und Sicherheit an.',
    'settings.appearance_theme': 'Erscheinungsbild',
    'settings.light_mode': 'Heller Modus',
    'settings.light_mode_desc': 'Warme Creme & edles Gold',
    'settings.dark_mode': 'Dunkler Modus',
    'settings.dark_mode_desc': 'Obsidian & Luxusgold',
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
    'auth.confirm_logout_title': 'Abmeldung Bestätigen',
    'auth.confirm_logout_msg': 'Sind Sie sicher, dass Sie sich von Ihrem Aviora Education-Konto abmelden möchten? Dies verhindert versehentliches Abmelden.',

    'toast.theme_saved': 'Design gespeichert und auf der gesamten Website angewendet.',
    'toast.lang_saved': 'Sprache gespeichert und überall aktualisiert.',
    'toast.tz_saved': 'Bevorzugte Zeitzone erfolgreich aktualisiert.',
    'toast.notif_saved': 'Benachrichtigungseinstellung in Ihrem Konto gespeichert.',
    'toast.error_sync': 'Server-Synchronisation fehlgeschlagen. Lokale Werte werden genutzt.'
  },

  'zh-CN': {
    'nav.home': '首页',
    'nav.about': '关于我们',
    'nav.tutors': '寻找导师',
    'nav.pricing': '课程订阅',
    'nav.subscriptions': '课程订阅',
    'nav.buddy': 'Aviora 伙伴',
    'nav.virtual_room': '虚拟教室',
    'nav.student_portal': '学生门户',
    'nav.teacher_portal': '教师门户',
    'nav.admin_portal': '管理门户',
    'nav.profile': '个人资料',
    'nav.login': '登录',
    'nav.signup': '注册',
    'nav.get_started': '开始使用',
    'nav.logout': '登出',
    'nav.how_it_works': '服务流程',
    'nav.dashboard': '控制台',
    'nav.class': '课堂',
    'nav.students': '学生管理',
    'nav.schedule': '日程安排',

    'settings.title': '设置与偏好',
    'settings.subtitle': '自定义系统外观主题、多语言环境、通知偏好和账户安全。',
    'settings.appearance_theme': '外观主题',
    'settings.light_mode': '浅色模式',
    'settings.light_mode_desc': '温润米白与暖金质感',
    'settings.dark_mode': '深色模式',
    'settings.dark_mode_desc': '黑曜石沉稳与奢华金',
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
    'auth.confirm_logout_title': '确认登出',
    'auth.confirm_logout_msg': '您确定要退出您的 Aviora Education 账户吗？这有助于防止误触导致的登出。',

    'toast.theme_saved': '外观主题已成功保存并实时应用于全站。',
    'toast.lang_saved': '显示语言已保存并全站更新。',
    'toast.tz_saved': '首选时区已成功更新。',
    'toast.notif_saved': '通知偏好已同步至您的账户。',
    'toast.error_sync': '同步至服务器失败，当前使用本地设置。'
  },

  'ja-JP': {
    'nav.home': 'ホーム',
    'nav.about': '会社概要',
    'nav.tutors': '講師を探す',
    'nav.pricing': 'サブスクリプション',
    'nav.subscriptions': 'サブスクリプション',
    'nav.buddy': 'Aviora バディ',
    'nav.virtual_room': 'バーチャル教室',
    'nav.student_portal': '受講生ポータル',
    'nav.teacher_portal': '講師ポータル',
    'nav.admin_portal': '管理ポータル',
    'nav.profile': 'プロフィール',
    'nav.login': 'ログイン',
    'nav.signup': '新規登録',
    'nav.get_started': '今すぐ始める',
    'nav.logout': 'ログアウト',
    'nav.how_it_works': 'ご利用の流れ',
    'nav.dashboard': 'ダッシュボード',
    'nav.class': '授業',
    'nav.students': '生徒管理',
    'nav.schedule': 'スケジュール',

    'settings.title': '設定と環境設定',
    'settings.subtitle': '表示テーマ、言語設定、通知、アカウントセキュリティを管理できます。',
    'settings.appearance_theme': '表示テーマ',
    'settings.light_mode': 'ライトモード',
    'settings.light_mode_desc': '温かみのあるクリーム＆ゴールド',
    'settings.dark_mode': 'ダークモード',
    'settings.dark_mode_desc': '上質な黒曜石＆ラグジュアリーゴールド',
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
    'auth.confirm_logout_title': 'ログアウトの確認',
    'auth.confirm_logout_msg': 'Aviora Education アカウントからログアウトしてもよろしいですか？誤操作によるログアウトを防ぐための確認です。',

    'toast.theme_saved': '表示テーマが保存され、サイト全体に適用されました。',
    'toast.lang_saved': '言語設定が保存され、サイト全体が更新されました。',
    'toast.tz_saved': '優先タイムゾーンが正常に更新されました。',
    'toast.notif_saved': '通知設定がアカウントに保存されました。',
    'toast.error_sync': 'サーバーとの同期に失敗しました。ローカル設定を使用します。'
  },

  'fil-PH': {
    'nav.home': 'Tahanan',
    'nav.about': 'Tungkol sa Amin',
    'nav.tutors': 'Maghanap ng Tutor',
    'nav.pricing': 'Subskripsyon',
    'nav.subscriptions': 'Subskripsyon',
    'nav.buddy': 'Aviora Buddy',
    'nav.virtual_room': 'Virtual na Silid',
    'nav.student_portal': 'Portal ng Mag-aaral',
    'nav.teacher_portal': 'Portal ng Guro',
    'nav.admin_portal': 'Portal ng Admin',
    'nav.profile': 'Profile',
    'nav.login': 'Mag-log In',
    'nav.signup': 'Mag-sign Up',
    'nav.get_started': 'Magsimula Na',
    'nav.logout': 'Mag-log Out',
    'nav.how_it_works': 'Paano Gumagana',
    'nav.dashboard': 'Dashboard',
    'nav.class': 'Klase',
    'nav.students': 'Mga Mag-aaral',
    'nav.schedule': 'Iskedyul',

    'settings.title': 'Mga Setting at Kagustuhan',
    'settings.subtitle': 'I-configure ang tema ng kulay, wika, mga abiso, at seguridad ng account.',
    'settings.appearance_theme': 'Tema ng Hitsura',
    'settings.light_mode': 'Maliwanag na Mode',
    'settings.light_mode_desc': 'Mainit na krema at ginto',
    'settings.dark_mode': 'Madilim na Mode',
    'settings.dark_mode_desc': 'Obsidian at marangyang ginto',
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
    'auth.confirm_logout_title': 'Kumpirmahin ang Pag-log Out',
    'auth.confirm_logout_msg': 'Sigurado ka bang nais mong mag-log out sa iyong Aviora Education account? Pinipigilan nito ang hindi sinasadyang pag-alis.',

    'toast.theme_saved': 'Tema ng kulay na-save at inilapat sa buong website.',
    'toast.lang_saved': 'Kagustuhan sa wika na-save at na-update sa buong website.',
    'toast.tz_saved': 'Paboritong timezone matagumpay na na-update.',
    'toast.notif_saved': 'Kagustuhan sa abiso na-save sa iyong account.',
    'toast.error_sync': 'Palyado ang pag-sync sa server. Ginagamit ang lokal na setting.'
  }
};

// Comprehensive English-to-Target Phrase & Word Dictionary
const PHRASE_DICTIONARY = {
  'es-ES': {
    // Nav & Common
    'Class': 'Clases',
    'Students': 'Estudiantes',
    'Schedule': 'Horario',
    'Home': 'Inicio',
    'About': 'Acerca de',
    'Subscription': 'Suscripción',
    'Subscriptions': 'Suscripciones',
    'Find Tutors': 'Buscar Tutores',
    'Tutors': 'Tutores',
    'Aviora Buddy': 'Aviora Buddy',
    'Buddy & Arena': 'Compañero y Arena',
    'How It Works': 'Cómo Funciona',
    'Dashboard': 'Panel Principal',
    'Log In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse',
    'Profile': 'Perfil',
    'Log Out': 'Cerrar Sesión',
    'Notifications': 'Notificaciones',
    'Mark all read': 'Marcar todo leído',
    'Mark all as read': 'Marcar todo como leído',
    'Filtered': 'Filtrado',
    'Back to Dashboard': 'Volver al Panel',
    'Save': 'Guardar',
    'Cancel': 'Cancelar',
    'Close': 'Cerrar',
    'Submit': 'Enviar',
    'Confirm': 'Confirmar',
    'Search': 'Buscar',
    'Filter': 'Filtrar',
    'Edit': 'Editar',
    'Delete': 'Eliminar',
    'Status': 'Estado',
    'Actions': 'Acciones',
    'Subject': 'Materia',
    'Tutor': 'Tutor',
    'Date & Time': 'Fecha y Hora',
    'Duration': 'Duración',
    'Hourly Rate': 'Tarifa por Hora',
    'Book Lesson': 'Reservar Clase',
    'Book a Lesson': 'Reservar una Clase',
    'View Profile': 'Ver Perfil',
    'Explore Tutors': 'Explorar Tutores',
    'Join Virtual Class': 'Entrar a Clase Virtual',
    'Review Session': 'Evaluar Sesión',
    'Academic Overview': 'Resumen Académico',
    'Upcoming Lessons': 'Próximas Clases',
    'Learning Milestones': 'Hitos de Aprendizaje',
    'Total Lessons': 'Total de Clases',
    'Remaining Credits': 'Créditos Restantes',
    'Study Hours': 'Horas de Estudio',
    'Grade Level': 'Nivel de Grado',
    'Active Plan': 'Plan Activo',
    'Quick Actions': 'Acciones Rápidas',
    'All Lessons': 'Todas las Clases',
    'Scheduled': 'Programada',
    'Completed': 'Completada',
    'Pending': 'Pendiente',
    'Cancelled': 'Cancelada',
    
    // Profile Fields
    'Full Name': 'Nombre Completo',
    'Email Address': 'Correo Electrónico',
    'Phone Contact': 'Teléfono de Contacto',
    'Current Grade Level': 'Nivel de Grado Actual',
    'School / Institution Name': 'Nombre de Escuela / Institución',
    'Primary Learning Goals': 'Objetivos Principales de Aprendizaje',
    'Target Subjects of Interest': 'Materias de Interés',
    'Save Profile Changes': 'Guardar Cambios de Perfil',
    'Settings & Preferences': 'Ajustes y Preferencias',
    'Appearance Theme': 'Tema de Apariencia',
    'Light Mode': 'Modo Claro',
    'Warm cream & gold canvas': 'Lienzo crema cálido y oro',
    'Dark Mode': 'Modo Oscuro',
    'Obsidian & luxury gold': 'Obsidiana y oro de lujo',
    'Language': 'Idioma',
    'Preferred Timezone': 'Zona Horaria Preferida',
    'Notification Preferences': 'Preferencias de Notificación',
    '3-Hour Lesson Reminders': 'Recordatorios de Clase de 3 Horas',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': 'Recibe alerta 3 horas antes de tu clase programada de 50 minutos',
    'Calendar Sync Alerts': 'Alertas de Sincronización de Calendario',
    'Notify when a tutor confirms, reschedules, or updates session details': 'Avisar cuando un tutor confirme, reprograme o actualice los detalles',
    'Direct Educator Messages': 'Mensajes Directos del Educador',
    'Instant alerts when an assigned educator sends study notes or messages': 'Alertas instantáneas cuando un tutor asignado envíe notas o mensajes',
    'Weekly Academic Digest': 'Resumen Académico Semanal',
    'Receive weekly performance summaries and remaining lesson credit updates': 'Recibe resúmenes semanales de rendimiento y créditos restantes',
    'Account Security': 'Seguridad de la Cuenta',
    'Current Password': 'Contraseña Actual',
    'New Password': 'Nueva Contraseña',
    'Confirm New Password': 'Confirmar Nueva Contraseña',
    'Update Password': 'Actualizar Contraseña',
    'Saved to Account': 'Guardado en la Cuenta',
    'Manage Subscription': 'Gestionar Suscripción',
    'Verified Student Account': 'Cuenta de Estudiante Verificada',
    
    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': 'Tutoría Académica de Élite 1 a 1 y Tutoría con IA',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': 'Transforma tu aprendizaje con educadores de la Ivy League y herramientas interactivas de vanguardia.',
    'Find Your Tutor': 'Encuentra a tu Tutor',
    'Explore Subscription': 'Explorar Suscripciones',
    '500+ Expert Tutors': '500+ Tutores Expertos',
    '99.4% Pass Rate': '99.4% Tasa de Aprobación',
    '50+ Subjects': '50+ Materias',
    'Our Mission': 'Nuestra Misión',
    'About Aviora Education': 'Sobre Aviora Education',
    'Redefining High School & University Academic Excellence': 'Redefiniendo la Excelencia Académica Escolar y Universitaria',
    'Transparent, Flexible Membership Plans': 'Planes de Membresía Transparentes y Flexibles',
    'Starter': 'Inicial',
    'Scholar': 'Académico',
    'Elite Prodigy': 'Prodigio de Élite',
    'Choose Plan': 'Elegir Plan',
    'Purchase Credits': 'Comprar Créditos',
    'Credits Remaining': 'Créditos Restantes',
    'All Subjects': 'Todas las Materias',
    'Mathematics': 'Matemáticas',
    'Physics': 'Física',
    'Chemistry': 'Química',
    'Biology': 'Biología',
    'Computer Science': 'Ciencias de la Computación',
    'English & Literature': 'Inglés y Literatura',
    'Economics': 'Economía',
    'History': 'Historia',
    'Join with Buddy Code': 'Unirse con Código Buddy',
    'Instant Passcode': 'Código Instantáneo',
    'Join Aviora Buddy Session': 'Unirse a Sesión de Aviora Buddy',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': 'Plataforma Premier de Mentoría Académica',
    'Your Potential': 'Tu Potencial',
    'Your Path': 'Tu Camino',
    'Your Future': 'Tu Futuro',
    'Your Potential.': 'Tu Potencial.',
    'Your Path.': 'Tu Camino.',
    'Your Future.': 'Tu Futuro.',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Aviora Education conecta a estudiantes ambiciosos con tutores académicos rigurosamente seleccionados de Stanford, MIT, Harvard y Columbia. Domina cálculo, física, programación, química y literatura con mentoría personalizada 1 a 1.',
    'Find Your Tutor': 'Encuentra a tu Tutor',
    'Become an Aviora Tutor': 'Conviértete en Tutor de Aviora',
    'Top 1% Educators': 'Educadores del Top 1%',
    'Strict Degree Verification': 'Verificación Estricta de Títulos',
    '98% Grade Boost': '98% de Mejora de Calificaciones',
    'Proven Conceptual Mastery': 'Dominio Conceptual Comprobado',
    'Faculty Pedigree & University Network': 'Red Universitaria y Prestigio Docente',
    'Faculty Pedigree & University Network:': 'Red Universitaria y Prestigio Docente:',
    'Stanford University': 'Universidad de Stanford',
    'Harvard University': 'Universidad de Harvard',
    'MIT': 'MIT',
    'Columbia University': 'Universidad de Columbia',
    'University of Cambridge': 'Universidad de Cambridge',
    'Princeton University': 'Universidad de Princeton',
    '1-on-1 Bespoke Instruction': 'Instrucción Personalizada 1 a 1',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': 'Evaluaciones diagnósticas adaptadas al plan de estudios exacto del estudiante, exámenes AP o concursos.',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': 'Evaluaciones diagnósticas adaptadas al plan de estudios exacto del estudiante, exámenes AP o plan universitario.',
    '100% Vetted Faculty': 'Profesorado 100% Verificado',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': 'Auditorías de antecedentes, verificación de diplomas y evaluaciones pedagógicas por nuestro Consejo Académico.',
    'Complete Schedule Sovereignty': 'Soberanía Completa de Horarios',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': 'Fechas y horarios flexibles elegidos por el estudiante, con pagos transparentes y ritmo a medida.',
    'Explore Student Achievements & Top Tutors': 'Explorar Logros de Estudiantes y Mejores Tutores',
    'Student\'s Achievement': 'Logros de Estudiantes',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': 'Explora trabajos originales excepcionales creados por estudiantes de Aviora bajo mentoría individual.',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': '¿Listo para crear proyectos y portafolios de nivel universitario?',
    'Connect with a Mentor': 'Conectar con un Mentor',
    'Connect with a Mentor →': 'Conectar con un Mentor →',
    'Verified Faculty': 'Profesorado Verificado',
    'Top Tutors': 'Mejores Tutores',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': 'Cada tutor de Aviora pasa por verificación de credenciales, antecedentes y evaluación pedagógica.',
    'Browse All Verified Tutors': 'Ver Todos los Tutores Verificados',
    'Browse All Verified Tutors →': 'Ver Todos los Tutores Verificados →',
    'Live Platform Telemetry': 'Telemetría en Vivo de la Plataforma',
    'Real-Time Platform & Subject Analytics': 'Análisis de Materias y Plataforma en Tiempo Real',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': 'Telemetría en directo que refleja la demanda académica en tiempo real en Aviora Education.',
    'Most Frequently Accessed Subjects': 'Materias Más Consultadas',
    'Updated in Real-Time': 'Actualizado en Tiempo Real',
    'Frequently Accessed Study Materials': 'Materiales de Estudio Frecuentes',
    'About Aviora Education': 'Acerca de Aviora Education',
    'Our Mission': 'Nuestra Misión',
    'Our Vision': 'Nuestra Visión',
    'Our Academic Philosophy': 'Filosofía Académica',
    'Redefining High School & University Academic Excellence': 'Redefiniendo la Excelencia Académica',

    'All rights reserved.': 'Todos los derechos reservados.'
  },

  'fr-FR': {
    // Nav & Common
    'Class': 'Cours',
    'Students': 'Étudiants',
    'Schedule': 'Emploi du temps',
    'Home': 'Accueil',
    'About': 'À propos',
    'Subscription': 'Abonnement',
    'Subscriptions': 'Abonnements',
    'Find Tutors': 'Trouver des Tuteurs',
    'Tutors': 'Tuteurs',
    'Aviora Buddy': 'Aviora Buddy',
    'Buddy & Arena': 'Buddy & Arène',
    'How It Works': 'Comment ça marche',
    'Dashboard': 'Tableau de bord',
    'Log In': 'Connexion',
    'Sign Up': 'Inscription',
    'Profile': 'Profil',
    'Log Out': 'Déconnexion',
    'Notifications': 'Notifications',
    'Mark all read': 'Tout marquer comme lu',
    'Mark all as read': 'Tout marquer comme lu',
    'Filtered': 'Filtré',
    'Back to Dashboard': 'Retour au Tableau de bord',
    'Save': 'Enregistrer',
    'Cancel': 'Annuler',
    'Close': 'Fermer',
    'Submit': 'Soumettre',
    'Confirm': 'Confirmer',
    'Search': 'Rechercher',
    'Filter': 'Filtrer',
    'Edit': 'Modifier',
    'Delete': 'Supprimer',
    'Status': 'Statut',
    'Actions': 'Actions',
    'Subject': 'Matière',
    'Tutor': 'Tuteur',
    'Date & Time': 'Date et Heure',
    'Duration': 'Durée',
    'Hourly Rate': 'Taux Horaire',
    'Book Lesson': 'Réserver un Cours',
    'Book a Lesson': 'Réserver un Cours',
    'View Profile': 'Voir le Profil',
    'Explore Tutors': 'Découvrir les Tuteurs',
    'Join Virtual Class': 'Rejoindre la Classe Virtuelle',
    'Review Session': 'Évaluer la Session',
    'Academic Overview': 'Aperçu Académique',
    'Upcoming Lessons': 'Cours à Venir',
    'Learning Milestones': 'Étapes d’Apprentissage',
    'Total Lessons': 'Total des Cours',
    'Remaining Credits': 'Crédits Restants',
    'Study Hours': 'Heures d’Étude',
    'Grade Level': 'Niveau d’Étude',
    'Active Plan': 'Abonnement Actif',
    'Quick Actions': 'Actions Rapides',
    'All Lessons': 'Tous les Cours',
    'Scheduled': 'Planifié',
    'Completed': 'Terminé',
    'Pending': 'En attente',
    'Cancelled': 'Annulé',
    
    // Profile Fields
    'Full Name': 'Nom Complet',
    'Email Address': 'Adresse E-mail',
    'Phone Contact': 'Numéro de Téléphone',
    'Current Grade Level': 'Niveau Scolaire Actuel',
    'School / Institution Name': 'Établissement / École',
    'Primary Learning Goals': 'Objectifs d’Apprentissage',
    'Target Subjects of Interest': 'Matières d’Intérêt',
    'Save Profile Changes': 'Enregistrer les Modifications',
    'Settings & Preferences': 'Paramètres & Préférences',
    'Appearance Theme': 'Thème d’Apparence',
    'Light Mode': 'Mode Clair',
    'Warm cream & gold canvas': 'Crème chaleureuse et touches d’or',
    'Dark Mode': 'Mode Sombre',
    'Obsidian & luxury gold': 'Obsidienne et or prestigieux',
    'Language': 'Langue',
    'Preferred Timezone': 'Fuseau Horaire Préféré',
    'Notification Preferences': 'Préférences de Notification',
    '3-Hour Lesson Reminders': 'Rappels de cours 3 heures avant',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': 'Recevez une notification 3 heures avant votre cours de 50 minutes',
    'Calendar Sync Alerts': 'Alertes de Calendrier',
    'Notify when a tutor confirms, reschedules, or updates session details': 'Notification lorsqu’un tuteur confirme ou met à jour la session',
    'Direct Educator Messages': 'Messages Directs de l’Enseignant',
    'Instant alerts when an assigned educator sends study notes or messages': 'Alertes immédiates en cas de nouveaux messages ou notes',
    'Weekly Academic Digest': 'Synthèse Académique Hebdomadaire',
    'Receive weekly performance summaries and remaining lesson credit updates': 'Recevez un récapitulatif hebdomadaire de vos progrès',
    'Account Security': 'Sécurité du Compte',
    'Current Password': 'Mot de Passe Actuel',
    'New Password': 'Nouveau Mot de Passe',
    'Confirm New Password': 'Confirmer Nouveau Mot de Passe',
    'Update Password': 'Changer le Mot de Passe',
    'Saved to Account': 'Enregistré sur le Compte',
    'Manage Subscription': 'Gérer l’Abonnement',
    'Verified Student Account': 'Compte Étudiant Vérifié',

    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': 'Mentorat Académique d’Élite 1-sur-1 & Tutorat IA',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': 'Transformez votre apprentissage avec des tuteurs d’élite et des outils interactifs de pointe.',
    'Find Your Tutor': 'Trouvez Votre Tuteur',
    'Explore Subscription': 'Découvrir les Abonnements',
    '500+ Expert Tutors': '500+ Tuteurs Experts',
    '99.4% Pass Rate': 'Taux de Réussite de 99.4%',
    '50+ Subjects': '50+ Matières',
    'Our Mission': 'Notre Mission',
    'About Aviora Education': 'À Propos d’Aviora Education',
    'Redefining High School & University Academic Excellence': 'Redéfinir l’Excellence Académique au Lycée et à l’Université',
    'Transparent, Flexible Membership Plans': 'Formules d’Abonnement Claires et Flexibles',
    'Starter': 'Découverte',
    'Scholar': 'Érudit',
    'Elite Prodigy': 'Prodige d’Élite',
    'Choose Plan': 'Choisir cette Formule',
    'Purchase Credits': 'Acheter des Crédits',
    'Credits Remaining': 'Crédits Restants',
    'All Subjects': 'Toutes les Matières',
    'Mathematics': 'Mathématiques',
    'Physics': 'Physique',
    'Chemistry': 'Chimie',
    'Biology': 'Biologie',
    'Computer Science': 'Informatique',
    'English & Literature': 'Anglais & Littérature',
    'Economics': 'Économie',
    'History': 'Histoire',
    'Join with Buddy Code': 'Rejoindre avec un Code Buddy',
    'Instant Passcode': 'Code Instantané',
    'Join Aviora Buddy Session': 'Rejoindre la Session Buddy',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': 'Plateforme d’Élite de Mentorat Académique',
    'Your Potential': 'Votre Potentiel',
    'Your Path': 'Votre Parcours',
    'Your Future': 'Votre Avenir',
    'Your Potential.': 'Votre Potentiel.',
    'Your Path.': 'Votre Parcours.',
    'Your Future.': 'Votre Avenir.',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Aviora Education met en relation des étudiants ambitieux avec des tuteurs rigoureusement sélectionnés de Stanford, MIT, Harvard et Columbia. Maîtrisez le calcul, la physique, la programmation, la chimie et la littérature grâce à un mentorat 1-à-1 sur mesure.',
    'Find Your Tutor': 'Trouver Votre Tuteur',
    'Become an Aviora Tutor': 'Devenir Tuteur Aviora',
    'Top 1% Educators': 'Éducateurs du Top 1%',
    'Strict Degree Verification': 'Vérification Stricte des Diplômes',
    '98% Grade Boost': '98% de Hausse des Notes',
    'Proven Conceptual Mastery': 'Maîtrise Conceptuelle Prouvée',
    'Faculty Pedigree & University Network': 'Réseau Universitaire & Prestigieux Corps Enseignant',
    'Faculty Pedigree & University Network:': 'Réseau Universitaire & Prestigieux Corps Enseignant :',
    'Stanford University': 'Université Stanford',
    'Harvard University': 'Université Harvard',
    'MIT': 'MIT',
    'Columbia University': 'Université Columbia',
    'University of Cambridge': 'Université de Cambridge',
    'Princeton University': 'Université de Princeton',
    '1-on-1 Bespoke Instruction': 'Instruction Personnalisée 1-à-1',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': 'Évaluations diagnostiques directement alignées sur le programme exact de l’élève ou ses examens AP.',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': 'Évaluations diagnostiques directement alignées sur le programme exact de l’élève ou ses examens universitaires.',
    '100% Vetted Faculty': 'Professeurs 100% Vérifiés',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': 'Audits des antécédents, vérification des diplômes et contrôles pédagogiques menés par notre Conseil Académique.',
    'Complete Schedule Sovereignty': 'Souveraineté Totale des Horaires',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': 'Dates et créneaux flexibles choisis par l’étudiant, avec paiements transparents et rythme sur mesure.',
    'Explore Student Achievements & Top Tutors': 'Découvrir les Réussites d’Élèves et Meilleurs Tuteurs',
    'Student\'s Achievement': 'Réalisations des Étudiants',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': 'Explorez des œuvres originales exceptionnelles réalisées par les élèves d’Aviora sous mentorat individuel.',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': 'Prêt à créer des projets et portfolios de calibre universitaire ?',
    'Connect with a Mentor': 'Contacter un Mentor',
    'Connect with a Mentor →': 'Contacter un Mentor →',
    'Verified Faculty': 'Corps Enseignant Vérifié',
    'Top Tutors': 'Meilleurs Tuteurs',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': 'Chaque tuteur Aviora fait l’objet d’une vérification complète de diplômes et d’une évaluation pédagogique.',
    'Browse All Verified Tutors': 'Parcourir Tous les Tuteurs Vérifiés',
    'Browse All Verified Tutors →': 'Parcourir Tous les Tuteurs Vérifiés →',
    'Live Platform Telemetry': 'Télémétrie en Direct de la Plateforme',
    'Real-Time Platform & Subject Analytics': 'Analyses en Temps Réel des Matières et de la Plateforme',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': 'Données en direct reflétant la demande académique en temps réel au sein d’Aviora Education.',
    'Most Frequently Accessed Subjects': 'Matières les Plus Consultées',
    'Updated in Real-Time': 'Mis à Jour en Temps Réel',
    'Frequently Accessed Study Materials': 'Supports d’Étude les Plus Fréquents',
    'About Aviora Education': 'À Propos d’Aviora Education',
    'Our Mission': 'Notre Mission',
    'Our Vision': 'Notre Vision',
    'Our Academic Philosophy': 'Philosophie Pédagogique',
    'Redefining High School & University Academic Excellence': 'Redéfinir l’Excellence Académique au Lycée et à l’Université',

    'All rights reserved.': 'Tous droits réservés.'
  },

  'de-DE': {
    // Nav & Common
    'Class': 'Unterricht',
    'Students': 'Schüler',
    'Schedule': 'Zeitplan',
    'Home': 'Startseite',
    'About': 'Über uns',
    'Subscription': 'Abonnement',
    'Subscriptions': 'Abonnements',
    'Find Tutors': 'Tutoren finden',
    'Tutors': 'Tutoren',
    'Aviora Buddy': 'Aviora Buddy',
    'Buddy & Arena': 'Buddy & Arena',
    'How It Works': 'So funktioniert es',
    'Dashboard': 'Dashboard',
    'Log In': 'Anmelden',
    'Sign Up': 'Registrieren',
    'Profile': 'Profil',
    'Log Out': 'Abmelden',
    'Notifications': 'Benachrichtigungen',
    'Mark all read': 'Alle als gelesen markieren',
    'Mark all as read': 'Alle als gelesen markieren',
    'Filtered': 'Gefiltert',
    'Back to Dashboard': 'Zurück zum Dashboard',
    'Save': 'Speichern',
    'Cancel': 'Abbrechen',
    'Close': 'Schließen',
    'Submit': 'Absenden',
    'Confirm': 'Bestätigen',
    'Search': 'Suchen',
    'Filter': 'Filtern',
    'Edit': 'Bearbeiten',
    'Delete': 'Löschen',
    'Status': 'Status',
    'Actions': 'Aktionen',
    'Subject': 'Fach',
    'Tutor': 'Tutor',
    'Date & Time': 'Datum & Uhrzeit',
    'Duration': 'Dauer',
    'Hourly Rate': 'Stundensatz',
    'Book Lesson': 'Stunde buchen',
    'Book a Lesson': 'Stunde buchen',
    'View Profile': 'Profil ansehen',
    'Explore Tutors': 'Tutoren entdecken',
    'Join Virtual Class': 'Klassenzimmer beitreten',
    'Review Session': 'Sitzung bewerten',
    'Academic Overview': 'Akademische Übersicht',
    'Upcoming Lessons': 'Kommende Stunden',
    'Learning Milestones': 'Lernmeilensteine',
    'Total Lessons': 'Gesamte Stunden',
    'Remaining Credits': 'Verbleibende Guthaben',
    'Study Hours': 'Lernstunden',
    'Grade Level': 'Klassenstufe',
    'Active Plan': 'Aktiver Plan',
    'Quick Actions': 'Schnellaktionen',
    'All Lessons': 'Alle Stunden',
    'Scheduled': 'Geplant',
    'Completed': 'Abgeschlossen',
    'Pending': 'Ausstehend',
    'Cancelled': 'Storniert',
    
    // Profile Fields
    'Full Name': 'Vollständiger Name',
    'Email Address': 'E-Mail-Adresse',
    'Phone Contact': 'Telefonnummer',
    'Current Grade Level': 'Aktuelle Klassenstufe',
    'School / Institution Name': 'Schule / Institution',
    'Primary Learning Goals': 'Hauptlernziele',
    'Target Subjects of Interest': 'Interessengebiete',
    'Save Profile Changes': 'Profiländerungen speichern',
    'Settings & Preferences': 'Einstellungen & Präferenzen',
    'Appearance Theme': 'Erscheinungsbild',
    'Light Mode': 'Heller Modus',
    'Warm cream & gold canvas': 'Warme Creme & edles Gold',
    'Dark Mode': 'Dunkler Modus',
    'Obsidian & luxury gold': 'Obsidian & Luxusgold',
    'Language': 'Sprache',
    'Preferred Timezone': 'Bevorzugte Zeitzone',
    'Notification Preferences': 'Benachrichtigungseinstellungen',
    '3-Hour Lesson Reminders': '3-Stunden-Unterrichtserinnerung',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': 'Erinnerung 3 Stunden vor der geplanten 50-Minuten-Stunde erhalten',
    'Calendar Sync Alerts': 'Kalendersynchronisierung',
    'Notify when a tutor confirms, reschedules, or updates session details': 'Benachrichtigung bei Terminbestätigungen oder -änderungen',
    'Direct Educator Messages': 'Direkte Lehrernachrichten',
    'Instant alerts when an assigned educator sends study notes or messages': 'Sofortige Benachrichtigung bei neuen Lernnotizen oder Nachrichten',
    'Weekly Academic Digest': 'Wöchentlicher Lernbericht',
    'Receive weekly performance summaries and remaining lesson credit updates': 'Wöchentliche Zusammenfassungen und verbleibende Stunden erhalten',
    'Account Security': 'Kontosicherheit',
    'Current Password': 'Aktuelles Passwort',
    'New Password': 'Neues Passwort',
    'Confirm New Password': 'Neues Passwort bestätigen',
    'Update Password': 'Passwort aktualisieren',
    'Saved to Account': 'Im Konto gespeichert',
    'Manage Subscription': 'Abonnement verwalten',
    'Verified Student Account': 'Verifiziertes Schülerkonto',

    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': 'Elite 1-zu-1 Mentoring & KI-Nachhilfe',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': 'Steigern Sie Ihren Lernerfolg mit Spitzenlehrkräften und modernen interaktiven Werkzeugen.',
    'Find Your Tutor': 'Finden Sie Ihren Tutor',
    'Explore Subscription': 'Abonnements ansehen',
    '500+ Expert Tutors': '500+ Erfahrene Tutoren',
    '99.4% Pass Rate': '99,4% Erfolgsquote',
    '50+ Subjects': '50+ Fächer',
    'Our Mission': 'Unsere Mission',
    'About Aviora Education': 'Über Aviora Education',
    'Redefining High School & University Academic Excellence': 'Akademische Spitzenleistungen für Schule & Universität neu definiert',
    'Transparent, Flexible Membership Plans': 'Transparente, flexible Mitgliedschaften',
    'Starter': 'Einsteiger',
    'Scholar': 'Gelehrter',
    'Elite Prodigy': 'Elite-Wunderkind',
    'Choose Plan': 'Plan auswählen',
    'Purchase Credits': 'Guthaben aufladen',
    'Credits Remaining': 'Verbleibende Guthaben',
    'All Subjects': 'Alle Fächer',
    'Mathematics': 'Mathematik',
    'Physics': 'Physik',
    'Chemistry': 'Chemie',
    'Biology': 'Biologie',
    'Computer Science': 'Informatik',
    'English & Literature': 'Englisch & Literatur',
    'Economics': 'Wirtschaft',
    'History': 'Geschichte',
    'Join with Buddy Code': 'Mit Buddy-Code beitreten',
    'Instant Passcode': 'Sofort-Code',
    'Join Aviora Buddy Session': 'Buddy-Sitzung beitreten',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': 'Erstklassige Plattform für Akademisches Mentoring',
    'Your Potential': 'Dein Potenzial',
    'Your Path': 'Dein Weg',
    'Your Future': 'Deine Zukunft',
    'Your Potential.': 'Dein Potenzial.',
    'Your Path.': 'Dein Weg.',
    'Your Future.': 'Deine Zukunft.',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Aviora Education verbindet ambitionierte Lernende mit streng geprüften Tutoren von Stanford, MIT, Harvard und Columbia. Meistern Sie Analysis, Physik, Programmieren, Chemie und Literatur mit persönlicher 1-zu-1-Betreuung.',
    'Find Your Tutor': 'Finde deinen Tutor',
    'Become an Aviora Tutor': 'Aviora-Tutor werden',
    'Top 1% Educators': 'Top 1% der Lehrkräfte',
    'Strict Degree Verification': 'Strikte Verifizierung von Abschlüssen',
    '98% Grade Boost': '98% Notenverbesserung',
    'Proven Conceptual Mastery': 'Nachgewiesene konzeptionelle Beherrschung',
    'Faculty Pedigree & University Network': 'Akademische Exzellenz & Universitätsnetzwerk',
    'Faculty Pedigree & University Network:': 'Akademische Exzellenz & Universitätsnetzwerk:',
    'Stanford University': 'Stanford University',
    'Harvard University': 'Harvard University',
    'MIT': 'MIT',
    'Columbia University': 'Columbia University',
    'University of Cambridge': 'University of Cambridge',
    'Princeton University': 'Princeton University',
    '1-on-1 Bespoke Instruction': 'Individueller 1-zu-1 Unterricht',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': 'Diagnostische Einstufung direkt abgestimmt auf den Lehrplan oder Prüfungen des Schülers.',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': 'Diagnostische Einstufung direkt abgestimmt auf den Lehrplan oder Universitätsprüfungen des Schülers.',
    '100% Vetted Faculty': '100% verifizierte Dozenten',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': 'Umfassende Hintergrundüberprüfungen, Diplomverifizierung und pädagogische Auswahl durch unser Akademisches Gremium.',
    'Complete Schedule Sovereignty': 'Vollständige zeitliche Flexibilität',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': 'Flexible Termine nach Wahl des Schülers mit transparenter Vorauszahlung und persönlichem Lerntempo.',
    'Explore Student Achievements & Top Tutors': 'Erfolge der Schüler & Top-Tutoren entdecken',
    'Student\'s Achievement': 'Erfolge der Schüler',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': 'Entdecken Sie herausragende Arbeiten von Aviora-Schülern aus 1-zu-1-Mentoring.',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': 'Bereit für Projekte und Portfolios auf Universitätsniveau?',
    'Connect with a Mentor': 'Mentor kontaktieren',
    'Connect with a Mentor →': 'Mentor kontaktieren →',
    'Verified Faculty': 'Verifizierte Dozenten',
    'Top Tutors': 'Top-Tutoren',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': 'Jeder Aviora-Tutor durchläuft eine gründliche Verifizierung seiner akademischen Nachweise und Pädagogik.',
    'Browse All Verified Tutors': 'Alle verifizierten Tutoren durchsuchen',
    'Browse All Verified Tutors →': 'Alle verifizierten Tutoren durchsuchen →',
    'Live Platform Telemetry': 'Live-Plattformdaten',
    'Real-Time Platform & Subject Analytics': 'Echtzeit-Fach- & Plattformanalysen',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': 'Live-Telemetrie der akademischen Nachfrage bei Aviora Education.',
    'Most Frequently Accessed Subjects': 'Meistgefragte Fächer',
    'Updated in Real-Time': 'In Echtzeit aktualisiert',
    'Frequently Accessed Study Materials': 'Häufig aufgerufene Lernmaterialien',
    'About Aviora Education': 'Über Aviora Education',
    'Our Mission': 'Unsere Mission',
    'Our Vision': 'Unsere Vision',
    'Our Academic Philosophy': 'Pädagogische Philosophie',
    'Redefining High School & University Academic Excellence': 'Akademische Exzellenz für Schule und Universität neu definiert',

    'All rights reserved.': 'Alle Rechte vorbehalten.'
  },

  'zh-CN': {
    // Nav & Common
    'Class': '课堂',
    'Students': '学生管理',
    'Schedule': '日程安排',
    'Home': '首页',
    'About': '关于我们',
    'Subscription': '课程订阅',
    'Subscriptions': '课程订阅',
    'Find Tutors': '寻找导师',
    'Tutors': '名师阵容',
    'Aviora Buddy': 'Aviora 伙伴',
    'Buddy & Arena': '伙伴与竞技场',
    'How It Works': '服务流程',
    'Dashboard': '控制台',
    'Log In': '登录',
    'Sign Up': '注册',
    'Profile': '个人资料',
    'Log Out': '登出',
    'Notifications': '通知中心',
    'Mark all read': '全部标为已读',
    'Mark all as read': '全部标为已读',
    'Filtered': '已过滤',
    'Back to Dashboard': '返回控制台',
    'Save': '保存',
    'Cancel': '取消',
    'Close': '关闭',
    'Submit': '提交',
    'Confirm': '确认',
    'Search': '搜索',
    'Filter': '筛选',
    'Edit': '编辑',
    'Delete': '删除',
    'Status': '状态',
    'Actions': '操作',
    'Subject': '学科',
    'Tutor': '导师',
    'Date & Time': '日期与时间',
    'Duration': '课时时长',
    'Hourly Rate': '课时单价',
    'Book Lesson': '预约课程',
    'Book a Lesson': '预约新课程',
    'View Profile': '查看详情',
    'Explore Tutors': '浏览名师团队',
    'Join Virtual Class': '进入在线教室',
    'Review Session': '评价课程',
    'Academic Overview': '学术概览',
    'Upcoming Lessons': '待上课程',
    'Learning Milestones': '学习里程碑',
    'Total Lessons': '累计课时',
    'Remaining Credits': '剩余课时额度',
    'Study Hours': '专注时长',
    'Grade Level': '当前年级',
    'Active Plan': '当前生效计划',
    'Quick Actions': '快捷操作',
    'All Lessons': '全部课程',
    'Scheduled': '已预约',
    'Completed': '已完成',
    'Pending': '待确认',
    'Cancelled': '已取消',
    
    // Profile Fields
    'Full Name': '学员姓名',
    'Email Address': '电子邮箱',
    'Phone Contact': '联系电话',
    'Current Grade Level': '当前就读年级',
    'School / Institution Name': '在读学校 / 机构名称',
    'Primary Learning Goals': '核心学习目标',
    'Target Subjects of Interest': '重点关注学科',
    'Save Profile Changes': '保存个人资料与偏好',
    'Settings & Preferences': '设置与偏好',
    'Appearance Theme': '外观主题',
    'Light Mode': '浅色模式',
    'Warm cream & gold canvas': '温润米白与暖金质感',
    'Dark Mode': '深色模式',
    'Obsidian & luxury gold': '黑曜石沉稳与奢华金',
    'Language': '显示语言',
    'Preferred Timezone': '首选时区',
    'Notification Preferences': '课程通知偏好',
    '3-Hour Lesson Reminders': '开课前 3 小时提醒',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': '在 50 分钟专属课程开始前 3 小时接收贴心提醒',
    'Calendar Sync Alerts': '日历日程同步提醒',
    'Notify when a tutor confirms, reschedules, or updates session details': '导师确认、改期或调整安排时第一时间通知',
    'Direct Educator Messages': '专属教师私信提醒',
    'Instant alerts when an assigned educator sends study notes or messages': '导师发送学习笔记或指导信息时即时推送',
    'Weekly Academic Digest': '每周学习周报推送',
    'Receive weekly performance summaries and remaining lesson credit updates': '定期接收课时余额变动与学业成长总结',
    'Account Security': '账户安全中心',
    'Current Password': '当前密码',
    'New Password': '新密码',
    'Confirm New Password': '确认新密码',
    'Update Password': '更新登录密码',
    'Saved to Account': '已保存至账户',
    'Manage Subscription': '管理订阅套餐',
    'Verified Student Account': '已认证学员账户',

    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': '常春藤顶尖名师 1 对 1 学术辅导与智能 AI 伴学',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': '汇聚全球顶尖名校名师，借助先进交互式教学工具，全面激发您的学业潜能。',
    'Find Your Tutor': '匹配专属名师',
    'Explore Subscription': '探索课时方案',
    '500+ Expert Tutors': '500+ 资深名校名师',
    '99.4% Pass Rate': '99.4% 学员优异通过率',
    '50+ Subjects': '50+ 全学科覆盖',
    'Our Mission': '办学宗旨',
    'About Aviora Education': '关于 Aviora Education',
    'Redefining High School & University Academic Excellence': '重塑中学与大学学术卓越标杆',
    'Transparent, Flexible Membership Plans': '清晰透明、灵活随心的会员计划',
    'Starter': '初级筑基',
    'Scholar': '学者进阶',
    'Elite Prodigy': '常青藤精英',
    'Choose Plan': '选择此方案',
    'Purchase Credits': '充值课时',
    'Credits Remaining': '剩余课时',
    'All Subjects': '所有科目',
    'Mathematics': '高等数学',
    'Physics': '大学物理',
    'Chemistry': '有机化学',
    'Biology': '分子生物学',
    'Computer Science': '计算机科学',
    'English & Literature': '英语与文学',
    'Economics': '经济学',
    'History': '世界历史',
    'Join with Buddy Code': '输入结对码加入',
    'Instant Passcode': '即时结对码',
    'Join Aviora Buddy Session': '加入伴学房间',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': '顶尖学术导师个性化指导平台',
    'Your Potential': '激发潜能',
    'Your Path': '指引前路',
    'Your Future': '成就未来',
    'Your Potential.': '激发潜能。',
    'Your Path.': '指引前路。',
    'Your Future.': '成就未来。',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Aviora Education 为心怀远大抱负的学生对接来自斯坦福、麻省理工、哈佛、哥伦比亚大学等顶尖学府的严格认证学者导师。通过量身定制的1对1专属辅导，全面精通微积分、物理、编程、化学及学术文学。',
    'Find Your Tutor': '寻找专属导师',
    'Become an Aviora Tutor': '成为 Aviora 导师',
    'Top 1% Educators': '全球排名前 1% 资深名师',
    'Strict Degree Verification': '权威学位与资质背景严苛核验',
    '98% Grade Boost': '98% 学员成绩显著提升',
    'Proven Conceptual Mastery': '经过实证的概念深度掌握',
    'Faculty Pedigree & University Network': '顶尖学府学术网络与师资血统',
    'Faculty Pedigree & University Network:': '顶尖学府学术网络与师资血统:',
    'Stanford University': '斯坦福大学',
    'Harvard University': '哈佛大学',
    'MIT': '麻省理工学院 (MIT)',
    'Columbia University': '哥伦比亚大学',
    'University of Cambridge': '剑桥大学',
    'Princeton University': '普林斯顿大学',
    '1-on-1 Bespoke Instruction': '1对1 定制化专属指导',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': '诊断性评估直接对标学生的校内教学大纲、AP考试或学术奥赛要求。',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': '诊断性评估直接对标学生的校内教学大纲、AP考试或大学课程要求。',
    '100% Vetted Faculty': '100% 官方严格认证名师',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': '由学术评审委员会进行全方位的背景审查、学位核验及教学法考核。',
    'Complete Schedule Sovereignty': '完全自主的课表掌控权',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': '日期与时间段完全由学生自主选择，透明透明的预付机制，完全依个人节奏学习。',
    'Explore Student Achievements & Top Tutors': '探索学员卓越成果与明星导师',
    'Student\'s Achievement': '学员成就与精选作品',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': '探索 Aviora 学员在1对1专属导师指导下创作的建筑结构模型、美术作品与数学绘图等杰出学术成果。',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': '准备好打造大学级别的高级研究项目与作品集了吗？',
    'Connect with a Mentor': '立即对接名师导师',
    'Connect with a Mentor →': '立即对接名师导师 →',
    'Verified Faculty': '认证教师团队',
    'Top Tutors': '特级名师阵容',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': '每一位 Aviora 导师均需通过全方位的学术资历审查、背景审查与试讲考核。',
    'Browse All Verified Tutors': '浏览所有认证导师',
    'Browse All Verified Tutors →': '浏览所有认证导师 →',
    'Live Platform Telemetry': '实时平台数据监控',
    'Real-Time Platform & Subject Analytics': '学科热度与平台数据实时分析',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': '反映 Aviora Education 全球实时学术需求与最常访问课程的动态数据。',
    'Most Frequently Accessed Subjects': '最受关注的热门学科',
    'Updated in Real-Time': '实时动态更新中',
    'Frequently Accessed Study Materials': '常被调阅的精选学习资料',
    'About Aviora Education': '关于 Aviora Education',
    'Our Mission': '我们的使命',
    'Our Vision': '我们的愿景',
    'Our Academic Philosophy': '学术与教学理念',
    'Redefining High School & University Academic Excellence': '重新定义高中与大学阶段的学术卓越标准',

    'All rights reserved.': '版权所有，保留一切权利。'
  },

  'ja-JP': {
    // Nav & Common
    'Class': '授業',
    'Students': '生徒管理',
    'Schedule': 'スケジュール',
    'Home': 'ホーム',
    'About': '会社概要',
    'Subscription': 'サブスクリプション',
    'Subscriptions': 'サブスクリプション',
    'Find Tutors': '講師を探す',
    'Tutors': '講師一覧',
    'Aviora Buddy': 'Aviora バディ',
    'Buddy & Arena': 'バディ＆アリーナ',
    'How It Works': 'ご利用の流れ',
    'Dashboard': 'ダッシュボード',
    'Log In': 'ログイン',
    'Sign Up': '新規登録',
    'Profile': 'プロフィール',
    'Log Out': 'ログアウト',
    'Notifications': '通知',
    'Mark all read': 'すべて既読にする',
    'Mark all as read': 'すべて既読にする',
    'Filtered': 'フィルター適用中',
    'Back to Dashboard': 'ダッシュボードに戻る',
    'Save': '保存',
    'Cancel': 'キャンセル',
    'Close': '閉じる',
    'Submit': '送信',
    'Confirm': '確認',
    'Search': '検索',
    'Filter': '絞り込み',
    'Edit': '編集',
    'Delete': '削除',
    'Status': 'ステータス',
    'Actions': '操作',
    'Subject': '科目',
    'Tutor': '講師',
    'Date & Time': '日時',
    'Duration': '所要時間',
    'Hourly Rate': '1時間料金',
    'Book Lesson': 'レッスンを予約',
    'Book a Lesson': 'レッスンを予約',
    'View Profile': 'プロフィールを見る',
    'Explore Tutors': '講師一覧を見る',
    'Join Virtual Class': 'バーチャル教室に入室',
    'Review Session': 'レッスンを評価',
    'Academic Overview': '学習概要',
    'Upcoming Lessons': '予定されているレッスン',
    'Learning Milestones': '学習マイルストーン',
    'Total Lessons': '受講済みレッスン数',
    'Remaining Credits': '残りレッスン枠',
    'Study Hours': '総学習時間',
    'Grade Level': '学年',
    'Active Plan': '有効なプラン',
    'Quick Actions': 'クイックアクション',
    'All Lessons': 'すべてのレッスン',
    'Scheduled': '予約済み',
    'Completed': '完了',
    'Pending': '確認待ち',
    'Cancelled': 'キャンセル済み',
    
    // Profile Fields
    'Full Name': '氏名',
    'Email Address': 'メールアドレス',
    'Phone Contact': '電話番号',
    'Current Grade Level': '現在の学年',
    'School / Institution Name': '学校名 / 所属機関',
    'Primary Learning Goals': '主な学習目標',
    'Target Subjects of Interest': '重点的に学びたい科目',
    'Save Profile Changes': '変更を保存する',
    'Settings & Preferences': '設定と環境設定',
    'Appearance Theme': '表示テーマ',
    'Light Mode': 'ライトモード',
    'Warm cream & gold canvas': '温かみのあるクリーム＆ゴールド',
    'Dark Mode': 'ダークモード',
    'Obsidian & luxury gold': '上質な黒曜石＆ラグジュアリーゴールド',
    'Language': '表示言語',
    'Preferred Timezone': '優先タイムゾーン',
    'Notification Preferences': '通知の環境設定',
    '3-Hour Lesson Reminders': 'レッスン開始3時間前リマインダー',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': '50分の個別レッスン開始3時間前に通知を受信します',
    'Calendar Sync Alerts': 'カレンダー同期アラート',
    'Notify when a tutor confirms, reschedules, or updates session details': '講師が予約を確認・変更した際に通知します',
    'Direct Educator Messages': '講師からのダイレクトメッセージ',
    'Instant alerts when an assigned educator sends study notes or messages': '学習ノートやメッセージが届いた際に即時通知します',
    'Weekly Academic Digest': '週刊学習ダイジェスト',
    'Receive weekly performance summaries and remaining lesson credit updates': '週ごとの学習成果と残りレッスン数の更新をお届けします',
    'Account Security': 'アカウントセキュリティ',
    'Current Password': '現在のパスワード',
    'New Password': '新しいパスワード',
    'Confirm New Password': '新しいパスワード（確認）',
    'Update Password': 'パスワードを更新',
    'Saved to Account': 'アカウントに保存されました',
    'Manage Subscription': 'プランを管理',
    'Verified Student Account': '認証済み受講生アカウント',

    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': '最高峰の個別指導と最先端AIによる個別アカデミック指導',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': '世界屈指の名門大出身講師と最新ツールで、学習体験を劇的に変革します。',
    'Find Your Tutor': '専属講師を見つける',
    'Explore Subscription': '料金プランを見る',
    '500+ Expert Tutors': '500名以上の厳選講師',
    '99.4% Pass Rate': '99.4%の合格実績',
    '50+ Subjects': '50以上の専門科目',
    'Our Mission': '私たちの使命',
    'About Aviora Education': 'Aviora Education について',
    'Redefining High School & University Academic Excellence': '中高・大学における学業の卓越性を再定義する',
    'Transparent, Flexible Membership Plans': '透明で柔軟な会員プラン',
    'Starter': 'スターター',
    'Scholar': 'スカラー',
    'Elite Prodigy': 'エリート・プロディジー',
    'Choose Plan': 'このプランを選択',
    'Purchase Credits': 'レッスン枠を購入',
    'Credits Remaining': '残りレッスン枠',
    'All Subjects': 'すべての科目',
    'Mathematics': '数学',
    'Physics': '物理学',
    'Chemistry': '化学',
    'Biology': '生物学',
    'Computer Science': '情報科学',
    'English & Literature': '英語・文学',
    'Economics': '経済学',
    'History': '世界史',
    'Join with Buddy Code': 'バディコードで参加',
    'Instant Passcode': '即時パスコード',
    'Join Aviora Buddy Session': 'バディセッションに参加',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': '最高峰の個別学術メンターシッププラットフォーム',
    'Your Potential': 'あなたの可能性',
    'Your Path': 'あなたの進む道',
    'Your Future': 'あなたの未来',
    'Your Potential.': 'あなたの可能性。',
    'Your Path.': 'あなたの進む道。',
    'Your Future.': 'あなたの未来。',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Aviora Education は、志の高い学生と、スタンフォード、MIT、ハーバード、コロンビアなど名門大学出身の厳格に審査された指導講師を結びつけます。オーダーメイドのマンツーマン指導で、微積分、物理、プログラミング、化学、文学などを極めましょう。',
    'Find Your Tutor': '専属講師を見つける',
    'Become an Aviora Tutor': 'Aviora の講師になる',
    'Top 1% Educators': '上位1％の優秀な指導陣',
    'Strict Degree Verification': '厳格な学位・資格照合済み',
    '98% Grade Boost': '98％の受講生が成績向上',
    'Proven Conceptual Mastery': '確かな本質的理解の定着',
    'Faculty Pedigree & University Network': '一流大学の指導陣ネットワーク',
    'Faculty Pedigree & University Network:': '一流大学の指導陣ネットワーク:',
    'Stanford University': 'スタンフォード大学',
    'Harvard University': 'ハーバード大学',
    'MIT': 'マサチューセッツ工科大学 (MIT)',
    'Columbia University': 'コロンビア大学',
    'University of Cambridge': 'ケンブリッジ大学',
    'Princeton University': 'プリンストン大学',
    '1-on-1 Bespoke Instruction': '完全個別オーダーメイド指導',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': '受講生の学校カリキュラムやAP試験、オリンピック対策に直結した診断評価を行います。',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': '受講生の学校カリキュラムやAP試験、大学のシラバスに直結した診断評価を行います。',
    '100% Vetted Faculty': '100％厳格審査された専任講師',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': '学術委員会による経歴審査、学位照合、模擬授業による指導力選考を通過した講師のみが担当します。',
    'Complete Schedule Sovereignty': '完全なスケジュール自由度',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': '受講生自身が日時を柔軟に選択でき、明瞭な事前決済と個別のペースで受講可能です。',
    'Explore Student Achievements & Top Tutors': '受講生の実績と人気講師を見る',
    'Student\'s Achievement': '受講生の実績と成果',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': '個別メンターシップのもとで制作された、建築模型から美術工芸、数理ドローイングまで、受講生たちの優れた作品をご覧ください。',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': '大学レベルのプロジェクトや研究論文、ポートフォリオ制作に挑戦しませんか？',
    'Connect with a Mentor': 'メンターに相談する',
    'Connect with a Mentor →': 'メンターに相談する →',
    'Verified Faculty': '認証済み講師陣',
    'Top Tutors': '人気のトップ講師',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': 'すべての Aviora 講師は、学歴証明の審査、身元確認、教育指導力審査を徹底して受けています。',
    'Browse All Verified Tutors': 'すべての認証済み講師を見る',
    'Browse All Verified Tutors →': 'すべての認証済み講師を見る →',
    'Live Platform Telemetry': 'リアルタイム運用データ',
    'Real-Time Platform & Subject Analytics': 'リアルタイム科目・需要データ分析',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': 'Aviora Education 全体で最も学習されている科目とリアルタイムの受講動向を可視化しています。',
    'Most Frequently Accessed Subjects': '最も受講されている科目',
    'Updated in Real-Time': 'リアルタイム更新中',
    'Frequently Accessed Study Materials': 'よく閲覧されている学習教材',
    'About Aviora Education': 'Aviora Education について',
    'Our Mission': '私たちの使命',
    'Our Vision': '私たちのビジョン',
    'Our Academic Philosophy': '教育理念と指導方針',
    'Redefining High School & University Academic Excellence': '中高・大学における学業の卓越性を再定義する',

    'All rights reserved.': '無断転載を禁じます。'
  },

  'fil-PH': {
    // Nav & Common
    'Class': 'Klase',
    'Students': 'Mga Mag-aaral',
    'Schedule': 'Iskedyul',
    'Home': 'Tahanan',
    'About': 'Tungkol sa Amin',
    'Subscription': 'Subskripsyon',
    'Subscriptions': 'Mga Subskripsyon',
    'Find Tutors': 'Maghanap ng Tutor',
    'Tutors': 'Mga Tutor',
    'Aviora Buddy': 'Aviora Buddy',
    'Buddy & Arena': 'Kasama at Arena',
    'How It Works': 'Paano Gumagana',
    'Dashboard': 'Dashboard',
    'Log In': 'Mag-log In',
    'Sign Up': 'Mag-sign Up',
    'Profile': 'Profile',
    'Log Out': 'Mag-log Out',
    'Notifications': 'Mga Abiso',
    'Mark all read': 'Markahan lahat bilang nabasa na',
    'Mark all as read': 'Markahan lahat bilang nabasa na',
    'Filtered': 'Nasala',
    'Back to Dashboard': 'Bumalik sa Dashboard',
    'Save': 'I-save',
    'Cancel': 'Kanselahin',
    'Close': 'Isara',
    'Submit': 'Isumite',
    'Confirm': 'Kumpirmahin',
    'Search': 'Maghanap',
    'Filter': 'Salain',
    'Edit': 'I-edit',
    'Delete': 'Burahin',
    'Status': 'Katayuan',
    'Actions': 'Mga Aksyon',
    'Subject': 'Paksa',
    'Tutor': 'Tutor',
    'Date & Time': 'Petsa at Oras',
    'Duration': 'Tagal',
    'Hourly Rate': 'Bayad Bawat Oras',
    'Book Lesson': 'Magpa-book ng Klase',
    'Book a Lesson': 'Magpa-book ng Klase',
    'View Profile': 'Tingnan ang Profile',
    'Explore Tutors': 'Tumingin ng Mga Tutor',
    'Join Virtual Class': 'Pumasok sa Virtual na Klase',
    'Review Session': 'Suriin ang Sesyon',
    'Academic Overview': 'Pangkalahatang-ideya sa Pag-aaral',
    'Upcoming Lessons': 'Paparating na Mga Klase',
    'Learning Milestones': 'Mga Tagumpay sa Pag-aaral',
    'Total Lessons': 'Kabuuan ng Klase',
    'Remaining Credits': 'Natitirang Kredito',
    'Study Hours': 'Oras ng Pag-aaral',
    'Grade Level': 'Baitang',
    'Active Plan': 'Aktibong Plano',
    'Quick Actions': 'Mabilisang Aksyon',
    'All Lessons': 'Lahat ng Klase',
    'Scheduled': 'Nakatakda',
    'Completed': 'Tapos Na',
    'Pending': 'Naghihintay',
    'Cancelled': 'Kinansela',
    
    // Profile Fields
    'Full Name': 'Buong Pangalan',
    'Email Address': 'Email Address',
    'Phone Contact': 'Numero ng Telepono',
    'Current Grade Level': 'Kasalukuyang Baitang',
    'School / Institution Name': 'Pangalan ng Paaralan',
    'Primary Learning Goals': 'Mga Layunin sa Pag-aaral',
    'Target Subjects of Interest': 'Mga Paksang Nais Pag-aralan',
    'Save Profile Changes': 'I-save ang Mga Pagbabago',
    'Settings & Preferences': 'Mga Setting at Kagustuhan',
    'Appearance Theme': 'Tema ng Hitsura',
    'Light Mode': 'Maliwanag na Mode',
    'Warm cream & gold canvas': 'Mainit na krema at ginto',
    'Dark Mode': 'Madilim na Mode',
    'Obsidian & luxury gold': 'Obsidian at marangyang ginto',
    'Language': 'Wika',
    'Preferred Timezone': 'Paboritong Timezone',
    'Notification Preferences': 'Mga Kagustuhan sa Abiso',
    '3-Hour Lesson Reminders': 'Paalala sa Klase Bago Mag-3 Oras',
    'Receive reminder alert 3 hours prior to scheduled 50-minute class': 'Makatanggap ng abiso 3 oras bago ang nakatakdang 50-minutong klase',
    'Calendar Sync Alerts': 'Mga Alerto sa Kalendaryo',
    'Notify when a tutor confirms, reschedules, or updates session details': 'Ipaalam kapag kinumpirma o inilipat ng tutor ang iskedyul',
    'Direct Educator Messages': 'Direktang Mensahe mula sa Guro',
    'Instant alerts when an assigned educator sends study notes or messages': 'Mabilisang alerto kapag nagpadala ang iyong tutor ng mga tala o mensahe',
    'Weekly Academic Digest': 'Lingguhang Ulat sa Pag-aaral',
    'Receive weekly performance summaries and remaining lesson credit updates': 'Tumanggap ng lingguhang buod ng grado at natitirang kredito',
    'Account Security': 'Seguridad ng Account',
    'Current Password': 'Kasalukuyang Password',
    'New Password': 'Bagong Password',
    'Confirm New Password': 'Kumpirmahin ang Bagong Password',
    'Update Password': 'Palitan ang Password',
    'Saved to Account': 'Nai-save sa Account',
    'Manage Subscription': 'Pamahalaan ang Subskripsyon',
    'Verified Student Account': 'Beripikadong Account ng Mag-aaral',

    // Hero & Features
    'Elite 1-on-1 Academic Mentorship & AI Tutoring': 'Mataas na Kalidad na 1-on-1 Mentorship at AI Tutoring',
    'Transform your learning with world-class Ivy League educators and cutting-edge interactive tools.': 'Itaas ang antas ng iyong pag-aaral kasama ang mga mahuhusay na guro at makabagong gamit.',
    'Find Your Tutor': 'Hanapin ang Iyong Tutor',
    'Explore Subscription': 'Tingnan ang Subskripsyon',
    '500+ Expert Tutors': '500+ Dalubhasang Tutor',
    '99.4% Pass Rate': '99.4% Antas ng Pagpasa',
    '50+ Subjects': '50+ Asignatura',
    'Our Mission': 'Ang Aming Misyon',
    'About Aviora Education': 'Tungkol sa Aviora Education',
    'Redefining High School & University Academic Excellence': 'Muling Pagtatakda ng Kahusayan sa Hayskul at Kolehiyo',
    'Transparent, Flexible Membership Plans': 'Malinaw at Madaling Baguhing Plano',
    'Starter': 'Pambungad',
    'Scholar': 'Iskolar',
    'Elite Prodigy': 'Elite Prodigy',
    'Choose Plan': 'Piliin ang Plano',
    'Purchase Credits': 'Bumili ng Kredito',
    'Credits Remaining': 'Natitirang Kredito',
    'All Subjects': 'Lahat ng Asignatura',
    'Mathematics': 'Matematika',
    'Physics': 'Pisika',
    'Chemistry': 'Kimika',
    'Biology': 'Biyolohiya',
    'Computer Science': 'Agham Pangkompyuter',
    'English & Literature': 'Ingles at Panitikan',
    'Economics': 'Ekonomiks',
    'History': 'Kasaysayan',
    'Join with Buddy Code': 'Sumali Gamit ang Buddy Code',
    'Instant Passcode': 'Agarang Passcode',
    'Join Aviora Buddy Session': 'Sumali sa Sesyon ng Buddy',
    
    // Hero & Landing Headlines
    'Premier Academic Mentorship Platform': 'Nangungunang Plataporma ng Akademikong Mentorship',
    'Your Potential': 'Iyong Potensyal',
    'Your Path': 'Iyong Landas',
    'Your Future': 'Iyong Hinaharap',
    'Your Potential.': 'Iyong Potensyal.',
    'Your Path.': 'Iyong Landas.',
    'Your Future.': 'Iyong Hinaharap.',
    'Aviora Education bridges ambitious students with rigorously vetted academic tutors from Stanford, MIT, Harvard, and Columbia. Master calculus, physics, coding, chemistry, and literature with personalized 1-on-1 mentorship.': 'Ikinokonekta ng Aviora Education ang mga masisipag na mag-aaral sa mga dalubhasang tutor mula Stanford, MIT, Harvard, at Columbia. Matutong mabuti sa calculus, pisika, coding, kimika, at panitikan gamit ang 1-on-1 mentorship.',
    'Find Your Tutor': 'Hanapin ang Iyong Tutor',
    'Become an Aviora Tutor': 'Maging Tutor ng Aviora',
    'Top 1% Educators': 'Nangungunang 1% na mga Guro',
    'Strict Degree Verification': 'Mahigpit na Beripikasyon ng Diploma',
    '98% Grade Boost': '98% Pagtaas ng Grado',
    'Proven Conceptual Mastery': 'Napatunayang Pagkaunawa sa Konsepto',
    'Faculty Pedigree & University Network': 'Kalidad ng Guro at Network ng Unibersidad',
    'Faculty Pedigree & University Network:': 'Kalidad ng Guro at Network ng Unibersidad:',
    'Stanford University': 'Stanford University',
    'Harvard University': 'Harvard University',
    'MIT': 'MIT',
    'Columbia University': 'Columbia University',
    'University of Cambridge': 'University of Cambridge',
    'Princeton University': 'Princeton University',
    '1-on-1 Bespoke Instruction': '1-on-1 Pasadyang Pagtuturo',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or Olympiad curriculum.': 'Pagsusuri na nakatugma sa kurikulum ng paaralan, pagsusulit sa AP, o Olympiad ng mag-aaral.',
    'Diagnostic assessments mapped directly to the student\'s exact school syllabus, AP exam, or university curriculum.': 'Pagsusuri na nakatugma sa kurikulum ng paaralan, pagsusulit sa AP, o kurikulum sa unibersidad.',
    '100% Vetted Faculty': '100% Beripikadong Kaguruan',
    'Comprehensive background audits, diploma verification, and pedagogical screenings conducted by our Academic Board.': 'Masusing pagsusuri sa background, diploma, at kakayahan sa pagtuturo ng aming Lupon.',
    'Complete Schedule Sovereignty': 'Ganap na Kalayaan sa Iskedyul',
    'Flexible dates and time slots determined entirely by the student, with upfront payments and personalized learning pace.': 'Madaling baguhing petsa at oras na pinili ng mag-aaral, may malinaw na bayad at sariling bilis ng aral.',
    'Explore Student Achievements & Top Tutors': 'Tuklasin ang Tagumpay ng Mag-aaral at Magagaling na Tutor',
    'Student\'s Achievement': 'Tagumpay ng Mag-aaral',
    'Explore exceptional original works—from precision structural crafts and physical models to fine arts and mathematical drawings—crafted by Aviora students under 1-on-1 mentorship.': 'Tuklasin ang natatanging gawa ng mga mag-aaral sa Aviora sa ilalim ng 1-on-1 mentorship.',
    'Ready to create university-level capstones, portfolio pieces, and mastery projects?': 'Handa ka na bang gumawa ng mga proyekto at portfolio na pang-unibersidad?',
    'Connect with a Mentor': 'Kumonekta sa Mentor',
    'Connect with a Mentor →': 'Kumonekta sa Mentor →',
    'Verified Faculty': 'Beripikadong Kaguruan',
    'Top Tutors': 'Nangungunang Mga Tutor',
    'Every Aviora tutor undergoes comprehensive academic credential verification, background audits, and pedagogical screening.': 'Bawat tutor sa Aviora ay dumaraan sa masusing pagsusuri ng kredensyal at pagtuturo.',
    'Browse All Verified Tutors': 'Tingnan Lahat ng Beripikadong Tutor',
    'Browse All Verified Tutors →': 'Tingnan Lahat ng Beripikadong Tutor →',
    'Live Platform Telemetry': 'Direktang Datos ng Plataporma',
    'Real-Time Platform & Subject Analytics': 'Real-Time na Pagsusuri ng Asignatura at Plataporma',
    'Live telemetry reflecting real-time academic demand and the most frequently accessed curricula across Aviora Education.': 'Direktang datos na nagpapakita ng demand sa pag-aaral sa Aviora Education.',
    'Most Frequently Accessed Subjects': 'Pinakamadalas Araling Asignatura',
    'Updated in Real-Time': 'Na-update sa Real-Time',
    'Frequently Accessed Study Materials': 'Mga Madalas Gamiting Materyal sa Pag-aaral',
    'About Aviora Education': 'Tungkol sa Aviora Education',
    'Our Mission': 'Ang Aming Misyon',
    'Our Vision': 'Ang Aming Bisyon',
    'Our Academic Philosophy': 'Pilosopiya sa Pagtuturo',
    'Redefining High School & University Academic Excellence': 'Muling Pagtatakda ng Kahusayan sa Paaralan at Kolehiyo',

    'All rights reserved.': 'Lahat ng karapatan ay nakalaan.'
  }
};


const SUPPORTED_LANGUAGES = [
  'en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'zh-TW', 'ja-JP', 'fil-PH',
  'ko-KR', 'it-IT', 'pt-BR', 'ru-RU', 'ar-SA', 'hi-IN', 'vi-VN', 'id-ID',
  'tr-TR', 'nl-NL', 'pl-PL', 'sv-SE', 'th-TH'
];

const LANGUAGE_ALIASES = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'zh': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  'ja': 'ja-JP',
  'fil': 'fil-PH',
  'tl': 'fil-PH',
  'tl-PH': 'fil-PH',
  'ko': 'ko-KR',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
  'vi': 'vi-VN',
  'id': 'id-ID',
  'tr': 'tr-TR',
  'nl': 'nl-NL',
  'pl': 'pl-PL',
  'sv': 'sv-SE',
  'th': 'th-TH'
};

const I18n = {
  currentLanguage: 'en-US',
  isTranslating: false,
  observer: null,

  init() {
    // Clear any residual Google Translate cookies or DOM banners
    try {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + hostname + ';';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + hostname + ';';
      }
      const gtBanner = document.querySelector('.goog-te-banner-frame');
      if (gtBanner) gtBanner.remove();
      const gtTooltip = document.getElementById('goog-gt-tt');
      if (gtTooltip) gtTooltip.remove();
    } catch (e) {}

    let saved = 'en-US';
    let user = null;
    try {
      user = (typeof Storage !== 'undefined' && Storage.getUser) ? Storage.getUser() : null;
      if (user && user.id) {
        const userPrefs = (typeof Storage !== 'undefined') ? Storage.getUserPreferences(user.id) : null;
        saved = (userPrefs && userPrefs.language) || localStorage.getItem('aviora_language_' + user.id) || 'en-US';
      } else {
        saved = 'en-US';
        try { localStorage.removeItem('aviora_language'); } catch(e){}
      }
    } catch (e) {}

    // Show or hide header language selector depending on login status
    const langPicker = document.getElementById('nav-lang-picker-wrap');
    if (langPicker) {
      langPicker.style.display = (user && user.id) ? 'block' : 'none';
    }

    this.applyLanguage(saved, false);
    this.setupObserver();
  },

  normalizeLanguage(lang) {
    if (!lang) return 'en-US';
    if (LANGUAGE_ALIASES[lang]) return LANGUAGE_ALIASES[lang];
    if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
    const short = lang.split('-')[0].toLowerCase();
    if (LANGUAGE_ALIASES[short]) return LANGUAGE_ALIASES[short];
    return 'en-US';
  },

  t(key, fallback = '') {
    const lang = this.normalizeLanguage(this.currentLanguage);
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

  translatePhrase(text, lang) {
    if (!text || typeof text !== 'string') return text;
    const cleanLang = this.normalizeLanguage(lang);
    if (cleanLang === 'en-US') return text;

    const dict = PHRASE_DICTIONARY[cleanLang];
    if (!dict) return text;

    const trimmed = text.trim();
    if (!trimmed) return text;

    // 1. Direct exact match
    if (dict[trimmed] !== undefined) {
      return dict[trimmed];
    }

    // 2. Direct case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase();
    for (const phrase in dict) {
      if (phrase.toLowerCase() === lowerTrimmed) {
        return dict[phrase];
      }
    }

    // 3. Multi-line whitespace collapse
    const collapsed = trimmed.replace(/\s+/g, ' ');
    if (dict[collapsed] !== undefined) {
      return dict[collapsed];
    }
    const lowerCollapsed = collapsed.toLowerCase();
    for (const phrase in dict) {
      if (phrase.toLowerCase() === lowerCollapsed) {
        return dict[phrase];
      }
    }

    // 4. Smart leading symbol and trailing punctuation stripping
    const leadMatch = collapsed.match(/^([✦★•\-–—►▶︎>\s]+)(.*)$/);
    const leadSymbols = leadMatch ? leadMatch[1] : '';
    const bodyWithoutLead = leadMatch ? leadMatch[2] : collapsed;

    const trailMatch = bodyWithoutLead.match(/^(.*?)([\.\:\?\!\,\…\→\↓\>]+)$/);
    const coreText = trailMatch ? trailMatch[1].trim() : bodyWithoutLead.trim();
    const trailSymbols = trailMatch ? trailMatch[2] : '';

    if (coreText && (leadSymbols || trailSymbols || coreText !== trimmed)) {
      if (dict[coreText] !== undefined) {
        const transCore = dict[coreText];
        const formattedTrail = (trailSymbols === '.' && ['ja-JP', 'zh-CN', 'zh-TW'].includes(cleanLang)) ? '。' : trailSymbols;
        return leadSymbols + transCore + formattedTrail;
      }
      const lowerCore = coreText.toLowerCase();
      for (const phrase in dict) {
        if (phrase.toLowerCase() === lowerCore) {
          const transCore = dict[phrase];
          const formattedTrail = (trailSymbols === '.' && ['ja-JP', 'zh-CN', 'zh-TW'].includes(cleanLang)) ? '。' : trailSymbols;
          return leadSymbols + transCore + formattedTrail;
        }
      }
    }

    return text;
  },

  translateDomTree(root, lang) {
    if (!root) return;
    const cleanLang = this.normalizeLanguage(lang);

    // 1. Walk visible text nodes
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node || !node.parentNode) return NodeFilter.FILTER_REJECT;
          const parentTag = node.parentNode.nodeName;
          if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CODE', 'PRE', 'SELECT', 'OPTION'].includes(parentTag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentNode.classList && (
            node.parentNode.classList.contains('no-translate') ||
            node.parentNode.classList.contains('skiptranslate') ||
            node.parentNode.id === 'header-language-select' ||
            node.parentNode.id === 'profile-language-select'
          )) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      // Store original English text on first visit
      if (currentNode.__avioraOrigText === undefined) {
        currentNode.__avioraOrigText = currentNode.textContent;
      }

      const origText = currentNode.__avioraOrigText;
      if (cleanLang === 'en-US') {
        if (currentNode.textContent !== origText) {
          currentNode.textContent = origText;
        }
      } else {
        const leadingSpace = origText.match(/^\s*/)[0];
        const trailingSpace = origText.match(/\s*$/)[0];
        const raw = origText.trim();

        const translated = this.translatePhrase(raw, cleanLang);
        if (translated !== raw) {
          currentNode.textContent = leadingSpace + translated + trailingSpace;
        }
      }
      currentNode = walker.nextNode();
    }

    // 2. Translate attributes (placeholder, title, submit button value)
    root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      if (el.__avioraOrigPlaceholder === undefined) {
        el.__avioraOrigPlaceholder = el.getAttribute('placeholder') || '';
      }
      if (cleanLang === 'en-US') {
        el.setAttribute('placeholder', el.__avioraOrigPlaceholder);
      } else {
        const trans = this.translatePhrase(el.__avioraOrigPlaceholder, cleanLang);
        el.setAttribute('placeholder', trans);
      }
    });

    root.querySelectorAll('[title]').forEach(el => {
      if (['SVG', 'PATH', 'SELECT', 'OPTION'].includes(el.nodeName)) return;
      if (el.__avioraOrigTitle === undefined) {
        el.__avioraOrigTitle = el.getAttribute('title') || '';
      }
      if (cleanLang === 'en-US') {
        el.setAttribute('title', el.__avioraOrigTitle);
      } else {
        const trans = this.translatePhrase(el.__avioraOrigTitle, cleanLang);
        el.setAttribute('title', trans);
      }
    });

    root.querySelectorAll('input[type="submit"], input[type="button"]').forEach(el => {
      if (el.__avioraOrigValue === undefined) {
        el.__avioraOrigValue = el.value || '';
      }
      if (cleanLang === 'en-US') {
        el.value = el.__avioraOrigValue;
      } else {
        el.value = this.translatePhrase(el.__avioraOrigValue, cleanLang);
      }
    });
  },

  applyLanguage(lang, dispatchEvent = true) {
    const cleanLang = this.normalizeLanguage(lang);
    this.currentLanguage = cleanLang;
    document.documentElement.setAttribute('lang', cleanLang);

    // Keep dropdown selectors in sync
    const headerLangSelect = document.getElementById('header-language-select');
    if (headerLangSelect && headerLangSelect.value !== cleanLang) {
      headerLangSelect.value = cleanLang;
    }
    const profileLangSelect = document.getElementById('profile-language-select');
    if (profileLangSelect && profileLangSelect.value !== cleanLang) {
      profileLangSelect.value = cleanLang;
    }

    try {
      const user = (typeof Storage !== 'undefined' && Storage.getUser) ? Storage.getUser() : null;
      if (user && user.id) {
        localStorage.setItem(`aviora_language_${user.id}`, cleanLang);
      }
      localStorage.setItem('aviora_language', cleanLang);
    } catch (e) {}

    // Translate DOM elements marked with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.t(key);
        if (text) {
          const icon = el.querySelector('svg, i, span.badge-gold, span.badge-secondary');
          if (icon && !el.classList.contains('preserve-no-icon')) {
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

    // Translate placeholders marked with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Translate titles marked with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    // Translate Core Standard Nav & UI Elements
    this.translateStandardElements();

    // Universal Text Walker: translates every word across the website
    this.isTranslating = true;
    try {
      this.translateDomTree(document.body, cleanLang);
    } catch (e) {
      console.warn('DOM tree translation error:', e);
    } finally {
      this.isTranslating = false;
    }

    if (dispatchEvent) {
      window.dispatchEvent(new CustomEvent('aviora-language-changed', { detail: { language: cleanLang } }));
    }
  },

  translateStandardElements() {
    // Navigation items
    const navMap = {
      'nav-link-home': 'nav.home',
      'nav-link-about': 'nav.about',
      'nav-link-tutors': 'nav.tutors',
      'nav-link-subscriptions': 'nav.pricing',
      'nav-link-subscription': 'nav.pricing',
      'nav-link-pricing': 'nav.pricing',
      'nav-link-buddy': 'nav.buddy',
      'nav-link-room': 'nav.virtual_room',
      'nav-link-portal': 'nav.student_portal',
      'nav-link-how': 'nav.how_it_works',
      'nav-link-dashboard': 'nav.dashboard',
      'nav-user-profile-btn': 'nav.profile',
      'user-logout-btn': 'nav.logout',
      'nav-login-btn': 'nav.login',
      'nav-signup-btn': 'nav.signup',
      'notif-mark-read-btn': 'common.mark_all_read',
      'nav-link-teacher-classes': 'nav.class',
      'nav-link-teacher-students': 'nav.students',
      'nav-link-teacher-schedule': 'nav.schedule',
      'nav-link-teacher-buddy': 'nav.buddy',
      'nav-link-teacher-dashboard': 'nav.dashboard'
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
        profCardTitle.appendChild(document.createTextNode(' ' + text));
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
  },

  setupObserver() {
    if (this.observer || typeof MutationObserver === 'undefined') return;
    let timeout = null;
    this.observer = new MutationObserver((mutations) => {
      if (this.isTranslating) return;
      if (this.currentLanguage === 'en-US') return;

      const shouldIgnore = mutations.every(m => {
        const target = m.target;
        return target && target.nodeName === 'FONT';
      });
      if (shouldIgnore) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!this.isTranslating) {
          this.applyLanguage(this.currentLanguage, false);
        }
      }, 150);
    });

    if (document.body) {
      this.observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
};

window.I18n = I18n;
window.I18N_TRANSLATIONS = I18N_TRANSLATIONS;
window.PHRASE_DICTIONARY = PHRASE_DICTIONARY;
window.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;


if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18n.init());
  } else {
    I18n.init();
  }
}
