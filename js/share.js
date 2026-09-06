/**
 * CompAlumim - Sharing & Export Engine • בית הספר עלומים חולון
 * Handles:
 * - PDF export (compact single-page A4 dashboard)
 * - Direct Print (window.print)
 * - WhatsApp sharing
 * - Telegram, Email, Facebook sharing
 * - Native mobile device sharing (navigator.share)
 */

const ShareEngine = (() => {
  let modalEl = null;

  function init() {
    modalEl = document.getElementById('shareModal');

    const btnOpenShare = document.getElementById('btnOpenShareModal');
    if (btnOpenShare) {
      btnOpenShare.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        openShareModal();
      });
    }

    const btnClose = document.getElementById('shareModalClose');
    if (btnClose) {
      btnClose.addEventListener('click', closeShareModal);
    }

    // Share Actions
    setupShareButtons();
  }

  function openShareModal() {
    if (!modalEl) return;
    modalEl.classList.add('active');
  }

  function closeShareModal() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
  }

  function getShareDetails() {
    const weekDates = Schedule.getWeekDates();
    const firstDay = weekDates[0];
    const lastDay = weekDates[5];
    const datesStr = `${firstDay.formattedDate} - ${lastDay.formattedDate}`;
    const schoolName = 'בית הספר עלומים חולון';
    const roomName = document.querySelector('.room-tab-btn.active')?.dataset.room === 'library'
      ? 'ספריית בית הספר'
      : 'חדר המחשבים';

    // Automatically append the sync URL so any teacher opening the link connects to the same cloud data!
    const gsUrl = Storage.getGoogleSheetsUrl();
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = gsUrl
      ? `${baseUrl}?sync=${encodeURIComponent(gsUrl)}`
      : window.location.href;

    const title = `${schoolName} • שיבוץ שבועי (${roomName})`;
    const text = `📋 לוח שיבוצים שבועי עבור ${roomName} לשבוע ${datesStr} ב${schoolName}:\n${shareUrl}`;

    return { title, text, url: shareUrl, datesStr, roomName, schoolName };
  }

  function setupShareButtons() {
    // 1. PDF Export / 1-Page Dashboard Print
    const btnPdf = document.getElementById('btnSharePdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        closeShareModal();
        prepareAndPrint();
      });
    }

    // 2. Direct Print
    const btnPrint = document.getElementById('btnSharePrint');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        closeShareModal();
        prepareAndPrint();
      });
    }

    // 3. WhatsApp
    const btnWhatsapp = document.getElementById('btnShareWhatsapp');
    if (btnWhatsapp) {
      btnWhatsapp.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const { text } = getShareDetails();
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
      });
    }

    // 4. Telegram
    const btnTelegram = document.getElementById('btnShareTelegram');
    if (btnTelegram) {
      btnTelegram.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const { text, url } = getShareDetails();
        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(tgUrl, '_blank');
      });
    }

    // 5. Email
    const btnEmail = document.getElementById('btnShareEmail');
    if (btnEmail) {
      btnEmail.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const { title, text } = getShareDetails();
        const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
        window.location.href = mailUrl;
      });
    }

    // 6. Facebook
    const btnFacebook = document.getElementById('btnShareFacebook');
    if (btnFacebook) {
      btnFacebook.addEventListener('click', () => {
        if (window.SoundFX) SoundFX.playClick();
        const { url } = getShareDetails();
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
      });
    }

    // 7. Native Mobile Share / Other App
    const btnNative = document.getElementById('btnShareNative');
    if (btnNative) {
      btnNative.addEventListener('click', async () => {
        if (window.SoundFX) SoundFX.playClick();
        const { title, text, url } = getShareDetails();

        if (navigator.share) {
          try {
            await navigator.share({ title, text, url });
            App.showToast('שותף בהצלחה! 🌟', 'success');
            closeShareModal();
          } catch (err) {
            // Cancelled by user or failed
          }
        } else {
          // Fallback: Copy to clipboard
          try {
            await navigator.clipboard.writeText(url);
            App.showToast('קישור הלוח הועתק ללוח הגזירים! 📋', 'success');
            closeShareModal();
          } catch {
            App.showToast('הקישור: ' + url, 'info');
          }
        }
      });
    }
  }

  /**
   * Prepares compact single-page A4 print layout
   */
  function prepareAndPrint() {
    App.showToast('מכין עמוד קומפקטי להדפסה / שמירה כ-PDF... 📄', 'info', 2000);
    setTimeout(() => {
      window.print();
    }, 250);
  }

  return {
    init,
    openShareModal,
    closeShareModal
  };
})();

// Export globally
window.ShareEngine = ShareEngine;
