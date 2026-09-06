/**
 * CompAlumim - Holidays & Hebrew Calendar Engine
 * Provides Hebrew calendar dates and Israeli school/national holidays
 * using browser-native Intl.DateTimeFormat (no heavy external dependencies).
 */

const Holidays = (() => {
  /**
   * Get Hebrew calendar information for a given Gregorian Date
   * @param {Date} date 
   * @returns {{ hebrewDay: number, hebrewMonth: string, holiday: object|null }}
   */
  function getHoliday(date) {
    if (!date || isNaN(date.getTime())) return null;

    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    const d = date.getDate();

    try {
      // Use native Hebrew calendar formatter
      const dayStr = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric' }).format(date);
      const hebrewDay = parseInt(dayStr, 10);
      const hebrewMonth = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { month: 'long' }).format(date);

      // ── Tishri Holidays (חגי תשרי) ──
      if (hebrewMonth === 'Elul' && hebrewDay === 29) {
        return { name: 'ערב ראש השנה', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && (hebrewDay === 1 || hebrewDay === 2)) {
        return { name: `ראש השנה ${hebrewDay === 1 ? 'א׳' : 'ב׳'}`, isChag: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 3) {
        return { name: 'צום גדליה', isFast: true, isSchoolOff: false };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 9) {
        return { name: 'ערב יום כיפור', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 10) {
        return { name: 'יום כיפור', isChag: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 14) {
        return { name: 'ערב סוכות', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 15) {
        return { name: 'חג סוכות', isChag: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay >= 16 && hebrewDay <= 20) {
        return { name: 'חול המועד סוכות', isCholHamoed: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 21) {
        return { name: 'הושענא רבה', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tishri' && hebrewDay === 22) {
        return { name: 'שמחת תורה', isChag: true, isSchoolOff: true };
      }

      // ── Hanukkah (חנוכה) ──
      if (hebrewMonth === 'Kislev' && hebrewDay >= 25) {
        const hanukkahDay = hebrewDay - 24;
        return { name: `חנוכה (נר ${hanukkahDay})`, isChag: false, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tevet' && hebrewDay <= 3) {
        const hanukkahDay = hebrewDay + 5; // approximately
        return { name: `חנוכה (יום ${hanukkahDay})`, isChag: false, isSchoolOff: true };
      }
      if (hebrewMonth === 'Tevet' && hebrewDay === 10) {
        return { name: 'עשרה בטבת', isFast: true, isSchoolOff: false };
      }

      // ── Tu BiShvat (ט״ו בשבט) ──
      if (hebrewMonth === 'Shevat' && hebrewDay === 15) {
        return { name: 'ט״ו בשבט', isChag: false, isSchoolOff: false };
      }

      // ── Purim (פורים) ──
      const isAdar = hebrewMonth.startsWith('Adar');
      if (isAdar && hebrewDay === 13) {
        return { name: 'תענית אסתר', isFast: true, isSchoolOff: false };
      }
      if (isAdar && hebrewDay === 14) {
        return { name: 'פורים', isChag: true, isSchoolOff: true };
      }
      if (isAdar && hebrewDay === 15) {
        return { name: 'שושן פורים', isChag: true, isSchoolOff: true };
      }

      // ── Pesach (פסח) ──
      if (hebrewMonth === 'Nisan' && hebrewDay === 14) {
        return { name: 'ערב פסח', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Nisan' && hebrewDay === 15) {
        return { name: 'חג הפסח', isChag: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Nisan' && hebrewDay >= 16 && hebrewDay <= 20) {
        return { name: 'חול המועד פסח', isCholHamoed: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Nisan' && hebrewDay === 21) {
        return { name: 'שביעי של פסח', isChag: true, isSchoolOff: true };
      }

      // ── Memorial & Independence Days (ימי זיכרון ועצמאות) ──
      if (hebrewMonth === 'Nisan' && hebrewDay === 27) {
        return { name: 'יום השואה', isMemorial: true, isSchoolOff: false };
      }
      if (hebrewMonth === 'Iyar' && (hebrewDay === 3 || hebrewDay === 4)) {
        return { name: 'יום הזיכרון', isMemorial: true, isSchoolOff: false };
      }
      if (hebrewMonth === 'Iyar' && (hebrewDay === 4 || hebrewDay === 5)) {
        return { name: 'יום העצמאות', isChag: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Iyar' && hebrewDay === 18) {
        return { name: 'ל״ג בעומר', isChag: false, isSchoolOff: true };
      }
      if (hebrewMonth === 'Iyar' && hebrewDay === 28) {
        return { name: 'יום ירושלים', isChag: false, isSchoolOff: false };
      }

      // ── Shavuot (שבועות) ──
      if (hebrewMonth === 'Sivan' && hebrewDay === 5) {
        return { name: 'ערב שבועות', isEve: true, isSchoolOff: true };
      }
      if (hebrewMonth === 'Sivan' && hebrewDay === 6) {
        return { name: 'חג השבועות', isChag: true, isSchoolOff: true };
      }

      // ── Summer Fast Days (תמוז ואב) ──
      if (hebrewMonth === 'Tammuz' && hebrewDay === 17) {
        return { name: 'צום י״ז בתמוז', isFast: true, isSchoolOff: false };
      }
      if (hebrewMonth === 'Av' && hebrewDay === 9) {
        return { name: 'תשעה באב', isFast: true, isSchoolOff: true };
      }

    } catch (e) {
      console.warn('Holidays calculation error:', e);
    }

    return null;
  }

  return {
    getHoliday
  };
})();

// Export globally
window.Holidays = Holidays;
