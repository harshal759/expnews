import { readBlockConfig } from '../../scripts/aem.js';
import { dispatchCustomEvent } from '../../scripts/custom-events.js';
import { syncFormDataLayer, DEFAULT_FORM_FIELD_MAP, attachLiveFormSync } from '../../scripts/form-data-layer.js';

const DEFAULT_FORM_TITLE = 'Book a Test Drive';
const DEFAULT_SUCCESS_MESSAGE = 'Thank you! Your test drive has been booked. We will contact you shortly to confirm your appointment.';
const DEFAULT_CAR_MODELS = ['Carvelo Sedan', 'Carvelo SUV', 'Carvelo Luxury', 'Carvelo Electric'];
const TIME_SLOTS = ['Morning (9AM – 12PM)', 'Afternoon (12PM – 4PM)', 'Evening (4PM – 7PM)'];

function isTruthy(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true';
}

function applyButtonConfigToSubmitButton(block, config) {
  const submitButton = block.querySelector("form button[type='submit']");
  if (!submitButton) return;
  const eventType = config.buttoneventtype ?? config['button-event-type'];
  if (eventType && String(eventType).trim()) submitButton.dataset.buttonEventType = String(eventType).trim();
  const webhookUrl = config.buttonwebhookurl ?? config['button-webhook-url'];
  if (webhookUrl && String(webhookUrl).trim()) submitButton.dataset.buttonWebhookUrl = String(webhookUrl).trim();
  const formId = config.buttonformid ?? config['button-form-id'];
  if (formId && String(formId).trim()) submitButton.dataset.buttonFormId = String(formId).trim();
  const buttonData = config.buttondata ?? config['button-data'];
  if (buttonData && String(buttonData).trim()) submitButton.dataset.buttonData = String(buttonData).trim();
}

function buildTestDriveFormDef(config = {}) {
  const formTitle = config['form-title'] || DEFAULT_FORM_TITLE;
  const submitLabel = config['submit-label'] || 'Book Test Drive';

  const rawModels = config['car-models'] || '';
  const carModels = rawModels
    ? rawModels.split(',').map((m) => m.trim()).filter(Boolean)
    : DEFAULT_CAR_MODELS;
  const carModelEnum = ['', ...carModels];
  const carModelEnumNames = ['Select a model...', ...carModels];

  const timeEnum = ['', ...TIME_SLOTS];
  const timeEnumNames = ['Select a time...', ...TIME_SLOTS];

  return {
    id: 'test-drive',
    fieldType: 'form',
    appliedCssClassNames: 'test-drive-form',
    items: [
      {
        id: 'heading-test-drive',
        fieldType: 'heading',
        label: { value: formTitle },
        appliedCssClassNames: 'col-12',
      },
      {
        id: 'panel-main',
        name: 'main',
        fieldType: 'panel',
        items: [
          {
            id: 'firstName',
            name: 'firstName',
            fieldType: 'text-input',
            label: { value: 'First name' },
            autoComplete: 'given-name',
            required: true,
            properties: { colspan: 6 },
          },
          {
            id: 'lastName',
            name: 'lastName',
            fieldType: 'text-input',
            label: { value: 'Last name' },
            autoComplete: 'family-name',
            required: true,
            properties: { colspan: 6 },
          },
          {
            id: 'email',
            name: 'email',
            fieldType: 'text-input',
            label: { value: 'Email address' },
            autoComplete: 'email',
            required: true,
            properties: { colspan: 6 },
          },
          {
            id: 'phone',
            name: 'phone',
            fieldType: 'text-input',
            label: { value: 'Phone number' },
            autoComplete: 'tel',
            required: true,
            properties: { colspan: 6 },
          },
          {
            id: 'carModel',
            name: 'carModel',
            fieldType: 'drop-down',
            label: { value: 'Select a model' },
            placeholder: 'Select a model...',
            enum: carModelEnum,
            enumNames: carModelEnumNames,
            required: true,
            type: 'string',
            properties: { colspan: 12 },
          },
          {
            id: 'dealership',
            name: 'dealership',
            fieldType: 'text-input',
            label: { value: 'Preferred dealership / location' },
            autoComplete: 'address-level2',
            properties: { colspan: 12 },
          },
          {
            id: 'preferredDate',
            name: 'preferredDate',
            fieldType: 'text-input',
            label: { value: 'Preferred date (YYYY-MM-DD)' },
            placeholder: 'YYYY-MM-DD',
            required: true,
            properties: { colspan: 6 },
          },
          {
            id: 'preferredTime',
            name: 'preferredTime',
            fieldType: 'drop-down',
            label: { value: 'Preferred time' },
            placeholder: 'Select a time...',
            enum: timeEnum,
            enumNames: timeEnumNames,
            required: true,
            type: 'string',
            properties: { colspan: 6 },
          },
          {
            id: 'submit-btn',
            name: 'submitButton',
            fieldType: 'button',
            buttonType: 'submit',
            label: { value: submitLabel },
            appliedCssClassNames: 'submit-wrapper col-12',
          },
        ],
      },
    ],
  };
}

