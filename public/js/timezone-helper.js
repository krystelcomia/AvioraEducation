/**
 * AVIORA EDUCATION - GEO, COUNTRY & TIMEZONE ENGINE
 * Handles internationalization of countries, timezones, live educator clocks,
 * and seamless cross-timezone slot scheduling conversion without double-booking conflicts.
 */

(function(window) {
  'use strict';

  const COUNTRIES = [
    { name: 'United States', code: 'US', flag: '🇺🇸', timezone: 'America/New_York', abbr: 'EST' },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', timezone: 'Europe/London', abbr: 'GMT' },
    { name: 'Canada', code: 'CA', flag: '🇨🇦', timezone: 'America/Toronto', abbr: 'EST' },
    { name: 'Australia', code: 'AU', flag: '🇦🇺', timezone: 'Australia/Sydney', abbr: 'AEST' },
    { name: 'Philippines', code: 'PH', flag: '🇵🇭', timezone: 'Asia/Manila', abbr: 'PHT' },
    { name: 'Singapore', code: 'SG', flag: '🇸🇬', timezone: 'Asia/Singapore', abbr: 'SGT' },
    { name: 'Japan', code: 'JP', flag: '🇯🇵', timezone: 'Asia/Tokyo', abbr: 'JST' },
    { name: 'South Korea', code: 'KR', flag: '🇰🇷', timezone: 'Asia/Seoul', abbr: 'KST' },
    { name: 'China', code: 'CN', flag: '🇨🇳', timezone: 'Asia/Shanghai', abbr: 'CST' },
    { name: 'India', code: 'IN', flag: '🇮🇳', timezone: 'Asia/Kolkata', abbr: 'IST' },
    { name: 'France', code: 'FR', flag: '🇫🇷', timezone: 'Europe/Paris', abbr: 'CET' },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', timezone: 'Europe/Berlin', abbr: 'CET' },
    { name: 'Spain', code: 'ES', flag: '🇪🇸', timezone: 'Europe/Madrid', abbr: 'CET' },
    { name: 'Italy', code: 'IT', flag: '🇮🇹', timezone: 'Europe/Rome', abbr: 'CET' },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷', timezone: 'America/Sao_Paulo', abbr: 'BRT' },
    { name: 'Mexico', code: 'MX', flag: '🇲🇽', timezone: 'America/Mexico_City', abbr: 'CST' },
    { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', timezone: 'Asia/Dubai', abbr: 'GST' },
    { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', timezone: 'Asia/Riyadh', abbr: 'AST' },
    { name: 'Indonesia', code: 'ID', flag: '🇮🇩', timezone: 'Asia/Jakarta', abbr: 'WIB' },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh', abbr: 'ICT' },
    { name: 'Turkey', code: 'TR', flag: '🇹🇷', timezone: 'Europe/Istanbul', abbr: 'TRT' },
    { name: 'Netherlands', code: 'NL', flag: '🇳🇱', timezone: 'Europe/Amsterdam', abbr: 'CET' },
    { name: 'Poland', code: 'PL', flag: '🇵🇱', timezone: 'Europe/Warsaw', abbr: 'CET' },
    { name: 'Sweden', code: 'SE', flag: '🇸🇪', timezone: 'Europe/Stockholm', abbr: 'CET' },
    { name: 'Thailand', code: 'TH', flag: '🇹🇭', timezone: 'Asia/Bangkok', abbr: 'ICT' },
    { name: 'Switzerland', code: 'CH', flag: '🇨🇭', timezone: 'Europe/Zurich', abbr: 'CET' },
    { name: 'South Africa', code: 'ZA', flag: '🇿🇦', timezone: 'Africa/Johannesburg', abbr: 'SAST' },
    { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', timezone: 'Pacific/Auckland', abbr: 'NZST' }
  ];

  const TIMEZONE_ABBRS = {
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'America/Toronto': 'EST',
    'America/Sao_Paulo': 'BRT',
    'America/Mexico_City': 'CST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Europe/Madrid': 'CET',
    'Europe/Rome': 'CET',
    'Europe/Amsterdam': 'CET',
    'Europe/Warsaw': 'CET',
    'Europe/Stockholm': 'CET',
    'Europe/Zurich': 'CET',
    'Europe/Istanbul': 'TRT',
    'Asia/Dubai': 'GST',
    'Asia/Riyadh': 'AST',
    'Asia/Kolkata': 'IST',
    'Asia/Bangkok': 'ICT',
    'Asia/Jakarta': 'WIB',
    'Asia/Ho_Chi_Minh': 'ICT',
    'Asia/Singapore': 'SGT',
    'Asia/Manila': 'PHT',
    'Asia/Shanghai': 'CST',
    'Asia/Tokyo': 'JST',
    'Asia/Seoul': 'KST',
    'Australia/Sydney': 'AEST',
    'Pacific/Auckland': 'NZST',
    'Africa/Johannesburg': 'SAST',
    'UTC': 'UTC'
  };

  const TIMEZONES_LIST = [
    { value: 'America/New_York', label: 'America/New_York (EST / EDT)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST / CDT)' },
    { value: 'America/Denver', label: 'America/Denver (MST / MDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST / PDT)' },
    { value: 'America/Toronto', label: 'America/Toronto (EST / EDT)' },
    { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
    { value: 'America/Mexico_City', label: 'America/Mexico_City (CST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT / BST)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET / CEST)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET / CEST)' },
    { value: 'Europe/Madrid', label: 'Europe/Madrid (CET / CEST)' },
    { value: 'Europe/Rome', label: 'Europe/Rome (CET / CEST)' },
    { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET / CEST)' },
    { value: 'Europe/Warsaw', label: 'Europe/Warsaw (CET / CEST)' },
    { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET / CEST)' },
    { value: 'Europe/Zurich', label: 'Europe/Zurich (CET / CEST)' },
    { value: 'Europe/Istanbul', label: 'Europe/Istanbul (TRT)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
    { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
    { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
    { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
    { value: 'Asia/Manila', label: 'Asia/Manila (PHT)' },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST / AEDT)' },
    { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST / NZDT)' },
    { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
    { value: 'UTC', label: 'UTC (Coordinated Time)' }
  ];

  function getTimezoneOffsetMinutes(tz, date = new Date()) {
    try {
      const d = new Date(date.getTime());
      const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(d.toLocaleString('en-US', { timeZone: tz }));
      return Math.round((tzDate - utcDate) / (60 * 1000));
    } catch (e) {
      return 0;
    }
  }

  const AvioraGeo = {
    COUNTRIES,
    TIMEZONES_LIST,
    TIMEZONE_ABBRS,

    getCountry(nameOrCode) {
      if (!nameOrCode) return null;
      const lower = String(nameOrCode).trim().toLowerCase();
      return COUNTRIES.find(c => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower) || null;
    },

    getCountryFlag(countryName) {
      if (!countryName) return '🌐';
      const c = this.getCountry(countryName);
      return c ? c.flag : '🌐';
    },

    getDefaultTimezone(countryName) {
      if (!countryName) return 'America/New_York';
      const c = this.getCountry(countryName);
      return c ? c.timezone : 'America/New_York';
    },

    getTimezoneAbbr(tz) {
      const activeTz = tz || (typeof localStorage !== 'undefined' ? localStorage.getItem('aviora_timezone') : null) || 'America/New_York';
      if (TIMEZONE_ABBRS[activeTz]) return TIMEZONE_ABBRS[activeTz];
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: activeTz, timeZoneName: 'short' }).formatToParts(new Date());
        const tzName = parts.find(p => p.type === 'timeZoneName')?.value;
        return tzName || activeTz.split('/').pop().replace('_', ' ');
      } catch (e) {
        return activeTz.split('/').pop().replace('_', ' ');
      }
    },

    getCurrentTimeInZone(tz, date = new Date()) {
      const activeTz = tz || 'America/New_York';
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: activeTz,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(date);
      } catch (e) {
        return '';
      }
    },

    convertDateAndTimeToZone(dateStr, timeStr, fromTz, toTz) {
      if (!fromTz || !toTz || fromTz === toTz) {
        const [h, m] = (timeStr || '09:00').split(':').map(Number);
        return {
          date: dateStr,
          time: timeStr,
          hour: isNaN(h) ? 9 : h,
          minute: isNaN(m) ? 0 : m
        };
      }

      try {
        const [h, m] = (timeStr || '09:00').split(':').map(Number);
        const [year, month, day] = dateStr.split('-').map(Number);
        const approxUtc = new Date(Date.UTC(year, month - 1, day, isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0));
        
        const offsetFrom = getTimezoneOffsetMinutes(fromTz, approxUtc);
        const exactUtcMs = approxUtc.getTime() - (offsetFrom * 60 * 1000);
        const targetDateObj = new Date(exactUtcMs);
        
        const toDateParts = new Intl.DateTimeFormat('en-US', {
          timeZone: toTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).formatToParts(targetDateObj);
        
        const partMap = {};
        toDateParts.forEach(p => partMap[p.type] = p.value);
        
        const targetDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
        let targetHour = parseInt(partMap.hour, 10);
        if (targetHour === 24) targetHour = 0;
        const targetTimeStr = `${String(targetHour).padStart(2, '0')}:${partMap.minute}`;
        
        return {
          date: targetDateStr,
          time: targetTimeStr,
          hour: targetHour,
          minute: parseInt(partMap.minute, 10),
          rawUtc: exactUtcMs
        };
      } catch (err) {
        return { date: dateStr, time: timeStr, hour: 9, minute: 0 };
      }
    },

    convertTimeRange(dateStr, timeRangeStr, fromTz, toTz) {
      if (!timeRangeStr || !timeRangeStr.includes('-')) {
        const conv = this.convertDateAndTimeToZone(dateStr, timeRangeStr || '09:00', fromTz, toTz);
        return {
          studentDate: conv.date,
          studentTime: conv.time,
          startHour: conv.hour,
          endHour: conv.hour + 1
        };
      }

      const parts = timeRangeStr.split('-').map(s => s.trim());
      const startConv = this.convertDateAndTimeToZone(dateStr, parts[0], fromTz, toTz);
      const endConv = this.convertDateAndTimeToZone(dateStr, parts[1], fromTz, toTz);

      return {
        studentDate: startConv.date,
        studentTime: `${startConv.time} - ${endConv.time}`,
        startHour: startConv.hour,
        endHour: endConv.hour
      };
    },

    getConvertedSlotsForStudent(studentDateStr, tutor, studentTz, durationMins = 50) {
      if (!tutor || !studentDateStr) return [];
      const tutorTz = tutor.timezone || 'America/New_York';
      const cleanStudentTz = studentTz || (typeof localStorage !== 'undefined' ? localStorage.getItem('aviora_timezone') : null) || 'America/New_York';

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const [year, month, day] = studentDateStr.split('-').map(Number);
      const convertedSlots = [];

      // Check offset days: yesterday (-1), today (0), tomorrow (+1)
      [-1, 0, 1].forEach(offset => {
        const d = new Date(Date.UTC(year, month - 1, day + offset, 12, 0, 0));
        const checkDateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const checkDayName = dayNames[d.getUTCDay()];

        const blocks = (typeof Tutors !== 'undefined' && Tutors.getTutorDateBlocks)
          ? Tutors.getTutorDateBlocks(tutor, checkDateStr, checkDayName)
          : ((tutor.availability_schedule || {})[checkDayName] || []);

        blocks.forEach(b => {
          const parts = String(b).split('-').map(s => s.trim());
          if (parts.length === 2) {
            const startH = parseInt(parts[0].split(':')[0], 10);
            const endH = parseInt(parts[1].split(':')[0], 10);

            for (let h = startH; h < endH; h++) {
              const tutorTimeStart = `${String(h).padStart(2, '0')}:00`;
              const tutorTimeEnd = `${String(h).padStart(2, '0')}:${durationMins}`;

              const startConv = this.convertDateAndTimeToZone(checkDateStr, tutorTimeStart, tutorTz, cleanStudentTz);
              const endConv = this.convertDateAndTimeToZone(checkDateStr, tutorTimeEnd, tutorTz, cleanStudentTz);

              if (startConv.date === studentDateStr) {
                convertedSlots.push({
                  studentDate: startConv.date,
                  studentStart: startConv.time,
                  studentEnd: endConv.time,
                  studentKey: `${startConv.time} - ${endConv.time}`,
                  studentHour: startConv.hour,
                  tutorDate: checkDateStr,
                  tutorDayName: checkDayName,
                  tutorTime: `${tutorTimeStart} - ${tutorTimeEnd}`,
                  tutorStart: tutorTimeStart,
                  tutorEnd: tutorTimeEnd,
                  tutorHour: h,
                  rawUtc: startConv.rawUtc
                });
              }
            }
          }
        });
      });

      // Deduplicate slots if any and sort by studentStart
      const seen = new Set();
      const uniqueSlots = [];
      for (const slot of convertedSlots) {
        if (!seen.has(slot.studentKey)) {
          seen.add(slot.studentKey);
          uniqueSlots.push(slot);
        }
      }
      uniqueSlots.sort((a, b) => a.studentStart.localeCompare(b.studentStart));
      return uniqueSlots;
    },

    populateCountrySelect(selectElement, selectedValue) {
      if (!selectElement) return;
      const currentVal = selectedValue || selectElement.value || 'United States';
      selectElement.innerHTML = COUNTRIES.map(c => `
        <option value="${c.name}" ${c.name === currentVal ? 'selected' : ''}>
          ${c.flag} ${c.name}
        </option>
      `).join('');
    },

    populateTimezoneSelect(selectElement, selectedValue) {
      if (!selectElement) return;
      const currentVal = selectedValue || selectElement.value || 'America/New_York';
      selectElement.innerHTML = TIMEZONES_LIST.map(tz => `
        <option value="${tz.value}" ${tz.value === currentVal ? 'selected' : ''}>
          ${tz.label}
        </option>
      `).join('');
    },

    updateLiveClocks() {
      // 1. Tutor card live clocks
      document.querySelectorAll('[data-tutor-tz]').forEach(el => {
        const tz = el.getAttribute('data-tutor-tz');
        if (tz) {
          const time = this.getCurrentTimeInZone(tz);
          const icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
          el.innerHTML = `${icon} ${time} local`;
        }
      });

      // 2. Tutor full profile live clock
      document.querySelectorAll('.tutor-profile-live-time[data-tutor-tz]').forEach(el => {
        const tz = el.getAttribute('data-tutor-tz');
        if (tz) {
          const time = this.getCurrentTimeInZone(tz);
          const abbr = this.getTimezoneAbbr(tz);
          el.textContent = `${time} (${abbr})`;
        }
      });

      // 3. Teacher schedule live clock
      const teacherClock = document.getElementById('teacher-live-clock');
      if (teacherClock) {
        const teacherTz = teacherClock.getAttribute('data-tz') || localStorage.getItem('aviora_timezone') || 'America/New_York';
        const time = this.getCurrentTimeInZone(teacherTz);
        const abbr = this.getTimezoneAbbr(teacherTz);
        teacherClock.textContent = `${time} (${abbr})`;
      }

      // 4. Teacher profile page hero live clock
      const teacherProfClock = document.getElementById('teacher-profile-live-clock');
      if (teacherProfClock) {
        const tTz = teacherProfClock.getAttribute('data-tz') || localStorage.getItem('aviora_timezone') || 'America/New_York';
        const time = this.getCurrentTimeInZone(tTz);
        const abbr = this.getTimezoneAbbr(tTz);
        teacherProfClock.textContent = `${time} (${abbr})`;
      }

      // 5. Teacher dashboard hero live clock
      const teacherDashClock = document.getElementById('teacher-dashboard-live-clock');
      if (teacherDashClock) {
        const tTz = teacherDashClock.getAttribute('data-tz') || localStorage.getItem('aviora_timezone') || 'America/New_York';
        const time = this.getCurrentTimeInZone(tTz);
        const abbr = this.getTimezoneAbbr(tTz);
        teacherDashClock.textContent = `${time} (${abbr})`;
      }
    },

    startLiveClocks(intervalMs = 30000) {
      if (this._clockInterval) clearInterval(this._clockInterval);
      this.updateLiveClocks();
      this._clockInterval = setInterval(() => this.updateLiveClocks(), intervalMs);
    }
  };

  // Expose globally
  window.AvioraGeo = AvioraGeo;
  window.getTimezoneAbbr = function(tz) {
    return AvioraGeo.getTimezoneAbbr(tz);
  };

  // Start live clock updates on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AvioraGeo.startLiveClocks());
    } else {
      AvioraGeo.startLiveClocks();
    }
  }

})(typeof window !== 'undefined' ? window : global);
