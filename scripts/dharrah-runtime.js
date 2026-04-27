(function () {
  if (window.__DHARRAH_RUNTIME__) return;

  var runtime = {
    observer: null,
    scheduled: false
  };

  var COUNTRY_CODES = [
    { iso: 'IN', code: '+91' },
    { iso: 'US', code: '+1' },
    { iso: 'AE', code: '+971' },
    { iso: 'GB', code: '+44' }
  ];

  var FORM_COOLDOWN_MS = 45000;
  var BOT_MIN_COMPLETION_MS = 2500;
  var FORM_COOLDOWN_KEY = 'dh_last_form_submit_at';

  function normalizeText(value) {
    return (value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isVisible(node) {
    if (!node) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return false;
    }
    return !!(node.offsetParent || (style && style.position === 'fixed'));
  }

  function requestFrame(callback) {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(callback);
      return;
    }
    window.setTimeout(callback, 16);
  }

  function getTimestamp() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function getCurrentRoute() {
    var hash = normalizeText((window.location && window.location.hash) || '');
    if (hash.indexOf('services') !== -1) return 'services';
    return document.getElementById('page-services') ? 'services' : 'home';
  }

  function trackEvent(name, params) {
    if (!window.trackDharrahEvent) return;
    window.trackDharrahEvent(name, Object.assign({
      route: getCurrentRoute()
    }, params || {}));
  }

  function readStorageNumber(key) {
    try {
      var value = window.localStorage ? window.localStorage.getItem(key) : '';
      var parsed = value ? parseInt(value, 10) : 0;
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      return 0;
    }
  }

  function writeStorageNumber(key, value) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    } catch (error) {
      // Ignore storage write issues in private or restricted contexts.
    }
  }

  function injectRuntimeStyles() {
    if (document.getElementById('dh-runtime-style')) return;

    var style = document.createElement('style');
    style.id = 'dh-runtime-style';
    style.textContent = [
      '.phone-picker-group {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  gap: 0 !important;',
      '  border: 1.5px solid rgba(61, 85, 128, 0.14) !important;',
      '  border-radius: 8px !important;',
      '  background: #f4f8fc !important;',
      '  margin-top: 8px !important;',
      '  height: 45px !important;',
      '  overflow: hidden !important;',
      '  width: 100% !important;',
      '  transition: all 0.3s ease;',
      '}',
      '.phone-picker-group:focus-within {',
      '  border-color: #c8201a !important;',
      '  box-shadow: 0 0 8px rgba(200, 32, 26, 0.15) !important;',
      '  background: #fff !important;',
      '}',
      '.phone-picker-group.has-error {',
      '  border-color: #ff4d4f !important;',
      '  background: #fff2f0 !important;',
      '}',
      '.phone-picker-group .cc-select {',
      '  flex-shrink: 0 !important;',
      '  width: 90px !important;',
      '  white-space: nowrap !important;',
      '  background: rgba(61, 85, 128, 0.03) !important;',
      '  border: none !important;',
      '  border-right: 1.5px solid rgba(61, 85, 128, 0.14) !important;',
      '  padding: 0 10px !important;',
      '  cursor: pointer !important;',
      '  font-size: 13px !important;',
      '  color: #1a2d5a !important;',
      '  outline: none !important;',
      '  height: 100% !important;',
      '  appearance: none;',
      '  font-weight: 500;',
      '}',
      '.phone-picker-group [data-dh-phone-input] {',
      '  flex-grow: 1 !important;',
      '  width: 100% !important;',
      '  min-width: 0 !important;',
      '  border: none !important;',
      '  padding: 0 15px !important;',
      '  font-size: 14px !important;',
      '  color: #1a2d5a !important;',
      '  outline: none !important;',
      '  background: transparent !important;',
      '  height: 100% !important;',
      '}',
      '.phone-picker-group [data-dh-phone-input]::placeholder {',
      '  color: #8a9fc7;',
      '  opacity: 0.6;',
      '}',
      '#dh-popup-overlay {',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  width: 100%;',
      '  height: 100%;',
      '  background: rgba(26, 45, 90, 0.4);',
      '  backdrop-filter: blur(5px);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  z-index: 99999;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.3s ease;',
      '}',
      '#dh-popup-overlay.active {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',
      '#dh-popup-box {',
      '  background: #fff;',
      '  border-radius: 12px;',
      '  padding: 35px;',
      '  width: 90%;',
      '  max-width: 400px;',
      '  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);',
      '  transform: translateY(20px);',
      '  transition: transform 0.3s ease;',
      '  text-align: center;',
      '  font-family: "DM Sans", sans-serif;',
      '  border-top: 4px solid #c8201a;',
      '}',
      '#dh-popup-overlay.active #dh-popup-box {',
      '  transform: translateY(0);',
      '}',
      '#dh-popup-box .p-icon {',
      '  font-size: 50px;',
      '  margin-bottom: 15px;',
      '  display: block;',
      '}',
      '#dh-popup-box .p-title {',
      '  color: #1a2d5a;',
      '  font-weight: 700;',
      '  font-size: 22px;',
      '  margin-bottom: 12px;',
      '}',
      '#dh-popup-box .p-msg {',
      '  color: #4b5563;',
      '  font-size: 15px;',
      '  line-height: 1.6;',
      '  margin-bottom: 25px;',
      '  white-space: pre-line;',
      '}',
      '#dh-popup-box .p-btn {',
      '  background: #1a2d5a;',
      '  color: #fff;',
      '  border: none;',
      '  padding: 12px 35px;',
      '  border-radius: 8px;',
      '  cursor: pointer;',
      '  font-weight: 600;',
      '  font-size: 14px;',
      '  transition: all 0.2s;',
      '  width: 100%;',
      '}',
      '#dh-popup-box .p-btn:hover {',
      '  background: #c8201a;',
      '  transform: translateY(-1px);',
      '  box-shadow: 0 4px 12px rgba(200, 32, 26, 0.2);',
      '}',
      '.dh-proof-band {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 14px;',
      '  margin-top: 26px;',
      '}',
      '.dh-proof-card {',
      '  background: linear-gradient(145deg, rgba(244, 248, 252, 0.92), rgba(255, 255, 255, 0.98));',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  border-radius: 12px;',
      '  padding: 16px 18px;',
      '  box-shadow: 0 10px 26px rgba(26, 45, 90, 0.05);',
      '}',
      '.dh-proof-eyebrow {',
      '  display: block;',
      '  font-size: 11px;',
      '  letter-spacing: 1.8px;',
      '  text-transform: uppercase;',
      '  color: #c8201a;',
      '  font-weight: 700;',
      '  margin-bottom: 8px;',
      '}',
      '.dh-proof-value {',
      '  display: block;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 24px;',
      '  line-height: 1.1;',
      '  color: #1a2d5a;',
      '  margin-bottom: 6px;',
      '}',
      '.dh-proof-text {',
      '  display: block;',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '  color: #4b5d7e;',
      '}',
      '.dh-form-proof {',
      '  margin-bottom: 22px;',
      '  padding: 18px 18px 16px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(244, 248, 252, 0.92), rgba(255, 255, 255, 1));',
      '}',
      '.dh-form-proof-head {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-bottom: 14px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-form-proof-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 24px;',
      '  line-height: 1.2;',
      '  color: #1a2d5a;',
      '}',
      '.dh-form-proof-pill {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  border-radius: 999px;',
      '  padding: 8px 14px;',
      '  border: 1px solid rgba(200, 32, 26, 0.16);',
      '  background: rgba(200, 32, 26, 0.06);',
      '  color: #c8201a;',
      '  font-size: 11px;',
      '  letter-spacing: 1.2px;',
      '  text-transform: uppercase;',
      '  font-weight: 700;',
      '}',
      '.dh-form-proof-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 12px;',
      '}',
      '.dh-form-proof-stat {',
      '  padding: 14px 14px 12px;',
      '  border-radius: 10px;',
      '  background: #fff;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '}',
      '.dh-form-proof-stat strong {',
      '  display: block;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 22px;',
      '  color: #1a2d5a;',
      '  margin-bottom: 4px;',
      '}',
      '.dh-form-proof-stat span {',
      '  display: block;',
      '  font-size: 12px;',
      '  line-height: 1.5;',
      '  color: #5c6f90;',
      '}',
      '.dh-form-reassurance {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin: 16px 0 0;',
      '}',
      '.dh-reassurance-chip {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 9px 12px;',
      '  border-radius: 999px;',
      '  background: rgba(61, 79, 204, 0.06);',
      '  border: 1px solid rgba(61, 79, 204, 0.14);',
      '  color: #3d4fcc;',
      '  font-size: 12px;',
      '  line-height: 1.4;',
      '  font-weight: 600;',
      '}',
      '.dh-next-steps {',
      '  margin-top: 18px;',
      '  padding: 18px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: rgba(255, 255, 255, 0.92);',
      '}',
      '.dh-next-steps-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 21px;',
      '  color: #1a2d5a;',
      '  margin-bottom: 12px;',
      '}',
      '.dh-next-step-list {',
      '  margin: 0;',
      '  padding: 0;',
      '  list-style: none;',
      '  display: grid;',
      '  gap: 10px;',
      '}',
      '.dh-next-step {',
      '  display: grid;',
      '  grid-template-columns: 34px 1fr;',
      '  gap: 12px;',
      '  align-items: start;',
      '}',
      '.dh-next-step-no {',
      '  width: 34px;',
      '  height: 34px;',
      '  border-radius: 50%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(200, 32, 26, 0.08);',
      '  color: #c8201a;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '}',
      '.dh-next-step-copy strong {',
      '  display: block;',
      '  font-size: 13px;',
      '  color: #1a2d5a;',
      '  margin-bottom: 2px;',
      '}',
      '.dh-next-step-copy span {',
      '  display: block;',
      '  font-size: 12px;',
      '  color: #5c6f90;',
      '  line-height: 1.5;',
      '}',
      '.dh-sector-strip {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin-top: 14px;',
      '}',
      '.dh-sector-tag {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 8px 12px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  color: #4b5d7e;',
      '  background: rgba(244, 248, 252, 0.9);',
      '  font-size: 11px;',
      '  letter-spacing: 1px;',
      '  text-transform: uppercase;',
      '  font-weight: 700;',
      '}',
      '.dh-form-status {',
      '  margin-top: 18px;',
      '  padding: 14px 16px;',
      '  border-radius: 10px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #f8fbfe;',
      '  color: #4b5d7e;',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '}',
      '.dh-form-status strong {',
      '  color: #1a2d5a;',
      '}',
      '.dh-form-status.is-success {',
      '  border-color: rgba(37, 99, 235, 0.18);',
      '  background: rgba(59, 130, 246, 0.06);',
      '}',
      '.dh-form-status.is-warning {',
      '  border-color: rgba(245, 158, 11, 0.18);',
      '  background: rgba(245, 158, 11, 0.08);',
      '}',
      '.dh-form-status.is-error {',
      '  border-color: rgba(239, 68, 68, 0.18);',
      '  background: rgba(239, 68, 68, 0.07);',
      '}',
      '.dh-honeypot {',
      '  position: absolute !important;',
      '  left: -9999px !important;',
      '  width: 1px !important;',
      '  height: 1px !important;',
      '  overflow: hidden !important;',
      '}',
      '.dh-cta-proof {',
      '  display: flex;',
      '  justify-content: center;',
      '  gap: 14px;',
      '  flex-wrap: wrap;',
      '  margin-top: 24px;',
      '}',
      '.dh-cta-proof span {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 10px 14px;',
      '  border-radius: 999px;',
      '  background: #fff;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  box-shadow: 0 8px 24px rgba(26, 45, 90, 0.06);',
      '  color: #1a2d5a;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.4px;',
      '}',
      '.dh-geo-section {',
      '  margin: 54px auto 0;',
      '  padding: 34px 30px;',
      '  border-radius: 18px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(248, 251, 254, 0.98), rgba(255, 255, 255, 1));',
      '  box-shadow: 0 18px 48px rgba(26, 45, 90, 0.06);',
      '}',
      '.dh-geo-eyebrow {',
      '  display: inline-block;',
      '  margin-bottom: 12px;',
      '  color: #c8201a;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  letter-spacing: 2px;',
      '  text-transform: uppercase;',
      '}',
      '.dh-geo-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: clamp(1.9rem, 3vw, 2.6rem);',
      '  line-height: 1.15;',
      '  color: #1a2d5a;',
      '  margin: 0 0 12px;',
      '}',
      '.dh-geo-intro {',
      '  max-width: 840px;',
      '  color: #4b5d7e;',
      '  font-size: 15px;',
      '  line-height: 1.8;',
      '  margin: 0 0 24px;',
      '}',
      '.dh-geo-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 14px;',
      '}',
      '.dh-geo-card {',
      '  padding: 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: #fff;',
      '}',
      '.dh-geo-card h3 {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 22px;',
      '  line-height: 1.2;',
      '  color: #1a2d5a;',
      '  margin: 0 0 8px;',
      '}',
      '.dh-geo-card p {',
      '  margin: 0;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.7;',
      '}',
      '.dh-geo-list {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 10px;',
      '  margin-top: 18px;',
      '}',
      '.dh-geo-list span {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 9px 12px;',
      '  border-radius: 999px;',
      '  background: rgba(244, 248, 252, 0.92);',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  color: #3d5580;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '}',
      '.dh-faq-wrap {',
      '  margin-top: 28px;',
      '  display: grid;',
      '  gap: 12px;',
      '}',
      '.dh-faq-item {',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  border-radius: 12px;',
      '  background: #fff;',
      '  overflow: hidden;',
      '}',
      '.dh-faq-item summary {',
      '  list-style: none;',
      '  cursor: pointer;',
      '  padding: 16px 18px;',
      '  font-size: 14px;',
      '  font-weight: 700;',
      '  color: #1a2d5a;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '}',
      '.dh-faq-item summary::-webkit-details-marker {',
      '  display: none;',
      '}',
      '.dh-faq-item summary::after {',
      '  content: "+";',
      '  color: #c8201a;',
      '  font-size: 20px;',
      '  line-height: 1;',
      '}',
      '.dh-faq-item[open] summary::after {',
      '  content: "-";',
      '}',
      '.dh-faq-item p {',
      '  margin: 0;',
      '  padding: 0 18px 18px;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.75;',
      '}',
      '.dh-service-snapshot {',
      '  margin-top: 30px;',
      '  padding-top: 26px;',
      '  border-top: 1px solid rgba(61, 85, 128, 0.12);',
      '}',
      '.dh-service-snapshot-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 28px;',
      '  color: #1a2d5a;',
      '  margin: 0 0 16px;',
      '}',
      '.dh-service-snapshot-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 14px;',
      '}',
      '.dh-service-snapshot-card {',
      '  padding: 16px 18px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: rgba(255, 255, 255, 0.96);',
      '}',
      '.dh-service-snapshot-card strong {',
      '  display: block;',
      '  color: #1a2d5a;',
      '  font-size: 14px;',
      '  margin-bottom: 6px;',
      '}',
      '.dh-service-snapshot-card span {',
      '  display: block;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.65;',
      '}',
      '@media (max-width: 900px) {',
      '  .dh-proof-band, .dh-form-proof-grid, .dh-geo-grid, .dh-service-snapshot-grid {',
      '    grid-template-columns: 1fr;',
      '  }',
      '  .dh-form-proof-head {',
      '    align-items: flex-start;',
      '  }',
      '}',
      '@media (max-width: 640px) {',
      '  .dh-proof-band {',
      '    margin-top: 20px;',
      '  }',
      '  .dh-proof-card, .dh-form-proof, .dh-next-steps {',
      '    padding-left: 14px;',
      '    padding-right: 14px;',
      '  }',
      '  .dh-geo-section {',
      '    padding: 24px 16px;',
      '    margin-top: 34px;',
      '  }',
      '  .dh-reassurance-chip, .dh-sector-tag, .dh-cta-proof span {',
      '    width: 100%;',
      '    justify-content: center;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function injectPopupUI() {
    if (document.getElementById('dh-popup-overlay')) return;

    injectRuntimeStyles();

    var overlay = document.createElement('div');
    overlay.id = 'dh-popup-overlay';
    overlay.innerHTML = [
      '<div id="dh-popup-box">',
      '  <span class="p-icon" id="p-icon">!</span>',
      '  <div class="p-title" id="p-title">Notification</div>',
      '  <div class="p-msg" id="p-msg"></div>',
      '  <button class="p-btn" type="button" id="dh-popup-close">OK</button>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    var closeButton = document.getElementById('dh-popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', function () {
        window.closeDhPopup();
      });
    }
  }

  window.showDhPopup = function (title, message, type) {
    injectPopupUI();

    var overlay = document.getElementById('dh-popup-overlay');
    var icon = document.getElementById('p-icon');
    var titleNode = document.getElementById('p-title');
    var messageNode = document.getElementById('p-msg');

    if (!overlay || !icon || !titleNode || !messageNode) return;

    icon.innerText = type === 'success' ? 'OK' : '!';
    titleNode.innerText = title || 'Notification';
    messageNode.innerText = message || '';
    overlay.classList.add('active');
  };

  window.closeDhPopup = function () {
    var overlay = document.getElementById('dh-popup-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  function ensureHeroProofBand() {
    var heroStats = document.querySelector('#hero .hero-stats');
    var heroLeft = document.querySelector('#hero .hero-left');
    if (!heroStats || !heroLeft || document.getElementById('dh-hero-proof-band')) return;

    var proofBand = document.createElement('div');
    proofBand.id = 'dh-hero-proof-band';
    proofBand.className = 'dh-proof-band';
    proofBand.innerHTML = [
      '<div class="dh-proof-card">',
      '  <span class="dh-proof-eyebrow">Consultation</span>',
      '  <span class="dh-proof-value">24 Hours</span>',
      '  <span class="dh-proof-text">Initial response with scope fit, next steps, and a practical compliance roadmap.</span>',
      '</div>',
      '<div class="dh-proof-card">',
      '  <span class="dh-proof-eyebrow">Coverage</span>',
      '  <span class="dh-proof-value">6 Key Sectors</span>',
      '  <span class="dh-proof-text">Chemical, sugar, textile, healthcare, infrastructure, and manufacturing advisory depth.</span>',
      '</div>',
      '<div class="dh-proof-card">',
      '  <span class="dh-proof-eyebrow">Confidence</span>',
      '  <span class="dh-proof-value">93% Approval</span>',
      '  <span class="dh-proof-text">Built around permits, filings, pollution systems, and regulator-ready documentation.</span>',
      '</div>'
    ].join('');

    heroStats.insertAdjacentElement('afterend', proofBand);
  }

  function ensureServicesCtaProof() {
    var ctaInner = document.querySelector('.srv-cta-inner');
    if (!ctaInner || document.getElementById('dh-services-cta-proof')) return;

    var proof = document.createElement('div');
    proof.id = 'dh-services-cta-proof';
    proof.className = 'dh-cta-proof';
    proof.innerHTML = [
      '<span>215+ projects delivered</span>',
      '<span>Free first consultation</span>',
      '<span>Proposal within 24 hours</span>'
    ].join('');

    ctaInner.appendChild(proof);
  }

  function ensureHoneypotField(form) {
    if (!form || form.querySelector('[data-dh-honeypot="true"]')) return;

    var trap = document.createElement('div');
    trap.className = 'dh-honeypot';
    trap.setAttribute('aria-hidden', 'true');
    trap.innerHTML = [
      '<label for="dh-website-field">Website</label>',
      '<input id="dh-website-field" data-dh-honeypot="true" type="text" name="website" autocomplete="off" tabindex="-1">'
    ].join('');

    form.appendChild(trap);
  }

  function ensureFormExperience(form) {
    if (!form) return;

    var wrap = form.closest('.form-wrap') || form.parentElement;
    if (!wrap) return;

    if (!wrap.querySelector('[data-dh-form-proof="true"]')) {
      var proof = document.createElement('div');
      proof.setAttribute('data-dh-form-proof', 'true');
      proof.className = 'dh-form-proof';
      proof.innerHTML = [
        '<div class="dh-form-proof-head">',
        '  <div class="dh-form-proof-title">Why teams reach out here first</div>',
        '  <div class="dh-form-proof-pill">Trusted for regulator-ready execution</div>',
        '</div>',
        '<div class="dh-form-proof-grid">',
        '  <div class="dh-form-proof-stat"><strong>215+</strong><span>Projects delivered across approvals, EIA, EPR, wastewater, and monitoring.</span></div>',
        '  <div class="dh-form-proof-stat"><strong>13+ Years</strong><span>Hands-on experience with GPCB, CPCB, and MoEF&CC workflows.</span></div>',
        '  <div class="dh-form-proof-stat"><strong>93%</strong><span>Approval-focused delivery backed by clearer documentation and faster follow-up.</span></div>',
        '</div>',
        '<div class="dh-form-reassurance">',
        '  <div class="dh-reassurance-chip">Free first consultation</div>',
        '  <div class="dh-reassurance-chip">Confidential requirement review</div>',
        '  <div class="dh-reassurance-chip">Call or proposal within 24 hours</div>',
        '</div>'
      ].join('');

      wrap.insertBefore(proof, wrap.firstChild);
    }

    if (!wrap.querySelector('[data-dh-next-steps="true"]')) {
      var steps = document.createElement('div');
      steps.setAttribute('data-dh-next-steps', 'true');
      steps.className = 'dh-next-steps';
      steps.innerHTML = [
        '<div class="dh-next-steps-title">What happens next</div>',
        '<ol class="dh-next-step-list">',
        '  <li class="dh-next-step"><div class="dh-next-step-no">01</div><div class="dh-next-step-copy"><strong>We review your requirement</strong><span>Our team checks your industry, approval stage, and urgency before reaching out.</span></div></li>',
        '  <li class="dh-next-step"><div class="dh-next-step-no">02</div><div class="dh-next-step-copy"><strong>We connect within 24 hours</strong><span>Expect a call, WhatsApp, or email with the right specialist and a short action path.</span></div></li>',
        '  <li class="dh-next-step"><div class="dh-next-step-no">03</div><div class="dh-next-step-copy"><strong>We share scope and document checklist</strong><span>You get a tailored proposal instead of a generic consultancy pitch.</span></div></li>',
        '</ol>',
        '<div class="dh-sector-strip">',
        '  <span class="dh-sector-tag">Chemical & Pharma</span>',
        '  <span class="dh-sector-tag">Sugar</span>',
        '  <span class="dh-sector-tag">Textile</span>',
        '  <span class="dh-sector-tag">Healthcare</span>',
        '  <span class="dh-sector-tag">Real Estate</span>',
        '  <span class="dh-sector-tag">Manufacturing</span>',
        '</div>'
      ].join('');

      form.insertAdjacentElement('afterend', steps);
    }

    var status = wrap.querySelector('[data-dh-form-status="true"]');
    if (!status) {
      status = document.createElement('div');
      status.className = 'dh-form-status';
      status.setAttribute('data-dh-form-status', 'true');
      status.setAttribute('aria-live', 'polite');
      status.innerHTML = '<strong>Response promise:</strong> Your first consultation is free and your inquiry stays with the Dharrah team.';
      form.insertAdjacentElement('afterend', status);
    }
  }

  function updateFormStatus(form, state, message) {
    if (!form) return;

    ensureFormExperience(form);

    var wrap = form.closest('.form-wrap') || form.parentElement;
    var status = wrap ? wrap.querySelector('[data-dh-form-status="true"]') : null;
    if (!status) return;

    status.classList.remove('is-success', 'is-warning', 'is-error');
    if (state === 'success') status.classList.add('is-success');
    if (state === 'warning') status.classList.add('is-warning');
    if (state === 'error') status.classList.add('is-error');
    status.innerHTML = message;
  }

  function ensureHomeGeoSection() {
    var contactSection = document.getElementById('contact');
    var casesSection = document.getElementById('cases');
    if (!contactSection || !casesSection || document.getElementById('dh-home-geo-section')) return;

    var section = document.createElement('section');
    section.id = 'dh-home-geo-section';
    section.className = 'dh-geo-section';
    section.setAttribute('data-dh-geo', 'home');
    section.innerHTML = [
      '<span class="dh-geo-eyebrow">AI-Friendly Overview</span>',
      '<h2 class="dh-geo-title">What Dharrah EHS helps industrial teams do</h2>',
      '<p class="dh-geo-intro">Dharrah EHS is an environmental, health, and safety consultancy focused on regulatory approvals, pollution control systems, industrial monitoring, and sustainability reporting for industries across Gujarat and India.</p>',
      '<div class="dh-geo-grid">',
      '  <article class="dh-geo-card"><h3>Approvals and compliance</h3><p>Dharrah supports GPCB NOC and CCA permissions, EIA documentation, environmental clearance work, EPR registrations, and recurring compliance filings for industrial units.</p></article>',
      '  <article class="dh-geo-card"><h3>Pollution control and treatment</h3><p>The team advises on ETP and STP systems, air pollution control equipment, dust control, wastewater treatment studies, and environmental monitoring requirements.</p></article>',
      '  <article class="dh-geo-card"><h3>ESG and reporting support</h3><p>Dharrah also works on ESG sustainability reporting, carbon accounting, greenhouse gas estimation, and disclosure-aligned documentation for regulated businesses.</p></article>',
      '</div>',
      '<div class="dh-geo-list">',
      '  <span>Industries: chemical, sugar, textile, healthcare, real estate, manufacturing</span>',
      '  <span>Coverage: Gujarat and India</span>',
      '  <span>Response: first consultation free, reply within 24 hours</span>',
      '  <span>Proof: 215+ projects, 13+ years, 93% approval-focused delivery</span>',
      '</div>',
      '<div class="dh-faq-wrap">',
      '  <details class="dh-faq-item" open><summary>What does Dharrah EHS do?</summary><p>Dharrah EHS provides environmental compliance, industrial approvals, pollution control consultancy, monitoring support, and sustainability reporting for businesses that need regulator-ready execution.</p></details>',
      '  <details class="dh-faq-item"><summary>Which approvals does Dharrah help with?</summary><p>The site highlights support for GPCB NOC and CCA permissions, EIA and environmental clearance work, EPR registrations, bio-medical waste authorizations, and ongoing statutory return filing.</p></details>',
      '  <details class="dh-faq-item"><summary>Which industries does Dharrah serve?</summary><p>The current service profile includes chemical and pharma, sugar, textile and dyes, hospitals and clinics, real estate and infrastructure, manufacturing, import-export, and power-oriented projects.</p></details>',
      '  <details class="dh-faq-item"><summary>Does Dharrah only advise or also support implementation?</summary><p>The site presents both advisory and implementation-oriented work, including pollution control equipment, wastewater systems, dust control technology, monitoring, and project documentation.</p></details>',
      '  <details class="dh-faq-item"><summary>How should a new client contact Dharrah?</summary><p>Use the inquiry form, phone, or WhatsApp. The current site promise is a free first consultation and a Dharrah response within 24 hours.</p></details>',
      '</div>'
    ].join('');

    contactSection.parentNode.insertBefore(section, contactSection);
  }

  function ensureServicesGeoSection() {
    var servicesWrap = document.querySelector('.srv-wrap');
    var ctaSection = document.querySelector('.srv-cta');
    if (!servicesWrap || !ctaSection || document.getElementById('dh-services-geo-section')) return;

    var section = document.createElement('section');
    section.id = 'dh-services-geo-section';
    section.className = 'dh-geo-section';
    section.setAttribute('data-dh-geo', 'services');
    section.innerHTML = [
      '<span class="dh-geo-eyebrow">Service Summary</span>',
      '<h2 class="dh-geo-title">A simpler way for buyers and AI engines to read the service catalogue</h2>',
      '<p class="dh-geo-intro">Dharrah EHS combines regulatory consulting, pollution control engineering, monitoring, and reporting support in one consultancy stack. This summary groups the main outcomes industrial buyers typically search for.</p>',
      '<div class="dh-geo-grid">',
      '  <article class="dh-geo-card"><h3>Regulatory permissions</h3><p>Includes GPCB and CPCB permission support, environmental clearance documentation, EPR work, import-related registrations, and recurring filing help.</p></article>',
      '  <article class="dh-geo-card"><h3>Systems and environmental engineering</h3><p>Covers wastewater treatment, automated STP and ETP solutions, membrane systems, air pollution control, dust suppression, and related chemicals or equipment support.</p></article>',
      '  <article class="dh-geo-card"><h3>Monitoring and sustainability</h3><p>Covers laboratory and monitoring coordination, site remediation, ESG and BRSR reporting, carbon accounting, and other environment-focused disclosure support.</p></article>',
      '</div>',
      '<div class="dh-service-snapshot">',
      '  <h3 class="dh-service-snapshot-title">High-intent searches this page now answers better</h3>',
      '  <div class="dh-service-snapshot-grid">',
      '    <div class="dh-service-snapshot-card"><strong>Who is this for?</strong><span>Industrial units, real estate projects, healthcare facilities, importers, and listed or compliance-heavy businesses.</span></div>',
      '    <div class="dh-service-snapshot-card"><strong>What outcomes?</strong><span>Approvals, registrations, pollution control design, monitoring readiness, regulator submissions, and sustainability disclosures.</span></div>',
      '    <div class="dh-service-snapshot-card"><strong>Which regions?</strong><span>The site messaging emphasizes Gujarat-led execution with project support extending across India.</span></div>',
      '    <div class="dh-service-snapshot-card"><strong>Why Dharrah?</strong><span>The core proof points on-site are 215+ projects, 13+ years of experience, and a 93% approval-focused track record.</span></div>',
      '  </div>',
      '</div>',
      '<div class="dh-faq-wrap">',
      '  <details class="dh-faq-item" open><summary>What are Dharrah EHS core services?</summary><p>The main service groups are regulatory compliance and permissions, ESG and carbon management, wastewater and water treatment, air and dust pollution control, environmental monitoring, specialized equipment, and food safety support.</p></details>',
      '  <details class="dh-faq-item"><summary>Does Dharrah handle both documents and systems?</summary><p>Yes. The current service set covers documentation and approvals as well as operational systems such as STP, ETP, air pollution control, dust control, and treatment-related engineering support.</p></details>',
      '  <details class="dh-faq-item"><summary>Can Dharrah support ongoing compliance after approvals?</summary><p>The services shown include annual and monthly return filing, monitoring-oriented support, and repeat compliance workflows beyond one-time registration work.</p></details>',
      '</div>'
    ].join('');

    ctaSection.parentNode.insertBefore(section, ctaSection);
  }

  function chooseContactForm() {
    var forms = Array.prototype.slice.call(document.querySelectorAll('form')).filter(isVisible);
    if (!forms.length) return null;

    forms.sort(function (left, right) {
      return scoreContactForm(right) - scoreContactForm(left);
    });

    return forms[0];
  }

  function scoreContactForm(form) {
    var score = 0;
    var submit = form.querySelector('button[type="submit"], .btn-red');
    var submitLabel = normalizeText(submit ? submit.textContent : '');

    if (submitLabel.indexOf('submit inquiry') !== -1) score += 10;
    if (form.querySelector('textarea')) score += 4;
    if (form.querySelector('select')) score += 3;
    if (form.querySelector('input[type="email"]')) score += 3;
    if (form.querySelector('input[type="tel"]')) score += 3;

    return score;
  }

  function getControlFromLabel(label) {
    var wrapper = label.closest('.fg') || label.parentElement;
    if (!wrapper) return null;
    return wrapper.querySelector('input, select, textarea');
  }

  function bindFieldByLabel(form, fieldName, labels) {
    var existing = form.querySelector('[data-dh-field="' + fieldName + '"]');
    if (existing) return existing;

    var labelNodes = form.querySelectorAll('label');
    for (var index = 0; index < labelNodes.length; index += 1) {
      var label = labelNodes[index];
      var labelText = normalizeText(label.textContent);

      if (labels.indexOf(labelText) !== -1) {
        var control = getControlFromLabel(label);
        if (control) {
          control.setAttribute('data-dh-field', fieldName);
          return control;
        }
      }
    }

    return null;
  }

  function bindFallbackFields(form) {
    var textInputs = Array.prototype.slice.call(form.querySelectorAll('input[type="text"]'));
    var telInput = form.querySelector('input[type="tel"]');
    var emailInput = form.querySelector('input[type="email"]');
    var selectInput = form.querySelector('select');
    var messageInput = form.querySelector('textarea');

    if (!form.querySelector('[data-dh-field="name"]') && textInputs[0]) {
      textInputs[0].setAttribute('data-dh-field', 'name');
    }

    if (!form.querySelector('[data-dh-field="company"]') && textInputs[1]) {
      textInputs[1].setAttribute('data-dh-field', 'company');
    }

    if (!form.querySelector('[data-dh-field="phone"]') && telInput) {
      telInput.setAttribute('data-dh-field', 'phone');
    }

    if (!form.querySelector('[data-dh-field="email"]') && emailInput) {
      emailInput.setAttribute('data-dh-field', 'email');
    }

    if (!form.querySelector('[data-dh-field="subject"]') && selectInput) {
      selectInput.setAttribute('data-dh-field', 'subject');
    }

    if (!form.querySelector('[data-dh-field="message"]') && messageInput) {
      messageInput.setAttribute('data-dh-field', 'message');
    }
  }

  function ensureContactHooks() {
    var form = chooseContactForm();
    if (!form) return null;

    form.setAttribute('data-dh-contact-form', 'true');
    if (!form.id) form.id = 'dh-contact-form';
    if (!form.dataset.dhMountedAt) form.dataset.dhMountedAt = String(getTimestamp());

    bindFieldByLabel(form, 'name', ['your name', 'full name']);
    bindFieldByLabel(form, 'company', ['company']);
    bindFieldByLabel(form, 'phone', ['phone']);
    bindFieldByLabel(form, 'email', ['email']);
    bindFieldByLabel(form, 'subject', ['service required']);
    bindFieldByLabel(form, 'message', ['message']);
    bindFallbackFields(form);
    ensureHoneypotField(form);
    ensureFormExperience(form);

    var submit = form.querySelector('button[type="submit"], .btn-red');
    if (submit) submit.setAttribute('data-dh-submit', 'true');

    return form;
  }

  function getField(form, fieldName) {
    return form ? form.querySelector('[data-dh-field="' + fieldName + '"]') : null;
  }

  function getFieldTarget(form, fieldName) {
    if (fieldName === 'phone') {
      return form.querySelector('[data-dh-phone-picker="true"]') || getField(form, fieldName);
    }
    return getField(form, fieldName);
  }

  function setFieldError(target, hasError) {
    if (!target) return;

    if (target.classList && target.classList.contains('phone-picker-group')) {
      target.classList.toggle('has-error', hasError);
      return;
    }

    target.style.borderColor = hasError ? '#ff4d4f' : '';
  }

  function clearFieldErrors(form) {
    ['name', 'email', 'phone', 'message'].forEach(function (fieldName) {
      setFieldError(getFieldTarget(form, fieldName), false);
    });
  }

  function buildPhonePicker(form, rawInput) {
    injectRuntimeStyles();

    rawInput.dataset.pickerSet = 'true';
    rawInput.setAttribute('data-dh-phone-raw', 'true');

    var parent = rawInput.parentElement;
    if (!parent) return null;

    var container = document.createElement('div');
    container.className = 'phone-picker-group';
    container.setAttribute('data-dh-phone-picker', 'true');
    container.innerHTML = [
      '<select class="cc-select" data-dh-country-code="true">',
      COUNTRY_CODES.map(function (item) {
        return '<option value="' + item.code + '">' + item.iso + ' ' + item.code + '</option>';
      }).join(''),
      '</select>',
      '<input type="tel" data-dh-phone-input="true" placeholder="Enter 10 digit number" maxlength="10" autocomplete="off">'
    ].join('');

    rawInput.style.display = 'none';
    rawInput.setAttribute('aria-hidden', 'true');
    parent.appendChild(container);

    var realInput = container.querySelector('[data-dh-phone-input]');
    var codeSelect = container.querySelector('[data-dh-country-code]');

    function syncHiddenPhone() {
      var numberValue = realInput.value.replace(/\D/g, '').substring(0, 10);
      realInput.value = numberValue;
      rawInput.value = codeSelect.value + ' ' + numberValue;
      rawInput.dispatchEvent(new Event('input', { bubbles: true }));
      rawInput.dispatchEvent(new Event('change', { bubbles: true }));
      container.classList.remove('has-error');
    }

    realInput.addEventListener('input', syncHiddenPhone);
    codeSelect.addEventListener('change', syncHiddenPhone);

    if (form.dataset.phoneResetBound !== 'true') {
      form.dataset.phoneResetBound = 'true';
      form.addEventListener('reset', function () {
        var pickerInput = form.querySelector('[data-dh-phone-input]');
        var pickerCode = form.querySelector('[data-dh-country-code]');
        var pickerContainer = form.querySelector('[data-dh-phone-picker]');
        var hiddenPhone = getField(form, 'phone');

        if (pickerInput) pickerInput.value = '';
        if (pickerCode) pickerCode.value = '+91';
        if (hiddenPhone) hiddenPhone.value = '';
        if (pickerContainer) pickerContainer.classList.remove('has-error');
      });
    }

    return container;
  }

  function setupPhonePicker() {
    var form = ensureContactHooks();
    if (!form) return;

    var phoneInput = getField(form, 'phone');
    if (!phoneInput || phoneInput.dataset.pickerSet === 'true') return;

    buildPhonePicker(form, phoneInput);
  }

  function readFormData(form) {
    return {
      name: (getField(form, 'name') ? getField(form, 'name').value : '').trim(),
      company: (getField(form, 'company') ? getField(form, 'company').value : '').trim(),
      phone: (getField(form, 'phone') ? getField(form, 'phone').value : '').trim(),
      email: (getField(form, 'email') ? getField(form, 'email').value : '').trim(),
      subject: (getField(form, 'subject') ? getField(form, 'subject').value : '').trim() || 'General Inquiry',
      message: (getField(form, 'message') ? getField(form, 'message').value : '').trim()
    };
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm(form, formData) {
    var errors = [];

    clearFieldErrors(form);

    if (formData.name.length < 3) {
      errors.push('- Full Name is too short (min 3 chars)');
      setFieldError(getFieldTarget(form, 'name'), true);
    }

    if (!isValidEmail(formData.email)) {
      errors.push('- Please enter a valid email address');
      setFieldError(getFieldTarget(form, 'email'), true);
    }

    if (formData.phone.replace(/\D/g, '').length < 10) {
      errors.push('- Phone number must have at least 10 digits');
      setFieldError(getFieldTarget(form, 'phone'), true);
    }

    if (formData.message.length < 6) {
      errors.push('- Message must be at least 6 characters');
      setFieldError(getFieldTarget(form, 'message'), true);
    }

    return errors;
  }

  function getCooldownRemainingMs() {
    var lastSubmitAt = readStorageNumber(FORM_COOLDOWN_KEY);
    if (!lastSubmitAt) return 0;

    var remaining = FORM_COOLDOWN_MS - (getTimestamp() - lastSubmitAt);
    return remaining > 0 ? remaining : 0;
  }

  function isLikelySpamSubmission(form) {
    var honeypot = form.querySelector('[data-dh-honeypot="true"]');
    if (honeypot && normalizeText(honeypot.value)) {
      return 'honeypot';
    }

    var mountedAt = parseInt(form.dataset.dhMountedAt || '0', 10);
    if (mountedAt && getTimestamp() - mountedAt < BOT_MIN_COMPLETION_MS) {
      return 'too_fast';
    }

    if (getCooldownRemainingMs() > 0) {
      return 'cooldown';
    }

    return '';
  }

  function formatCooldownMessage(remainingMs) {
    var remainingSeconds = Math.ceil(remainingMs / 1000);
    return '<strong>Please wait a moment.</strong> We just received an inquiry from this browser. Try again in about ' + remainingSeconds + ' seconds or contact us on WhatsApp.';
  }

  function setupContactBridge() {
    var form = ensureContactHooks();
    if (!form || form.dataset.bridgeSet === 'true') return;

    form.dataset.bridgeSet = 'true';
    updateFormStatus(form, '', '<strong>Response promise:</strong> Your first consultation is free and your inquiry stays with the Dharrah team.');

    form.addEventListener('input', function () {
      if (form.dataset.submitting === 'true') return;

      var wrap = form.closest('.form-wrap') || form.parentElement;
      var status = wrap ? wrap.querySelector('[data-dh-form-status="true"]') : null;
      if (!status) return;

      if (status.classList.contains('is-error') || status.classList.contains('is-warning')) {
        updateFormStatus(form, '', '<strong>Response promise:</strong> Your first consultation is free and your inquiry stays with the Dharrah team.');
      }
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (form.dataset.submitting === 'true') return;

      var formData = readFormData(form);
      var blockReason = isLikelySpamSubmission(form);

      if (blockReason) {
        if (blockReason === 'cooldown') {
          var remaining = getCooldownRemainingMs();
          updateFormStatus(form, 'warning', formatCooldownMessage(remaining));
          trackEvent('form_submit_blocked', {
            form_name: 'lead_inquiry',
            block_reason: blockReason,
            remaining_seconds: Math.ceil(remaining / 1000)
          });
          window.showDhPopup('Please Wait', 'We recently received an inquiry from this browser. Please wait a few seconds or contact us on WhatsApp.');
          return;
        }

        updateFormStatus(form, 'warning', '<strong>Submission paused.</strong> Please try again normally or contact us directly if you need urgent assistance.');
        trackEvent('form_submit_blocked', {
          form_name: 'lead_inquiry',
          block_reason: blockReason
        });
        return;
      }

      trackEvent('form_submit_attempt', {
        form_name: 'lead_inquiry',
        subject: formData.subject || 'General Inquiry'
      });

      var errors = validateForm(form, formData);

      if (errors.length) {
        updateFormStatus(form, 'error', '<strong>Some details still need attention.</strong> Please correct the highlighted fields and try again.');
        trackEvent('form_submit_validation_error', {
          form_name: 'lead_inquiry',
          error_count: errors.length
        });
        window.showDhPopup('Validation Required', errors.join('\n'));
        return;
      }

      var button = form.querySelector('[data-dh-submit], button[type="submit"], .btn-red');
      var originalLabel = button ? button.innerText : '';
      var endpoint = (window.DHARRAH_CONFIG && window.DHARRAH_CONFIG.contactEndpoint) || 'https://quiet-poetry-e97c.amburax.workers.dev';

      form.dataset.submitting = 'true';
      if (button) {
        button.innerText = 'SENDING...';
        button.disabled = true;
      }
      updateFormStatus(form, 'warning', '<strong>Sending your inquiry...</strong> We are forwarding it to the Dharrah team now.');

      try {
        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Worker error');
        }

        writeStorageNumber(FORM_COOLDOWN_KEY, getTimestamp());
        updateFormStatus(form, 'success', '<strong>Inquiry received.</strong> Expect a Dharrah response within 24 hours with the next steps or a tailored proposal.');
        trackEvent('form_submit', {
          form_name: 'lead_inquiry',
          subject: formData.subject || 'General Inquiry'
        });
        trackEvent('form_submit_success', {
          form_name: 'lead_inquiry',
          subject: formData.subject || 'General Inquiry'
        });

        window.showDhPopup('Inquiry Sent', 'Your message has been received at care@dharrahehs.com successfully.', 'success');
        form.reset();
        form.dataset.dhMountedAt = String(getTimestamp());
        clearFieldErrors(form);
      } catch (error) {
        updateFormStatus(form, 'error', '<strong>We could not send your inquiry just now.</strong> Please try again in a moment or reach out by phone or WhatsApp.');
        trackEvent('form_submit_error', {
          form_name: 'lead_inquiry',
          error_type: 'network_or_worker'
        });
        window.showDhPopup('System Error', 'We could not send your message right now. Please try again or email us directly.');
      } finally {
        form.dataset.submitting = 'false';
        if (button) {
          button.innerText = originalLabel;
          button.disabled = false;
        }
      }
    });
  }

  function setupLogoScroll() {
    var logo = document.querySelector('.nav-logo');
    if (!logo || logo.dataset.dhScrollBound === 'true') return;

    logo.dataset.dhScrollBound = 'true';
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function adjustFooterLayout() {
    var footer = document.querySelector('footer');
    if (!footer) return;

    var brand = document.getElementById('amburax-brand');
    if (!brand) {
      brand = document.createElement('div');
      brand.id = 'amburax-brand';
      brand.style.cssText = 'opacity: 0.5; display: flex; justify-content: center; align-items: center; gap: 8px; margin: 0; padding: 0; white-space: nowrap;';
      brand.innerHTML = 'Engineered by <a href="https://www.linkedin.com/company/amburax/about/" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; opacity: 0.85; transition: all 0.3s;">AMBURAX</a>';
    }

    var row = document.getElementById('dh-footer-row2');
    if (!row) {
      row = document.createElement('div');
      row.id = 'dh-footer-row2';
      row.style.cssText = 'display: flex; justify-content: center; align-items: center; width: 100%; padding: 20px 20px 10px 20px; position: relative; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 20px; gap: 40px; flex-wrap: wrap; left: -10px; font-family: "Inter", sans-serif; font-size: 11px;';
      footer.appendChild(row);
    }

    var copyright = null;
    var nodes = footer.querySelectorAll('p, div, span');
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (node.id === 'dh-footer-row2' || node.id === 'amburax-brand') continue;

      var text = node.textContent || '';
      if ((text.indexOf('©') !== -1 || text.toLowerCase().indexOf('rights reserved') !== -1) && node.children.length <= 1) {
        copyright = node;
        break;
      }
    }

    if (copyright && copyright.parentElement !== row) {
      row.appendChild(copyright);
      copyright.style.width = 'auto';
      copyright.style.textAlign = 'left';
      copyright.style.margin = '0';
      copyright.style.padding = '0';
      copyright.style.opacity = '0.5';
    }

    if (brand.parentElement !== row) {
      row.appendChild(brand);
    }
  }

  function initializeRuntime() {
    runtime.scheduled = false;
    injectRuntimeStyles();
    ensureHeroProofBand();
    ensureHomeGeoSection();
    ensureServicesGeoSection();
    ensureServicesCtaProof();
    ensureContactHooks();
    setupPhonePicker();
    setupContactBridge();
    setupLogoScroll();
    adjustFooterLayout();
  }

  function scheduleRuntime() {
    if (runtime.scheduled) return;
    runtime.scheduled = true;
    requestFrame(initializeRuntime);
  }

  function observeRuntime() {
    if (runtime.observer) return;

    var target = document.getElementById('root') || document.body;
    if (!target) return;

    runtime.observer = new MutationObserver(function () {
      scheduleRuntime();
    });
    runtime.observer.observe(target, { childList: true, subtree: true });
  }

  window.__DHARRAH_RUNTIME__ = runtime;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRuntime);
  } else {
    scheduleRuntime();
  }

  window.addEventListener('load', scheduleRuntime);
  window.addEventListener('hashchange', scheduleRuntime);
  window.addEventListener('popstate', scheduleRuntime);
  observeRuntime();
})();