function showSuccessMessage(form, message) {
  const existing = form.querySelectorAll('.form-message');
  existing.forEach((el) => el.remove());

  const msgEl = document.createElement('div');
  msgEl.className = 'form-message success';
  msgEl.textContent = message;

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.parentNode.insertBefore(msgEl, submitBtn);
    submitBtn.disabled = true;
  } else {
    form.appendChild(msgEl);
  }
}

function attachTestDriveSubmitHandler(block, config) {
  const form = block.querySelector('form');
  if (!form) return;

  const successMessage = config['success-message'] || DEFAULT_SUCCESS_MESSAGE;
  const redirectUrl = config['redirect-url'] || config.redirecturl || '';
  const authoredEventType = config.buttoneventtype ?? config['button-event-type'] ?? '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {};
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const name = field.name || field.id;
      if (!name) return;
      formData[name] = field.type === 'checkbox' ? (field.checked ? field.value || 'true' : '') : field.value;
    });

    const dateValue = String(formData.preferredDate || '').trim();
    if (dateValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const dateField = form.querySelector('[name="preferredDate"]');
      dateField?.classList.add('error');
      return;
    }
    form.querySelector('[name="preferredDate"]')?.classList.remove('error');

    syncFormDataLayer(form, DEFAULT_FORM_FIELD_MAP);

    const submitBtn = form.querySelector("button[type='submit']");
    const eventType = submitBtn?.dataset?.buttonEventType?.trim() || authoredEventType;
    if (eventType) dispatchCustomEvent(eventType);

    showSuccessMessage(form, successMessage);

    if (redirectUrl) setTimeout(() => { window.location.href = redirectUrl; }, 2000);
  });
}

export default async function decorate(block) {
  const config = readBlockConfig(block) || {};
  [...block.children].forEach((row) => { row.style.display = 'none'; });

  // Build layout: image panel (left) + form panel (right)
  const wrapper = document.createElement('div');
  wrapper.className = 'test-drive-wrapper';

  // Image panel
  const imagePanel = document.createElement('div');
  imagePanel.className = 'test-drive-image-panel';

  const imageSrc = config.image || config['image-url'] || '';
  const imageAlt = config['image-alt'] || 'Test drive vehicle';
  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = imageAlt;
    img.className = 'test-drive-vehicle-image';
    img.loading = 'eager';
    imagePanel.append(img);
  }

  const eyebrow = config.eyebrow || '';
  const headline = config.headline || '';
  const subtext = config.subtext || '';
  if (eyebrow || headline || subtext) {
    const textEl = document.createElement('div');
    textEl.className = 'test-drive-image-text';
    if (eyebrow) {
      const eyebrowEl = document.createElement('p');
      eyebrowEl.className = 'test-drive-eyebrow';
      eyebrowEl.textContent = eyebrow;
      textEl.append(eyebrowEl);
    }
    if (headline) {
      const h2 = document.createElement('h2');
      h2.textContent = headline;
      textEl.append(h2);
    }
    if (subtext) {
      const p = document.createElement('p');
      p.className = 'test-drive-subtext';
      p.textContent = subtext;
      textEl.append(p);
    }
    imagePanel.append(textEl);
  }

  // Form panel
  const formPanel = document.createElement('div');
  formPanel.className = 'test-drive-form-panel';

  const formDef = buildTestDriveFormDef(config);
  const formContainer = document.createElement('div');
  formContainer.className = 'form';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = JSON.stringify(formDef);
  pre.append(code);
  formContainer.append(pre);
  formPanel.append(formContainer);

  wrapper.append(imagePanel, formPanel);
  block.replaceChildren(wrapper);

  const formModule = await import('../form/form.js');
  await formModule.default(formContainer);

  setTimeout(() => {
    applyButtonConfigToSubmitButton(block, config);
    attachTestDriveSubmitHandler(block, config);
    const form = block.querySelector('form');
    if (form) {
      syncFormDataLayer(form, DEFAULT_FORM_FIELD_MAP);
      attachLiveFormSync(form, DEFAULT_FORM_FIELD_MAP);
    }
  }, 100);
}
