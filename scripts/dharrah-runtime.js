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
  var REGULATORY_FORM_COOLDOWN_KEY = 'dh_last_regulatory_submit_at';
  var EC_FORM_COOLDOWN_KEY = 'dh_last_ec_submit_at';
  var EPR_FORM_COOLDOWN_KEY = 'dh_last_epr_submit_at';
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
  var GPCB_STEP_TITLES = [
    'Consent Route',
    'Applicant Profile',
    'Products & Utilities',
    'Pollution Profile',
    'Existing Approval & Changes',
    'Documents & Dharrah Support'
  ];
  var EC_STEP_TITLES = [
    'Project Route',
    'Project Identity',
    'Category & Location',
    'Configuration & Pollution Load',
    'Existing Studies & Approvals',
    'Documents & Dharrah Support'
  ];
  var EPR_STEP_TITLES = [
    'Waste Stream & Role',
    'Applicant Profile',
    'Registration Scope',
    'Current Compliance & Documents',
    'Support Needed'
  ];
  var ATTACHMENT_MAX_FILES = 5;
  var ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
  var ATTACHMENT_TOTAL_MAX_BYTES = 15 * 1024 * 1024;
  var ATTACHMENT_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
  var ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

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
      '  padding: 16px 18px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(244, 248, 252, 0.92), rgba(255, 255, 255, 1));',
      '}',
      '.dh-form-proof-summary {',
      '  display: grid;',
      '  gap: 4px;',
      '  margin-bottom: 12px;',
      '}',
      '.dh-form-proof-summary strong {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 23px;',
      '  line-height: 1.2;',
      '  color: #1a2d5a;',
      '}',
      '.dh-form-proof-summary span {',
      '  display: block;',
      '  font-size: 13px;',
      '  line-height: 1.55;',
      '  color: #5c6f90;',
      '}',
      '.dh-form-proof-head {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-bottom: 10px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-form-proof-title {',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 19px;',
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
      '  gap: 10px;',
      '}',
      '.dh-form-proof-stat {',
      '  padding: 12px 12px 10px;',
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
      '  font-size: 11px;',
      '  line-height: 1.5;',
      '  color: #5c6f90;',
      '}',
      '.dh-form-reassurance {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin: 12px 0 0;',
      '}',
      '.dh-reassurance-chip {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 8px 11px;',
      '  border-radius: 999px;',
      '  background: rgba(61, 79, 204, 0.06);',
      '  border: 1px solid rgba(61, 79, 204, 0.14);',
      '  color: #3d4fcc;',
      '  font-size: 11px;',
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
      '.dh-tech-inline-card.is-rail {',
      '  margin-top: 28px;',
      '  padding: 22px;',
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
      '.dh-tech-inline-card.is-rail .dh-tech-inline-title {',
      '  font-size: 24px;',
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
      '.dh-route-strip {',
      '  margin-top: 28px;',
      '  padding: 22px;',
      '  border-radius: 18px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 1));',
      '  box-shadow: 0 16px 36px rgba(26, 45, 90, 0.06);',
      '}',
      '.dh-route-strip-head {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-end;',
      '  gap: 14px;',
      '  flex-wrap: wrap;',
      '  margin-bottom: 18px;',
      '}',
      '.dh-route-strip-head h3 {',
      '  margin: 6px 0 0;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 30px;',
      '  line-height: 1.1;',
      '  color: #1a2d5a;',
      '}',
      '.dh-route-strip-head p {',
      '  margin: 8px 0 0;',
      '  max-width: 760px;',
      '  color: #556887;',
      '  font-size: 14px;',
      '  line-height: 1.7;',
      '}',
      '.dh-route-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 14px;',
      '}',
      '.dh-route-card {',
      '  padding: 18px;',
      '  border-radius: 16px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #fff;',
      '  display: grid;',
      '  gap: 12px;',
      '}',
      '.dh-route-card.is-ready {',
      '  border-color: rgba(200, 32, 26, 0.18);',
      '  box-shadow: 0 16px 30px rgba(200, 32, 26, 0.08);',
      '}',
      '.dh-route-card-top {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-start;',
      '  gap: 12px;',
      '}',
      '.dh-route-card h4 {',
      '  margin: 0;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 25px;',
      '  line-height: 1.1;',
      '  color: #1a2d5a;',
      '}',
      '.dh-route-kicker {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 7px 11px;',
      '  border-radius: 999px;',
      '  background: rgba(200, 32, 26, 0.07);',
      '  border: 1px solid rgba(200, 32, 26, 0.12);',
      '  color: #c8201a;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 1.4px;',
      '  text-transform: uppercase;',
      '}',
      '.dh-route-card p {',
      '  margin: 0;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.7;',
      '}',
      '.dh-route-list {',
      '  margin: 0;',
      '  padding: 0;',
      '  list-style: none;',
      '  display: grid;',
      '  gap: 8px;',
      '}',
      '.dh-route-list li {',
      '  padding-left: 16px;',
      '  position: relative;',
      '  color: #4b5d7e;',
      '  font-size: 12px;',
      '  line-height: 1.6;',
      '}',
      '.dh-route-list li::before {',
      '  content: "";',
      '  position: absolute;',
      '  top: 8px;',
      '  left: 0;',
      '  width: 6px;',
      '  height: 6px;',
      '  border-radius: 999px;',
      '  background: #c8201a;',
      '}',
      '.dh-route-actions {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin-top: 2px;',
      '}',
      '.dh-route-note {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 7px 10px;',
      '  border-radius: 999px;',
      '  background: rgba(61, 79, 204, 0.06);',
      '  border: 1px solid rgba(61, 79, 204, 0.12);',
      '  color: #3d4fcc;',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '}',
      '.dh-service-card-action {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '  margin-top: 14px;',
      '}',
      '.dh-service-card-action .dh-tech-trigger {',
      '  min-height: 42px;',
      '  padding: 0 16px;',
      '  font-size: 11px;',
      '}',
      '.dh-knowledge-center {',
      '  margin-top: 22px;',
      '  padding: 24px;',
      '  border-radius: 18px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: linear-gradient(180deg, rgba(255,255,255,1), rgba(247,250,255,0.98));',
      '  box-shadow: 0 16px 36px rgba(26, 45, 90, 0.05);',
      '}',
      '.dh-knowledge-grid {',
      '  display: grid;',
      '  grid-template-columns: 1.2fr 1fr;',
      '  gap: 16px;',
      '}',
      '.dh-knowledge-panel {',
      '  padding: 20px;',
      '  border-radius: 16px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #fff;',
      '}',
      '.dh-knowledge-panel h3 {',
      '  margin: 6px 0 10px;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 30px;',
      '  line-height: 1.08;',
      '  color: #1a2d5a;',
      '}',
      '.dh-knowledge-panel p {',
      '  margin: 0;',
      '  color: #556887;',
      '  font-size: 14px;',
      '  line-height: 1.7;',
      '}',
      '.dh-knowledge-list {',
      '  margin: 16px 0 0;',
      '  padding: 0;',
      '  list-style: none;',
      '  display: grid;',
      '  gap: 10px;',
      '}',
      '.dh-knowledge-list li {',
      '  padding: 14px 14px 14px 16px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: #f8fbff;',
      '}',
      '.dh-knowledge-list strong {',
      '  display: block;',
      '  color: #1a2d5a;',
      '  font-size: 14px;',
      '  margin-bottom: 4px;',
      '}',
      '.dh-knowledge-list span {',
      '  color: #556887;',
      '  font-size: 12px;',
      '  line-height: 1.6;',
      '}',
      '.dh-knowledge-route-grid {',
      '  display: grid;',
      '  gap: 12px;',
      '}',
      '.dh-knowledge-route-card {',
      '  padding: 16px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: #fff;',
      '  display: grid;',
      '  gap: 10px;',
      '}',
      '.dh-knowledge-route-card h4 {',
      '  margin: 0;',
      '  color: #1a2d5a;',
      '  font-size: 18px;',
      '  font-family: "Crimson Text", serif;',
      '}',
      '.dh-knowledge-route-card p {',
      '  margin: 0;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.65;',
      '}',
      '#dh-consent-overlay, #dh-ec-overlay, #dh-epr-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 100001;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 18px;',
      '  background: rgba(15, 23, 42, 0.52);',
      '  backdrop-filter: blur(7px);',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.28s ease;',
      '}',
      '#dh-consent-overlay.active, #dh-ec-overlay.active, #dh-epr-overlay.active {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',
      '.dh-consent-shell {',
      '  width: min(980px, calc(100% - 40px));',
      '  height: min(780px, calc(100vh - 52px));',
      '  max-height: calc(100vh - 52px);',
      '  background: #f5f8fc;',
      '  color: #1a2d5a;',
      '  display: flex;',
      '  flex-direction: column;',
      '  min-height: 0;',
      '  border-radius: 20px;',
      '  overflow: hidden;',
      '  box-shadow: 0 22px 46px rgba(15, 23, 42, 0.2);',
      '  transform: translateY(12px);',
      '  transition: transform 0.28s ease;',
      '}',
      '#dh-consent-overlay.active .dh-consent-shell {',
      '  transform: translateY(0);',
      '}',
      '.dh-consent-shell form {',
      '  display: flex;',
      '  flex-direction: column;',
      '  flex: 1;',
      '  min-height: 0;',
      '}',
      '.dh-consent-head {',
      '  padding: 20px 24px 16px;',
      '  background: linear-gradient(135deg, #13233f, #1a2d5a);',
      '  color: #fff;',
      '}',
      '.dh-consent-head-top {',
      '  display: flex;',
      '  align-items: flex-start;',
      '  justify-content: space-between;',
      '  gap: 18px;',
      '}',
      '.dh-consent-kicker {',
      '  display: inline-block;',
      '  margin-bottom: 10px;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  letter-spacing: 1.8px;',
      '  text-transform: uppercase;',
      '  color: rgba(255,255,255,0.72);',
      '}',
      '.dh-consent-head h2 {',
      '  margin: 0;',
      '  font-family: "Crimson Text", serif;',
      '  max-width: 720px;',
      '  font-size: clamp(34px, 4.6vw, 46px);',
      '  line-height: 1.06;',
      '  letter-spacing: -0.25px;',
      '}',
      '.dh-consent-head p {',
      '  margin: 10px 0 0;',
      '  max-width: 720px;',
      '  color: rgba(255,255,255,0.86);',
      '  font-size: 14px;',
      '  line-height: 1.6;',
      '}',
      '.dh-consent-close {',
      '  flex: 0 0 auto;',
      '  width: 44px;',
      '  height: 44px;',
      '  border: 1px solid rgba(255,255,255,0.16);',
      '  border-radius: 999px;',
      '  background: rgba(255,255,255,0.08);',
      '  color: #fff;',
      '  font-size: 24px;',
      '  line-height: 1;',
      '  cursor: pointer;',
      '}',
      '.dh-consent-progress {',
      '  margin-top: 16px;',
      '}',
      '.dh-consent-progress-row {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '  align-items: flex-end;',
      '  margin-bottom: 12px;',
      '}',
      '.dh-consent-progress-copy {',
      '  display: grid;',
      '  gap: 6px;',
      '}',
      '.dh-consent-progress-copy strong {',
      '  font-size: 17px;',
      '  line-height: 1.3;',
      '}',
      '.dh-consent-progress-copy span, .dh-consent-progress-row > span {',
      '  color: rgba(255,255,255,0.72);',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '}',
      '.dh-consent-progress-meta {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '  margin-top: 18px;',
      '  margin-bottom: 8px;',
      '  color: rgba(255,255,255,0.72);',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '}',
      '.dh-consent-progress-meta strong {',
      '  color: #fff;',
      '  font-size: 17px;',
      '  line-height: 1.3;',
      '}',
      '.dh-consent-progress-bar {',
      '  height: 12px;',
      '  border-radius: 999px;',
      '  overflow: hidden;',
      '  background: rgba(255,255,255,0.16);',
      '}',
      '.dh-consent-progress-track {',
      '  height: 12px;',
      '  border-radius: 999px;',
      '  overflow: hidden;',
      '  background: rgba(255,255,255,0.16);',
      '}',
      '.dh-consent-progress-track span {',
      '  display: block;',
      '  height: 100%;',
      '  width: 0;',
      '  border-radius: 999px;',
      '  background: linear-gradient(90deg, #f6c344, #f28c28);',
      '  transition: width 0.25s ease;',
      '}',
      '.dh-consent-progress-fill {',
      '  height: 100%;',
      '  width: 0;',
      '  border-radius: 999px;',
      '  background: linear-gradient(90deg, #f6c344, #f28c28);',
      '  transition: width 0.25s ease;',
      '}',
      '.dh-consent-body {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 18px 24px;',
      '  min-height: 0;',
      '}',
      '.dh-consent-step {',
      '  display: none;',
      '}',
      '.dh-consent-step.active {',
      '  display: block;',
      '}',
      '.dh-consent-step-card {',
      '  padding: 18px;',
      '  border-radius: 16px;',
      '  background: #fff;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  box-shadow: 0 10px 24px rgba(26, 45, 90, 0.05);',
      '}',
      '.dh-consent-step-title {',
      '  margin: 0;',
      '  font-family: "Crimson Text", serif;',
      '  font-size: 30px;',
      '  line-height: 1.12;',
      '  color: #1a2d5a;',
      '}',
      '.dh-consent-step-copy {',
      '  margin: 10px 0 0;',
      '  color: #556887;',
      '  font-size: 14px;',
      '  line-height: 1.65;',
      '}',
      '.dh-consent-grid {',
      '  display: grid;',
      '  gap: 14px;',
      '  margin-top: 18px;',
      '}',
      '.dh-consent-grid.cols-2 {',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '}',
      '.dh-consent-grid.cols-3 {',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '}',
      '.dh-consent-field {',
      '  display: grid;',
      '  gap: 8px;',
      '}',
      '.dh-consent-field label {',
      '  font-size: 11px;',
      '  letter-spacing: 1.6px;',
      '  text-transform: uppercase;',
      '  color: #5c6f90;',
      '  font-weight: 700;',
      '}',
      '.dh-consent-field input, .dh-consent-field textarea, .dh-consent-field select {',
      '  width: 100%;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.14);',
      '  background: #f8fbff;',
      '  color: #1a2d5a;',
      '  padding: 14px 14px;',
      '  font-size: 14px;',
      '  line-height: 1.45;',
      '  outline: none;',
      '  transition: border-color 0.2s ease, box-shadow 0.2s ease;',
      '}',
      '.dh-consent-field textarea {',
      '  min-height: 98px;',
      '  resize: vertical;',
      '}',
      '.dh-consent-field input:focus, .dh-consent-field textarea:focus, .dh-consent-field select:focus {',
      '  border-color: rgba(200, 32, 26, 0.34);',
      '  box-shadow: 0 0 0 3px rgba(200, 32, 26, 0.08);',
      '}',
      '.dh-consent-field.has-error input, .dh-consent-field.has-error textarea, .dh-consent-field.has-error select {',
      '  border-color: rgba(220, 38, 38, 0.82);',
      '  background: rgba(254, 242, 242, 0.98);',
      '}',
      '.dh-consent-option-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 12px;',
      '  margin-top: 18px;',
      '}',
      '.dh-consent-option-grid.has-error {',
      '  padding: 12px;',
      '  border-radius: 18px;',
      '  border: 1px solid rgba(220, 38, 38, 0.26);',
      '  background: rgba(254, 242, 242, 0.68);',
      '}',
      '.dh-consent-option {',
      '  position: relative;',
      '  border: 1px solid rgba(61, 85, 128, 0.14);',
      '  border-radius: 14px;',
      '  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.96));',
      '  padding: 16px;',
      '  cursor: pointer;',
      '  display: grid;',
      '  gap: 6px;',
      '}',
      '.dh-consent-option input {',
      '  position: absolute;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '}',
      '.dh-consent-option strong {',
      '  font-size: 16px;',
      '  line-height: 1.28;',
      '  color: #1a2d5a;',
      '}',
      '.dh-consent-option span {',
      '  color: #556887;',
      '  font-size: 12px;',
      '  line-height: 1.55;',
      '}',
      '.dh-consent-option.is-selected {',
      '  border-color: rgba(200, 32, 26, 0.28);',
      '  box-shadow: 0 12px 26px rgba(200, 32, 26, 0.08);',
      '}',
      '.dh-consent-checklist {',
      '  display: grid;',
      '  gap: 10px;',
      '  margin-top: 18px;',
      '}',
      '.dh-consent-check {',
      '  display: flex;',
      '  align-items: flex-start;',
      '  gap: 10px;',
      '  padding: 12px 14px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #f8fbff;',
      '}',
      '.dh-consent-check input {',
      '  margin-top: 3px;',
      '}',
      '.dh-consent-check strong {',
      '  display: block;',
      '  color: #1a2d5a;',
      '  font-size: 13px;',
      '  margin-bottom: 3px;',
      '}',
      '.dh-consent-check span {',
      '  display: block;',
      '  color: #5c6f90;',
      '  font-size: 12px;',
      '  line-height: 1.55;',
      '}',
      '.dh-upload-card {',
      '  margin-top: 18px;',
      '  padding: 16px 18px;',
      '  border-radius: 14px;',
      '  border: 1px dashed rgba(200, 32, 26, 0.22);',
      '  background: linear-gradient(180deg, rgba(255, 248, 241, 0.88), rgba(255,255,255,0.98));',
      '}',
      '.dh-upload-copy {',
      '  display: grid;',
      '  gap: 6px;',
      '  margin-bottom: 12px;',
      '}',
      '.dh-upload-copy-top {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '}',
      '.dh-upload-copy strong {',
      '  color: #1a2d5a;',
      '  font-size: 15px;',
      '  line-height: 1.35;',
      '}',
      '.dh-upload-badge {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 5px 10px;',
      '  border-radius: 999px;',
      '  background: rgba(200, 32, 26, 0.08);',
      '  color: #c2410c;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 1px;',
      '  text-transform: uppercase;',
      '}',
      '.dh-upload-copy span {',
      '  color: #5c6f90;',
      '  font-size: 12px;',
      '  line-height: 1.65;',
      '}',
      '.dh-upload-drop {',
      '  display: grid;',
      '  gap: 10px;',
      '  cursor: pointer;',
      '}',
      '.dh-upload-drop input {',
      '  display: none;',
      '}',
      '.dh-upload-trigger {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: fit-content;',
      '  padding: 11px 16px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(200, 32, 26, 0.18);',
      '  background: #ffffff;',
      '  color: #c2410c;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.8px;',
      '  text-transform: uppercase;',
      '}',
      '.dh-upload-note {',
      '  color: #6b7280;',
      '  font-size: 12px;',
      '  line-height: 1.6;',
      '}',
      '.dh-upload-summary {',
      '  margin-top: 12px;',
      '  padding: 12px 14px;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: #ffffff;',
      '  color: #556887;',
      '  font-size: 12px;',
      '  line-height: 1.65;',
      '}',
      '.dh-upload-summary strong {',
      '  color: #1a2d5a;',
      '}',
      '.dh-upload-total {',
      '  display: inline-block;',
      '  margin-left: 10px;',
      '  color: #64748b;',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '}',
      '.dh-upload-file-list {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 8px;',
      '  margin-top: 10px;',
      '}',
      '.dh-upload-file-list span {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 7px 10px;',
      '  border-radius: 999px;',
      '  background: #fff7ef;',
      '  border: 1px solid #f5d6bc;',
      '  color: #7c4a2c;',
      '  font-size: 11px;',
      '  line-height: 1.4;',
      '}',
      '.dh-upload-summary.is-error {',
      '  border-color: rgba(220, 38, 38, 0.26);',
      '  background: rgba(254, 242, 242, 0.86);',
      '  color: #b91c1c;',
      '}',
      '.dh-consent-help-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 16px;',
      '  margin-top: 22px;',
      '}',
      '.dh-consent-summary-grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 16px;',
      '  margin-top: 22px;',
      '}',
      '.dh-consent-summary-card {',
      '  padding: 16px 18px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(61, 85, 128, 0.1);',
      '  background: rgba(248,251,255,0.98);',
      '}',
      '.dh-consent-summary-card h4 {',
      '  margin: 0 0 10px;',
      '  font-size: 16px;',
      '  line-height: 1.35;',
      '  color: #1a2d5a;',
      '}',
      '.dh-consent-summary-card ul {',
      '  margin: 0;',
      '  padding-left: 18px;',
      '  color: #556887;',
      '  font-size: 13px;',
      '  line-height: 1.7;',
      '}',
      '.dh-consent-note {',
      '  margin-top: 18px;',
      '  padding: 14px 16px;',
      '  border-radius: 12px;',
      '  background: rgba(61, 79, 204, 0.06);',
      '  border: 1px solid rgba(61, 79, 204, 0.14);',
      '  color: #3d4fcc;',
      '  font-size: 13px;',
      '  line-height: 1.65;',
      '}',
      '.dh-consent-foot {',
      '  padding: 12px 24px 16px;',
      '  border-top: 1px solid rgba(61, 85, 128, 0.12);',
      '  background: rgba(255,255,255,0.98);',
      '}',
      '.dh-consent-status {',
      '  margin-bottom: 12px;',
      '  padding: 11px 13px;',
      '  border-radius: 12px;',
      '  background: rgba(61, 79, 204, 0.06);',
      '  border: 1px solid rgba(61, 79, 204, 0.12);',
      '  color: #334155;',
      '  font-size: 12px;',
      '  line-height: 1.55;',
      '}',
      '.dh-consent-status.is-error {',
      '  background: rgba(220, 38, 38, 0.06);',
      '  border-color: rgba(220, 38, 38, 0.18);',
      '  color: #991b1b;',
      '}',
      '.dh-consent-status.is-warning {',
      '  background: rgba(245, 158, 11, 0.08);',
      '  border-color: rgba(245, 158, 11, 0.18);',
      '  color: #92400e;',
      '}',
      '.dh-consent-status.is-success {',
      '  background: rgba(16, 185, 129, 0.08);',
      '  border-color: rgba(16, 185, 129, 0.18);',
      '  color: #065f46;',
      '}',
      '.dh-consent-actions {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  gap: 14px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-consent-actions-left, .dh-consent-actions-right {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '}',
      '.dh-consent-btn {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  min-height: 44px;',
      '  padding: 0 18px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(26, 45, 90, 0.12);',
      '  background: #fff;',
      '  color: #1a2d5a;',
      '  font-size: 11px;',
      '  font-weight: 800;',
      '  letter-spacing: 0.7px;',
      '  text-transform: uppercase;',
      '  cursor: pointer;',
      '  transition: all 0.22s ease;',
      '  box-shadow: 0 10px 24px rgba(26, 45, 90, 0.06);',
      '}',
      '.dh-consent-btn:hover {',
      '  transform: translateY(-1px);',
      '}',
      '.dh-consent-btn.primary {',
      '  background: linear-gradient(135deg, #c8201a, #df4b33);',
      '  color: #fff;',
      '  border-color: transparent;',
      '  box-shadow: 0 16px 30px rgba(200, 32, 26, 0.2);',
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
      '  .dh-proof-band, .dh-form-proof-grid, .dh-geo-grid, .dh-service-snapshot-grid, .dh-tech-grid.cols-2, .dh-tech-grid.cols-3, .dh-tech-summary-grid, .dh-route-grid, .dh-consent-grid.cols-2, .dh-consent-grid.cols-3, .dh-consent-option-grid, .dh-consent-summary-grid, .dh-consent-help-grid, .dh-knowledge-grid {',
      '    grid-template-columns: 1fr;',
      '  }',
      '  .dh-form-proof-head {',
      '    align-items: flex-start;',
      '  }',
      '  .dh-route-strip-head {',
      '    align-items: flex-start;',
      '  }',
      '  .dh-consent-body {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
      '  }',
      '  #dh-consent-overlay, #dh-ec-overlay, #dh-epr-overlay {',
      '    padding: 12px;',
      '  }',
      '  .dh-consent-shell {',
      '    width: 100%;',
      '    height: calc(100vh - 24px);',
      '    max-height: calc(100vh - 24px);',
      '    border-radius: 18px;',
      '  }',
      '  .dh-consent-head {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
      '  }',
      '  .dh-consent-foot {',
      '    padding-left: 18px;',
      '    padding-right: 18px;',
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
      '  .dh-route-strip {',
      '    padding: 18px;',
      '  }',
      '  .dh-route-card {',
      '    padding: 16px;',
      '  }',
      '  .dh-knowledge-center, .dh-knowledge-panel {',
      '    padding: 18px;',
      '  }',
      '  .dh-consent-head-top, .dh-consent-actions, .dh-consent-actions-left, .dh-consent-actions-right {',
      '    flex-direction: column;',
      '    align-items: stretch;',
      '    width: 100%;',
      '  }',
      '  .dh-tech-head-top, .dh-tech-actions {',
      '    flex-direction: column;',
      '    align-items: stretch;',
      '  }',
      '  .dh-consent-shell {',
      '    height: 100vh;',
      '    max-height: 100vh;',
      '    width: 100%;',
      '    border-radius: 0;',
      '  }',
      '  #dh-consent-overlay, #dh-ec-overlay, #dh-epr-overlay {',
      '    padding: 0;',
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
      '  .dh-tech-trigger, .dh-tech-btn, .dh-consent-btn {',
      '    width: 100%;',
      '  }',
      '  .dh-tech-step-card {',
      '    padding: 18px;',
      '  }',
      '  .dh-consent-step-card {',
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

  function formatAttachmentSize(bytes) {
    if (!bytes) return '0 MB';
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
  }

  function getFileExtension(name) {
    var safeName = (name || '').toLowerCase();
    var parts = safeName.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  function getAttachmentFiles(form, key) {
    var input = form ? form.querySelector('[data-dh-upload-input="' + key + '"]') : null;
    return input && input.files ? Array.prototype.slice.call(input.files) : [];
  }

  function buildAttachmentMarkup(key, title, copy) {
    return [
      '<div class="dh-upload-card">',
      '  <div class="dh-upload-copy">',
      '    <div class="dh-upload-copy-top"><strong>' + title + '</strong><span class="dh-upload-badge">Optional</span></div>',
      '    <span>' + copy + '</span>',
      '  </div>',
      '  <label class="dh-upload-drop">',
      '    <input type="file" multiple accept="' + ATTACHMENT_ACCEPT + '" data-dh-upload-input="' + key + '">',
      '    <span class="dh-upload-trigger">Choose Files</span>',
      '    <span class="dh-upload-note">Up to ' + ATTACHMENT_MAX_FILES + ' files, max 3 MB each. PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.</span>',
      '  </label>',
      '  <div class="dh-upload-summary" data-dh-upload-summary="' + key + '">No files selected yet.</div>',
      '</div>'
    ].join('');
  }

  function validateAttachmentFiles(files) {
    var errors = [];
    var totalBytes = 0;

    if (files.length > ATTACHMENT_MAX_FILES) {
      errors.push('You can upload up to ' + ATTACHMENT_MAX_FILES + ' files at a time.');
    }

    files.forEach(function (file) {
      var extension = getFileExtension(file.name);
      var size = file.size || 0;
      totalBytes += size;

      if (ATTACHMENT_ALLOWED_EXTENSIONS.indexOf(extension) === -1) {
        errors.push(file.name + ' is not an allowed file type.');
      }

      if (size > ATTACHMENT_MAX_BYTES) {
        errors.push(file.name + ' is larger than 3 MB.');
      }
    });

    if (totalBytes > ATTACHMENT_TOTAL_MAX_BYTES) {
      errors.push('The combined upload is too large. Keep the total under ' + formatAttachmentSize(ATTACHMENT_TOTAL_MAX_BYTES) + '.');
    }

    return errors;
  }

  function updateAttachmentSummary(form, key, tone, message) {
    var summary = form ? form.querySelector('[data-dh-upload-summary="' + key + '"]') : null;
    if (!summary) return;
    summary.classList.remove('is-error', 'is-success');
    if (tone) {
      summary.classList.add('is-' + tone);
    }
    summary.innerHTML = message;
  }

  function refreshAttachmentSummary(form, key) {
    var files = getAttachmentFiles(form, key);
    if (!files.length) {
      updateAttachmentSummary(form, key, '', 'No files selected yet.');
      return;
    }

    var totalBytes = files.reduce(function (sum, file) {
      return sum + (file.size || 0);
    }, 0);

    updateAttachmentSummary(
      form,
      key,
      '',
      '<strong>' + files.length + ' file(s) ready.</strong><span class="dh-upload-total">Total: ' + formatAttachmentSize(totalBytes) + '</span><div class="dh-upload-file-list">' + files.map(function (file) {
        return '<span>' + file.name + ' (' + formatAttachmentSize(file.size || 0) + ')</span>';
      }).join('') + '</div>'
    );
  }

  function bindAttachmentInput(form, key) {
    if (!form) return;
    var input = form.querySelector('[data-dh-upload-input="' + key + '"]');
    if (!input || input.dataset.boundUpload === 'true') return;
    input.dataset.boundUpload = 'true';
    input.addEventListener('change', function () {
      var files = getAttachmentFiles(form, key);
      var errors = validateAttachmentFiles(files);
      if (errors.length) {
        input.value = '';
        updateAttachmentSummary(form, key, 'error', errors[0]);
        window.showDhPopup('Attachment Limit', errors[0]);
        return;
      }
      refreshAttachmentSummary(form, key);
    });
  }

  function buildMultipartRequest(data, files) {
    var formData = new FormData();
    formData.append('payload', JSON.stringify(data));
    files.forEach(function (file) {
      formData.append('attachments', file, file.name);
    });
    return formData;
  }

  function getValidatedAttachments(form, key) {
    var files = getAttachmentFiles(form, key);
    var errors = validateAttachmentFiles(files);
    if (errors.length) {
      updateAttachmentSummary(form, key, 'error', errors[0]);
      return { files: [], error: errors[0] };
    }
    refreshAttachmentSummary(form, key);
    return { files: files, error: '' };
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
                   buildAttachmentMarkup('tech', 'Attach plant documents if ready', 'Optional: add boiler data sheets, APC drawings, scrubber layouts, emission reports, stack data, or site photos. These files will be attached directly to Dharrah’s email.'),
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
    var contactSection = document.getElementById('contact');
    var contactWrap = document.querySelector('#contact .form-wrap');
    var contactGrid = contactSection ? contactSection.querySelector('.contact-grid') : null;
    var contactRail = contactGrid ? contactGrid.firstElementChild : null;
    if (contactRail && !document.getElementById('dh-tech-inline-contact')) {
      var contactCard = document.createElement('div');
      contactCard.id = 'dh-tech-inline-contact';
      contactCard.className = 'dh-tech-inline-card is-rail';
      contactCard.innerHTML = [
        '<span class="dh-tech-inline-eyebrow">Detailed Intake</span>',
        '<h3 class="dh-tech-inline-title">Need a boiler or scrubber review instead of a simple inquiry?</h3>',
        '<p class="dh-tech-inline-copy">Use the structured technical assessment when your team already has plant, boiler, APC, scrubber, or dust-control details ready. Dharrah can start with engineering context instead of a basic lead note.</p>',
        '<div class="dh-tech-inline-meta">',
        '  <span>Built for technical projects</span>',
        '  <span>Sent to your engineering inbox</span>',
        '</div>',
        '<div class="dh-tech-inline-actions">',
        '  <button type="button" class="dh-tech-trigger is-primary" data-dh-open-tech="contact">Open Technical Assessment</button>',
        '  <button type="button" class="dh-tech-trigger" data-dh-scroll-to-form="true">Use Regular Inquiry Form</button>',
        '</div>'
      ].join('');

      var whatsappButton = contactRail.querySelector('.wa-btn');
      if (whatsappButton && whatsappButton.parentNode) {
        whatsappButton.insertAdjacentElement('afterend', contactCard);
      } else {
        contactRail.appendChild(contactCard);
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
        '<div class="dh-form-proof-summary"><strong>Fast path for regulator-ready execution</strong><span>Use this form for approvals, monitoring, ESG, wastewater, and general compliance needs. For plant-heavy boiler or APC issues, use the technical assessment on the left.</span></div>',
        '<div class="dh-form-proof-head">',
        '  <div class="dh-form-proof-title">Why this inquiry works well</div>',
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

    function bindLeadInquiryScrollButtons() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-dh-scroll-to-form]'), function (button) {
        if (button.dataset.boundScrollToForm === 'true') return;
        button.dataset.boundScrollToForm = 'true';
        button.addEventListener('click', function () {
          var leadForm = document.querySelector('#contact .form-wrap');
          if (!leadForm) return;
          leadForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var firstField = leadForm.querySelector('input, select, textarea');
          if (firstField) {
            window.setTimeout(function () {
              firstField.focus();
            }, 300);
          }
        });
      });
    }

    if (form.dataset.bridgeSet === 'true') {
      bindAttachmentInput(form, 'tech');
      Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-tech]'), function (button) {
        if (button.dataset.boundTechOpen === 'true') return;
        button.dataset.boundTechOpen = 'true';
        button.addEventListener('click', function () {
          openTechnicalAssessment(button.getAttribute('data-dh-open-tech') || 'site');
        });
      });
      bindLeadInquiryScrollButtons();
      return;
    }

    form.dataset.bridgeSet = 'true';
    bindAttachmentInput(form, 'tech');
    setTechnicalAssessmentStep(form, 0);

    Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-tech]'), function (button) {
      if (button.dataset.boundTechOpen === 'true') return;
      button.dataset.boundTechOpen = 'true';
      button.addEventListener('click', function () {
        openTechnicalAssessment(button.getAttribute('data-dh-open-tech') || 'site');
      });
    });
    bindLeadInquiryScrollButtons();

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
      var attachmentState = getValidatedAttachments(form, 'tech');
      if (attachmentState.error) {
        updateTechnicalStatus(form, 'error', '<strong>Attachment review needed.</strong> Please fix the selected files before sending the assessment.');
        window.showDhPopup('Attachment Limit', attachmentState.error);
        return;
      }

      form.dataset.submitting = 'true';
      if (submitButton) {
        submitButton.innerText = 'SENDING...';
        submitButton.disabled = true;
      }
      updateTechnicalStatus(form, 'warning', '<strong>Sending your assessment...</strong> Dharrah is receiving the plant, boiler, MDC, and scrubber details now.');

      try {
        var response = await fetch(getContactEndpoint(), {
          method: 'POST',
          body: buildMultipartRequest(data, attachmentState.files)
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
        refreshAttachmentSummary(form, 'tech');
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

  function injectGpcbConsentOverlay() {
    if (document.getElementById('dh-consent-overlay')) return;

    injectRuntimeStyles();

    var overlay = document.createElement('div');
    overlay.id = 'dh-consent-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="dh-consent-shell" role="dialog" aria-modal="true" aria-labelledby="dh-consent-title">',
      '  <div class="dh-consent-head">',
      '    <div class="dh-consent-head-top">',
      '      <div>',
      '        <span class="dh-consent-kicker">Regulatory Intake</span>',
      '        <h2 id="dh-consent-title">GPCB consent route planning</h2>',
      '        <p>Use this when Dharrah first needs to confirm whether the case is fresh, amendment-based, renewal-driven, or linked to an existing approval.</p>',
      '      </div>',
      '      <button type="button" class="dh-consent-close" data-dh-consent-close="true" aria-label="Close consent intake">&times;</button>',
      '    </div>',
      '    <div class="dh-consent-progress">',
      '      <div class="dh-consent-progress-row">',
      '        <div class="dh-consent-progress-copy"><strong data-dh-consent-step-label="true">Step 1 of 6 - Consent Route</strong><span>Answer only what is already available. Dharrah can follow up for missing documents after the first review.</span></div>',
      '        <span data-dh-consent-step-count="true">1 / 6</span>',
      '      </div>',
      '      <div class="dh-consent-progress-bar"><div class="dh-consent-progress-fill" data-dh-consent-progress="true"></div></div>',
      '    </div>',
      '  </div>',
      '  <form id="dh-consent-form" novalidate>',
      '    <div class="dh-consent-body">',
      '      <div class="dh-consent-step active" data-dh-consent-step="0">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Which GPCB consent route does this case need?</h3>',
      '          <p class="dh-consent-step-copy">Start by identifying whether the matter is a fresh application or an update to an existing consent. This decides the rest of the checklist and tells Dharrah whether previous approvals must be reviewed first.</p>',
      '          <div class="dh-consent-option-grid" data-dh-consent-route-grid="true">',
      '            <label class="dh-consent-option"><input type="radio" name="gpcb_case_type" value="cte_fresh" data-dh-consent-field="caseType"><strong>CTE / NOC Fresh</strong><span>For a new unit, new line, or first-time consent to establish before installation or expansion work starts.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="gpcb_case_type" value="cte_amendment" data-dh-consent-field="caseType"><strong>CTE / NOC Amendment</strong><span>For a proposed change in product mix, raw material, capacity, process, or layout before operations begin.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="gpcb_case_type" value="cca_fresh" data-dh-consent-field="caseType"><strong>CCA Fresh</strong><span>For a unit moving into operating-consent stage after setup, trial, or installation work is complete.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="gpcb_case_type" value="cca_amendment" data-dh-consent-field="caseType"><strong>CCA Amendment</strong><span>For an existing operating unit where process, raw material, product, capacity, fuel, APC, ETP, or waste profile is changing.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="gpcb_case_type" value="cca_renewal" data-dh-consent-field="caseType"><strong>CCA Renewal / Continuity</strong><span>For an existing unit that mainly needs renewal continuity, updated validity, or revised supporting information before expiry.</span></label>',
      '          </div>',
      '          <div class="dh-consent-note">If the plant already has a consent and something has changed in product, raw material, process, fuel, wastewater, emissions, or pollution-control systems, choose an amendment route. Dharrah will specifically ask for the existing approval copy and the exact change summary.</div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-consent-step="1">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Applicant and plant profile</h3>',
      '          <p class="dh-consent-step-copy">These are the basics Dharrah needs before checking which GPCB window, documents, and supporting calculations are likely to apply.</p>',
      '          <div class="dh-consent-grid cols-2">',
      '            <div class="dh-consent-field"><label>Legal Entity / Firm Name</label><input type="text" data-dh-consent-field="legalEntity" placeholder="Registered company / partnership / proprietorship name"></div>',
      '            <div class="dh-consent-field"><label>Plant / Unit Name</label><input type="text" data-dh-consent-field="plantName" placeholder="Factory / industrial unit name"></div>',
      '            <div class="dh-consent-field"><label>Authorized Contact Name</label><input type="text" data-dh-consent-field="contactName" placeholder="Primary contact for consent follow-up"></div>',
      '            <div class="dh-consent-field"><label>Phone</label><input type="text" data-dh-consent-field="phone" placeholder="+91 XXXXX XXXXX"></div>',
      '            <div class="dh-consent-field"><label>Email</label><input type="email" data-dh-consent-field="email" placeholder="name@company.com"></div>',
      '            <div class="dh-consent-field"><label>Unit Stage</label><select data-dh-consent-field="unitStage"><option value="">Select stage</option><option value="greenfield">Greenfield / New Unit</option><option value="existing">Existing Operating Unit</option><option value="expansion">Expansion / Additional Line</option></select></div>',
      '            <div class="dh-consent-field"><label>District</label><input type="text" data-dh-consent-field="district" placeholder="District in Gujarat"></div>',
      '            <div class="dh-consent-field"><label>Industrial Area / GIDC / Village</label><input type="text" data-dh-consent-field="location" placeholder="GIDC / industrial estate / local area"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-consent-step="2">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Products, raw materials, and utilities</h3>',
      '          <p class="dh-consent-step-copy">This step helps Dharrah understand category, scale, and whether any change in process or utility load may trigger amendment logic.</p>',
      '          <div class="dh-consent-grid cols-2">',
      '            <div class="dh-consent-field"><label>Industry Sector</label><input type="text" data-dh-consent-field="industrySector" placeholder="Chemical, textile, pharma, food, engineering..."></div>',
      '            <div class="dh-consent-field"><label>Installed Capacity / Output</label><input type="text" data-dh-consent-field="installedCapacity" placeholder="Product and monthly/annual capacity"></div>',
      '            <div class="dh-consent-field"><label>Products</label><textarea data-dh-consent-field="productSummary" placeholder="List main products and quantities"></textarea></div>',
      '            <div class="dh-consent-field"><label>Raw Materials</label><textarea data-dh-consent-field="rawMaterialSummary" placeholder="List key raw materials and approximate quantities"></textarea></div>',
      '            <div class="dh-consent-field"><label>Fuel / Boiler / DG Summary</label><textarea data-dh-consent-field="fuelAndBoilers" placeholder="Fuel type, boiler/DG details, consumption pattern"></textarea></div>',
      '            <div class="dh-consent-field"><label>Project Cost / Investment</label><input type="text" data-dh-consent-field="projectCost" placeholder="Approximate project cost"></div>',
      '            <div class="dh-consent-field"><label>Land Area / Built-up Context</label><input type="text" data-dh-consent-field="landArea" placeholder="Plot area / built-up area if known"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-consent-step="3">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Water, air, and waste profile</h3>',
      '          <p class="dh-consent-step-copy">These are the core technical signals for consent drafting. Even partial values are useful if you know the direction of the change or the treatment/disposal path.</p>',
      '          <div class="dh-consent-grid cols-2">',
      '            <div class="dh-consent-field"><label>Water Source</label><input type="text" data-dh-consent-field="waterSource" placeholder="Borewell, GIDC, tanker, municipal, surface water..."></div>',
      '            <div class="dh-consent-field"><label>Water Consumption</label><input type="text" data-dh-consent-field="waterConsumption" placeholder="Approximate total and major breakup"></div>',
      '            <div class="dh-consent-field"><label>Wastewater Generation</label><textarea data-dh-consent-field="wastewaterGeneration" placeholder="Process/domestic/cooling wastewater and discharge pattern"></textarea></div>',
      '            <div class="dh-consent-field"><label>ETP / STP / CETP Status</label><textarea data-dh-consent-field="etpStpDetails" placeholder="ETP/STP details, reuse/disposal, CETP membership if any"></textarea></div>',
      '            <div class="dh-consent-field"><label>Emission Sources</label><textarea data-dh-consent-field="emissionSources" placeholder="Stacks, process vents, DG sets, boiler emissions, fugitive sources"></textarea></div>',
      '            <div class="dh-consent-field"><label>APCD Details</label><textarea data-dh-consent-field="apcdDetails" placeholder="Scrubber, bag filter, cyclone, ESP, ducting, stack details"></textarea></div>',
      '            <div class="dh-consent-field"><label>Hazardous / Solid Waste</label><textarea data-dh-consent-field="hazardousWaste" placeholder="Major waste streams, quantity, storage, TSDF/recycler path"></textarea></div>',
      '            <div class="dh-consent-field"><label>Other Linked Compliance Status</label><input type="text" data-dh-consent-field="linkedCompliance" placeholder="BMW / EPR / recycler tie-up / TSDF / other authorizations"></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-consent-step="4">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Existing approval and change summary</h3>',
      '          <p class="dh-consent-step-copy">Fill this carefully for amendment or renewal cases. This is where Dharrah understands whether the new application should compare against an existing consent, old product mix, or earlier pollution load.</p>',
      '          <div class="dh-consent-grid cols-2">',
      '            <div class="dh-consent-field"><label>Existing Consent / CCA Number</label><input type="text" data-dh-consent-field="existingConsentNumber" placeholder="Consent number if already available"></div>',
      '            <div class="dh-consent-field"><label>Existing Consent Validity</label><input type="text" data-dh-consent-field="existingConsentValidity" placeholder="Validity / expiry if known"></div>',
      '          </div>',
      '          <div class="dh-consent-checklist" style="margin-top:20px;">',
      '            <label class="dh-consent-check"><input type="checkbox" value="Product mix change" data-dh-consent-multi="changeAreas"><span><strong>Product mix change</strong><span>New product, deleted product, or quantity revision.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Raw material change" data-dh-consent-multi="changeAreas"><span><strong>Raw material change</strong><span>Example: coco replaced with mango, new solvent, additive, or feedstock.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Capacity change" data-dh-consent-multi="changeAreas"><span><strong>Capacity / load change</strong><span>Expansion in installed capacity, operating hours, or utility load.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Process change" data-dh-consent-multi="changeAreas"><span><strong>Process or manufacturing change</strong><span>Any modified process flow, additional stage, or changed reaction path.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Fuel or boiler change" data-dh-consent-multi="changeAreas"><span><strong>Fuel / boiler / DG change</strong><span>New fuel, changed boiler size, new DG, or utility configuration.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Wastewater or ETP change" data-dh-consent-multi="changeAreas"><span><strong>Water / ETP / disposal change</strong><span>Changed wastewater load, treatment setup, CETP link, or reuse path.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Emissions or APCD change" data-dh-consent-multi="changeAreas"><span><strong>Emission / APCD change</strong><span>Changed stacks, scrubber, bag filter, cyclone, or emission point.</span></span></label>',
      '          </div>',
      '          <div class="dh-consent-field" style="margin-top:20px;"><label>Change Summary / What Exactly Changed?</label><textarea data-dh-consent-field="changeSummary" placeholder="Explain the actual change request in plain language so Dharrah can decide whether amendment logic, comparison tables, and previous consent review are needed."></textarea></div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-consent-step="5">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Documents available and support needed</h3>',
      '          <p class="dh-consent-step-copy">Tell Dharrah what is already available, what is still pending, and attach the key files if your team has them ready.</p>',
      '          <div class="dh-consent-checklist">',
      '            <label class="dh-consent-check"><input type="checkbox" value="Site / factory layout" data-dh-consent-multi="docsReady"><span><strong>Site / factory layout</strong><span>Land layout, building layout, stack positions, utility zones.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Manufacturing process flow" data-dh-consent-multi="docsReady"><span><strong>Manufacturing process flow</strong><span>Process note, PFD, product and raw-material details.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Water balance / ETP details" data-dh-consent-multi="docsReady"><span><strong>Water balance / ETP details</strong><span>Water breakup, wastewater generation, ETP/STP/CETP details.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="APCD / stack details" data-dh-consent-multi="docsReady"><span><strong>APCD / stack details</strong><span>Air pollution control scheme, stack details, DG/boiler details.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Waste / recycler / TSDF details" data-dh-consent-multi="docsReady"><span><strong>Waste / recycler / TSDF details</strong><span>Hazardous waste categories, quantity, tie-ups, or disposal path.</span></span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Previous consent copy" data-dh-consent-multi="docsReady"><span><strong>Previous consent copy</strong><span>Very important for amendment or renewal cases.</span></span></label>',
      '          </div>',
      '          <div class="dh-consent-help-grid">',
      '            <div class="dh-consent-field"><label>Documents still pending</label><textarea data-dh-consent-field="docsPending" placeholder="List anything missing or still being prepared. Example: revised water balance, APCD drawing, old CCA scan, waste tie-up copy."></textarea></div>',
      '            <div class="dh-consent-field"><label>What help do you need from Dharrah?</label><textarea data-dh-consent-field="helpNeeded" placeholder="Example: full consent filing, amendment comparison, checklist review, water-air-waste details, or complete documentation support."></textarea></div>',
      '          </div>',
      '          <div class="dh-consent-grid cols-2" style="margin-top:16px;">',
      '            <div class="dh-consent-field"><label>Urgency</label><select data-dh-consent-field="urgency"><option value="">Select urgency</option><option value="immediate">Immediate / running issue</option><option value="this_month">Needed this month</option><option value="next_quarter">Next quarter planning</option><option value="not_sure">Not sure yet</option></select></div>',
      '            <div class="dh-consent-field"><label>Preferred Dharrah response</label><select data-dh-consent-field="responsePreference"><option value="">Select preference</option><option value="call">Call first</option><option value="whatsapp">WhatsApp first</option><option value="email">Email checklist first</option><option value="proposal">Proposal after quick review</option></select></div>',
      '          </div>',
      '          <div class="dh-consent-summary-grid">',
      '            <div class="dh-consent-summary-card"><h4>What Dharrah receives</h4><ul><li>The exact consent route selected</li><li>Plant and applicant context</li><li>Product, utility, and pollution profile</li><li>Existing approval and amendment logic if applicable</li><li>Document readiness and missing support areas</li></ul></div>',
      '            <div class="dh-consent-summary-card"><h4>What happens after submit</h4><ul><li>Dharrah checks whether the matter is fresh, amendment, or continuity-driven</li><li>Your team gets the right checklist instead of a generic contact response</li><li>Follow-up can move directly into document collection and filing support</li></ul></div>',
      '          </div>',
                   buildAttachmentMarkup('gpcb', 'Attach consent and process documents', 'Optional: add existing consent copies, process flow charts, water balance, APCD drawings, waste tie-up proof, or layout files. These will be sent as direct email attachments.'),
      '          <div class="dh-honeypot" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">',
      '            <label for="dh-consent-website-field">Website</label>',
      '            <input id="dh-consent-website-field" data-dh-honeypot="true" type="text" name="website" autocomplete="off" tabindex="-1">',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="dh-consent-foot">',
      '      <div class="dh-consent-status" data-dh-consent-status="true"><strong>Use this intake when the issue is a real GPCB consent workflow.</strong> Dharrah will turn the answers into the right document checklist and next-step filing path.</div>',
      '      <div class="dh-consent-actions">',
      '        <div class="dh-consent-actions-left"><button type="button" class="dh-consent-btn" data-dh-consent-prev="true">Back</button></div>',
      '        <div class="dh-consent-actions-right"><button type="button" class="dh-consent-btn" data-dh-consent-close="true">Close</button><button type="button" class="dh-consent-btn primary" data-dh-consent-next="true">Next Step</button><button type="submit" class="dh-consent-btn primary" data-dh-consent-submit="true">Send Consent Intake</button></div>',
      '      </div>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
  }

  function ensureRegulatoryIntakeRoutes() {
    var sc1 = document.getElementById('sc1');
    if (!sc1) return;

    var grid = sc1.querySelector('.cards-grid');
    if (!grid) return;

    Array.prototype.forEach.call(grid.querySelectorAll('.s-card'), function (card) {
      var title = normalizeText(card.querySelector('.s-name') ? card.querySelector('.s-name').textContent : '');
      if (!title) return;

      if (title.indexOf('noc / cca permission') !== -1 && !card.querySelector('[data-dh-service-card-action="gpcb"]')) {
        var action = document.createElement('div');
        action.className = 'dh-service-card-action';
        action.setAttribute('data-dh-service-card-action', 'gpcb');
        action.innerHTML = '<button type="button" class="dh-tech-trigger is-primary" data-dh-open-consent="service-card">Start Consent Intake</button>';
        card.appendChild(action);
      }

      if (title.indexOf('environment clearance including eia report preparation') !== -1 && !card.querySelector('[data-dh-service-card-action="ec"]')) {
        var ecAction = document.createElement('div');
        ecAction.className = 'dh-service-card-action';
        ecAction.setAttribute('data-dh-service-card-action', 'ec');
        ecAction.innerHTML = '<button type="button" class="dh-tech-trigger" data-dh-open-ec="service-card">Start EC / EIA Screening</button>';
        card.appendChild(ecAction);
      }

      if (title.indexOf('epr for plastic / e-waste / tyre / oil / battery waste') !== -1 && !card.querySelector('[data-dh-service-card-action="epr"]')) {
        var eprAction = document.createElement('div');
        eprAction.className = 'dh-service-card-action';
        eprAction.setAttribute('data-dh-service-card-action', 'epr');
        eprAction.innerHTML = '<button type="button" class="dh-tech-trigger" data-dh-open-epr="service-card">Start EPR Intake</button>';
        card.appendChild(eprAction);
      }
    });

    if (!document.getElementById('dh-reg-route-strip')) {
      var strip = document.createElement('div');
      strip.id = 'dh-reg-route-strip';
      strip.className = 'dh-route-strip';
      strip.innerHTML = [
        '<div class="dh-route-strip-head">',
        '  <div>',
        '    <span class="dh-tech-inline-eyebrow">Regulatory Intake Routes</span>',
        '    <h3>Separate the service forms before the first Dharrah review</h3>',
        '    <p>The regulatory services on this page do not need one shared inquiry form. Each route asks different first questions, different change logic, and different document-readiness details.</p>',
        '  </div>',
        '  <span class="dh-route-note">Knowledge Center is live below these routes</span>',
        '</div>',
        '<div class="dh-route-grid">',
        '  <div class="dh-route-card is-ready">',
        '    <div class="dh-route-card-top"><div><span class="dh-route-kicker">Ready now</span><h4>GPCB Consent Intake</h4></div></div>',
        '    <p>For fresh NOC / CTE, CCA, amendment, and continuity cases where Dharrah needs to know whether the plant is new, existing, or changing product/process/load.</p>',
        '    <ul class="dh-route-list"><li>Fresh vs amendment route</li><li>Existing consent copy logic</li><li>Product, fuel, water, APC, and waste changes</li><li>Document-readiness checklist before filing support</li></ul>',
        '    <div class="dh-route-actions"><button type="button" class="dh-tech-trigger is-primary" data-dh-open-consent="route-strip">Open Consent Intake</button></div>',
        '  </div>',
        '  <div class="dh-route-card is-ready">',
        '    <div class="dh-route-card-top"><div><span class="dh-route-kicker">Ready now</span><h4>EC / EIA Screening Intake</h4></div></div>',
        '    <p>For projects that first need category screening and route identification before anyone starts collecting the full EIA pack.</p>',
        '    <ul class="dh-route-list"><li>Category A / B / B1 / B2 screening</li><li>ToR, EIA, and public hearing path</li><li>Project location and sensitivity inputs</li><li>PARIVESH-side document readiness</li></ul>',
        '    <div class="dh-route-actions"><button type="button" class="dh-tech-trigger is-primary" data-dh-open-ec="route-strip">Open EC / EIA Intake</button></div>',
        '  </div>',
        '  <div class="dh-route-card is-ready">',
        '    <div class="dh-route-card-top"><div><span class="dh-route-kicker">Ready now</span><h4>EPR Role & Category Intake</h4></div></div>',
        '    <p>For Plastic Waste and E-Waste cases where the first branch depends on the applicant role before the actual documents are even requested.</p>',
        '    <ul class="dh-route-list"><li>Producer / manufacturer / importer / brand-owner branch</li><li>Plastic vs E-Waste route split</li><li>Portal, quantity, and category readiness</li><li>Role-based checklist instead of one common upload ask</li></ul>',
        '    <div class="dh-route-actions"><button type="button" class="dh-tech-trigger is-primary" data-dh-open-epr="route-strip">Open EPR Intake</button></div>',
        '  </div>',
        '</div>'
      ].join('');

      grid.insertAdjacentElement('afterend', strip);
    }
  }

  function ensureKnowledgeCenter() {
    var strip = document.getElementById('dh-reg-route-strip');
    if (!strip || document.getElementById('dh-knowledge-center')) return;

    var section = document.createElement('div');
    section.id = 'dh-knowledge-center';
    section.className = 'dh-knowledge-center';
    section.innerHTML = [
      '<div class="dh-knowledge-grid">',
      '  <div class="dh-knowledge-panel">',
      '    <span class="dh-tech-inline-eyebrow">Dharrah Knowledge Center</span>',
      '    <h3>Know which approval path you are opening before Dharrah starts the filing work</h3>',
      '    <p>Use this section when the team is still figuring out which approval route applies, what usually changes in an amendment case, and which baseline documents save time in the first review call.</p>',
      '    <ul class="dh-knowledge-list">',
      '      <li><strong>GPCB Consent cases</strong><span>Fresh CTE / NOC, fresh CCA, amendment, renewal, product-mix change, fuel change, and APC / ETP update cases.</span></li>',
      '      <li><strong>EC / EIA screening</strong><span>Category A vs B, B1 vs B2, ToR route, public hearing likelihood, and whether the project already has a PARIVESH trail.</span></li>',
      '      <li><strong>EPR readiness</strong><span>Waste stream split, producer / importer / brand-owner roles, portal status, annual quantity, and what documents usually block registration.</span></li>',
      '    </ul>',
      '  </div>',
      '  <div class="dh-knowledge-route-grid">',
      '    <div class="dh-knowledge-route-card">',
      '      <span class="dh-route-kicker">Open guided route</span>',
      '      <h4>GPCB Consent Intake</h4>',
      '      <p>Best when the unit already knows it needs fresh consent, amendment, or renewal support and Dharrah should start with the exact change logic.</p>',
      '      <div class="dh-route-actions"><button type="button" class="dh-tech-trigger" data-dh-open-consent="knowledge-center">Open Consent Intake</button></div>',
      '    </div>',
      '    <div class="dh-knowledge-route-card">',
      '      <span class="dh-route-kicker">Open guided route</span>',
      '      <h4>EC / EIA Screening Intake</h4>',
      '      <p>Best when the project team is unsure whether the route is Category A, B1, B2, ToR-heavy, or public-hearing-driven.</p>',
      '      <div class="dh-route-actions"><button type="button" class="dh-tech-trigger" data-dh-open-ec="knowledge-center">Open EC / EIA Intake</button></div>',
      '    </div>',
      '    <div class="dh-knowledge-route-card">',
      '      <span class="dh-route-kicker">Open guided route</span>',
      '      <h4>EPR Role & Category Intake</h4>',
      '      <p>Best when the team needs Dharrah to sort the applicant role, waste stream, registration scope, and first compliance checklist before portal work starts.</p>',
      '      <div class="dh-route-actions"><button type="button" class="dh-tech-trigger" data-dh-open-epr="knowledge-center">Open EPR Intake</button></div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    strip.insertAdjacentElement('afterend', section);
  }

  function getConsentField(form, key) {
    return form ? form.querySelector('[data-dh-consent-field="' + key + '"]') : null;
  }

  function getConsentMultiValues(form, key) {
    return Array.prototype.map.call(form.querySelectorAll('[data-dh-consent-multi="' + key + '"]:checked'), function (input) {
      return (input.value || '').trim();
    }).filter(Boolean);
  }

  function getSelectedConsentType(form) {
    var selected = form ? form.querySelector('[data-dh-consent-field="caseType"]:checked') : null;
    return selected ? selected.value : '';
  }

  function readGpcbConsentData(form) {
    return {
      requestType: 'gpcb_consent',
      caseType: getSelectedConsentType(form),
      legalEntity: (getConsentField(form, 'legalEntity') ? getConsentField(form, 'legalEntity').value : '').trim(),
      plantName: (getConsentField(form, 'plantName') ? getConsentField(form, 'plantName').value : '').trim(),
      contactName: (getConsentField(form, 'contactName') ? getConsentField(form, 'contactName').value : '').trim(),
      phone: (getConsentField(form, 'phone') ? getConsentField(form, 'phone').value : '').trim(),
      email: (getConsentField(form, 'email') ? getConsentField(form, 'email').value : '').trim(),
      unitStage: (getConsentField(form, 'unitStage') ? getConsentField(form, 'unitStage').value : '').trim(),
      district: (getConsentField(form, 'district') ? getConsentField(form, 'district').value : '').trim(),
      location: (getConsentField(form, 'location') ? getConsentField(form, 'location').value : '').trim(),
      industrySector: (getConsentField(form, 'industrySector') ? getConsentField(form, 'industrySector').value : '').trim(),
      installedCapacity: (getConsentField(form, 'installedCapacity') ? getConsentField(form, 'installedCapacity').value : '').trim(),
      productSummary: (getConsentField(form, 'productSummary') ? getConsentField(form, 'productSummary').value : '').trim(),
      rawMaterialSummary: (getConsentField(form, 'rawMaterialSummary') ? getConsentField(form, 'rawMaterialSummary').value : '').trim(),
      fuelAndBoilers: (getConsentField(form, 'fuelAndBoilers') ? getConsentField(form, 'fuelAndBoilers').value : '').trim(),
      projectCost: (getConsentField(form, 'projectCost') ? getConsentField(form, 'projectCost').value : '').trim(),
      landArea: (getConsentField(form, 'landArea') ? getConsentField(form, 'landArea').value : '').trim(),
      waterSource: (getConsentField(form, 'waterSource') ? getConsentField(form, 'waterSource').value : '').trim(),
      waterConsumption: (getConsentField(form, 'waterConsumption') ? getConsentField(form, 'waterConsumption').value : '').trim(),
      wastewaterGeneration: (getConsentField(form, 'wastewaterGeneration') ? getConsentField(form, 'wastewaterGeneration').value : '').trim(),
      etpStpDetails: (getConsentField(form, 'etpStpDetails') ? getConsentField(form, 'etpStpDetails').value : '').trim(),
      emissionSources: (getConsentField(form, 'emissionSources') ? getConsentField(form, 'emissionSources').value : '').trim(),
      apcdDetails: (getConsentField(form, 'apcdDetails') ? getConsentField(form, 'apcdDetails').value : '').trim(),
      hazardousWaste: (getConsentField(form, 'hazardousWaste') ? getConsentField(form, 'hazardousWaste').value : '').trim(),
      linkedCompliance: (getConsentField(form, 'linkedCompliance') ? getConsentField(form, 'linkedCompliance').value : '').trim(),
      existingConsentNumber: (getConsentField(form, 'existingConsentNumber') ? getConsentField(form, 'existingConsentNumber').value : '').trim(),
      existingConsentValidity: (getConsentField(form, 'existingConsentValidity') ? getConsentField(form, 'existingConsentValidity').value : '').trim(),
      changeAreas: getConsentMultiValues(form, 'changeAreas'),
      changeSummary: (getConsentField(form, 'changeSummary') ? getConsentField(form, 'changeSummary').value : '').trim(),
      docsReady: getConsentMultiValues(form, 'docsReady'),
      docsPending: (getConsentField(form, 'docsPending') ? getConsentField(form, 'docsPending').value : '').trim(),
      helpNeeded: (getConsentField(form, 'helpNeeded') ? getConsentField(form, 'helpNeeded').value : '').trim(),
      urgency: (getConsentField(form, 'urgency') ? getConsentField(form, 'urgency').value : '').trim(),
      responsePreference: (getConsentField(form, 'responsePreference') ? getConsentField(form, 'responsePreference').value : '').trim()
    };
  }

  function clearConsentFieldErrors(form) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.dh-consent-field.has-error, .dh-consent-option-grid.has-error'), function (node) {
      node.classList.remove('has-error');
    });
  }

  function markConsentFieldError(form, key, hasError) {
    if (key === 'caseType') {
      var grid = form.querySelector('[data-dh-consent-route-grid="true"]');
      if (grid) grid.classList.toggle('has-error', !!hasError);
      return;
    }
    var field = getConsentField(form, key);
    if (!field || !field.parentElement) return;
    field.parentElement.classList.toggle('has-error', !!hasError);
  }

  function updateConsentOptionStates(form) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.dh-consent-option'), function (option) {
      var input = option.querySelector('input[type="radio"]');
      option.classList.toggle('is-selected', !!(input && input.checked));
    });
  }

  function updateConsentStatus(form, tone, message) {
    var status = form ? form.querySelector('[data-dh-consent-status="true"]') : null;
    if (!status) return;
    status.classList.remove('is-error', 'is-warning', 'is-success');
    if (tone) {
      status.classList.add('is-' + tone);
    }
    status.innerHTML = message;
  }

  function setConsentStep(form, stepIndex) {
    if (!form) return;

    var boundedIndex = Math.max(0, Math.min(GPCB_STEP_TITLES.length - 1, stepIndex));
    form.dataset.currentStep = String(boundedIndex);

    Array.prototype.forEach.call(form.querySelectorAll('[data-dh-consent-step]'), function (step) {
      step.classList.toggle('active', parseInt(step.getAttribute('data-dh-consent-step'), 10) === boundedIndex);
    });

    var label = form.parentElement ? form.parentElement.querySelector('[data-dh-consent-step-label="true"]') : null;
    var count = form.parentElement ? form.parentElement.querySelector('[data-dh-consent-step-count="true"]') : null;
    var progress = form.parentElement ? form.parentElement.querySelector('[data-dh-consent-progress="true"]') : null;
    var prev = form.querySelector('[data-dh-consent-prev="true"]');
    var next = form.querySelector('[data-dh-consent-next="true"]');
    var submit = form.querySelector('[data-dh-consent-submit="true"]');
    var body = form.querySelector('.dh-consent-body');

    if (label) label.innerHTML = 'Step ' + (boundedIndex + 1) + ' of ' + GPCB_STEP_TITLES.length + ' - ' + GPCB_STEP_TITLES[boundedIndex];
    if (count) count.innerText = (boundedIndex + 1) + ' / ' + GPCB_STEP_TITLES.length;
    if (progress) progress.style.width = (((boundedIndex + 1) / GPCB_STEP_TITLES.length) * 100) + '%';
    if (prev) prev.style.display = boundedIndex === 0 ? 'none' : '';
    if (next) next.style.display = boundedIndex === GPCB_STEP_TITLES.length - 1 ? 'none' : '';
    if (submit) submit.style.display = boundedIndex === GPCB_STEP_TITLES.length - 1 ? '' : 'none';
    if (body) body.scrollTop = 0;
  }

  function validateConsentStep(form, stepIndex, data) {
    var errors = [];
    clearConsentFieldErrors(form);

    if (stepIndex === 0) {
      if (!data.caseType) {
        errors.push('Select the consent route first.');
        markConsentFieldError(form, 'caseType', true);
      }
    }

    if (stepIndex === 1) {
      [['legalEntity', 'Legal entity'], ['plantName', 'Plant name'], ['contactName', 'Contact name'], ['phone', 'Phone'], ['district', 'District']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markConsentFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 2) {
      [['industrySector', 'Industry sector'], ['installedCapacity', 'Installed capacity'], ['productSummary', 'Products']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markConsentFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 3) {
      [['waterSource', 'Water source'], ['wastewaterGeneration', 'Wastewater generation'], ['emissionSources', 'Emission sources']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markConsentFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 4) {
      if (data.caseType === 'cte_amendment' || data.caseType === 'cca_amendment' || data.caseType === 'cca_renewal') {
        if (!data.existingConsentNumber) {
          errors.push('Existing consent number is required for amendment or renewal cases.');
          markConsentFieldError(form, 'existingConsentNumber', true);
        }
        if (!data.changeSummary && data.caseType !== 'cca_renewal') {
          errors.push('Explain what changed in the process, product, raw material, capacity, or pollution setup.');
          markConsentFieldError(form, 'changeSummary', true);
        }
      }
    }

    if (stepIndex === 5) {
      if (!data.helpNeeded) {
        errors.push('Describe what support you need from Dharrah.');
        markConsentFieldError(form, 'helpNeeded', true);
      }
    }

    return errors;
  }

  function openConsentIntake(source) {
    injectGpcbConsentOverlay();

    var overlay = document.getElementById('dh-consent-overlay');
    var form = document.getElementById('dh-consent-form');
    if (!overlay || !form) return;

    form.dataset.dhSource = source || 'services';
    form.dataset.dhMountedAt = String(getTimestamp());
    clearConsentFieldErrors(form);
    updateConsentOptionStates(form);
    updateConsentStatus(form, '', '<strong>Use this intake when the issue is a real GPCB consent workflow.</strong> Dharrah will turn the answers into the right document checklist and next-step filing path.');
    setConsentStep(form, 0);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trackEvent('gpcb_intake_open', {
      form_name: 'gpcb_consent',
      source: source || 'services'
    });
  }

  function closeConsentIntake() {
    var overlay = document.getElementById('dh-consent-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function injectEcEiaOverlay() {
    if (document.getElementById('dh-ec-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'dh-ec-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="dh-consent-shell" role="dialog" aria-modal="true" aria-labelledby="dh-ec-title">',
      '  <form id="dh-ec-form" novalidate>',
      '    <div class="dh-consent-head">',
      '      <div class="dh-consent-head-top">',
      '        <div>',
      '          <span class="dh-consent-kicker">EC / EIA Screening</span>',
      '          <h2 id="dh-ec-title">EC route screening</h2>',
      '          <p>Use this when the team needs Dharrah to screen the likely category, PARIVESH path, and whether studies or hearing steps are likely.</p>',
      '        </div>',
      '        <button type="button" class="dh-consent-close" data-dh-ec-close="true" aria-label="Close EC / EIA intake">&times;</button>',
      '      </div>',
      '      <div class="dh-consent-progress-meta"><strong data-dh-ec-step-label="true">Step 1 of 6 - Project Route</strong><span data-dh-ec-step-count="true">1 / 6</span></div>',
      '      <p>Share what the project team already knows. Dharrah can determine the likely EC path before the full EIA pack is assembled.</p>',
      '      <div class="dh-consent-progress-track"><span data-dh-ec-progress="true"></span></div>',
      '    </div>',
      '    <div class="dh-consent-body">',
      '      <div class="dh-consent-step active" data-dh-ec-step="0">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Which EC / EIA situation best matches this project?</h3>',
      '          <div class="dh-consent-option-grid" data-dh-ec-route-grid="true">',
      '            <label class="dh-consent-option"><input type="radio" name="ec_case_type" value="ec_fresh" data-dh-ec-field="caseType"><strong>Fresh Project Screening</strong><span>New project where Dharrah should screen the likely EC / ToR route from scratch.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="ec_case_type" value="ec_expansion" data-dh-ec-field="caseType"><strong>Expansion / Modernization</strong><span>Existing unit with capacity, product, or facility expansion and possible old approval history.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="ec_case_type" value="ec_existing_update" data-dh-ec-field="caseType"><strong>Existing EC Update Support</strong><span>Transfer, amendment, validity, compliance, or public-hearing-linked clarification around an existing trail.</span></label>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-ec-step="1">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Who is the project proponent and what is being proposed?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Project Proponent</span><input type="text" data-dh-ec-field="proponentName" placeholder="Legal entity / applicant"></label>',
      '            <label class="dh-consent-field"><span>Project Name</span><input type="text" data-dh-ec-field="projectName" placeholder="Plant / expansion / development name"></label>',
      '            <label class="dh-consent-field"><span>Contact Name</span><input type="text" data-dh-ec-field="contactName" placeholder="Primary project contact"></label>',
      '            <label class="dh-consent-field"><span>Phone</span><input type="text" data-dh-ec-field="phone" placeholder="+91 XXXXX XXXXX"></label>',
      '            <label class="dh-consent-field"><span>Email</span><input type="email" data-dh-ec-field="email" placeholder="name@company.com"></label>',
      '            <label class="dh-consent-field"><span>Project Sector</span><input type="text" data-dh-ec-field="sector" placeholder="Chemical / Infra / Mineral / Industrial estate"></label>',
      '          </div>',
      '          <label class="dh-consent-field"><span>Schedule Item / Activity</span><input type="text" data-dh-ec-field="scheduleItem" placeholder="If known, mention the EIA schedule item or activity"></label>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-ec-step="2">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">How should Dharrah screen the project category and location?</h3>',
      '          <div class="dh-consent-grid cols-3">',
      '            <label class="dh-consent-field"><span>Expected Category</span><select data-dh-ec-field="categoryExpectation"><option value="">Select</option><option value="category_a">Category A</option><option value="category_b1">Category B1</option><option value="category_b2">Category B2</option><option value="screening_needed">Need Dharrah to screen</option></select></label>',
      '            <label class="dh-consent-field"><span>State</span><input type="text" data-dh-ec-field="state" placeholder="State"></label>',
      '            <label class="dh-consent-field"><span>District</span><input type="text" data-dh-ec-field="district" placeholder="District"></label>',
      '          </div>',
      '          <label class="dh-consent-field"><span>Village / Taluka / Coordinates</span><input type="text" data-dh-ec-field="siteLocation" placeholder="Village, taluka, survey no., coordinates if available"></label>',
      '          <label class="dh-consent-field"><span>Location Sensitivity</span><textarea rows="4" data-dh-ec-field="locationSensitivity" placeholder="Protected area, ESA, critically polluted area, inter-state boundary, CRZ, forest, wildlife, industrial estate, or say unknown"></textarea></label>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-ec-step="3">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">What is the project configuration and likely pollution load?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Capacity / Configuration</span><textarea rows="4" data-dh-ec-field="capacitySummary" placeholder="Installed capacity, product mix, built-up area, or expansion detail"></textarea></label>',
      '            <label class="dh-consent-field"><span>Land Area / Site Spread</span><textarea rows="4" data-dh-ec-field="landArea" placeholder="Plot area, built-up area, greenbelt if known"></textarea></label>',
      '            <label class="dh-consent-field"><span>Water & Utilities</span><textarea rows="4" data-dh-ec-field="waterDemand" placeholder="Water source, demand, fuel, power, utilities"></textarea></label>',
      '            <label class="dh-consent-field"><span>Pollution Load Summary</span><textarea rows="4" data-dh-ec-field="pollutionSummary" placeholder="Air, wastewater, APCD / ETP / STP, solid/hazardous waste, risk if any"></textarea></label>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-ec-step="4">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Does the project already have studies, approvals, or a PARIVESH trail?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Existing EC / ToR Number</span><input type="text" data-dh-ec-field="existingEcNumber" placeholder="If any existing EC / ToR / proposal number exists"></label>',
      '            <label class="dh-consent-field"><span>PARIVESH / Proposal Status</span><input type="text" data-dh-ec-field="pariveshStatus" placeholder="Fresh, proposal started, query received, hearing pending, etc."></label>',
      '            <label class="dh-consent-field"><span>Consultant / Accreditation Status</span><input type="text" data-dh-ec-field="consultantStatus" placeholder="Consultant appointed, not appointed, or under review"></label>',
      '            <label class="dh-consent-field"><span>Public Hearing / Baseline Status</span><input type="text" data-dh-ec-field="publicHearingStatus" placeholder="Public hearing likely, completed, not required, baseline season pending"></label>',
      '          </div>',
      '          <label class="dh-consent-field"><span>Existing Study Notes</span><textarea rows="4" data-dh-ec-field="studyStatus" placeholder="Mention baseline, risk study, hydrogeology, compliance report, litigation, or previous rejection / query if any"></textarea></label>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-ec-step="5">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">What documents are ready and what should Dharrah handle first?</h3>',
      '          <div class="dh-consent-checklist">',
      '            <label class="dh-consent-check"><input type="checkbox" value="Project brief / concept note" data-dh-ec-multi="docsReady"><span>Project brief / concept note</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Layout / site plan / KML" data-dh-ec-multi="docsReady"><span>Layout / site plan / KML</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Process flow and utility details" data-dh-ec-multi="docsReady"><span>Process flow and utility details</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Previous EC / ToR / compliance documents" data-dh-ec-multi="docsReady"><span>Previous EC / ToR / compliance documents</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Baseline / consultant / study notes" data-dh-ec-multi="docsReady"><span>Baseline / consultant / study notes</span></label>',
      '          </div>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Documents Pending</span><textarea rows="4" data-dh-ec-field="docsPending" placeholder="What is still missing or not finalized?"></textarea></label>',
      '            <label class="dh-consent-field"><span>Support Needed from Dharrah</span><textarea rows="4" data-dh-ec-field="helpNeeded" placeholder="Screen route, shortlist documents, PARIVESH planning, consultant coordination, public hearing support, etc."></textarea></label>',
      '            <label class="dh-consent-field"><span>Urgency</span><input type="text" data-dh-ec-field="urgency" placeholder="Tender timeline, investor timeline, internal target date"></label>',
      '            <label class="dh-consent-field"><span>Preferred Response</span><input type="text" data-dh-ec-field="responsePreference" placeholder="Call, email summary, document checklist, meeting"></label>',
      '            <label class="dh-consent-field" style="display:none"><span>Website</span><input type="text" data-dh-honeypot="true" name="website_ec" autocomplete="off" tabindex="-1"></label>',
      '          </div>',
                   buildAttachmentMarkup('ec', 'Attach EC / EIA project documents', 'Optional: add concept notes, site plans, KML exports, old EC or ToR copies, consultant notes, or study summaries. Dharrah will receive them directly in the intake email.'),
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="dh-consent-foot">',
      '      <div class="dh-consent-status" data-dh-ec-status="true"><strong>Use this intake when the route itself needs screening.</strong> Dharrah will map the likely EC path before you sink time into the wrong studies.</div>',
      '      <div class="dh-consent-actions">',
      '        <div class="dh-consent-actions-left"><button type="button" class="dh-consent-btn" data-dh-ec-prev="true">Back</button></div>',
      '        <div class="dh-consent-actions-right"><button type="button" class="dh-consent-btn" data-dh-ec-close="true">Close</button><button type="button" class="dh-consent-btn primary" data-dh-ec-next="true">Next Step</button><button type="submit" class="dh-consent-btn primary" data-dh-ec-submit="true">Send EC / EIA Intake</button></div>',
      '      </div>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
  }

  function injectEprOverlay() {
    if (document.getElementById('dh-epr-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'dh-epr-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="dh-consent-shell" role="dialog" aria-modal="true" aria-labelledby="dh-epr-title">',
      '  <form id="dh-epr-form" novalidate>',
      '    <div class="dh-consent-head">',
      '      <div class="dh-consent-head-top">',
      '        <div>',
      '          <span class="dh-consent-kicker">EPR Role & Category</span>',
      '          <h2 id="dh-epr-title">EPR route screening</h2>',
      '          <p>Use this when Dharrah first needs to identify the waste stream, applicant role, registration scope, and portal readiness.</p>',
      '        </div>',
      '        <button type="button" class="dh-consent-close" data-dh-epr-close="true" aria-label="Close EPR intake">&times;</button>',
      '      </div>',
      '      <div class="dh-consent-progress-meta"><strong data-dh-epr-step-label="true">Step 1 of 5 - Waste Stream & Role</strong><span data-dh-epr-step-count="true">1 / 5</span></div>',
      '      <p>Tell Dharrah which EPR route applies, what role the business plays, and what the current portal / document status looks like.</p>',
      '      <div class="dh-consent-progress-track"><span data-dh-epr-progress="true"></span></div>',
      '    </div>',
      '    <div class="dh-consent-body">',
      '      <div class="dh-consent-step active" data-dh-epr-step="0">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Which waste stream and applicant role should Dharrah start with?</h3>',
      '          <div class="dh-consent-option-grid" data-dh-epr-stream-grid="true">',
      '            <label class="dh-consent-option"><input type="radio" name="epr_stream" value="plastic_waste" data-dh-epr-field="wasteStream"><strong>Plastic Waste EPR</strong><span>Packaging, PIBO, category mapping, and annual quantity route.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="epr_stream" value="e_waste" data-dh-epr-field="wasteStream"><strong>E-Waste EPR</strong><span>EEE category, producer / importer route, and CPCB portal readiness.</span></label>',
      '            <label class="dh-consent-option"><input type="radio" name="epr_stream" value="other_stream" data-dh-epr-field="wasteStream"><strong>Battery / Tyre / Used Oil</strong><span>Use when the requirement is not plastic or e-waste but still needs Dharrah to map the route.</span></label>',
      '          </div>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Applicant Role</span><select data-dh-epr-field="applicantRole"><option value="">Select role</option><option value="producer">Producer</option><option value="manufacturer">Manufacturer</option><option value="importer">Importer</option><option value="brand_owner">Brand Owner</option><option value="seller_or_trader">Seller / Trader</option><option value="recycler_or_dismantler">Recycler / Dismantler</option></select></label>',
      '            <label class="dh-consent-field"><span>Registration Type Needed</span><input type="text" data-dh-epr-field="registrationType" placeholder="Fresh registration, renewal, amendment, annual filing help"></label>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-epr-step="1">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">Who is applying and how should Dharrah contact the team?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Legal Entity</span><input type="text" data-dh-epr-field="legalEntity" placeholder="Company / applicant entity"></label>',
      '            <label class="dh-consent-field"><span>Brand / Trade Name</span><input type="text" data-dh-epr-field="brandName" placeholder="Brand or product family if relevant"></label>',
      '            <label class="dh-consent-field"><span>Contact Name</span><input type="text" data-dh-epr-field="contactName" placeholder="Primary contact"></label>',
      '            <label class="dh-consent-field"><span>Phone</span><input type="text" data-dh-epr-field="phone" placeholder="+91 XXXXX XXXXX"></label>',
      '            <label class="dh-consent-field"><span>Email</span><input type="email" data-dh-epr-field="email" placeholder="name@company.com"></label>',
      '            <label class="dh-consent-field"><span>GST / Registration State</span><input type="text" data-dh-epr-field="gstOrState" placeholder="GSTIN, state, or registration base"></label>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-epr-step="2">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">What is the registration scope and annual quantity exposure?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Product / Category</span><input type="text" data-dh-epr-field="productCategory" placeholder="EEE category, packaging category, battery type, etc."></label>',
      '            <label class="dh-consent-field"><span>Annual Quantity</span><input type="text" data-dh-epr-field="annualQuantity" placeholder="Kg, MT, units, tonnage, or say estimated"></label>',
      '            <label class="dh-consent-field"><span>Operating States / Market Spread</span><input type="text" data-dh-epr-field="operatingStates" placeholder="States or market coverage"></label>',
      '            <label class="dh-consent-field"><span>Portal Status</span><input type="text" data-dh-epr-field="portalStatus" placeholder="No login, login exists, old registration, query pending"></label>',
      '          </div>',
      '          <label class="dh-consent-field"><span>Sales / Procurement / Channel Summary</span><textarea rows="4" data-dh-epr-field="channelSummary" placeholder="How product or packaging moves in the market, imported, manufactured, sold, or collected"></textarea></label>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-epr-step="3">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">What compliance history or supporting documents are already available?</h3>',
      '          <div class="dh-consent-checklist">',
      '            <label class="dh-consent-check"><input type="checkbox" value="GST / incorporation / PAN documents" data-dh-epr-multi="docsReady"><span>GST / incorporation / PAN documents</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Authorization letter / signatory proof" data-dh-epr-multi="docsReady"><span>Authorization letter / signatory proof</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Product / packaging category sheet" data-dh-epr-multi="docsReady"><span>Product / packaging category sheet</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Sales / procurement / quantity data" data-dh-epr-multi="docsReady"><span>Sales / procurement / quantity data</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Portal login / previous registration history" data-dh-epr-multi="docsReady"><span>Portal login / previous registration history</span></label>',
      '            <label class="dh-consent-check"><input type="checkbox" value="Recycler / PRO / partner documents" data-dh-epr-multi="docsReady"><span>Recycler / PRO / partner documents</span></label>',
      '          </div>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Current Registration / Filing Status</span><textarea rows="4" data-dh-epr-field="currentStatus" placeholder="Fresh applicant, expired registration, return pending, annual filing due, query pending"></textarea></label>',
      '            <label class="dh-consent-field"><span>Compliance Gaps / Missing Inputs</span><textarea rows="4" data-dh-epr-field="docsPending" placeholder="What is missing, unclear, or blocked right now?"></textarea></label>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="dh-consent-step" data-dh-epr-step="4">',
      '        <div class="dh-consent-step-card">',
      '          <h3 class="dh-consent-step-title">How should Dharrah support the EPR route from here?</h3>',
      '          <div class="dh-consent-grid cols-2">',
      '            <label class="dh-consent-field"><span>Support Needed</span><textarea rows="4" data-dh-epr-field="helpNeeded" placeholder="Role screening, category mapping, portal registration, filing, annual return, partner coordination"></textarea></label>',
      '            <label class="dh-consent-field"><span>Urgency / Timeline</span><textarea rows="4" data-dh-epr-field="urgency" placeholder="Internal deadline, dispatch hold, compliance target, investor or customer deadline"></textarea></label>',
      '            <label class="dh-consent-field"><span>Preferred Response</span><input type="text" data-dh-epr-field="responsePreference" placeholder="Call, checklist, email summary, meeting"></label>',
      '            <label class="dh-consent-field" style="display:none"><span>Website</span><input type="text" data-dh-honeypot="true" name="website_epr" autocomplete="off" tabindex="-1"></label>',
      '          </div>',
                   buildAttachmentMarkup('epr', 'Attach EPR support documents', 'Optional: add GST/incorporation proof, category sheets, portal screenshots, quantity sheets, old registrations, or recycler / PRO documents. These files will be emailed directly to Dharrah.'),
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="dh-consent-foot">',
      '      <div class="dh-consent-status" data-dh-epr-status="true"><strong>Use this intake when role and category matter first.</strong> Dharrah will sort the EPR branch before the team spends time on the wrong checklist.</div>',
      '      <div class="dh-consent-actions">',
      '        <div class="dh-consent-actions-left"><button type="button" class="dh-consent-btn" data-dh-epr-prev="true">Back</button></div>',
      '        <div class="dh-consent-actions-right"><button type="button" class="dh-consent-btn" data-dh-epr-close="true">Close</button><button type="button" class="dh-consent-btn primary" data-dh-epr-next="true">Next Step</button><button type="submit" class="dh-consent-btn primary" data-dh-epr-submit="true">Send EPR Intake</button></div>',
      '      </div>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
  }

  function getEcField(form, key) {
    return form ? form.querySelector('[data-dh-ec-field="' + key + '"]') : null;
  }

  function getEcMultiValues(form, key) {
    return Array.prototype.map.call(form.querySelectorAll('[data-dh-ec-multi="' + key + '"]:checked'), function (input) {
      return (input.value || '').trim();
    }).filter(Boolean);
  }

  function readEcData(form) {
    return {
      requestType: 'ec_eia_intake',
      caseType: (form.querySelector('[data-dh-ec-field="caseType"]:checked') || {}).value || '',
      proponentName: (getEcField(form, 'proponentName') ? getEcField(form, 'proponentName').value : '').trim(),
      projectName: (getEcField(form, 'projectName') ? getEcField(form, 'projectName').value : '').trim(),
      contactName: (getEcField(form, 'contactName') ? getEcField(form, 'contactName').value : '').trim(),
      phone: (getEcField(form, 'phone') ? getEcField(form, 'phone').value : '').trim(),
      email: (getEcField(form, 'email') ? getEcField(form, 'email').value : '').trim(),
      sector: (getEcField(form, 'sector') ? getEcField(form, 'sector').value : '').trim(),
      scheduleItem: (getEcField(form, 'scheduleItem') ? getEcField(form, 'scheduleItem').value : '').trim(),
      categoryExpectation: (getEcField(form, 'categoryExpectation') ? getEcField(form, 'categoryExpectation').value : '').trim(),
      state: (getEcField(form, 'state') ? getEcField(form, 'state').value : '').trim(),
      district: (getEcField(form, 'district') ? getEcField(form, 'district').value : '').trim(),
      siteLocation: (getEcField(form, 'siteLocation') ? getEcField(form, 'siteLocation').value : '').trim(),
      locationSensitivity: (getEcField(form, 'locationSensitivity') ? getEcField(form, 'locationSensitivity').value : '').trim(),
      capacitySummary: (getEcField(form, 'capacitySummary') ? getEcField(form, 'capacitySummary').value : '').trim(),
      landArea: (getEcField(form, 'landArea') ? getEcField(form, 'landArea').value : '').trim(),
      waterDemand: (getEcField(form, 'waterDemand') ? getEcField(form, 'waterDemand').value : '').trim(),
      pollutionSummary: (getEcField(form, 'pollutionSummary') ? getEcField(form, 'pollutionSummary').value : '').trim(),
      existingEcNumber: (getEcField(form, 'existingEcNumber') ? getEcField(form, 'existingEcNumber').value : '').trim(),
      pariveshStatus: (getEcField(form, 'pariveshStatus') ? getEcField(form, 'pariveshStatus').value : '').trim(),
      consultantStatus: (getEcField(form, 'consultantStatus') ? getEcField(form, 'consultantStatus').value : '').trim(),
      publicHearingStatus: (getEcField(form, 'publicHearingStatus') ? getEcField(form, 'publicHearingStatus').value : '').trim(),
      studyStatus: (getEcField(form, 'studyStatus') ? getEcField(form, 'studyStatus').value : '').trim(),
      docsReady: getEcMultiValues(form, 'docsReady'),
      docsPending: (getEcField(form, 'docsPending') ? getEcField(form, 'docsPending').value : '').trim(),
      helpNeeded: (getEcField(form, 'helpNeeded') ? getEcField(form, 'helpNeeded').value : '').trim(),
      urgency: (getEcField(form, 'urgency') ? getEcField(form, 'urgency').value : '').trim(),
      responsePreference: (getEcField(form, 'responsePreference') ? getEcField(form, 'responsePreference').value : '').trim()
    };
  }

  function clearEcFieldErrors(form) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.dh-consent-field.has-error, .dh-consent-option-grid.has-error'), function (node) {
      node.classList.remove('has-error');
    });
  }

  function markEcFieldError(form, key, hasError) {
    if (key === 'caseType') {
      var grid = form.querySelector('[data-dh-ec-route-grid="true"]');
      if (grid) grid.classList.toggle('has-error', !!hasError);
      return;
    }
    var field = getEcField(form, key);
    if (!field || !field.parentElement) return;
    field.parentElement.classList.toggle('has-error', !!hasError);
  }

  function updateEcStatus(form, tone, message) {
    var status = form ? form.querySelector('[data-dh-ec-status="true"]') : null;
    if (!status) return;
    status.classList.remove('is-error', 'is-warning', 'is-success');
    if (tone) status.classList.add('is-' + tone);
    status.innerHTML = message;
  }

  function setEcStep(form, stepIndex) {
    var boundedIndex = Math.max(0, Math.min(EC_STEP_TITLES.length - 1, stepIndex));
    form.dataset.currentStep = String(boundedIndex);
    Array.prototype.forEach.call(form.querySelectorAll('[data-dh-ec-step]'), function (step) {
      step.classList.toggle('active', parseInt(step.getAttribute('data-dh-ec-step'), 10) === boundedIndex);
    });
    var overlay = form.parentElement;
    var label = overlay ? overlay.querySelector('[data-dh-ec-step-label="true"]') : null;
    var count = overlay ? overlay.querySelector('[data-dh-ec-step-count="true"]') : null;
    var progress = overlay ? overlay.querySelector('[data-dh-ec-progress="true"]') : null;
    var prev = form.querySelector('[data-dh-ec-prev="true"]');
    var next = form.querySelector('[data-dh-ec-next="true"]');
    var submit = form.querySelector('[data-dh-ec-submit="true"]');
    var body = form.querySelector('.dh-consent-body');
    if (label) label.innerHTML = 'Step ' + (boundedIndex + 1) + ' of ' + EC_STEP_TITLES.length + ' - ' + EC_STEP_TITLES[boundedIndex];
    if (count) count.innerText = (boundedIndex + 1) + ' / ' + EC_STEP_TITLES.length;
    if (progress) progress.style.width = (((boundedIndex + 1) / EC_STEP_TITLES.length) * 100) + '%';
    if (prev) prev.style.display = boundedIndex === 0 ? 'none' : '';
    if (next) next.style.display = boundedIndex === EC_STEP_TITLES.length - 1 ? 'none' : '';
    if (submit) submit.style.display = boundedIndex === EC_STEP_TITLES.length - 1 ? '' : 'none';
    if (body) body.scrollTop = 0;
  }

  function validateEcStep(form, stepIndex, data) {
    var errors = [];
    clearEcFieldErrors(form);

    if (stepIndex === 0 && !data.caseType) {
      errors.push('Select the project route first.');
      markEcFieldError(form, 'caseType', true);
    }

    if (stepIndex === 1) {
      [['proponentName', 'Project proponent'], ['projectName', 'Project name'], ['contactName', 'Contact name'], ['phone', 'Phone'], ['sector', 'Project sector']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markEcFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 2) {
      [['categoryExpectation', 'Expected category'], ['state', 'State'], ['district', 'District'], ['locationSensitivity', 'Location sensitivity']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markEcFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 3) {
      [['capacitySummary', 'Capacity / configuration'], ['waterDemand', 'Water & utilities'], ['pollutionSummary', 'Pollution summary']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markEcFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 4 && data.caseType === 'ec_existing_update' && !data.existingEcNumber) {
      errors.push('Existing EC / ToR / proposal number is required for existing-update cases.');
      markEcFieldError(form, 'existingEcNumber', true);
    }

    if (stepIndex === 5 && !data.helpNeeded) {
      errors.push('Describe the support needed from Dharrah.');
      markEcFieldError(form, 'helpNeeded', true);
    }

    return errors;
  }

  function openEcIntake(source) {
    injectEcEiaOverlay();
    var overlay = document.getElementById('dh-ec-overlay');
    var form = document.getElementById('dh-ec-form');
    if (!overlay || !form) return;
    form.dataset.dhSource = source || 'services';
    form.dataset.dhMountedAt = String(getTimestamp());
    clearEcFieldErrors(form);
    updateConsentOptionStates(form);
    updateEcStatus(form, '', '<strong>Use this intake when the route itself needs screening.</strong> Dharrah will map the likely EC path before you sink time into the wrong studies.');
    setEcStep(form, 0);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trackEvent('ec_intake_open', { form_name: 'ec_eia_intake', source: source || 'services' });
  }

  function closeEcIntake() {
    var overlay = document.getElementById('dh-ec-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function getEprField(form, key) {
    return form ? form.querySelector('[data-dh-epr-field="' + key + '"]') : null;
  }

  function getEprMultiValues(form, key) {
    return Array.prototype.map.call(form.querySelectorAll('[data-dh-epr-multi="' + key + '"]:checked'), function (input) {
      return (input.value || '').trim();
    }).filter(Boolean);
  }

  function readEprData(form) {
    return {
      requestType: 'epr_intake',
      wasteStream: (form.querySelector('[data-dh-epr-field="wasteStream"]:checked') || {}).value || '',
      applicantRole: (getEprField(form, 'applicantRole') ? getEprField(form, 'applicantRole').value : '').trim(),
      registrationType: (getEprField(form, 'registrationType') ? getEprField(form, 'registrationType').value : '').trim(),
      legalEntity: (getEprField(form, 'legalEntity') ? getEprField(form, 'legalEntity').value : '').trim(),
      brandName: (getEprField(form, 'brandName') ? getEprField(form, 'brandName').value : '').trim(),
      contactName: (getEprField(form, 'contactName') ? getEprField(form, 'contactName').value : '').trim(),
      phone: (getEprField(form, 'phone') ? getEprField(form, 'phone').value : '').trim(),
      email: (getEprField(form, 'email') ? getEprField(form, 'email').value : '').trim(),
      gstOrState: (getEprField(form, 'gstOrState') ? getEprField(form, 'gstOrState').value : '').trim(),
      productCategory: (getEprField(form, 'productCategory') ? getEprField(form, 'productCategory').value : '').trim(),
      annualQuantity: (getEprField(form, 'annualQuantity') ? getEprField(form, 'annualQuantity').value : '').trim(),
      operatingStates: (getEprField(form, 'operatingStates') ? getEprField(form, 'operatingStates').value : '').trim(),
      portalStatus: (getEprField(form, 'portalStatus') ? getEprField(form, 'portalStatus').value : '').trim(),
      channelSummary: (getEprField(form, 'channelSummary') ? getEprField(form, 'channelSummary').value : '').trim(),
      docsReady: getEprMultiValues(form, 'docsReady'),
      currentStatus: (getEprField(form, 'currentStatus') ? getEprField(form, 'currentStatus').value : '').trim(),
      docsPending: (getEprField(form, 'docsPending') ? getEprField(form, 'docsPending').value : '').trim(),
      helpNeeded: (getEprField(form, 'helpNeeded') ? getEprField(form, 'helpNeeded').value : '').trim(),
      urgency: (getEprField(form, 'urgency') ? getEprField(form, 'urgency').value : '').trim(),
      responsePreference: (getEprField(form, 'responsePreference') ? getEprField(form, 'responsePreference').value : '').trim()
    };
  }

  function clearEprFieldErrors(form) {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.dh-consent-field.has-error, .dh-consent-option-grid.has-error'), function (node) {
      node.classList.remove('has-error');
    });
  }

  function markEprFieldError(form, key, hasError) {
    if (key === 'wasteStream') {
      var grid = form.querySelector('[data-dh-epr-stream-grid="true"]');
      if (grid) grid.classList.toggle('has-error', !!hasError);
      return;
    }
    var field = getEprField(form, key);
    if (!field || !field.parentElement) return;
    field.parentElement.classList.toggle('has-error', !!hasError);
  }

  function updateEprStatus(form, tone, message) {
    var status = form ? form.querySelector('[data-dh-epr-status="true"]') : null;
    if (!status) return;
    status.classList.remove('is-error', 'is-warning', 'is-success');
    if (tone) status.classList.add('is-' + tone);
    status.innerHTML = message;
  }

  function setEprStep(form, stepIndex) {
    var boundedIndex = Math.max(0, Math.min(EPR_STEP_TITLES.length - 1, stepIndex));
    form.dataset.currentStep = String(boundedIndex);
    Array.prototype.forEach.call(form.querySelectorAll('[data-dh-epr-step]'), function (step) {
      step.classList.toggle('active', parseInt(step.getAttribute('data-dh-epr-step'), 10) === boundedIndex);
    });
    var overlay = form.parentElement;
    var label = overlay ? overlay.querySelector('[data-dh-epr-step-label="true"]') : null;
    var count = overlay ? overlay.querySelector('[data-dh-epr-step-count="true"]') : null;
    var progress = overlay ? overlay.querySelector('[data-dh-epr-progress="true"]') : null;
    var prev = form.querySelector('[data-dh-epr-prev="true"]');
    var next = form.querySelector('[data-dh-epr-next="true"]');
    var submit = form.querySelector('[data-dh-epr-submit="true"]');
    var body = form.querySelector('.dh-consent-body');
    if (label) label.innerHTML = 'Step ' + (boundedIndex + 1) + ' of ' + EPR_STEP_TITLES.length + ' - ' + EPR_STEP_TITLES[boundedIndex];
    if (count) count.innerText = (boundedIndex + 1) + ' / ' + EPR_STEP_TITLES.length;
    if (progress) progress.style.width = (((boundedIndex + 1) / EPR_STEP_TITLES.length) * 100) + '%';
    if (prev) prev.style.display = boundedIndex === 0 ? 'none' : '';
    if (next) next.style.display = boundedIndex === EPR_STEP_TITLES.length - 1 ? 'none' : '';
    if (submit) submit.style.display = boundedIndex === EPR_STEP_TITLES.length - 1 ? '' : 'none';
    if (body) body.scrollTop = 0;
  }

  function validateEprStep(form, stepIndex, data) {
    var errors = [];
    clearEprFieldErrors(form);

    if (stepIndex === 0) {
      if (!data.wasteStream) {
        errors.push('Select the waste stream first.');
        markEprFieldError(form, 'wasteStream', true);
      }
      if (!data.applicantRole) {
        errors.push('Applicant role is required.');
        markEprFieldError(form, 'applicantRole', true);
      }
    }

    if (stepIndex === 1) {
      [['legalEntity', 'Legal entity'], ['contactName', 'Contact name'], ['phone', 'Phone'], ['email', 'Email']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markEprFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 2) {
      [['productCategory', 'Product / category'], ['annualQuantity', 'Annual quantity'], ['portalStatus', 'Portal status']].forEach(function (item) {
        if (!data[item[0]]) {
          errors.push(item[1] + ' is required.');
          markEprFieldError(form, item[0], true);
        }
      });
    }

    if (stepIndex === 4 && !data.helpNeeded) {
      errors.push('Describe the support needed from Dharrah.');
      markEprFieldError(form, 'helpNeeded', true);
    }

    return errors;
  }

  function openEprIntake(source) {
    injectEprOverlay();
    var overlay = document.getElementById('dh-epr-overlay');
    var form = document.getElementById('dh-epr-form');
    if (!overlay || !form) return;
    form.dataset.dhSource = source || 'services';
    form.dataset.dhMountedAt = String(getTimestamp());
    clearEprFieldErrors(form);
    updateConsentOptionStates(form);
    updateEprStatus(form, '', '<strong>Use this intake when role and category matter first.</strong> Dharrah will sort the EPR branch before the team spends time on the wrong checklist.');
    setEprStep(form, 0);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trackEvent('epr_intake_open', { form_name: 'epr_intake', source: source || 'services' });
  }

  function closeEprIntake() {
    var overlay = document.getElementById('dh-epr-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function setupRegulatoryIntakeBridge() {
    injectGpcbConsentOverlay();
    injectEcEiaOverlay();
    injectEprOverlay();
    ensureRegulatoryIntakeRoutes();
    ensureKnowledgeCenter();

    var consentOverlay = document.getElementById('dh-consent-overlay');
    var consentForm = document.getElementById('dh-consent-form');
    var ecOverlay = document.getElementById('dh-ec-overlay');
    var ecForm = document.getElementById('dh-ec-form');
    var eprOverlay = document.getElementById('dh-epr-overlay');
    var eprForm = document.getElementById('dh-epr-form');
    if (!consentOverlay || !consentForm || !ecOverlay || !ecForm || !eprOverlay || !eprForm) return;
    bindAttachmentInput(consentForm, 'gpcb');
    bindAttachmentInput(ecForm, 'ec');
    bindAttachmentInput(eprForm, 'epr');

    Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-consent]'), function (button) {
      if (button.dataset.boundOpenConsent === 'true') return;
      button.dataset.boundOpenConsent = 'true';
      button.addEventListener('click', function () {
        openConsentIntake(button.getAttribute('data-dh-open-consent') || 'services');
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-ec]'), function (button) {
      if (button.dataset.boundOpenEc === 'true') return;
      button.dataset.boundOpenEc = 'true';
      button.addEventListener('click', function () {
        openEcIntake(button.getAttribute('data-dh-open-ec') || 'services');
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-dh-open-epr]'), function (button) {
      if (button.dataset.boundOpenEpr === 'true') return;
      button.dataset.boundOpenEpr = 'true';
      button.addEventListener('click', function () {
        openEprIntake(button.getAttribute('data-dh-open-epr') || 'services');
      });
    });

    function bindOverlayClose(overlay, selector, closeFn) {
      Array.prototype.forEach.call(overlay.querySelectorAll(selector), function (button) {
        if (button.dataset.boundClose === 'true') return;
        button.dataset.boundClose = 'true';
        button.addEventListener('click', closeFn);
      });
      if (overlay.dataset.boundBackdrop !== 'true') {
        overlay.dataset.boundBackdrop = 'true';
        overlay.addEventListener('click', function (event) {
          if (event.target === overlay) closeFn();
        });
      }
    }

    bindOverlayClose(consentOverlay, '[data-dh-consent-close="true"]', closeConsentIntake);
    bindOverlayClose(ecOverlay, '[data-dh-ec-close="true"]', closeEcIntake);
    bindOverlayClose(eprOverlay, '[data-dh-epr-close="true"]', closeEprIntake);

    if (document.body.dataset.boundRegEsc !== 'true') {
      document.body.dataset.boundRegEsc = 'true';
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (consentOverlay.classList.contains('active')) closeConsentIntake();
        if (ecOverlay.classList.contains('active')) closeEcIntake();
        if (eprOverlay.classList.contains('active')) closeEprIntake();
      });
    }

    if (consentForm.dataset.eventsBound !== 'true') {
      consentForm.dataset.eventsBound = 'true';
      setConsentStep(consentForm, 0);
      updateConsentOptionStates(consentForm);
      consentForm.addEventListener('change', function () {
        updateConsentOptionStates(consentForm);
      });
      consentForm.querySelector('[data-dh-consent-next="true"]').addEventListener('click', function () {
        var current = parseInt(consentForm.dataset.currentStep || '0', 10);
        var data = readGpcbConsentData(consentForm);
        var errors = validateConsentStep(consentForm, current, data);
        if (errors.length) {
          updateConsentStatus(consentForm, 'error', '<strong>Some consent details still need attention.</strong> Please correct the highlighted items before moving ahead.');
          window.showDhPopup('Validation Required', errors.join('\n'));
          return;
        }
        updateConsentStatus(consentForm, '', '<strong>Step saved locally.</strong> Continue when you are ready.');
        setConsentStep(consentForm, current + 1);
      });
      consentForm.querySelector('[data-dh-consent-prev="true"]').addEventListener('click', function () {
        setConsentStep(consentForm, parseInt(consentForm.dataset.currentStep || '0', 10) - 1);
      });
      consentForm.addEventListener('input', function () {
        if (consentForm.dataset.submitting === 'true') return;
        var status = consentForm.querySelector('[data-dh-consent-status="true"]');
        if (status && (status.classList.contains('is-error') || status.classList.contains('is-warning'))) {
          updateConsentStatus(consentForm, '', '<strong>Consent route in progress:</strong> Share what you already know. Dharrah can request the missing documents after the first review.');
        }
      });
      consentForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (consentForm.dataset.submitting === 'true') return;
        var data = readGpcbConsentData(consentForm);
        var blockReason = isLikelySpamSubmission(consentForm, REGULATORY_FORM_COOLDOWN_KEY);
        if (blockReason) {
          if (blockReason === 'cooldown') {
            var remaining = getCooldownRemainingMs(REGULATORY_FORM_COOLDOWN_KEY);
            updateConsentStatus(consentForm, 'warning', formatCooldownMessage(remaining));
            trackEvent('gpcb_intake_blocked', { form_name: 'gpcb_consent', block_reason: blockReason, remaining_seconds: Math.ceil(remaining / 1000) });
            window.showDhPopup('Please Wait', 'We recently received a consent intake from this browser. Please wait a little or contact Dharrah directly.');
            return;
          }
          updateConsentStatus(consentForm, 'warning', '<strong>Submission paused.</strong> Please try again normally or contact Dharrah directly if the requirement is urgent.');
          trackEvent('gpcb_intake_blocked', { form_name: 'gpcb_consent', block_reason: blockReason });
          return;
        }
        var errors = validateConsentStep(consentForm, 0, data).concat(validateConsentStep(consentForm, 1, data)).concat(validateConsentStep(consentForm, 2, data)).concat(validateConsentStep(consentForm, 3, data)).concat(validateConsentStep(consentForm, 4, data)).concat(validateConsentStep(consentForm, 5, data));
        if (errors.length) {
          updateConsentStatus(consentForm, 'error', '<strong>Some consent details still need attention.</strong> Please correct the highlighted items and submit again.');
          trackEvent('gpcb_intake_validation_error', { form_name: 'gpcb_consent', error_count: errors.length });
          window.showDhPopup('Validation Required', errors.slice(0, 8).join('\n'));
          return;
        }
        var submitButton = consentForm.querySelector('[data-dh-consent-submit="true"]');
        var originalLabel = submitButton ? submitButton.innerText : '';
        var consentAttachments = getValidatedAttachments(consentForm, 'gpcb');
        if (consentAttachments.error) {
          updateConsentStatus(consentForm, 'error', '<strong>Attachment review needed.</strong> Please fix the selected files before sending the consent intake.');
          window.showDhPopup('Attachment Limit', consentAttachments.error);
          return;
        }
        consentForm.dataset.submitting = 'true';
        if (submitButton) {
          submitButton.innerText = 'SENDING...';
          submitButton.disabled = true;
        }
        trackEvent('gpcb_intake_submit_attempt', { form_name: 'gpcb_consent', case_type: data.caseType });
        updateConsentStatus(consentForm, 'warning', '<strong>Sending your consent intake...</strong> Dharrah is receiving the route, change logic, and document-readiness summary now.');
        try {
          var response = await fetch(getContactEndpoint(), { method: 'POST', body: buildMultipartRequest(data, consentAttachments.files) });
          if (!response.ok) throw new Error('Consent intake send failed');
          writeStorageNumber(REGULATORY_FORM_COOLDOWN_KEY, getTimestamp());
          updateConsentStatus(consentForm, 'success', '<strong>Consent intake received.</strong> Dharrah will review the route, compare the change logic, and contact your team with the next filing steps.');
          trackEvent('gpcb_intake_submit', { form_name: 'gpcb_consent', case_type: data.caseType });
          trackEvent('gpcb_intake_success', { form_name: 'gpcb_consent', case_type: data.caseType });
          window.showDhPopup('Consent Intake Sent', 'Your GPCB consent intake has been received successfully. Dharrah will review the route and contact your team with the next filing steps.', 'success');
          consentForm.reset();
          consentForm.dataset.dhMountedAt = String(getTimestamp());
          clearConsentFieldErrors(consentForm);
          updateConsentOptionStates(consentForm);
          refreshAttachmentSummary(consentForm, 'gpcb');
          setConsentStep(consentForm, 0);
          closeConsentIntake();
        } catch (error) {
          updateConsentStatus(consentForm, 'error', '<strong>We could not send the consent intake right now.</strong> Please try again in a moment or contact Dharrah directly by phone or WhatsApp.');
          trackEvent('gpcb_intake_error', { form_name: 'gpcb_consent', error_type: 'network_or_worker' });
          window.showDhPopup('System Error', 'We could not send the GPCB consent intake right now. Please try again or contact us directly.');
        } finally {
          consentForm.dataset.submitting = 'false';
          if (submitButton) {
            submitButton.innerText = originalLabel;
            submitButton.disabled = false;
          }
        }
      });
    }

    if (ecForm.dataset.eventsBound !== 'true') {
      ecForm.dataset.eventsBound = 'true';
      setEcStep(ecForm, 0);
      updateConsentOptionStates(ecForm);
      ecForm.addEventListener('change', function () {
        updateConsentOptionStates(ecForm);
      });
      ecForm.querySelector('[data-dh-ec-next="true"]').addEventListener('click', function () {
        var current = parseInt(ecForm.dataset.currentStep || '0', 10);
        var data = readEcData(ecForm);
        var errors = validateEcStep(ecForm, current, data);
        if (errors.length) {
          updateEcStatus(ecForm, 'error', '<strong>Some EC / EIA details still need attention.</strong> Please correct the highlighted items before moving ahead.');
          window.showDhPopup('Validation Required', errors.join('\n'));
          return;
        }
        updateEcStatus(ecForm, '', '<strong>Step saved locally.</strong> Continue when you are ready.');
        setEcStep(ecForm, current + 1);
      });
      ecForm.querySelector('[data-dh-ec-prev="true"]').addEventListener('click', function () {
        setEcStep(ecForm, parseInt(ecForm.dataset.currentStep || '0', 10) - 1);
      });
      ecForm.addEventListener('input', function () {
        if (ecForm.dataset.submitting === 'true') return;
        var status = ecForm.querySelector('[data-dh-ec-status="true"]');
        if (status && (status.classList.contains('is-error') || status.classList.contains('is-warning'))) {
          updateEcStatus(ecForm, '', '<strong>Screening in progress:</strong> Dharrah can still work with partial route information if the project team does not have every study note yet.');
        }
      });
      ecForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (ecForm.dataset.submitting === 'true') return;
        var data = readEcData(ecForm);
        var blockReason = isLikelySpamSubmission(ecForm, EC_FORM_COOLDOWN_KEY);
        if (blockReason) {
          if (blockReason === 'cooldown') {
            var remaining = getCooldownRemainingMs(EC_FORM_COOLDOWN_KEY);
            updateEcStatus(ecForm, 'warning', formatCooldownMessage(remaining));
            trackEvent('ec_intake_blocked', { form_name: 'ec_eia_intake', block_reason: blockReason, remaining_seconds: Math.ceil(remaining / 1000) });
            window.showDhPopup('Please Wait', 'We recently received an EC / EIA intake from this browser. Please wait a little or contact Dharrah directly.');
            return;
          }
          updateEcStatus(ecForm, 'warning', '<strong>Submission paused.</strong> Please try again normally or contact Dharrah directly if the project timeline is urgent.');
          trackEvent('ec_intake_blocked', { form_name: 'ec_eia_intake', block_reason: blockReason });
          return;
        }
        var ecErrors = validateEcStep(ecForm, 0, data).concat(validateEcStep(ecForm, 1, data)).concat(validateEcStep(ecForm, 2, data)).concat(validateEcStep(ecForm, 3, data)).concat(validateEcStep(ecForm, 4, data)).concat(validateEcStep(ecForm, 5, data));
        if (ecErrors.length) {
          updateEcStatus(ecForm, 'error', '<strong>Some EC / EIA details still need attention.</strong> Please correct the highlighted items and submit again.');
          trackEvent('ec_intake_validation_error', { form_name: 'ec_eia_intake', error_count: ecErrors.length });
          window.showDhPopup('Validation Required', ecErrors.slice(0, 8).join('\n'));
          return;
        }
        var ecSubmitButton = ecForm.querySelector('[data-dh-ec-submit="true"]');
        var ecOriginalLabel = ecSubmitButton ? ecSubmitButton.innerText : '';
        var ecAttachments = getValidatedAttachments(ecForm, 'ec');
        if (ecAttachments.error) {
          updateEcStatus(ecForm, 'error', '<strong>Attachment review needed.</strong> Please fix the selected files before sending the EC / EIA intake.');
          window.showDhPopup('Attachment Limit', ecAttachments.error);
          return;
        }
        ecForm.dataset.submitting = 'true';
        if (ecSubmitButton) {
          ecSubmitButton.innerText = 'SENDING...';
          ecSubmitButton.disabled = true;
        }
        trackEvent('ec_intake_submit_attempt', { form_name: 'ec_eia_intake', case_type: data.caseType, category: data.categoryExpectation });
        updateEcStatus(ecForm, 'warning', '<strong>Sending your EC / EIA intake...</strong> Dharrah is receiving the project route, category clues, and document-readiness summary now.');
        try {
          var ecResponse = await fetch(getContactEndpoint(), { method: 'POST', body: buildMultipartRequest(data, ecAttachments.files) });
          if (!ecResponse.ok) throw new Error('EC intake send failed');
          writeStorageNumber(EC_FORM_COOLDOWN_KEY, getTimestamp());
          updateEcStatus(ecForm, 'success', '<strong>EC / EIA intake received.</strong> Dharrah will review the project route and respond with the likely screening path and next document ask.');
          trackEvent('ec_intake_submit', { form_name: 'ec_eia_intake', case_type: data.caseType, category: data.categoryExpectation });
          trackEvent('ec_intake_success', { form_name: 'ec_eia_intake', case_type: data.caseType, category: data.categoryExpectation });
          window.showDhPopup('EC / EIA Intake Sent', 'Your EC / EIA intake has been received successfully. Dharrah will review the project route and contact your team with the next screening steps.', 'success');
          ecForm.reset();
          ecForm.dataset.dhMountedAt = String(getTimestamp());
          clearEcFieldErrors(ecForm);
          updateConsentOptionStates(ecForm);
          refreshAttachmentSummary(ecForm, 'ec');
          setEcStep(ecForm, 0);
          closeEcIntake();
        } catch (error) {
          updateEcStatus(ecForm, 'error', '<strong>We could not send the EC / EIA intake right now.</strong> Please try again in a moment or contact Dharrah directly by phone or WhatsApp.');
          trackEvent('ec_intake_error', { form_name: 'ec_eia_intake', error_type: 'network_or_worker' });
          window.showDhPopup('System Error', 'We could not send the EC / EIA intake right now. Please try again or contact us directly.');
        } finally {
          ecForm.dataset.submitting = 'false';
          if (ecSubmitButton) {
            ecSubmitButton.innerText = ecOriginalLabel;
            ecSubmitButton.disabled = false;
          }
        }
      });
    }

    if (eprForm.dataset.eventsBound !== 'true') {
      eprForm.dataset.eventsBound = 'true';
      setEprStep(eprForm, 0);
      updateConsentOptionStates(eprForm);
      eprForm.addEventListener('change', function () {
        updateConsentOptionStates(eprForm);
      });
      eprForm.querySelector('[data-dh-epr-next="true"]').addEventListener('click', function () {
        var current = parseInt(eprForm.dataset.currentStep || '0', 10);
        var data = readEprData(eprForm);
        var errors = validateEprStep(eprForm, current, data);
        if (errors.length) {
          updateEprStatus(eprForm, 'error', '<strong>Some EPR details still need attention.</strong> Please correct the highlighted items before moving ahead.');
          window.showDhPopup('Validation Required', errors.join('\n'));
          return;
        }
        updateEprStatus(eprForm, '', '<strong>Step saved locally.</strong> Continue when you are ready.');
        setEprStep(eprForm, current + 1);
      });
      eprForm.querySelector('[data-dh-epr-prev="true"]').addEventListener('click', function () {
        setEprStep(eprForm, parseInt(eprForm.dataset.currentStep || '0', 10) - 1);
      });
      eprForm.addEventListener('input', function () {
        if (eprForm.dataset.submitting === 'true') return;
        var status = eprForm.querySelector('[data-dh-epr-status="true"]');
        if (status && (status.classList.contains('is-error') || status.classList.contains('is-warning'))) {
          updateEprStatus(eprForm, '', '<strong>EPR route in progress:</strong> Dharrah can still help even if the team only has partial quantity and portal details right now.');
        }
      });
      eprForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (eprForm.dataset.submitting === 'true') return;
        var data = readEprData(eprForm);
        var blockReason = isLikelySpamSubmission(eprForm, EPR_FORM_COOLDOWN_KEY);
        if (blockReason) {
          if (blockReason === 'cooldown') {
            var remaining = getCooldownRemainingMs(EPR_FORM_COOLDOWN_KEY);
            updateEprStatus(eprForm, 'warning', formatCooldownMessage(remaining));
            trackEvent('epr_intake_blocked', { form_name: 'epr_intake', block_reason: blockReason, remaining_seconds: Math.ceil(remaining / 1000) });
            window.showDhPopup('Please Wait', 'We recently received an EPR intake from this browser. Please wait a little or contact Dharrah directly.');
            return;
          }
          updateEprStatus(eprForm, 'warning', '<strong>Submission paused.</strong> Please try again normally or contact Dharrah directly if the compliance matter is urgent.');
          trackEvent('epr_intake_blocked', { form_name: 'epr_intake', block_reason: blockReason });
          return;
        }
        var eprErrors = validateEprStep(eprForm, 0, data).concat(validateEprStep(eprForm, 1, data)).concat(validateEprStep(eprForm, 2, data)).concat(validateEprStep(eprForm, 3, data)).concat(validateEprStep(eprForm, 4, data));
        if (eprErrors.length) {
          updateEprStatus(eprForm, 'error', '<strong>Some EPR details still need attention.</strong> Please correct the highlighted items and submit again.');
          trackEvent('epr_intake_validation_error', { form_name: 'epr_intake', error_count: eprErrors.length });
          window.showDhPopup('Validation Required', eprErrors.slice(0, 8).join('\n'));
          return;
        }
        var eprSubmitButton = eprForm.querySelector('[data-dh-epr-submit="true"]');
        var eprOriginalLabel = eprSubmitButton ? eprSubmitButton.innerText : '';
        var eprAttachments = getValidatedAttachments(eprForm, 'epr');
        if (eprAttachments.error) {
          updateEprStatus(eprForm, 'error', '<strong>Attachment review needed.</strong> Please fix the selected files before sending the EPR intake.');
          window.showDhPopup('Attachment Limit', eprAttachments.error);
          return;
        }
        eprForm.dataset.submitting = 'true';
        if (eprSubmitButton) {
          eprSubmitButton.innerText = 'SENDING...';
          eprSubmitButton.disabled = true;
        }
        trackEvent('epr_intake_submit_attempt', { form_name: 'epr_intake', waste_stream: data.wasteStream, applicant_role: data.applicantRole });
        updateEprStatus(eprForm, 'warning', '<strong>Sending your EPR intake...</strong> Dharrah is receiving the waste stream, role, portal status, and checklist context now.');
        try {
          var eprResponse = await fetch(getContactEndpoint(), { method: 'POST', body: buildMultipartRequest(data, eprAttachments.files) });
          if (!eprResponse.ok) throw new Error('EPR intake send failed');
          writeStorageNumber(EPR_FORM_COOLDOWN_KEY, getTimestamp());
          updateEprStatus(eprForm, 'success', '<strong>EPR intake received.</strong> Dharrah will review the role, stream, and document state before sending the next compliance steps.');
          trackEvent('epr_intake_submit', { form_name: 'epr_intake', waste_stream: data.wasteStream, applicant_role: data.applicantRole });
          trackEvent('epr_intake_success', { form_name: 'epr_intake', waste_stream: data.wasteStream, applicant_role: data.applicantRole });
          window.showDhPopup('EPR Intake Sent', 'Your EPR intake has been received successfully. Dharrah will review the stream and role before contacting your team with the next compliance steps.', 'success');
          eprForm.reset();
          eprForm.dataset.dhMountedAt = String(getTimestamp());
          clearEprFieldErrors(eprForm);
          updateConsentOptionStates(eprForm);
          refreshAttachmentSummary(eprForm, 'epr');
          setEprStep(eprForm, 0);
          closeEprIntake();
        } catch (error) {
          updateEprStatus(eprForm, 'error', '<strong>We could not send the EPR intake right now.</strong> Please try again in a moment or contact Dharrah directly by phone or WhatsApp.');
          trackEvent('epr_intake_error', { form_name: 'epr_intake', error_type: 'network_or_worker' });
          window.showDhPopup('System Error', 'We could not send the EPR intake right now. Please try again or contact us directly.');
        } finally {
          eprForm.dataset.submitting = 'false';
          if (eprSubmitButton) {
            eprSubmitButton.innerText = eprOriginalLabel;
            eprSubmitButton.disabled = false;
          }
        }
      });
    }
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
    setupRegulatoryIntakeBridge();
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
