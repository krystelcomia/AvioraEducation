/**
 * AVIORA EDUCATION - VECTOR ICONS LIBRARY
 * Clean, formal, high-definition SVG vector icons to replace emojis across the platform.
 */
const Icons = {
  create(svgPath, size = 18, extraStyle = '', extraAttrs = '') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: -2px; ${extraStyle}" ${extraAttrs}>${svgPath}</svg>`;
  },

  calendar(size = 18, style = '') {
    return this.create('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', size, style);
  },

  clock(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>', size, style);
  },

  timer(size = 18, style = '') {
    return this.create('<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M5 3L2 6"></path><path d="m22 6-3-3"></path><path d="M12 2v2"></path>', size, style);
  },

  hourglass(size = 18, style = '') {
    return this.create('<path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>', size, style);
  },

  check(size = 18, style = '') {
    return this.create('<polyline points="20 6 9 17 4 12"></polyline>', size, style);
  },

  checkCircle(size = 18, style = '') {
    return this.create('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>', size, style);
  },

  gem(size = 18, style = '') {
    return this.create('<path d="M6 3h12l4 6-10 12L2 9z"></path><path d="M11 3v6l-4 12"></path><path d="M13 3v6l4 12"></path>', size, style);
  },

  creditCard(size = 18, style = '') {
    return this.create('<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>', size, style);
  },

  message(size = 18, style = '') {
    return this.create('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>', size, style);
  },

  video(size = 18, style = '') {
    return this.create('<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>', size, style);
  },

  book(size = 18, style = '') {
    return this.create('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>', size, style);
  },

  graduationCap(size = 18, style = '') {
    return this.create('<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>', size, style);
  },

  user(size = 18, style = '') {
    return this.create('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>', size, style);
  },

  users(size = 18, style = '') {
    return this.create('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', size, style);
  },

  settings(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>', size, style);
  },

  sun(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', size, style);
  },

  moon(size = 18, style = '') {
    return this.create('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>', size, style);
  },

  bell(size = 18, style = '') {
    return this.create('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>', size, style);
  },

  barChart(size = 18, style = '') {
    return this.create('<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>', size, style);
  },

  lock(size = 18, style = '') {
    return this.create('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>', size, style);
  },

  shield(size = 18, style = '') {
    return this.create('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>', size, style);
  },

  scale(size = 18, style = '') {
    return this.create('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>', size, style);
  },

  mail(size = 18, style = '') {
    return this.create('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>', size, style);
  },

  mapPin(size = 18, style = '') {
    return this.create('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>', size, style);
  },

  target(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>', size, style);
  },

  award(size = 18, style = '') {
    return this.create('<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>', size, style);
  },

  trophy(size = 18, style = '') {
    return this.create('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 4h12a2 2 0 0 1 2 2v4a6 6 0 0 1-12 0V6a2 2 0 0 1 2-2Z"></path>', size, style);
  },

  compass(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>', size, style);
  },

  zap(size = 18, style = '') {
    return this.create('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>', size, style);
  },

  rocket(size = 18, style = '') {
    return this.create('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>', size, style);
  },

  sparkle(size = 18, style = '') {
    return this.create('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>', size, style);
  },

  lightbulb(size = 18, style = '') {
    return this.create('<line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>', size, style);
  },

  telescope(size = 18, style = '') {
    return this.create('<path d="m10 10 3 3"></path><path d="m14 6 3 3"></path><path d="M2 19l4.5-9"></path><path d="m19 19-4.5-9"></path><path d="m10 14 2 2"></path><circle cx="12" cy="12" r="1"></circle><path d="M17 3l4 4-11 11-4-4L17 3z"></path>', size, style);
  },

  fileText(size = 18, style = '') {
    return this.create('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>', size, style);
  },

  star(size = 16, style = '', fill = '#F59E0B') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill}" stroke-width="1.5" style="display: inline-block; vertical-align: -2px; ${style}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  },

  search(size = 18, style = '') {
    return this.create('<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', size, style);
  },

  phone(size = 18, style = '') {
    return this.create('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>', size, style);
  },

  paperclip(size = 18, style = '') {
    return this.create('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>', size, style);
  },

  inbox(size = 18, style = '') {
    return this.create('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>', size, style);
  },

  crown(size = 18, style = '') {
    return this.create('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.269a4 4 0 0 1-3.83 2.942H8.684a4 4 0 0 1-3.83-2.942L2.019 6.019a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path>', size, style);
  },

  landmark(size = 18, style = '') {
    return this.create('<line x1="3" y1="22" x2="21" y2="22"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 2 20 7 4 7"></polygon>', size, style);
  },

  palette(size = 18, style = '') {
    return this.create('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>', size, style);
  },

  pencil(size = 18, style = '') {
    return this.create('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>', size, style);
  },

  layers(size = 18, style = '') {
    return this.create('<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>', size, style);
  },

  globe(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>', size, style);
  },

  dollarSign(size = 18, style = '') {
    return this.create('<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', size, style);
  },

  flask(size = 18, style = '') {
    return this.create('<path d="M9 3h6"></path><path d="M10 9V3"></path><path d="M14 9V3"></path><path d="M8.5 13h7"></path><path d="M14 9a2 2 0 0 1 2 2v6.5a4.5 4.5 0 0 1-9 0V11a2 2 0 0 1 2-2z"></path>', size, style);
  },

  sprout(size = 18, style = '') {
    return this.create('<path d="M7 20h10"></path><path d="M12 20v-8"></path><path d="M12 12a5 5 0 0 1 5-5c0 3-2 5-5 5Z"></path><path d="M12 12a5 5 0 0 0-5-5c0 3 2 5 5 5Z"></path>', size, style);
  },

  x(size = 18, style = '') {
    return this.create('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', size, style);
  },

  mic(size = 18, style = '') {
    return this.create('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>', size, style);
  },

  micOff(size = 18, style = '') {
    return this.create('<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>', size, style);
  },

  videoOff(size = 18, style = '') {
    return this.create('<line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-3.34-3.34L16 16.34V7.66l7-4.66v15l-1.66-1.11"></path><path d="M16 16v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1"></path>', size, style);
  },

  screenShare(size = 18, style = '') {
    return this.create('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><polyline points="8 21 12 17 16 21"></polyline><line x1="12" y1="17" x2="12" y2="10"></line><polyline points="9 13 12 10 15 13"></polyline>', size, style);
  },

  phoneOff(size = 18, style = '') {
    return this.create('<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="1" y1="1" x2="23" y2="23"></line>', size, style);
  },

  ban(size = 18, style = '') {
    return this.create('<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>', size, style);
  },

  save(size = 18, style = '') {
    return this.create('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>', size, style);
  },

  plus(size = 18, style = '') {
    return this.create('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', size, style);
  },

  trash(size = 18, style = '') {
    return this.create('<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>', size, style);
  },

  note(size = 18, style = '') {
    return this.create('<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line>', size, style);
  },

  edit(size = 18, style = '') {
    return this.pencil(size, style);
  },

  link(size = 18, style = '') {
    return this.create('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>', size, style);
  },

  externalLink(size = 18, style = '') {
    return this.create('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>', size, style);
  },

  dot(size = 8, color = 'currentColor', style = '') {
    return `<span style="display: inline-block; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; vertical-align: middle; ${style}"></span>`;
  }
};

window.Icons = Icons;
window.AvioraIcons = Icons;
