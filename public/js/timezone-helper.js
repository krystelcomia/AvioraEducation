/**
 * AVIORA EDUCATION - GEO, COUNTRY & TIMEZONE ENGINE
 * Handles internationalization of countries, timezones, live educator clocks,
 * and seamless cross-timezone slot scheduling conversion without double-booking conflicts.
 */

(function(window) {
  'use strict';

  const COUNTRIES = [
    { name: 'United States', code: 'US', flag: '🇺🇸', timezone: 'America/New_York', abbr: 'EST', currency: 'USD', symbol: '$', rate: 1.0, currencyName: 'US Dollar' },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', timezone: 'Europe/London', abbr: 'GMT', currency: 'GBP', symbol: '£', rate: 0.78, currencyName: 'British Pound' },
    { name: 'Canada', code: 'CA', flag: '🇨🇦', timezone: 'America/Toronto', abbr: 'EST', currency: 'CAD', symbol: 'CA$', rate: 1.36, currencyName: 'Canadian Dollar' },
    { name: 'Australia', code: 'AU', flag: '🇦🇺', timezone: 'Australia/Sydney', abbr: 'AEST', currency: 'AUD', symbol: 'A$', rate: 1.52, currencyName: 'Australian Dollar' },
    { name: 'Philippines', code: 'PH', flag: '🇵🇭', timezone: 'Asia/Manila', abbr: 'PHT', currency: 'PHP', symbol: '₱', rate: 56.0, currencyName: 'Philippine Peso' },
    { name: 'Singapore', code: 'SG', flag: '🇸🇬', timezone: 'Asia/Singapore', abbr: 'SGT', currency: 'SGD', symbol: 'S$', rate: 1.34, currencyName: 'Singapore Dollar' },
    { name: 'Japan', code: 'JP', flag: '🇯🇵', timezone: 'Asia/Tokyo', abbr: 'JST', currency: 'JPY', symbol: '¥', rate: 152.0, currencyName: 'Japanese Yen' },
    { name: 'South Korea', code: 'KR', flag: '🇰🇷', timezone: 'Asia/Seoul', abbr: 'KST', currency: 'KRW', symbol: '₩', rate: 1380.0, currencyName: 'South Korean Won' },
    { name: 'China', code: 'CN', flag: '🇨🇳', timezone: 'Asia/Shanghai', abbr: 'CST', currency: 'CNY', symbol: '¥', rate: 7.23, currencyName: 'Chinese Yuan' },
    { name: 'India', code: 'IN', flag: '🇮🇳', timezone: 'Asia/Kolkata', abbr: 'IST', currency: 'INR', symbol: '₹', rate: 83.5, currencyName: 'Indian Rupee' },
    { name: 'France', code: 'FR', flag: '🇫🇷', timezone: 'Europe/Paris', abbr: 'CET', currency: 'EUR', symbol: '€', rate: 0.92, currencyName: 'Euro' },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', timezone: 'Europe/Berlin', abbr: 'CET', currency: 'EUR', symbol: '€', rate: 0.92, currencyName: 'Euro' },
    { name: 'Spain', code: 'ES', flag: '🇪🇸', timezone: 'Europe/Madrid', abbr: 'CET', currency: 'EUR', symbol: '€', rate: 0.92, currencyName: 'Euro' },
    { name: 'Italy', code: 'IT', flag: '🇮🇹', timezone: 'Europe/Rome', abbr: 'CET', currency: 'EUR', symbol: '€', rate: 0.92, currencyName: 'Euro' },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷', timezone: 'America/Sao_Paulo', abbr: 'BRT', currency: 'BRL', symbol: 'R$', rate: 5.4, currencyName: 'Brazilian Real' },
    { name: 'Mexico', code: 'MX', flag: '🇲🇽', timezone: 'America/Mexico_City', abbr: 'CST', currency: 'MXN', symbol: 'MX$', rate: 18.2, currencyName: 'Mexican Peso' },
    { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', timezone: 'Asia/Dubai', abbr: 'GST', currency: 'AED', symbol: 'AED', rate: 3.67, currencyName: 'UAE Dirham' },
    { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', timezone: 'Asia/Riyadh', abbr: 'AST', currency: 'SAR', symbol: 'SAR', rate: 3.75, currencyName: 'Saudi Riyal' },
    { name: 'Indonesia', code: 'ID', flag: '🇮🇩', timezone: 'Asia/Jakarta', abbr: 'WIB', currency: 'IDR', symbol: 'Rp', rate: 15800.0, currencyName: 'Indonesian Rupiah' },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh', abbr: 'ICT', currency: 'VND', symbol: '₫', rate: 25000.0, currencyName: 'Vietnamese Dong' },
    { name: 'Turkey', code: 'TR', flag: '🇹🇷', timezone: 'Europe/Istanbul', abbr: 'TRT', currency: 'TRY', symbol: '₺', rate: 34.0, currencyName: 'Turkish Lira' },
    { name: 'Netherlands', code: 'NL', flag: '🇳🇱', timezone: 'Europe/Amsterdam', abbr: 'CET', currency: 'EUR', symbol: '€', rate: 0.92, currencyName: 'Euro' },
    { name: 'Poland', code: 'PL', flag: '🇵🇱', timezone: 'Europe/Warsaw', abbr: 'CET', currency: 'PLN', symbol: 'zł', rate: 3.98, currencyName: 'Polish Złoty' },
    { name: 'Sweden', code: 'SE', flag: '🇸🇪', timezone: 'Europe/Stockholm', abbr: 'CET', currency: 'SEK', symbol: 'kr', rate: 10.5, currencyName: 'Swedish Krona' },
    { name: 'Thailand', code: 'TH', flag: '🇹🇭', timezone: 'Asia/Bangkok', abbr: 'ICT', currency: 'THB', symbol: '฿', rate: 36.5, currencyName: 'Thai Baht' },
    { name: 'Switzerland', code: 'CH', flag: '🇨🇭', timezone: 'Europe/Zurich', abbr: 'CET', currency: 'CHF', symbol: 'CHF', rate: 0.89, currencyName: 'Swiss Franc' },
    { name: 'South Africa', code: 'ZA', flag: '🇿🇦', timezone: 'Africa/Johannesburg', abbr: 'SAST', currency: 'ZAR', symbol: 'R', rate: 18.0, currencyName: 'South African Rand' },
    { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', timezone: 'Pacific/Auckland', abbr: 'NZST', currency: 'NZD', symbol: 'NZ$', rate: 1.64, currencyName: 'New Zealand Dollar' }
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
      document.querySelectorAll('.tutor-live-clock[data-tutor-tz]').forEach(el => {
        const tz = el.getAttribute('data-tutor-tz');
        if (tz) {
          const time = this.getCurrentTimeInZone(tz);
          const abbr = this.getTimezoneAbbr(tz);
          el.textContent = `${time} (${abbr})`;
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

      // 6. Profile preferred timezone clock displays (student, teacher, admin)
      ['profile', 'teacher', 'admin'].forEach(prefix => {
        const box = document.getElementById(`${prefix}-timezone-clock-display`);
        const textEl = document.getElementById(`${prefix}-timezone-time-text`);
        const abbrEl = document.getElementById(`${prefix}-timezone-time-abbr`);
        if (box && textEl) {
          const tz = box.getAttribute('data-tz') || localStorage.getItem('aviora_timezone') || 'America/New_York';
          textEl.textContent = this.getCurrentTimeInZone(tz);
          if (abbrEl) abbrEl.textContent = this.getTimezoneAbbr(tz);
        }
      });
    },

    startLiveClocks(intervalMs = 30000) {
      if (this._clockInterval) clearInterval(this._clockInterval);
      this.updateLiveClocks();
      this._clockInterval = setInterval(() => this.updateLiveClocks(), intervalMs);
    }
  };

  const AvioraCurrency = {
    DEFAULT_CURRENCY: { code: 'USD', symbol: '$', rate: 1.0, currencyName: 'US Dollar' },

    getCountry(nameOrCode) {
      return AvioraGeo.getCountry(nameOrCode);
    },

    getCurrencyForCountry(countryNameOrCode) {
      if (!countryNameOrCode) return this.DEFAULT_CURRENCY;
      const c = this.getCountry(countryNameOrCode);
      if (c && c.currency) {
        return {
          code: c.currency,
          symbol: c.symbol || '$',
          rate: c.rate || 1.0,
          currencyName: c.currencyName || c.currency
        };
      }
      return this.DEFAULT_CURRENCY;
    },

    getActiveCountry() {
      if (typeof window === 'undefined') return 'United States';
      const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
      const uidKey = user ? `_${user.id}` : '';
      return (uidKey ? localStorage.getItem(`aviora_country${uidKey}`) : null)
        || user?.country
        || localStorage.getItem('aviora_country')
        || 'United States';
    },

    getActiveCurrency() {
      return this.getCurrencyForCountry(this.getActiveCountry());
    },

    getAdminCurrency() {
      const adminCountry = (typeof localStorage !== 'undefined' ? localStorage.getItem('aviora_admin_country') : null) || 'United States';
      return this.getCurrencyForCountry(adminCountry);
    },

    setAdminCountry(country) {
      if (typeof localStorage !== 'undefined' && country) {
        localStorage.setItem('aviora_admin_country', country);
        this.updateDOM();
      }
    },

    getCurrencyByCode(code) {
      if (!code) return this.DEFAULT_CURRENCY;
      const upper = String(code).toUpperCase().trim();
      const match = COUNTRIES.find(c => c.currency === upper);
      if (match) {
        return {
          code: match.currency,
          symbol: match.symbol || '$',
          rate: match.rate || 1.0,
          currencyName: match.currencyName || match.currency
        };
      }
      return this.DEFAULT_CURRENCY;
    },

    convert(amountInBase, fromCurrencyCode = 'USD', toCurrencyCode = null) {
      const val = parseFloat(amountInBase);
      if (isNaN(val)) return 0;
      const targetCurr = toCurrencyCode ? this.getCurrencyByCode(toCurrencyCode) : this.getActiveCurrency();
      const sourceCurr = fromCurrencyCode ? this.getCurrencyByCode(fromCurrencyCode) : this.DEFAULT_CURRENCY;

      // Base conversion to USD
      const inUsd = val / (sourceCurr.rate || 1.0);
      // Target conversion
      const result = inUsd * (targetCurr.rate || 1.0);

      // Rounding for currencies
      if (['JPY', 'KRW', 'VND', 'IDR'].includes(targetCurr.code)) {
        return Math.round(result);
      }
      if (targetCurr.code === 'PHP') {
        return Math.round(result);
      }
      return Math.round(result * 100) / 100;
    },

    convertInputToBase(amountInActiveCurrency, fromCurrencyCode = null) {
      const val = parseFloat(amountInActiveCurrency);
      if (isNaN(val)) return 0;
      const sourceCurr = fromCurrencyCode ? this.getCurrencyByCode(fromCurrencyCode) : this.getActiveCurrency();
      const inUsd = val / (sourceCurr.rate || 1.0);
      return Math.round(inUsd * 100) / 100;
    },

    convertFromAdmin(amountInAdmin, toCurrencyCode = null) {
      const adminCurr = this.getAdminCurrency();
      return this.convert(amountInAdmin, adminCurr.code, toCurrencyCode);
    },

    convertToAdmin(amountInUSD) {
      const adminCurr = this.getAdminCurrency();
      return this.convert(amountInUSD, 'USD', adminCurr.code);
    },

    format(amountInBase, options = {}) {
      const val = parseFloat(amountInBase);
      if (isNaN(val)) return '$0.00';
      const targetCurr = options.to ? this.getCurrencyByCode(options.to) : this.getActiveCurrency();
      const fromCurr = options.from ? this.getCurrencyByCode(options.from) : this.DEFAULT_CURRENCY;
      const converted = this.convert(val, fromCurr.code, targetCurr.code);

      const noDecimalCurrs = ['JPY', 'KRW', 'VND', 'IDR', 'PHP'];
      const isWhole = (converted % 1 === 0) || noDecimalCurrs.includes(targetCurr.code);
      const formattedNum = isWhole
        ? converted.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let out = `${targetCurr.symbol}${formattedNum}`;
      if (options.showCode) {
        out += ` ${targetCurr.code}`;
      }
      if (options.perHour) {
        out += ' / hr';
      }
      return out;
    },

    formatRange(minBase, maxBase, options = {}) {
      const targetCurr = options.to ? this.getCurrencyByCode(options.to) : this.getActiveCurrency();
      const cMin = this.convert(minBase, options.from || 'USD', targetCurr.code);
      const cMax = this.convert(maxBase, options.from || 'USD', targetCurr.code);
      const noDecimalCurrs = ['JPY', 'KRW', 'VND', 'IDR', 'PHP'];
      const isMinWhole = (cMin % 1 === 0) || noDecimalCurrs.includes(targetCurr.code);
      const isMaxWhole = (cMax % 1 === 0) || noDecimalCurrs.includes(targetCurr.code);
      const sMin = isMinWhole ? cMin.toLocaleString('en-US') : cMin.toFixed(2);
      const sMax = isMaxWhole ? cMax.toLocaleString('en-US') : cMax.toFixed(2);
      if (cMin === cMax) return `${targetCurr.symbol}${sMin}`;
      return `${targetCurr.symbol}${sMin}–${targetCurr.symbol}${sMax}`;
    },

    updateDOM() {
      if (typeof document === 'undefined') return;
      const curr = this.getActiveCurrency();

      // 1. Hourly Rate Input Labels & Currency Symbols
      ['t-profile-rate-label', 'app-hourly-rate-label', 'formal-subject-rate-label', 'subject-rate-label'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `Hourly Rate (${curr.symbol} ${curr.code} / hr)`;
      });
      ['formal-subject-rate-currency'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = curr.symbol;
      });

      // 2. Add Subject Modal Input
      const modalRateInp = document.getElementById('formal-subject-rate');
      if (modalRateInp) {
        let baseUsd = parseFloat(modalRateInp.getAttribute('data-base-usd'));
        if (isNaN(baseUsd) || baseUsd <= 0) {
          baseUsd = (typeof Teacher !== 'undefined' && (Teacher.tutorProfile?.hourly_rate || Teacher.application?.hourly_rate)) || 45;
          modalRateInp.setAttribute('data-base-usd', baseUsd);
        }
        modalRateInp.value = this.convert(baseUsd);
      }

      // 3. Application Form Rate Input
      const appRateInp = document.getElementById('app-hourly-rate');
      if (appRateInp) {
        let baseUsd = parseFloat(appRateInp.getAttribute('data-base-usd'));
        if (isNaN(baseUsd) || baseUsd <= 0) {
          baseUsd = 55;
          appRateInp.setAttribute('data-base-usd', '55');
        }
        appRateInp.value = this.convert(baseUsd);
      }

      // 4. Tutor Profile Rate Input & Hero Badge
      const rateInp = document.getElementById('t-profile-rate');
      if (rateInp) {
        let baseUsd = parseFloat(rateInp.getAttribute('data-base-usd'));
        if (isNaN(baseUsd) || baseUsd <= 0) {
          baseUsd = 45;
          rateInp.setAttribute('data-base-usd', '45');
        }
        rateInp.value = this.convert(baseUsd);
      }

      const rateBadge = document.getElementById('teacher-profile-rate-badge');
      if (rateBadge) {
        const baseUsd = parseFloat(rateInp?.getAttribute('data-base-usd')) || 45;
        rateBadge.textContent = this.format(baseUsd, { perHour: true });
      }

      // 5. Connected Teacher account pages (Classes, Subjects, Dashboard, Requests)
      if (typeof Teacher !== 'undefined') {
        if (typeof Teacher.renderTeacherSubjects === 'function') {
          Teacher.renderTeacherSubjects();
        }
        if (typeof Teacher.renderClasses === 'function') {
          Teacher.renderClasses();
        }
        if (typeof Teacher.renderDashboardStats === 'function') {
          Teacher.renderDashboardStats();
        }
        if (typeof Teacher.renderTeacherRequests === 'function') {
          Teacher.renderTeacherRequests();
        }
      }

      // 6. Navigation Wallet Balances
      if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'student') {
        const bal = parseFloat(Auth.currentUser.wallet_balance || 0);
        const formattedBal = this.format(bal);
        const navBal = document.getElementById('nav-wallet-balance');
        if (navBal) navBal.textContent = formattedBal;
        const dropBal = document.getElementById('wallet-dropdown-balance');
        if (dropBal) dropBal.textContent = formattedBal;
        const payBal = document.getElementById('pay-wallet-balance-label');
        if (payBal) payBal.textContent = formattedBal;
      }

      // 7. Rate Filter in Tutors Directory
      const rateFilter = document.getElementById('tutor-rate-filter');
      if (rateFilter) {
        rateFilter.querySelectorAll('option').forEach(opt => {
          const base = opt.value;
          if (base && base !== 'all' && !isNaN(parseFloat(base))) {
            const converted = this.convert(parseFloat(base));
            opt.textContent = `Under ${curr.symbol}${converted.toLocaleString('en-US')}/hr`;
          }
        });
      }

      // 8. Subscription Displays
      const subRateDisplay = document.getElementById('sub-enroll-tutor-rate-display');
      if (subRateDisplay) {
        const base = parseFloat(subRateDisplay.getAttribute('data-base-rate')) || 58;
        subRateDisplay.textContent = this.format(base, { perHour: true });
      }

      // 9. Generic data-usd-amount elements
      document.querySelectorAll('[data-usd-amount]').forEach(el => {
        const amt = parseFloat(el.getAttribute('data-usd-amount'));
        if (!isNaN(amt)) {
          const perHour = el.getAttribute('data-per-hour') === 'true';
          el.textContent = this.format(amt, { perHour });
        }
      });
    }
  };

  // Expose globally
  AvioraGeo.currency = AvioraCurrency;
  window.AvioraCurrency = AvioraCurrency;
  window.AvioraGeo = AvioraGeo;
  window.getTimezoneAbbr = function(tz) {
    return AvioraGeo.getTimezoneAbbr(tz);
  };

  // Start live clock updates on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        AvioraGeo.startLiveClocks();
        AvioraCurrency.updateDOM();
      });
    } else {
      AvioraGeo.startLiveClocks();
      AvioraCurrency.updateDOM();
    }
  }

})(typeof window !== 'undefined' ? window : global);
