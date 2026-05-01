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
  var TECHNICAL_FORM_COOLDOWN_KEY = 'dh_last_technical_submit_at';
  var TECHNICAL_STEP_TITLES = [
    'Plant Details',
    'Key Contacts',
    'Boiler Details',
    'Heating Surfaces',
    'Existing MDC',
    'Wet Scrubber',
    'Problem Summary'
  ];
  var BOILER_FIELD_CONFIG = [
    { key: 'make', label: 'Boiler Make', placeholder: 'Make / model' },
    { key: 'capacity', label: 'Boiler Capacity', placeholder: 'TPH / rating' },
    { key: 'steamPressure', label: 'Steam Pressure', placeholder: 'kg/cm2' },
    { key: 'fuel', label: 'Boiler Fuel', placeholder: 'Bagasse / coal / biomass' },
    { key: 'fuelAnalysis', label: 'Fuel Analysis', placeholder: 'NCV / %Ash / %C' },
    { key: 'fuelConsumption', label: 'Fuel Consumption', placeholder: 'Per hour / day' },
    { key: 'superHeatedTemp', label: 'Super Heated Steam Temp', placeholder: 'deg C' }
  ];
  var HEATING_SURFACE_CONFIG = [
    { key: 'furnace', label: 'Furnace', placeholder: 'Sq. Mtr' },
    { key: 'bank', label: 'Bank', placeholder: 'Sq. Mtr' },
    { key: 'economizer', label: 'Economizer', placeholder: 'Sq. Mtr' },
    { key: 'superHeater', label: 'Super Heater', placeholder: 'Sq. Mtr' },
    { key: 'airHeater', label: 'Air Heater', placeholder: 'Sq. Mtr' },
    { key: 'flueGasVolume', label: 'Flue Gas Volume', placeholder: 'm3/hr' },
    { key: 'flueGasTemp', label: 'Flue Gas Temp', placeholder: 'deg C' }
  ];

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
      '.dh-tech-inline-card {',
      '  margin-top: 18px;',
      '  padding: 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(244, 248, 252, 0.96));',
      '  box-shadow: 0 12px 30px rgba(26, 45, 90, 0.06);',
      '}',
      '.dh-tech-inline-eyebrow {',
      '  display: inline-block;',
      '  margin-bottom: 10px;',
      '  color: #c8201a;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  letter-spacing: 1.7px;',
      '  text-transform: uppercase;',
      '}',
      '.dh-tech-inline-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 28px;',
      '  line-height: 1.15;',
      '  color: #1a2d5a;',
      '  margin: 0 0 8px;',
      '}',
      '.dh-tech-inline-copy {',
      '  margin: 0;',
      '  color: #556887;',
      '  font-size: 14px;',
      '  line-height: 1.75;',
      '}',
      '.dh-tech-inline-meta {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin-top: 16px;',
      '}',
      '.dh-tech-inline-meta span {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 9px 12px;',
      '  border-radius: 999px;',
      '  background: #fff;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  color: #1a2d5a;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '}',
      '.dh-tech-inline-actions {',
      '  display: flex;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '  margin-top: 18px;',
      '}',
      '.dh-tech-trigger {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 8px;',
      '  min-height: 48px;',
      '  padding: 0 22px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(26, 45, 90, 0.12);',
      '  background: #fff;',
      '  color: #1a2d5a;',
      '  font-size: 12px;',
      '  font-weight: 800;',
      '  letter-spacing: 0.7px;',
      '  text-transform: uppercase;',
      '  cursor: pointer;',
      '  transition: all 0.25s ease;',
      '  box-shadow: 0 10px 24px rgba(26, 45, 90, 0.06);',
      '}',
      '.dh-tech-trigger:hover {',
      '  transform: translateY(-1px);',
      '  border-color: rgba(200, 32, 26, 0.25);',
      '  color: #c8201a;',
      '}',
      '.dh-tech-trigger.is-primary {',
      '  background: linear-gradient(135deg, #c8201a, #df4b33);',
      '  color: #fff;',
      '  border-color: transparent;',
      '  box-shadow: 0 16px 30px rgba(200, 32, 26, 0.2);',
      '}',
      '.dh-tech-trigger.is-primary:hover {',
      '  color: #fff;',
      '  box-shadow: 0 18px 34px rgba(200, 32, 26, 0.24);',
      '}',
      '#dh-tech-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 100000;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 18px;',
      '  background: rgba(15, 23, 42, 0.45);',
      '  backdrop-filter: blur(6px);',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.28s ease;',
      '}',
      '#dh-tech-overlay.active {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',
      '.dh-tech-shell {',
      '  width: min(1120px, calc(100% - 24px));',
      '  height: min(920px, calc(100vh - 36px));',
      '  max-height: calc(100vh - 36px);',
      '  background: #f5f8fc;',
      '  color: #1a2d5a;',
      '  display: flex;',
      '  flex-direction: column;',
      '  min-height: 0;',
      '  border-radius: 22px;',
      '  overflow: hidden;',
      '  box-shadow: -18px 0 40px rgba(15, 23, 42, 0.16);',
      '  box-shadow: 0 26px 60px rgba(15, 23, 42, 0.22);',
      '  transform: translateY(12px);',
      '  transition: transform 0.28s ease;',
      '}',
      '#dh-tech-overlay.active .dh-tech-shell {',
      '  transform: translateY(0);',
      '}',
      '.dh-tech-shell form {',
      '  display: flex;',
      '  flex-direction: column;',
      '  flex: 1;',
      '  min-height: 0;',
      '}',
      '.dh-tech-head {',
      '  padding: 26px 28px 20px;',
      '  background: linear-gradient(135deg, #13233f, #1a2d5a);',
      '  color: #fff;',
      '}',
      '.dh-tech-head-top {',
      '  display: flex;',
      '  align-items: flex-start;',
      '  justify-content: space-between;',
      '  gap: 18px;',
      '}',
      '.dh-tech-kicker {',
      '  display: inline-block;',
      '  margin-bottom: 10px;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  letter-spacing: 1.8px;',
      '  text-transform: uppercase;',
      '  color: rgba(255,255,255,0.78);',
      '}',
      '.dh-tech-head h2 {',
      '  margin: 0 0 8px;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: clamp(2rem, 3vw, 2.6rem);',
      '  line-height: 1.05;',
      '}',
      '.dh-tech-head p {',
      '  margin: 0;',
      '  max-width: 720px;',
      '  font-size: 14px;',
      '  line-height: 1.75;',
      '  color: rgba(255,255,255,0.86);',
      '}',
      '.dh-tech-close {',
      '  width: 42px;',
      '  height: 42px;',
      '  border-radius: 50%;',
      '  border: 1px solid rgba(255,255,255,0.26);',
      '  background: rgba(255,255,255,0.14);',
      '  color: #fff;',
      '  font-size: 20px;',
      '  font-weight: 700;',
      '  cursor: pointer;',
      '  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);',
      '}',
      '.dh-tech-close:hover {',
      '  background: rgba(200, 32, 26, 0.92);',
      '  border-color: transparent;',
      '}',
      '.dh-tech-progress {',
      '  margin-top: 18px;',
      '}',
      '.dh-tech-progress-row {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-bottom: 10px;',
      '}',
      '.dh-tech-progress-copy strong {',
      '  display: block;',
      '  font-size: 15px;',
      '}',
      '.dh-tech-progress-copy span, .dh-tech-progress-row > span {',
      '  font-size: 12px;',
      '  color: rgba(255,255,255,0.7);',
      '}',
      '.dh-tech-progress-bar {',
      '  width: 100%;',
      '  height: 8px;',
      '  border-radius: 999px;',
      '  background: rgba(255,255,255,0.14);',
      '  overflow: hidden;',
      '}',
      '.dh-tech-progress-fill {',
      '  width: 14.2857%;',
      '  height: 100%;',
      '  border-radius: inherit;',
      '  background: linear-gradient(90deg, #eab308, #f97316);',
      '  transition: width 0.25s ease;',
      '}',
      '.dh-tech-body {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 26px 28px 18px;',
      '  min-height: 0;',
      '}',
      '.dh-tech-step {',
      '  display: none;',
      '}',
      '.dh-tech-step.active {',
      '  display: block;',
      '}',
      '.dh-tech-step-card {',
      '  background: #fff;',
      '  border-radius: 18px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  box-shadow: 0 16px 36px rgba(26, 45, 90, 0.06);',
      '  padding: 24px;',
      '}',
      '.dh-tech-step-title {',
      '  margin: 0 0 8px;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 32px;',
      '  line-height: 1.08;',
      '  color: #1a2d5a;',
      '}',
      '.dh-tech-step-copy {',
      '  margin: 0 0 20px;',
      '  color: #556887;',
      '  font-size: 14px;',
      '  line-height: 1.75;',
      '}',
      '.dh-tech-grid {',
      '  display: grid;',
      '  gap: 16px;',
      '}',
      '.dh-tech-grid.cols-2 {',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '}',
      '.dh-tech-grid.cols-3 {',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '}',
      '.dh-tech-field {',
      '  display: grid;',
      '  gap: 7px;',
      '}',
      '.dh-tech-field label {',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.6px;',
      '  text-transform: uppercase;',
      '  color: #3d5580;',
      '}',
      '.dh-tech-field input, .dh-tech-field textarea {',
      '  width: 100%;',
      '  min-height: 48px;',
      '  border-radius: 10px;',
      '  border: 1px solid rgba(61, 85, 128, 0.14);',
      '  background: #f9fbfe;',
      '  color: #1a2d5a;',
      '  padding: 12px 14px;',
      '  font-size: 14px;',
      '  outline: none;',
      '  transition: all 0.2s ease;',
      '}',
      '.dh-tech-field textarea {',
      '  min-height: 160px;',
      '  resize: vertical;',
      '}',
      '.dh-tech-field input:focus, .dh-tech-field textarea:focus {',
      '  border-color: #c8201a;',
      '  box-shadow: 0 0 0 4px rgba(200, 32, 26, 0.08);',
      '  background: #fff;',
      '}',
      '.dh-tech-field input.has-error, .dh-tech-field textarea.has-error {',
      '  border-color: #ef4444;',
      '  background: #fff1f2;',
      '}',
      '.dh-tech-note {',
      '  padding: 14px 16px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(200, 32, 26, 0.14);',
      '  background: rgba(200, 32, 26, 0.05);',
      '  color: #7c2d12;',
      '  font-size: 13px;',
      '  line-height: 1.65;',
      '}',
      '.dh-tech-contact-card {',
      '  padding: 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: linear-gradient(180deg, rgba(249, 251, 254, 0.98), rgba(255,255,255,1));',
      '}',
      '.dh-tech-contact-card h4, .dh-tech-table-card h4 {',
      '  margin: 0 0 14px;',
      '  font-size: 18px;',
      '  color: #1a2d5a;',
      '}',
      '.dh-tech-table-card {',
      '  padding: 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(255,255,255,1));',
      '}',
      '.dh-tech-table-wrap {',
      '  overflow-x: auto;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.08);',
      '}',
      '.dh-tech-table {',
      '  width: 100%;',
      '  border-collapse: collapse;',
      '  min-width: 760px;',
      '}',
      '.dh-tech-table th, .dh-tech-table td {',
      '  border-bottom: 1px solid rgba(61, 85, 128, 0.08);',
      '  padding: 12px;',
      '  text-align: left;',
      '  vertical-align: top;',
      '}',
      '.dh-tech-table th {',
      '  background: #f3f7fc;',
      '  color: #1a2d5a;',
      '  font-size: 12px;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.7px;',
      '}',
      '.dh-tech-table td:first-child {',
      '  width: 24%;',
      '  font-size: 13px;',
      '  color: #3d5580;',
      '  font-weight: 700;',
      '  background: rgba(244, 248, 252, 0.6);',
      '}',
      '.dh-tech-table input {',
      '  width: 100%;',
      '  min-height: 42px;',
      '  border-radius: 9px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #fff;',
      '  color: #1a2d5a;',
      '  padding: 10px 12px;',
      '  font-size: 13px;',
      '  outline: none;',
      '}',
      '.dh-tech-table input:focus {',
      '  border-color: #c8201a;',
      '  box-shadow: 0 0 0 3px rgba(200, 32, 26, 0.08);',
      '}',
      '.dh-tech-table input.has-error {',
      '  border-color: #ef4444;',
      '  background: #fff1f2;',
      '}',
      '.dh-tech-summary-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 16px;',
      '  margin-top: 18px;',
      '}',
      '.dh-tech-summary-card {',
      '  padding: 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: #fff;',
      '}',
      '.dh-tech-summary-card h4 {',
      '  margin: 0 0 12px;',
      '  font-size: 17px;',
      '  color: #1a2d5a;',
      '}',
      '.dh-tech-summary-card ul {',
      '  margin: 0;',
      '  padding-left: 18px;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.7;',
      '}',
      '.dh-tech-foot {',
      '  padding: 16px 28px 22px;',
      '  border-top: 1px solid rgba(61, 85, 128, 0.08);',
      '  background: #fff;',
      '  flex-shrink: 0;',
      '  box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.05);',
      '}',
      '.dh-tech-status {',
      '  margin-bottom: 14px;',
      '  padding: 13px 14px;',
      '  border-radius: 10px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #f8fbfe;',
      '  color: #4b5d7e;',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '}',
      '.dh-tech-status.is-success {',
      '  border-color: rgba(37, 99, 235, 0.18);',
      '  background: rgba(59, 130, 246, 0.06);',
      '}',
      '.dh-tech-status.is-warning {',
      '  border-color: rgba(245, 158, 11, 0.18);',
      '  background: rgba(245, 158, 11, 0.08);',
      '}',
      '.dh-tech-status.is-error {',
      '  border-color: rgba(239, 68, 68, 0.18);',
      '  background: rgba(239, 68, 68, 0.07);',
      '}',
      '.dh-tech-actions {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 14px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-tech-actions-left, .dh-tech-actions-right {',
      '  display: flex;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-tech-btn {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  min-height: 48px;',
      '  padding: 0 22px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(26, 45, 90, 0.12);',
      '  background: #fff;',
      '  color: #1a2d5a;',
      '  font-size: 12px;',
      '  font-weight: 800;',
      '  letter-spacing: 0.6px;',
      '  text-transform: uppercase;',
      '  cursor: pointer;',
      '}',
      '.dh-tech-btn.primary {',
      '  border-color: transparent;',
      '  background: linear-gradient(135deg, #c8201a, #df4b33);',
      '  color: #fff;',
      '}',
      '.dh-tech-btn[disabled] {',
      '  opacity: 0.7;',
      '  cursor: not-allowed;',
      '}',
      '@media (max-width: 900px) {',
      '  .dh-proof-band, .dh-form-proof-grid, .dh-geo-grid, .dh-service-snapshot-grid, .dh-tech-grid.cols-2, .dh-tech-grid.cols-3, .dh-tech-summary-grid {',
      '    grid-template-columns: 1fr;',
      '  }',
      '  .dh-form-proof-head {',
      '    align-items: flex-start;',
      '  }',
      '  .dh-tech-body {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
      '  }',
      '  #dh-tech-overlay {',
      '    padding: 12px;',
      '  }',
      '  .dh-tech-shell {',
      '    width: 100%;',
      '    height: calc(100vh - 24px);',
      '    max-height: calc(100vh - 24px);',
      '    border-radius: 18px;',
      '  }',
      '  .dh-tech-head {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
      '  }',
      '  .dh-tech-foot {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
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
      '  .dh-tech-head-top, .dh-tech-actions {',
      '    flex-direction: column;',
      '    align-items: stretch;',
      '  }',
      '  .dh-tech-shell {',
      '    height: 100vh;',
      '    max-height: 100vh;',
      '    width: 100%;',
      '    border-radius: 0;',
      '  }',
      '  #dh-tech-overlay {',
      '    padding: 0;',
      '  }',
      '  .dh-tech-inline-actions, .dh-tech-actions-left, .dh-tech-actions-right {',
      '    width: 100%;',
      '  }',
      '  .dh-tech-trigger, .dh-tech-btn {',
      '    width: 100%;',
      '  }',
      '  .dh-tech-step-card {',
      '    padding: 18px;',
      '  }',
      '  .dh-tech-inline-title {',
      '    font-size: 24px;',
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

  function ensureHomeSupportSection() {
    var whySection = document.getElementById('why');
    var industriesSection = document.getElementById('industries');

    if (!whySection || !industriesSection || document.getElementById('dh-home-support-section')) return;

    var section = document.createElement('section');
    section.id = 'dh-home-support-section';
    section.className = 'dh-geo-section';
    section.innerHTML = [
      '<span class="dh-geo-eyebrow">How We Help</span>',
      '<h2 class="dh-geo-title">Support built for industrial teams that need approvals, systems, and steady follow-through</h2>',
      '<p class="dh-geo-intro">Dharrah EHS supports businesses that need more than documentation alone. The work spans regulatory approvals, pollution control planning, environmental monitoring, and reporting support, with practical guidance shaped around the site, sector, and compliance stage.</p>',
      '<div class="dh-geo-grid">',
      '  <div class="dh-geo-card">',
      '    <h3>Approvals and compliance</h3>',
      '    <p>Support for GPCB NOC and CCA permissions, EIA and environment clearance documentation, EPR registrations, return filing, and regulator-ready submissions.</p>',
      '  </div>',
      '  <div class="dh-geo-card">',
      '    <h3>Pollution control and treatment</h3>',
      '    <p>Advisory for air pollution control, dust control, ETP and STP planning, treatability studies, wastewater treatment strategy, and site-specific execution support.</p>',
      '  </div>',
      '  <div class="dh-geo-card">',
      '    <h3>Monitoring and reporting</h3>',
      '    <p>Ongoing support for environmental monitoring, ESG and BRSR reporting, carbon estimation, remediation inputs, and recurring compliance follow-up where continuity matters.</p>',
      '  </div>',
      '</div>',
      '<div class="dh-geo-list">',
      '  <span>215+ projects across Gujarat and India</span>',
      '  <span>13+ years of EHS execution</span>',
      '  <span>Response within 24 hours</span>',
      '  <span>Chemical, sugar, textile, healthcare, and manufacturing sectors</span>',
      '</div>'
    ].join('');

    industriesSection.parentNode.insertBefore(section, industriesSection);
  }

  function getContactEndpoint() {
    return (window.DHARRAH_CONFIG && window.DHARRAH_CONFIG.contactEndpoint) || '/api/contact';
  }

  function buildTechnicalTableRows(config, prefix) {
    return config.map(function (item) {
      return [
        '<tr>',
        '  <td>' + item.label + '</td>',
        '  <td><input type="text" data-dh-tech-field="' + prefix + '_1_' + item.key + '" placeholder="' + item.placeholder + '"></td>',
        '  <td><input type="text" data-dh-tech-field="' + prefix + '_2_' + item.key + '" placeholder="' + item.placeholder + '"></td>',
        '  <td><input type="text" data-dh-tech-field="' + prefix + '_3_' + item.key + '" placeholder="' + item.placeholder + '"></td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function injectTechnicalAssessmentOverlay() {
    if (document.getElementById('dh-tech-overlay')) return;

    injectRuntimeStyles();

    var overlay = document.createElement('div');
    overlay.id = 'dh-tech-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="dh-tech-shell" role="dialog" aria-modal="true" aria-labelledby="dh-tech-title">',
      '  <div class="dh-tech-head">',
      '    <div class="dh-tech-head-top">',
      '      <div>',
      '        <span class="dh-tech-kicker">Detailed Intake Form</span>',
      '        <h2 id="dh-tech-title">Technical assessment for boilers, scrubbers, and dust-control systems</h2>',
      '        <p>Use this when your team needs a practical engineering review, not just a general consultation. The form is structured so Dharrah can respond with the right technical questions, checklist, and next-step guidance.</p>',
      '      </div>',
      '      <button type="button" class="dh-tech-close" data-dh-tech-close="true" aria-label="Close technical assessment">&times;</button>',
      '    </div>',
      '    <div class="dh-tech-progress">',
      '      <div class="dh-tech-progress-row">',
      '        <div class="dh-tech-progress-copy"><strong data-dh-tech-step-label="true">Step 1 of 7 - Plant Details</strong><span>Share only what is available now. Your team can leave non-critical values blank and still submit the form.</span></div>',
      '        <span data-dh-tech-step-count="true">1 / 7</span>',
      '      </div>',
      '      <div class="dh-tech-progress-bar"><div class="dh-tech-progress-fill" data-dh-tech-progress="true"></div></div>',
      '    </div>',
      '  </div>',
      '  <form id="dh-tech-form" novalidate>',
      '    <div class="dh-tech-body">',
      '      <div class="dh-tech-step active" data-dh-tech-step="0">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Plant and access details</h3>',
      '          <p class="dh-tech-step-copy">Start with the site basics so the engineering team understands the plant context before reading the technical values.</p>',
      '          <div class="dh-tech-grid cols-2">',
      '            <div class="dh-tech-field"><label>Factory Name</label><input type="text" data-dh-tech-field="factoryName" placeholder="Factory / plant name"></div>',
      '            <div class="dh-tech-field"><label>Nearest Station</label><input type="text" data-dh-tech-field="nearestStation" placeholder="Nearest station / industrial location"></div>',
      '            <div class="dh-tech-field"><label>Train Access</label><input type="text" data-dh-tech-field="trainAccess" placeholder="Train route or note"></div>',
      '            <div class="dh-tech-field"><label>Bus Access</label><input type="text" data-dh-tech-field="busAccess" placeholder="Bus route or note"></div>',
      '          </div>',
      '          <div class="dh-tech-note" style="margin-top: 18px;">This form is meant for boiler, APC, scrubber, or dust-control situations where a short inquiry form is not enough for the first technical review.</div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="1">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Who should Dharrah coordinate with?</h3>',
      '          <p class="dh-tech-step-copy">Add the people who can answer plant and boiler questions fastest. This helps the follow-up reach the right technical contact on the first call.</p>',
      '          <div class="dh-tech-grid cols-2">',
      '            <div class="dh-tech-contact-card">',
      '              <h4>GMT / WM / CE</h4>',
      '              <div class="dh-tech-grid">',
      '                <div class="dh-tech-field"><label>Name</label><input type="text" data-dh-tech-field="primary_name" placeholder="Primary plant contact"></div>',
      '                <div class="dh-tech-field"><label>Cell</label><input type="text" data-dh-tech-field="primary_phone" placeholder="+91 XXXXX XXXXX"></div>',
      '                <div class="dh-tech-field"><label>Email</label><input type="text" data-dh-tech-field="primary_email" placeholder="name@company.com"></div>',
      '              </div>',
      '            </div>',
      '            <div class="dh-tech-contact-card">',
      '              <h4>Boiler Engineer</h4>',
      '              <div class="dh-tech-grid">',
      '                <div class="dh-tech-field"><label>Name</label><input type="text" data-dh-tech-field="boilerEngineer_name" placeholder="Boiler engineer contact"></div>',
      '                <div class="dh-tech-field"><label>Cell</label><input type="text" data-dh-tech-field="boilerEngineer_phone" placeholder="+91 XXXXX XXXXX"></div>',
      '                <div class="dh-tech-field"><label>Email</label><input type="text" data-dh-tech-field="boilerEngineer_email" placeholder="engineer@company.com"></div>',
      '              </div>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="2">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Boiler details</h3>',
      '          <p class="dh-tech-step-copy">Add the current values for up to three boilers. This mirrors the engineering intake sheet but uses a cleaner web layout.</p>',
      '          <div class="dh-tech-table-card">',
      '            <h4>Boiler information</h4>',
      '            <div class="dh-tech-table-wrap">',
      '              <table class="dh-tech-table">',
      '                <thead>',
      '                  <tr><th>Field</th><th>Boiler 1</th><th>Boiler 2</th><th>Boiler 3</th></tr>',
      '                </thead>',
      '                <tbody>',
                         buildTechnicalTableRows(BOILER_FIELD_CONFIG, 'boiler'),
      '                </tbody>',
      '              </table>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="3">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Heating surfaces and flue-gas values</h3>',
      '          <p class="dh-tech-step-copy">If these values are available, they help Dharrah understand the thermal and gas-handling context before the first technical discussion.</p>',
      '          <div class="dh-tech-table-card">',
      '            <h4>Heating surfaces</h4>',
      '            <div class="dh-tech-table-wrap">',
      '              <table class="dh-tech-table">',
      '                <thead>',
      '                  <tr><th>Surface / Metric</th><th>Boiler 1</th><th>Boiler 2</th><th>Boiler 3</th></tr>',
      '                </thead>',
      '                <tbody>',
                         buildTechnicalTableRows(HEATING_SURFACE_CONFIG, 'surface'),
      '                </tbody>',
      '              </table>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="4">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Existing MDC details</h3>',
      '          <p class="dh-tech-step-copy">Share the current MDC setup so Dharrah can quickly judge whether the issue is sizing, area, staging, or overall configuration.</p>',
      '          <div class="dh-tech-grid cols-3">',
      '            <div class="dh-tech-field"><label>No. of Cyclones</label><input type="text" data-dh-tech-field="mdc_cycloneCount" placeholder="Count"></div>',
      '            <div class="dh-tech-field"><label>Cyclone Dia x Length</label><input type="text" data-dh-tech-field="mdc_cycloneSize" placeholder="mm"></div>',
      '            <div class="dh-tech-field"><label>Area Used (W x L)</label><input type="text" data-dh-tech-field="mdc_areaUsed" placeholder="Dimensions"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="5">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">Existing wet scrubber details</h3>',
      '          <p class="dh-tech-step-copy">Add the current scrubber configuration if the problem relates to APC, scrubber performance, outlet values, ash handling, or draft issues.</p>',
      '          <div class="dh-tech-grid cols-2">',
      '            <div class="dh-tech-field"><label>Scrubber Make</label><input type="text" data-dh-tech-field="scrubber_make" placeholder="Make / type"></div>',
      '            <div class="dh-tech-field"><label>Scrubber Dia x Height</label><input type="text" data-dh-tech-field="scrubber_dimensions" placeholder="Dimensions"></div>',
      '            <div class="dh-tech-field"><label>Scrubber Area Used</label><input type="text" data-dh-tech-field="scrubber_areaUsed" placeholder="Area / footprint"></div>',
      '            <div class="dh-tech-field"><label>Pump Capacity x Motor HP</label><input type="text" data-dh-tech-field="scrubber_pumpMotor" placeholder="Pump and motor details"></div>',
      '            <div class="dh-tech-field"><label>Duct Size Inlet</label><input type="text" data-dh-tech-field="scrubber_ductInlet" placeholder="Inlet dimensions"></div>',
      '            <div class="dh-tech-field"><label>Duct Size Outlet</label><input type="text" data-dh-tech-field="scrubber_ductOutlet" placeholder="Outlet dimensions"></div>',
      '            <div class="dh-tech-field"><label>Ash Pit Size</label><input type="text" data-dh-tech-field="scrubber_ashPitSize" placeholder="Ash pit size"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-tech-step" data-dh-tech-step="6">',
      '        <div class="dh-tech-step-card">',
      '          <h3 class="dh-tech-step-title">What problem is the plant facing?</h3>',
      '          <p class="dh-tech-step-copy">Describe the issue in practical terms. Mention the symptom, frequency, recent changes, and what outcome the team wants from the review.</p>',
      '          <div class="dh-tech-field">',
      '            <label>Problem Faced</label>',
      '            <textarea data-dh-tech-field="problemSummary" placeholder="Write the issue in brief. Example: high outlet emissions, recurring APC non-compliance, pressure drop, ash carry-over, scrubber under-performance, unstable draft, or difficulty meeting regulator expectations."></textarea>',
      '          </div>',
      '          <div class="dh-tech-summary-grid">',
      '            <div class="dh-tech-summary-card">',
      '              <h4>What Dharrah receives</h4>',
      '              <ul>',
      '                <li>Plant and access context</li>',
      '                <li>Primary operating and boiler contacts</li>',
      '                <li>Current boiler, MDC, and scrubber data</li>',
      '                <li>The real operating problem in your own words</li>',
      '              </ul>',
      '            </div>',
      '            <div class="dh-tech-summary-card">',
      '              <h4>What happens next</h4>',
      '              <ul>',
      '                <li>Dharrah reviews the inputs internally</li>',
      '                <li>Your team gets a call or email from the right specialist</li>',
      '                <li>The follow-up focuses on technical review, documents, and next-step feasibility</li>',
      '              </ul>',
      '            </div>',
      '          </div>',
      '          <div class="dh-honeypot" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">',
      '            <label for="dh-tech-website-field">Website</label>',
      '            <input id="dh-tech-website-field" data-dh-honeypot="true" type="text" name="website" autocomplete="off" tabindex="-1">',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="dh-tech-foot">',
      '      <div class="dh-tech-status" data-dh-tech-status="true"><strong>Use this form for technical cases.</strong> For a quick consultation, the regular inquiry form is still the faster option.</div>',
      '      <div class="dh-tech-actions">',
      '        <div class="dh-tech-actions-left">',
      '          <button type="button" class="dh-tech-btn" data-dh-tech-prev="true">Back</button>',
      '        </div>',
      '        <div class="dh-tech-actions-right">',
      '          <button type="button" class="dh-tech-btn" data-dh-tech-close="true">Close</button>',
      '          <button type="button" class="dh-tech-btn primary" data-dh-tech-next="true">Next Step</button>',
      '          <button type="submit" class="dh-tech-btn primary" data-dh-tech-submit="true">Send Assessment</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
  }

  function ensureTechnicalAssessmentEntryPoints() {
    var contactWrap = document.querySelector('#contact .form-wrap');
    if (contactWrap && !document.getElementById('dh-tech-inline-contact')) {
      var contactCard = document.createElement('div');
      contactCard.id = 'dh-tech-inline-contact';
      contactCard.className = 'dh-tech-inline-card';
      contactCard.innerHTML = [
        '<span class="dh-tech-inline-eyebrow">Detailed Intake</span>',
        '<h3 class="dh-tech-inline-title">Need a boiler or scrubber review instead of a simple inquiry?</h3>',
        '<p class="dh-tech-inline-copy">Open the structured technical assessment when your team already has plant, boiler, APC, scrubber, or dust-control details to share. It helps Dharrah start with engineering context instead of a basic lead note.</p>',
        '<div class="dh-tech-inline-meta">',
        '  <span>Full-screen guided form</span>',
        '  <span>Built for technical projects</span>',
        '  <span>Sent directly to your engineering inbox</span>',
        '</div>',
        '<div class="dh-tech-inline-actions">',
        '  <button type="button" class="dh-tech-trigger is-primary" data-dh-open-tech="contact">Open Technical Assessment</button>',
        '</div>'
      ].join('');

      var formTitle = contactWrap.querySelector('.form-title');
      if (formTitle) {
        contactWrap.insertBefore(contactCard, formTitle);
      } else {
        contactWrap.appendChild(contactCard);
      }
    }

    var airSection = document.getElementById('sc4');
    if (airSection && !document.getElementById('dh-tech-inline-service')) {
      var serviceCard = document.createElement('div');
      serviceCard.id = 'dh-tech-inline-service';
      serviceCard.className = 'dh-tech-inline-card';
      serviceCard.innerHTML = [
        '<span class="dh-tech-inline-eyebrow">For APC Projects</span>',
        '<h3 class="dh-tech-inline-title">Share plant data before the first engineering discussion</h3>',
        '<p class="dh-tech-inline-copy">If the issue involves boilers, air-pollution control, MDC, wet scrubbers, ash handling, or dust-control performance, use the technical assessment so Dharrah reviews the real operating setup before calling you back.</p>',
        '<div class="dh-tech-inline-actions">',
        '  <button type="button" class="dh-tech-trigger is-primary" data-dh-open-tech="services">Start Technical Assessment</button>',
        '  <button type="button" class="dh-tech-trigger" data-dh-open-tech="services">Use Detailed Intake Instead of a General Inquiry</button>',
        '</div>'
      ].join('');

      var airCards = airSection.querySelector('.cards-grid');
      if (airCards) {
        airCards.insertAdjacentElement('afterend', serviceCard);
      }
    }
  }

  function getTechnicalAssessmentForm() {
    return document.getElementById('dh-tech-form');
  }

  function getTechnicalField(form, key) {
    return form ? form.querySelector('[data-dh-tech-field="' + key + '"]') : null;
  }

  function clearTechnicalFieldErrors(form) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.has-error'), function (field) {
      field.classList.remove('has-error');
    });
  }

  function setTechnicalFieldError(form, key, hasError) {
    var field = getTechnicalField(form, key);
    if (!field) return;
    field.classList.toggle('has-error', hasError);
  }

  function readTechnicalAssessmentData(form) {
    var boilers = [1, 2, 3].map(function (index) {
      var boiler = { label: 'Boiler ' + index };
      BOILER_FIELD_CONFIG.forEach(function (item) {
        var field = getTechnicalField(form, 'boiler_' + index + '_' + item.key);
        boiler[item.key] = field ? field.value.trim() : '';
      });
      return boiler;
    });

    var heatingSurfaces = {};
    HEATING_SURFACE_CONFIG.forEach(function (item) {
      heatingSurfaces[item.key] = {
        boiler1: (getTechnicalField(form, 'surface_1_' + item.key) ? getTechnicalField(form, 'surface_1_' + item.key).value : '').trim(),
        boiler2: (getTechnicalField(form, 'surface_2_' + item.key) ? getTechnicalField(form, 'surface_2_' + item.key).value : '').trim(),
        boiler3: (getTechnicalField(form, 'surface_3_' + item.key) ? getTechnicalField(form, 'surface_3_' + item.key).value : '').trim()
      };
    });

    return {
      requestType: 'technical_assessment',
      factoryName: (getTechnicalField(form, 'factoryName') ? getTechnicalField(form, 'factoryName').value : '').trim(),
      nearestStation: (getTechnicalField(form, 'nearestStation') ? getTechnicalField(form, 'nearestStation').value : '').trim(),
      trainAccess: (getTechnicalField(form, 'trainAccess') ? getTechnicalField(form, 'trainAccess').value : '').trim(),
      busAccess: (getTechnicalField(form, 'busAccess') ? getTechnicalField(form, 'busAccess').value : '').trim(),
      primaryContact: {
        role: 'GMT / WM / CE',
        name: (getTechnicalField(form, 'primary_name') ? getTechnicalField(form, 'primary_name').value : '').trim(),
        phone: (getTechnicalField(form, 'primary_phone') ? getTechnicalField(form, 'primary_phone').value : '').trim(),
        email: (getTechnicalField(form, 'primary_email') ? getTechnicalField(form, 'primary_email').value : '').trim()
      },
      boilerEngineer: {
        role: 'Boiler Engineer',
        name: (getTechnicalField(form, 'boilerEngineer_name') ? getTechnicalField(form, 'boilerEngineer_name').value : '').trim(),
        phone: (getTechnicalField(form, 'boilerEngineer_phone') ? getTechnicalField(form, 'boilerEngineer_phone').value : '').trim(),
        email: (getTechnicalField(form, 'boilerEngineer_email') ? getTechnicalField(form, 'boilerEngineer_email').value : '').trim()
      },
      boilers: boilers,
      plantContext: heatingSurfaces,
      mdc: {
        cycloneCount: (getTechnicalField(form, 'mdc_cycloneCount') ? getTechnicalField(form, 'mdc_cycloneCount').value : '').trim(),
        cycloneSize: (getTechnicalField(form, 'mdc_cycloneSize') ? getTechnicalField(form, 'mdc_cycloneSize').value : '').trim(),
        areaUsed: (getTechnicalField(form, 'mdc_areaUsed') ? getTechnicalField(form, 'mdc_areaUsed').value : '').trim()
      },
      scrubber: {
        make: (getTechnicalField(form, 'scrubber_make') ? getTechnicalField(form, 'scrubber_make').value : '').trim(),
        dimensions: (getTechnicalField(form, 'scrubber_dimensions') ? getTechnicalField(form, 'scrubber_dimensions').value : '').trim(),
        areaUsed: (getTechnicalField(form, 'scrubber_areaUsed') ? getTechnicalField(form, 'scrubber_areaUsed').value : '').trim(),
        pumpMotor: (getTechnicalField(form, 'scrubber_pumpMotor') ? getTechnicalField(form, 'scrubber_pumpMotor').value : '').trim(),
        ductInlet: (getTechnicalField(form, 'scrubber_ductInlet') ? getTechnicalField(form, 'scrubber_ductInlet').value : '').trim(),
        ductOutlet: (getTechnicalField(form, 'scrubber_ductOutlet') ? getTechnicalField(form, 'scrubber_ductOutlet').value : '').trim(),
        ashPitSize: (getTechnicalField(form, 'scrubber_ashPitSize') ? getTechnicalField(form, 'scrubber_ashPitSize').value : '').trim()
      },
      problemSummary: (getTechnicalField(form, 'problemSummary') ? getTechnicalField(form, 'problemSummary').value : '').trim()
    };
  }

  function updateTechnicalStatus(form, state, message) {
    if (!form) return;
    var status = form.querySelector('[data-dh-tech-status="true"]');
    if (!status) return;

    status.classList.remove('is-success', 'is-warning', 'is-error');
    if (state === 'success') status.classList.add('is-success');
    if (state === 'warning') status.classList.add('is-warning');
    if (state === 'error') status.classList.add('is-error');
    status.innerHTML = message;
  }

  function validateTechnicalAssessmentStep(form, stepIndex, data) {
    var errors = [];
    clearTechnicalFieldErrors(form);

    if (stepIndex === 0) {
      if (data.factoryName.length < 3) {
        errors.push('- Factory name is required');
        setTechnicalFieldError(form, 'factoryName', true);
      }
    }

    if (stepIndex === 1) {
      var primaryHasEmail = isValidEmail(data.primaryContact.email);
      var primaryHasPhone = data.primaryContact.phone.replace(/\D/g, '').length >= 10;

      if (data.primaryContact.name.length < 3) {
        errors.push('- Primary plant contact name is required');
        setTechnicalFieldError(form, 'primary_name', true);
      }

      if (!primaryHasEmail && !primaryHasPhone) {
        errors.push('- Add at least one reachable phone or email for the primary plant contact');
        setTechnicalFieldError(form, 'primary_phone', true);
        setTechnicalFieldError(form, 'primary_email', true);
      }

      if (data.primaryContact.email && !primaryHasEmail) {
        errors.push('- Primary contact email is not valid');
        setTechnicalFieldError(form, 'primary_email', true);
      }

      if (data.boilerEngineer.email && !isValidEmail(data.boilerEngineer.email)) {
        errors.push('- Boiler engineer email is not valid');
        setTechnicalFieldError(form, 'boilerEngineer_email', true);
      }
    }

    if (stepIndex === 6) {
      if (data.problemSummary.length < 15) {
        errors.push('- Describe the problem in at least 15 characters');
        setTechnicalFieldError(form, 'problemSummary', true);
      }
    }

    return errors;
  }

  function validateTechnicalAssessmentAll(form, data) {
    clearTechnicalFieldErrors(form);

    var allErrors = [];
    var primaryHasEmail = isValidEmail(data.primaryContact.email);
    var primaryHasPhone = data.primaryContact.phone.replace(/\D/g, '').length >= 10;

    if (data.factoryName.length < 3) {
      allErrors.push('- Factory name is required');
      setTechnicalFieldError(form, 'factoryName', true);
    }

    if (data.primaryContact.name.length < 3) {
      allErrors.push('- Primary plant contact name is required');
      setTechnicalFieldError(form, 'primary_name', true);
    }

    if (!primaryHasEmail && !primaryHasPhone) {
      allErrors.push('- Add at least one reachable phone or email for the primary plant contact');
      setTechnicalFieldError(form, 'primary_phone', true);
      setTechnicalFieldError(form, 'primary_email', true);
    }

    if (data.primaryContact.email && !primaryHasEmail) {
      allErrors.push('- Primary contact email is not valid');
      setTechnicalFieldError(form, 'primary_email', true);
    }

    if (data.boilerEngineer.email && !isValidEmail(data.boilerEngineer.email)) {
      allErrors.push('- Boiler engineer email is not valid');
      setTechnicalFieldError(form, 'boilerEngineer_email', true);
    }

    if (data.problemSummary.length < 15) {
      allErrors.push('- Describe the problem in at least 15 characters');
      setTechnicalFieldError(form, 'problemSummary', true);
    }

    return allErrors;
  }

  function setTechnicalAssessmentStep(form, stepIndex) {
    if (!form) return;

    var boundedIndex = Math.max(0, Math.min(TECHNICAL_STEP_TITLES.length - 1, stepIndex));
    form.dataset.currentStep = String(boundedIndex);

    Array.prototype.forEach.call(form.querySelectorAll('[data-dh-tech-step]'), function (step) {
      step.classList.toggle('active', step.getAttribute('data-dh-tech-step') === String(boundedIndex));
    });

    var overlay = document.getElementById('dh-tech-overlay');
    var label = overlay ? overlay.querySelector('[data-dh-tech-step-label="true"]') : null;
    var count = overlay ? overlay.querySelector('[data-dh-tech-step-count="true"]') : null;
    var progress = overlay ? overlay.querySelector('[data-dh-tech-progress="true"]') : null;
    var prev = form.querySelector('[data-dh-tech-prev="true"]');
    var next = form.querySelector('[data-dh-tech-next="true"]');
    var submit = form.querySelector('[data-dh-tech-submit="true"]');
    var body = form.querySelector('.dh-tech-body');

    if (label) label.innerHTML = 'Step ' + (boundedIndex + 1) + ' of ' + TECHNICAL_STEP_TITLES.length + ' - ' + TECHNICAL_STEP_TITLES[boundedIndex];
    if (count) count.innerText = (boundedIndex + 1) + ' / ' + TECHNICAL_STEP_TITLES.length;
    if (progress) progress.style.width = (((boundedIndex + 1) / TECHNICAL_STEP_TITLES.length) * 100) + '%';
    if (prev) prev.style.display = boundedIndex === 0 ? 'none' : '';
    if (next) next.style.display = boundedIndex === TECHNICAL_STEP_TITLES.length - 1 ? 'none' : '';
    if (submit) submit.style.display = boundedIndex === TECHNICAL_STEP_TITLES.length - 1 ? '' : 'none';
    if (body) body.scrollTop = 0;
  }

  function openTechnicalAssessment(source) {
    injectTechnicalAssessmentOverlay();

    var overlay = document.getElementById('dh-tech-overlay');
    var form = getTechnicalAssessmentForm();
    if (!overlay || !form) return;

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    form.dataset.dhMountedAt = String(getTimestamp());
    form.dataset.dhSource = source || 'site';
    setTechnicalAssessmentStep(form, 0);
    updateTechnicalStatus(form, '', '<strong>Technical review mode:</strong> Share the values you already have. Dharrah can follow up for any missing details later.');
    trackEvent('technical_assessment_open', {
      form_name: 'technical_assessment',
      source: source || 'site'
    });
  }

  function closeTechnicalAssessment() {
    var overlay = document.getElementById('dh-tech-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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

  function getCooldownRemainingMs(storageKey) {
    var lastSubmitAt = readStorageNumber(storageKey || FORM_COOLDOWN_KEY);
    if (!lastSubmitAt) return 0;

    var remaining = FORM_COOLDOWN_MS - (getTimestamp() - lastSubmitAt);
    return remaining > 0 ? remaining : 0;
  }

  function isLikelySpamSubmission(form, storageKey) {
    var honeypot = form.querySelector('[data-dh-honeypot="true"]');
    if (honeypot && normalizeText(honeypot.value)) {
      return 'honeypot';
    }

    var mountedAt = parseInt(form.dataset.dhMountedAt || '0', 10);
    if (mountedAt && getTimestamp() - mountedAt < BOT_MIN_COMPLETION_MS) {
      return 'too_fast';
    }

    if (getCooldownRemainingMs(storageKey) > 0) {
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
      var blockReason = isLikelySpamSubmission(form, FORM_COOLDOWN_KEY);

      if (blockReason) {
        if (blockReason === 'cooldown') {
          var remaining = getCooldownRemainingMs(FORM_COOLDOWN_KEY);
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
      var endpoint = getContactEndpoint();

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

        window.showDhPopup('Inquiry Sent', 'Your inquiry has been received successfully. Our team will contact you within 24 hours.', 'success');
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

  function setupTechnicalAssessmentBridge() {
    injectTechnicalAssessmentOverlay();
    ensureTechnicalAssessmentEntryPoints();

    var overlay = document.getElementById('dh-tech-overlay');
    var form = getTechnicalAssessmentForm();
    if (!overlay || !form) return;

    if (form.dataset.bridgeSet === 'true') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-tech]'), function (button) {
        if (button.dataset.boundTechOpen === 'true') return;
        button.dataset.boundTechOpen = 'true';
        button.addEventListener('click', function () {
          openTechnicalAssessment(button.getAttribute('data-dh-open-tech') || 'site');
        });
      });
      return;
    }

    form.dataset.bridgeSet = 'true';
    setTechnicalAssessmentStep(form, 0);

    Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-tech]'), function (button) {
      if (button.dataset.boundTechOpen === 'true') return;
      button.dataset.boundTechOpen = 'true';
      button.addEventListener('click', function () {
        openTechnicalAssessment(button.getAttribute('data-dh-open-tech') || 'site');
      });
    });

    Array.prototype.forEach.call(overlay.querySelectorAll('[data-dh-tech-close="true"]'), function (button) {
      button.addEventListener('click', function () {
        closeTechnicalAssessment();
      });
    });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeTechnicalAssessment();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('active')) {
        closeTechnicalAssessment();
      }
    });

    var next = form.querySelector('[data-dh-tech-next="true"]');
    if (next) {
      next.addEventListener('click', function () {
        var current = parseInt(form.dataset.currentStep || '0', 10);
        var data = readTechnicalAssessmentData(form);
        var errors = validateTechnicalAssessmentStep(form, current, data);

        if (errors.length) {
          updateTechnicalStatus(form, 'error', '<strong>Some details still need attention.</strong> Please correct the highlighted fields before moving to the next step.');
          window.showDhPopup('Validation Required', errors.join('\n'));
          return;
        }

        updateTechnicalStatus(form, '', '<strong>Step saved locally.</strong> Continue when you are ready.');
        setTechnicalAssessmentStep(form, current + 1);
      });
    }

    var prev = form.querySelector('[data-dh-tech-prev="true"]');
    if (prev) {
      prev.addEventListener('click', function () {
        var current = parseInt(form.dataset.currentStep || '0', 10);
        setTechnicalAssessmentStep(form, current - 1);
      });
    }

    form.addEventListener('input', function () {
      if (form.dataset.submitting === 'true') return;
      var status = form.querySelector('[data-dh-tech-status="true"]');
      if (!status) return;
      if (status.classList.contains('is-error') || status.classList.contains('is-warning')) {
        updateTechnicalStatus(form, '', '<strong>Technical review mode:</strong> Share the values you already have. Dharrah can follow up for any missing details later.');
      }
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (form.dataset.submitting === 'true') return;

      var data = readTechnicalAssessmentData(form);
      var blockReason = isLikelySpamSubmission(form, TECHNICAL_FORM_COOLDOWN_KEY);

      if (blockReason) {
        if (blockReason === 'cooldown') {
          var remaining = getCooldownRemainingMs(TECHNICAL_FORM_COOLDOWN_KEY);
          updateTechnicalStatus(form, 'warning', formatCooldownMessage(remaining));
          trackEvent('technical_assessment_blocked', {
            form_name: 'technical_assessment',
            block_reason: blockReason,
            remaining_seconds: Math.ceil(remaining / 1000)
          });
          window.showDhPopup('Please Wait', 'We recently received a technical assessment from this browser. Please wait a little or contact us directly.');
          return;
        }

        updateTechnicalStatus(form, 'warning', '<strong>Submission paused.</strong> Please try again normally or contact Dharrah directly if the requirement is urgent.');
        trackEvent('technical_assessment_blocked', {
          form_name: 'technical_assessment',
          block_reason: blockReason
        });
        return;
      }

      trackEvent('technical_assessment_submit_attempt', {
        form_name: 'technical_assessment',
        source: form.dataset.dhSource || 'site'
      });

      var errors = validateTechnicalAssessmentAll(form, data);
      if (errors.length) {
        updateTechnicalStatus(form, 'error', '<strong>Some required details are missing.</strong> Please correct the highlighted fields before sending the assessment.');
        trackEvent('technical_assessment_validation_error', {
          form_name: 'technical_assessment',
          error_count: errors.length
        });
        if (data.factoryName.length < 3) {
          setTechnicalAssessmentStep(form, 0);
        } else if (data.primaryContact.name.length < 3 || (!isValidEmail(data.primaryContact.email) && data.primaryContact.phone.replace(/\D/g, '').length < 10)) {
          setTechnicalAssessmentStep(form, 1);
        } else {
          setTechnicalAssessmentStep(form, 6);
        }
        window.showDhPopup('Validation Required', errors.join('\n'));
        return;
      }

      var submitButton = form.querySelector('[data-dh-tech-submit="true"]');
      var originalLabel = submitButton ? submitButton.innerText : '';

      form.dataset.submitting = 'true';
      if (submitButton) {
        submitButton.innerText = 'SENDING...';
        submitButton.disabled = true;
      }
      updateTechnicalStatus(form, 'warning', '<strong>Sending your assessment...</strong> Dharrah is receiving the plant, boiler, MDC, and scrubber details now.');

      try {
        var response = await fetch(getContactEndpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error('Assessment send failed');
        }

        writeStorageNumber(TECHNICAL_FORM_COOLDOWN_KEY, getTimestamp());
        updateTechnicalStatus(form, 'success', '<strong>Technical assessment received.</strong> Dharrah will review the data and contact your team with the next engineering steps.');
        trackEvent('technical_assessment_submit', {
          form_name: 'technical_assessment',
          source: form.dataset.dhSource || 'site'
        });
        trackEvent('technical_assessment_success', {
          form_name: 'technical_assessment',
          source: form.dataset.dhSource || 'site'
        });

        window.showDhPopup('Assessment Sent', 'Your technical assessment has been received successfully. Dharrah will review the plant details and contact you with the next steps.', 'success');
        form.reset();
        form.dataset.dhMountedAt = String(getTimestamp());
        setTechnicalAssessmentStep(form, 0);
        clearTechnicalFieldErrors(form);
        closeTechnicalAssessment();
      } catch (error) {
        updateTechnicalStatus(form, 'error', '<strong>We could not send the technical assessment right now.</strong> Please try again in a moment or contact Dharrah directly by phone or WhatsApp.');
        trackEvent('technical_assessment_error', {
          form_name: 'technical_assessment',
          error_type: 'network_or_worker'
        });
        window.showDhPopup('System Error', 'We could not send the technical assessment right now. Please try again or contact us directly.');
      } finally {
        form.dataset.submitting = 'false';
        if (submitButton) {
          submitButton.innerText = originalLabel;
          submitButton.disabled = false;
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
    ensureHomeSupportSection();
    ensureServicesCtaProof();
    ensureContactHooks();
    setupPhonePicker();
    setupContactBridge();
    setupTechnicalAssessmentBridge();
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
