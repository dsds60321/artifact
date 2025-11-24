let apiDocsManager2;

class ApiDocsManager2 {
    constructor() {
        this.form = document.getElementById('apiDocsForm');
        this.endpointsList = document.getElementById('endpointsList');
        this.addEndpointBtn = document.getElementById('addEndpointBtn');
        this.endpointTemplate = document.getElementById('endpointTemplate');
        this.formFieldTemplate = document.getElementById('endpointFormFieldTemplate');
        this.paramFieldTemplate = document.getElementById('endpointParamFieldTemplate');
        this.emptyState = this.endpointsList?.querySelector('.empty-state') ?? null;
        this.titleInput = document.getElementById('title');
        this.versionInput = document.getElementById('version');
        this.previewEl = document.getElementById('apiJsonPreview');
        this.initialData = this.loadInitialData();

        this.endpointCounter = 0;

        this.bindGlobalEvents();
        this.prefillMeta();
        this.renderInitialEndpoints();
        this.updateJsonPreview();
    }

    bindGlobalEvents() {
        this.addEndpointBtn?.addEventListener('click', () => this.addEndpoint());

        this.titleInput?.addEventListener('input', () => this.updateJsonPreview());
        this.versionInput?.addEventListener('input', () => this.updateJsonPreview());
    }

    loadInitialData() {
        const holder = document.getElementById('apiDocsInitialData');
        if (!holder) return null;

        const raw = holder.textContent?.trim();
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('초기 API 문서 데이터를 파싱할 수 없습니다.', error);
            return null;
        }
    }

    prefillMeta() {
        if (!this.initialData) return;

        const title = this.initialData.title ?? this.initialData?.info?.title;
        const version = this.initialData.version ?? this.initialData?.info?.version;

        if (this.titleInput && !this.titleInput.value && typeof title === 'string') {
            this.titleInput.value = title;
        }

        if (this.versionInput && !this.versionInput.value && typeof version === 'string') {
            this.versionInput.value = version;
        }
    }

    renderInitialEndpoints() {
        const endpoints = this.normalizeInitialEndpoints()
            .filter((endpoint) => this.isMeaningfulEndpoint(endpoint));
        if (endpoints.length > 0) {
            endpoints.forEach((endpoint) => this.addEndpoint(endpoint));
            return;
        }

        this.toggleEmptyState();
    }

    normalizeInitialEndpoints() {
        if (!this.initialData) {
            return [];
        }

        if (Array.isArray(this.initialData.endpoints)) {
            return this.initialData.endpoints.map((endpoint) => this.normalizeLegacyEndpoint(endpoint));
        }

        if (this.initialData.paths && typeof this.initialData.paths === 'object') {
            return this.normalizeOpenApiEndpoints(this.initialData.paths);
        }

        return [];
    }

    normalizeLegacyEndpoint(endpoint = {}) {
        const params = Array.isArray(endpoint.params)
            ? endpoint.params.map((param) => ({
                key: param.name ?? param.key ?? '',
                value: param.value ?? param.example ?? '',
                example: param.example ?? param.value ?? '',
                default: param.default ?? param.schema?.default ?? '',
                required: Boolean(param.required)
            }))
            : [];

        const bodyForm = Array.isArray(endpoint.body?.form)
            ? endpoint.body.form.map((field) => ({
                key: field.key ?? '',
                type: field.type ?? 'string',
                example: field.example ?? field.value ?? '',
                default: field.default ?? '',
                required: Boolean(field.required)
            }))
            : [];

        return {
            method: endpoint.method ?? 'GET',
            url: endpoint.path ?? endpoint.url ?? '',
            params,
            body: {
                mode: endpoint.body?.mode === 'raw' ? 'raw' : 'form',
                form: bodyForm,
                raw: endpoint.body?.raw ?? '',
                rawRequired: endpoint.body?.rawRequired ?? '',
                rawDefault: endpoint.body?.rawDefault ?? ''
            }
        };
    }

    normalizeOpenApiEndpoints(paths = {}) {
        const endpoints = [];

        Object.entries(paths).forEach(([pathKey, operations]) => {
            Object.entries(operations).forEach(([method, operation]) => {
                if (!operation || typeof operation !== 'object') {
                    return;
                }

                const params = Array.isArray(operation.parameters)
                    ? operation.parameters
                        .filter((param) => param?.in === 'query')
                        .map((param) => ({
                            key: param.name ?? '',
                            value: param.example ?? param.schema?.example ?? '',
                            example: param.example ?? param.schema?.example ?? '',
                            default: param.schema?.default ?? '',
                            required: Boolean(param.required)
                        }))
                    : [];

                let bodyMode = 'form';
                let form = [];
                let raw = '';
                let rawRequired = '';
                let rawDefault = '';

                const requestBody = operation.requestBody?.content?.['application/json'];
                if (requestBody) {
                    const schema = requestBody.schema;
                    if (schema?.properties && typeof schema.properties === 'object') {
                        const requiredList = Array.isArray(schema.required) ? schema.required : [];
                        form = Object.entries(schema.properties).map(([key, property]) => ({
                            key,
                            type: property?.type ?? 'string',
                            example: property?.example ?? '',
                            default: property?.default ?? '',
                            required: requiredList.includes(key)
                        }));
                        bodyMode = 'form';
                    } else if (requestBody.example !== undefined) {
                        bodyMode = 'raw';
                        raw = typeof requestBody.example === 'string'
                            ? requestBody.example
                            : JSON.stringify(requestBody.example, null, 2);
                        if (Array.isArray(schema?.required)) {
                            rawRequired = schema.required.join(', ');
                        }
                        if (schema?.default !== undefined) {
                            rawDefault = typeof schema.default === 'string'
                                ? schema.default
                                : JSON.stringify(schema.default);
                        }
                    } else if (schema && !schema.properties) {
                        bodyMode = 'raw';
                        raw = JSON.stringify(schema, null, 2);
                        if (Array.isArray(schema.required)) {
                            rawRequired = schema.required.join(', ');
                        }
                        if (schema.default !== undefined) {
                            rawDefault = typeof schema.default === 'string'
                                ? schema.default
                                : JSON.stringify(schema.default);
                        }
                    }
                }

                endpoints.push({
                    method: method.toUpperCase(),
                    url: pathKey,
                    params,
                    body: {
                        mode: bodyMode,
                        form,
                        raw,
                        rawRequired,
                        rawDefault
                    }
                });
            });
        });

        return endpoints;
    }

    isMeaningfulEndpoint(endpoint = {}) {
        const hasUrl = Boolean(endpoint.url && endpoint.url.trim());
        const hasParams = Array.isArray(endpoint.params) && endpoint.params.some((param) => Boolean(param.key));
        const hasBody = Array.isArray(endpoint.body?.form) && endpoint.body.form.some((field) => Boolean(field.key));
        const hasRaw = endpoint.body?.mode === 'raw' && Boolean(endpoint.body?.raw?.trim());
        return hasUrl || hasParams || hasBody || hasRaw;
    }

    addEndpoint(prefill = {}) {
        if (!this.endpointTemplate || !this.endpointsList) {
            return;
        }

        const endpointEl = this.endpointTemplate.content.firstElementChild.cloneNode(true);
        const index = this.endpointCounter++;
        endpointEl.dataset.index = String(index);

        this.assignNames(endpointEl, index);

        const initialFormRows = endpointEl.querySelectorAll('[data-body-card] [data-form-field]').length;
        const initialParamRows = endpointEl.querySelectorAll('[data-param-field]').length;
        endpointEl.dataset.formRowCounter = String(initialFormRows);
        endpointEl.dataset.paramRowCounter = String(initialParamRows);

        this.endpointsList.appendChild(endpointEl);
        this.toggleEmptyState();

        this.setupEndpointListeners(endpointEl);

        const method = (prefill.method || 'GET').toUpperCase();
        const url = prefill.url || '';
        const bodyMode = prefill.body?.mode === 'raw' ? 'raw' : 'form';
        const formFields = bodyMode === 'form'
            ? (Array.isArray(prefill.body?.form)
                ? prefill.body.form
                : this.convertRawBodyToForm(prefill.body?.raw))
            : [];
        const rawExample = prefill.body?.raw || '';
        const rawRequired = prefill.body?.rawRequired || '';
        const rawDefault = prefill.body?.rawDefault || '';
        const params = Array.isArray(prefill.params) ? prefill.params : [];

        this.setMethodValue(endpointEl, method);
        this.setUrlValue(endpointEl, url);
        this.setBodyMode(endpointEl, bodyMode, { silent: true });
        this.updateParamVisibility(endpointEl);
        this.updateBodyVisibility(endpointEl);

        if (bodyMode === 'form') {
            if (formFields.length > 0) {
                formFields.forEach((field) => this.addFormField(endpointEl, field, { silent: true }));
            }
        } else {
            const rawTextarea = endpointEl.querySelector('[data-field="rawBody"]');
            const rawRequiredInput = endpointEl.querySelector('[data-field="rawRequired"]');
            const rawDefaultInput = endpointEl.querySelector('[data-field="rawDefault"]');
            if (rawTextarea) rawTextarea.value = rawExample;
            if (rawRequiredInput) rawRequiredInput.value = rawRequired;
            if (rawDefaultInput) rawDefaultInput.value = rawDefault;
            this.validateRawSection(endpointEl);
        }

        if (params.length > 0) {
            const paramRows = Array.from(endpointEl.querySelectorAll('[data-param-field]'));
            if (paramRows.length > 0) {
                this.applyParamPreset(paramRows[0], params[0]);
                params.slice(1).forEach((item) => this.addParamField(endpointEl, item, { silent: true }));
            } else {
                params.forEach((item) => this.addParamField(endpointEl, item, { silent: true }));
            }
        }

        this.ensureParamFieldPresence(endpointEl);
        this.ensureFormFieldPresence(endpointEl);
        this.updateParamsState(endpointEl);
        this.updateBodyState(endpointEl);
        this.updateSummary(endpointEl);
        this.updateJsonPreview();
    }

    assignNames(scope, index) {
        scope.querySelectorAll('[data-name]').forEach((element) => {
            const template = element.dataset.name;
            if (template) {
                element.name = template.replace(/__index__/g, index);
            }
        });
    }

    setupEndpointListeners(endpointEl) {
        const methodSelect = endpointEl.querySelector('[data-method-select]');
        const urlInput = endpointEl.querySelector('[data-url-input]');
        const bodyModeButtons = endpointEl.querySelectorAll('[data-body-mode-btn]');
        const toggleBtn = endpointEl.querySelector('[data-toggle-endpoint]');
        const removeBtn = endpointEl.querySelector('[data-remove-endpoint]');
        const paramTableBody = endpointEl.querySelector('[data-param-fields]');
        const formTableBody = endpointEl.querySelector('[data-body-card] [data-form-fields]');
        const rawTextarea = endpointEl.querySelector('[data-field="rawBody"]');
        const rawRequiredInput = endpointEl.querySelector('[data-field="rawRequired"]');
        const rawDefaultInput = endpointEl.querySelector('[data-field="rawDefault"]');

        methodSelect?.addEventListener('change', () => {
            this.updateSummary(endpointEl);
            this.updateParamVisibility(endpointEl);
            this.updateBodyVisibility(endpointEl);
            this.updateJsonPreview();
        });

        urlInput?.addEventListener('input', () => {
            this.updateSummary(endpointEl);
            this.updateJsonPreview();
        });

        bodyModeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.bodyModeBtn === 'raw' ? 'raw' : 'form';
                this.setBodyMode(endpointEl, mode);
            });
        });

        if (paramTableBody) {
            paramTableBody.querySelectorAll('[data-param-field]').forEach((row) => {
                this.attachParamFieldListeners(row, endpointEl);
            });

            paramTableBody.addEventListener('click', (event) => {
                const target = event.target.closest('[data-remove-param-field]');
                if (target) {
                    const row = target.closest('[data-param-field]');
                    if (row) {
                        row.remove();
                        this.ensureParamFieldPresence(endpointEl);
                        this.updateParamsState(endpointEl);
                        this.updateSummary(endpointEl);
                        this.updateJsonPreview();
                    }
                }
            });
        }

        if (formTableBody) {
            formTableBody.querySelectorAll('[data-form-field]').forEach((row) => {
                this.attachBodyFieldListeners(row, endpointEl);
            });

            formTableBody.addEventListener('click', (event) => {
                const target = event.target.closest('[data-remove-form-field]');
                if (target) {
                    const row = target.closest('[data-form-field]');
                    if (row) {
                        row.remove();
                        this.ensureFormFieldPresence(endpointEl);
                        this.updateBodyState(endpointEl);
                        this.updateJsonPreview();
                    }
                }
            });
        }

        rawTextarea?.addEventListener('input', () => {
            this.validateRawSection(endpointEl);
            this.updateBodyState(endpointEl);
            this.updateJsonPreview();
        });

        rawRequiredInput?.addEventListener('input', () => {
            this.updateJsonPreview();
        });

        rawDefaultInput?.addEventListener('input', () => {
            this.updateBodyState(endpointEl);
            this.updateJsonPreview();
        });

        const prettyBtn = endpointEl.querySelector('[data-pretty-json]');
        prettyBtn?.addEventListener('click', () => this.prettifyRawJson(endpointEl));

        toggleBtn?.addEventListener('click', () => this.toggleEndpointBody(endpointEl, toggleBtn));
        removeBtn?.addEventListener('click', () => this.removeEndpoint(endpointEl));
    }

    getMethodValue(endpointEl) {
        return endpointEl
            .querySelector('[data-method-select]')
            ?.value
            ?.trim()
            ?.toUpperCase() || 'GET';
    }

    isGetMethod(endpointEl) {
        return this.getMethodValue(endpointEl) === 'GET';
    }

    setMethodValue(endpointEl, method) {
        const methodSelect = endpointEl.querySelector('[data-method-select]');
        if (methodSelect) {
            methodSelect.value = method;
        }
        this.updateSummary(endpointEl);
        this.updateParamVisibility(endpointEl);
        this.updateBodyVisibility(endpointEl);
        this.updateParamsState(endpointEl);
    }

    setUrlValue(endpointEl, url) {
        const urlInput = endpointEl.querySelector('[data-url-input]');
        if (urlInput) {
            urlInput.value = url;
        }
        this.updateSummary(endpointEl);
        this.updateParamsState(endpointEl);
    }

    setBodyMode(endpointEl, mode, { silent = false } = {}) {
        const normalizedMode = mode === 'raw' ? 'raw' : 'form';
        const hidden = endpointEl.querySelector('[data-body-mode-input]');
        const buttons = endpointEl.querySelectorAll('[data-body-mode-btn]');
        const sections = endpointEl.querySelectorAll('.body-mode-content');

        if (hidden) {
            hidden.value = normalizedMode;
        }

        buttons.forEach((button) => {
            const isActive = button.dataset.bodyModeBtn === normalizedMode;
            button.classList.toggle('active', isActive);
        });

        sections.forEach((section) => {
            const targetMode = section.dataset.bodyMode === normalizedMode;
            section.classList.toggle('d-none', !targetMode);
        });

        if (normalizedMode === 'form') {
            this.ensureFormFieldPresence(endpointEl);
        } else {
            this.validateRawSection(endpointEl);
        }

        this.updateBodyState(endpointEl);

        if (!silent) {
            this.updateJsonPreview();
        }
    }

    addFormField(endpointEl, preset = {}, { silent = false } = {}) {
        if (!this.formFieldTemplate) return;

        const tableBody = endpointEl.querySelector('[data-body-card] [data-form-fields]');
        if (!tableBody) return;

        const rowEl = this.formFieldTemplate.content.firstElementChild.cloneNode(true);
        const endpointIndex = endpointEl.dataset.index;
        const rowIndex = Number(endpointEl.dataset.formRowCounter || '0');
        endpointEl.dataset.formRowCounter = String(rowIndex + 1);

        rowEl.dataset.rowIndex = String(rowIndex);
        rowEl.querySelectorAll('[data-name]').forEach((element) => {
            const template = element.dataset.name;
            if (template) {
                element.name = template
                    .replace(/__index__/g, endpointIndex)
                    .replace(/__row__/g, rowIndex);
            }
        });

        const keyInput = rowEl.querySelector('[data-body-field="key"]');
        const typeSelect = rowEl.querySelector('[data-body-field="type"]');
        const exampleInput = rowEl.querySelector('[data-body-field="example"]');
        const defaultInput = rowEl.querySelector('[data-body-field="default"]');
        const requiredInput = rowEl.querySelector('[data-body-field="required"]');

        if (keyInput) {
            keyInput.value = preset.key ?? '';
        }
        if (typeSelect && preset.type) {
            typeSelect.value = preset.type;
        }
        if (exampleInput) {
            exampleInput.value = preset.example ?? '';
        }
        if (defaultInput) {
            defaultInput.value = preset.default ?? '';
        }
        if (requiredInput) {
            requiredInput.checked = Boolean(preset.required);
        }

        tableBody.appendChild(rowEl);
        this.attachBodyFieldListeners(rowEl, endpointEl);

        if (!silent) {
            this.updateBodyState(endpointEl);
            this.updateJsonPreview();
        }
    }

    addParamField(endpointEl, preset = {}, { silent = false } = {}) {
        if (!this.paramFieldTemplate) return;

        const tableBody = endpointEl.querySelector('[data-param-fields]');
        if (!tableBody) return;

        const rowEl = this.paramFieldTemplate.content.firstElementChild.cloneNode(true);
        const endpointIndex = endpointEl.dataset.index;
        const rowIndex = Number(endpointEl.dataset.paramRowCounter || '0');
        endpointEl.dataset.paramRowCounter = String(rowIndex + 1);

        rowEl.dataset.rowIndex = String(rowIndex);
        rowEl.querySelectorAll('[data-name]').forEach((element) => {
            const template = element.dataset.name;
            if (template) {
                element.name = template
                    .replace(/__index__/g, endpointIndex)
                    .replace(/__row__/g, rowIndex);
            }
        });

        this.applyParamPreset(rowEl, preset);

        tableBody.appendChild(rowEl);
        this.attachParamFieldListeners(rowEl, endpointEl);

        if (!silent) {
            this.updateParamsState(endpointEl);
            this.updateSummary(endpointEl);
            this.updateJsonPreview();
        }
    }

    attachParamFieldListeners(rowEl, endpointEl) {
        const inputs = rowEl.querySelectorAll('input');
        inputs.forEach((input) => {
            const eventName = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventName, () => {
                this.ensureParamFieldPresence(endpointEl);
                this.updateParamsState(endpointEl);
                this.updateSummary(endpointEl);
                this.updateJsonPreview();
            });
        });
    }

    applyParamPreset(rowEl, preset = {}) {
        const keyInput = rowEl.querySelector('[data-param-field="key"]');
        const valueInput = rowEl.querySelector('[data-param-field="value"]');
        const exampleInput = rowEl.querySelector('[data-param-field="example"]');
        const defaultInput = rowEl.querySelector('[data-param-field="default"]');
        const requiredInput = rowEl.querySelector('[data-param-field="required"]');

        if (keyInput) keyInput.value = preset.key ?? '';
        if (valueInput) valueInput.value = preset.value ?? '';
        if (exampleInput) exampleInput.value = preset.example ?? '';
        if (defaultInput) defaultInput.value = preset.default ?? '';
        if (requiredInput) requiredInput.checked = Boolean(preset.required);
    }

    attachBodyFieldListeners(rowEl, endpointEl) {
        const inputs = rowEl.querySelectorAll('input, select');
        inputs.forEach((input) => {
            const eventName = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventName, () => {
                this.ensureFormFieldPresence(endpointEl);
                this.updateBodyState(endpointEl);
                this.updateJsonPreview();
            });
        });
    }

    ensureFormFieldPresence(endpointEl) {
        const tableBody = endpointEl.querySelector('[data-body-card] [data-form-fields]');
        if (!tableBody) return;

        const mode = endpointEl.querySelector('[data-body-mode-input]')?.value ?? 'form';
        if (mode === 'raw') {
            return;
        }

        const bodyCard = endpointEl.querySelector('[data-body-card]');
        if (bodyCard && bodyCard.style.display === 'none') {
            return;
        }

        let rows = Array.from(tableBody.querySelectorAll('[data-form-field]'));
        if (rows.length === 0) {
            this.addFormField(endpointEl, {}, { silent: true });
            rows = Array.from(tableBody.querySelectorAll('[data-form-field]'));
        }

        this.removeRedundantEmptyRows(rows, 'body');

        const latestRows = Array.from(tableBody.querySelectorAll('[data-form-field]'));
        const lastRow = latestRows[latestRows.length - 1];
        if (lastRow && !this.isBodyRowEmpty(lastRow)) {
            this.addFormField(endpointEl, {}, { silent: true });
        }
    }

    ensureParamFieldPresence(endpointEl) {
        const tableBody = endpointEl.querySelector('[data-param-fields]');
        if (!tableBody) return;

        if (!this.isGetMethod(endpointEl)) {
            return;
        }

        let rows = Array.from(tableBody.querySelectorAll('[data-param-field]'));
        if (rows.length === 0) {
            this.addParamField(endpointEl, {}, { silent: true });
            rows = Array.from(tableBody.querySelectorAll('[data-param-field]'));
        }

        this.removeRedundantEmptyRows(rows, 'param');

        const latestRows = Array.from(tableBody.querySelectorAll('[data-param-field]'));
        const lastRow = latestRows[latestRows.length - 1];
        if (lastRow && !this.isParamRowEmpty(lastRow)) {
            this.addParamField(endpointEl, {}, { silent: true });
        }
    }

    removeRedundantEmptyRows(rows, type) {
        if (rows.length <= 1) return;

        const isEmpty = type === 'body'
            ? (row) => this.isBodyRowEmpty(row)
            : (row) => this.isParamRowEmpty(row);

        const lastIndex = rows.length - 1;
        rows.forEach((row, index) => {
            if (index === lastIndex) return;
            if (isEmpty(row) && isEmpty(rows[lastIndex])) {
                row.remove();
            }
        });
    }

    isBodyRowEmpty(row) {
        const key = row.querySelector('[data-body-field="key"]')?.value?.trim();
        const example = row.querySelector('[data-body-field="example"]')?.value?.trim();
        const defaultValue = row.querySelector('[data-body-field="default"]')?.value?.trim();
        const required = row.querySelector('[data-body-field="required"]')?.checked ?? false;
        return !key && !example && !defaultValue && !required;
    }

    isParamRowEmpty(row) {
        const key = row.querySelector('[data-param-field="key"]')?.value?.trim();
        const value = row.querySelector('[data-param-field="value"]')?.value?.trim();
        const example = row.querySelector('[data-param-field="example"]')?.value?.trim();
        const defaultValue = row.querySelector('[data-param-field="default"]')?.value?.trim();
        const required = row.querySelector('[data-param-field="required"]')?.checked ?? false;
        return !key && !value && !example && !defaultValue && !required;
    }

    updateSummary(endpointEl) {
        const methodSelect = endpointEl.querySelector('[data-method-select]');
        const urlInput = endpointEl.querySelector('[data-url-input]');
        const badge = endpointEl.querySelector('[data-method-badge]');
        const urlPreview = endpointEl.querySelector('[data-url-preview]');

        const method = this.getMethodValue(endpointEl);
        const url = urlInput?.value?.trim() || '';
        const params = this.isGetMethod(endpointEl)
            ? this.getParamsData(endpointEl, { includeEmpty: false })
            : [];
        const displayUrl = this.composeDisplayUrl(url, params) || '요청 URL을 입력하세요.';

        if (badge) {
            badge.textContent = method;
            this.applyMethodBadgeStyle(badge, method);
        }

        if (urlPreview) {
            urlPreview.textContent = displayUrl;
        }
    }

    applyMethodBadgeStyle(badge, method) {
        const methodClasses = [
            'method-get',
            'method-post',
            'method-put',
            'method-patch',
            'method-delete',
            'method-options',
            'method-head',
            'method-default',
        ];
        badge.classList.remove(...methodClasses);

        const map = {
            GET: 'method-get',
            POST: 'method-post',
            PUT: 'method-put',
            PATCH: 'method-patch',
            DELETE: 'method-delete',
            OPTIONS: 'method-options',
            HEAD: 'method-head',
        };

        const className = map[method] ?? 'method-default';
        badge.classList.add(className);
    }

    toggleEndpointBody(endpointEl, toggleBtn) {
        const body = endpointEl.querySelector('.endpoint-body');
        if (!body) return;

        const collapsed = body.classList.toggle('collapsed');
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-chevron-up', !collapsed);
            icon.classList.toggle('fa-chevron-down', collapsed);
        }
    }

    removeEndpoint(endpointEl) {
        endpointEl.remove();
        this.toggleEmptyState();
        this.updateJsonPreview();
    }

    toggleEmptyState() {
        if (!this.emptyState) return;

        const hasEndpoint = this.endpointsList?.querySelector('[data-endpoint]');
        this.emptyState.style.display = hasEndpoint ? 'none' : '';
    }

    getParamsData(endpointEl, { includeEmpty = false } = {}) {
        const rows = Array.from(endpointEl.querySelectorAll('[data-param-field]'));
        const data = rows.map((row) => this.readParamRow(row));

        if (includeEmpty) {
            return data;
        }

        return data.filter((param) => param.key || param.value || param.example || param.default || param.required);
    }

    readParamRow(row) {
        const key = row.querySelector('[data-param-field="key"]')?.value?.trim() ?? '';
        const value = row.querySelector('[data-param-field="value"]')?.value?.trim() ?? '';
        const example = row.querySelector('[data-param-field="example"]')?.value?.trim() ?? '';
        const defaultValue = row.querySelector('[data-param-field="default"]')?.value?.trim() ?? '';
        const required = row.querySelector('[data-param-field="required"]')?.checked ?? false;
        return { key, value, example, default: defaultValue, required };
    }

    updateParamsState(endpointEl) {
        const preview = endpointEl.querySelector('[data-params-preview]');
        const emptyLabel = endpointEl.querySelector('[data-params-empty-label]');
        const queryInput = endpointEl.querySelector('[data-query-preview-input]');
        const isGet = this.isGetMethod(endpointEl);
        const params = this.getParamsData(endpointEl, { includeEmpty: false });
        const queryString = this.buildQueryString(params);

        if (preview) {
            if (isGet) {
                preview.textContent = queryString ? `?${queryString}` : '예: ?status=ACTIVE';
            } else {
                preview.textContent = 'GET 메서드에서만 Query Params를 구성할 수 있습니다.';
            }
        }

        if (queryInput) {
            if (isGet) {
                const basePath = endpointEl.querySelector('[data-url-input]')?.value?.trim() ?? '';
                queryInput.placeholder = '예: /orders?status=ACTIVE';
                const display = this.composeDisplayUrl(basePath, params);
                queryInput.value = display || '';
            } else {
                queryInput.value = '';
                queryInput.placeholder = 'GET 메서드에서만 Query String이 생성됩니다.';
            }
        }

        if (emptyLabel) {
            if (isGet) {
                emptyLabel.style.display = params.length ? 'none' : '';
            } else {
                emptyLabel.style.display = 'none';
            }
        }
    }

    updateBodyState(endpointEl) {
        const emptyLabel = endpointEl.querySelector('[data-body-empty-label]');

        if (!emptyLabel) return;

        const mode = endpointEl.querySelector('[data-body-mode-input]')?.value ?? 'form';

        if (mode === 'raw') {
            const rawValue = endpointEl.querySelector('[data-field="rawBody"]')?.value?.trim() ?? '';
            const rawDefault = endpointEl.querySelector('[data-field="rawDefault"]')?.value?.trim() ?? '';
            const hasContent = Boolean(rawValue || rawDefault);
            emptyLabel.style.display = hasContent ? 'none' : '';
            return;
        }

        const rows = Array.from(endpointEl.querySelectorAll('[data-form-field]'));
        const hasContent = rows.some((row) => !this.isBodyRowEmpty(row));
        emptyLabel.style.display = hasContent ? 'none' : '';
    }

    updateBodyVisibility(endpointEl) {
        const card = endpointEl.querySelector('[data-body-card]');
        if (!card) return;

        const method = this.getMethodValue(endpointEl);
        const visible = method === 'POST';
        card.style.display = visible ? '' : 'none';

        if (!visible) {
            return;
        }

        const currentMode = endpointEl.querySelector('[data-body-mode-input]')?.value ?? 'form';
        this.setBodyMode(endpointEl, currentMode, { silent: true });
        if (currentMode === 'form') {
            this.ensureFormFieldPresence(endpointEl);
        }
        this.updateBodyState(endpointEl);
    }

    buildQueryString(params) {
        if (!Array.isArray(params) || params.length === 0) {
            return '';
        }

        return params
            .map(({ key, value }) => {
                if (!key || !value) return null;
                const parsed = this.parseScalarValue(value);
                return `${encodeURIComponent(key)}=${encodeURIComponent(this.stringifyQueryValue(parsed.value, parsed.type))}`;
            })
            .filter(Boolean)
            .join('&');
    }

    composeDisplayUrl(url, params) {
        const base = (url || '').trim();
        const query = this.buildQueryString(params);

        if (!base) {
            return query ? `?${query}` : '';
        }

        if (!query) {
            return base;
        }

        if (base.includes('?')) {
            const needsAmpersand = !base.endsWith('?') && !base.endsWith('&');
            return `${base}${needsAmpersand ? '&' : ''}${query}`;
        }

        return `${base}?${query}`;
    }

    buildSpec() {
        const title = this.titleInput?.value?.trim() || '';
        const version = this.versionInput?.value?.trim() || '';
        const paths = {};

        const endpointElements = Array.from(this.endpointsList?.querySelectorAll('[data-endpoint]') ?? []);
        endpointElements.forEach((endpointEl) => {
            const methodValue = this.getMethodValue(endpointEl);
            const pathValue = endpointEl.querySelector('[data-url-input]')?.value?.trim();
            const method = (methodValue || 'GET').toLowerCase();
            const path = this.normalizePath(pathValue);
            const params = this.buildParameters(endpointEl);
            const requestBody = this.buildRequestBody(endpointEl);

            if (!path && params.length === 0 && !requestBody) {
                return;
            }

            const operation = this.stripEmpty({
                summary: undefined,
                parameters: params,
                requestBody,
                responses: {
                    200: {
                        description: 'OK'
                    }
                }
            });

            if (!path) {
                return;
            }

            if (!operation) {
                return;
            }

            if (!paths[path]) {
                paths[path] = {};
            }
            paths[path][method] = operation;
        });

        return {
            openapi: '3.0.3',
            info: {
                title: title || '',
                version: version || ''
            },
            paths
        };
    }

    normalizePath(url) {
        if (!url) return '';
        const trimmed = url.trim();
        if (!trimmed) return '';
        const base = trimmed.split('?')[0];
        if (!base) return '';
        if (base.startsWith('/')) return base;
        return `/${base}`;
    }

    buildParameters(endpointEl) {
        if (!this.isGetMethod(endpointEl)) {
            return [];
        }

        const params = this.getParamsData(endpointEl, { includeEmpty: false });
        return params
            .filter((param) => param.key)
            .map((param) => {
                const parsedValue = param.value ? this.parseScalarValue(param.value) : null;
                const parsedExample = param.example ? this.parseScalarValue(param.example) : parsedValue;
                const parsedDefault = param.default ? this.parseScalarValue(param.default) : null;

                const schemaType = parsedExample?.type || parsedDefault?.type || 'string';
                const schema = { type: schemaType };

                if (parsedDefault && parsedDefault.value !== '') {
                    schema.default = parsedDefault.value;
                }
                if (parsedExample && parsedExample.value !== '') {
                    schema.example = parsedExample.value;
                }

                const parameter = {
                    name: param.key,
                    in: 'query',
                    required: Boolean(param.required),
                    schema
                };

                if (parsedExample && parsedExample.value !== '') {
                    parameter.example = parsedExample.value;
                } else if (parsedValue && parsedValue.value !== '') {
                    parameter.example = parsedValue.value;
                }

                return parameter;
            });
    }

    buildRequestBody(endpointEl) {
        const method = this.getMethodValue(endpointEl);
        if (method !== 'POST') {
            return undefined;
        }

        const mode = endpointEl.querySelector('[data-body-mode-input]')?.value ?? 'form';
        if (mode === 'raw') {
            return this.buildRawRequestBody(endpointEl);
        }
        return this.buildFormRequestBody(endpointEl);
    }

    buildFormRequestBody(endpointEl) {
        const rows = Array.from(endpointEl.querySelectorAll('[data-form-field]'));
        const properties = {};
        const requiredProps = [];

        rows.forEach((row) => {
            const key = row.querySelector('[data-body-field="key"]')?.value?.trim();
            if (!key) return;

            const type = row.querySelector('[data-body-field="type"]')?.value ?? 'string';
            const example = row.querySelector('[data-body-field="example"]')?.value?.trim();
            const defaultValue = row.querySelector('[data-body-field="default"]')?.value?.trim();
            const required = row.querySelector('[data-body-field="required"]')?.checked ?? false;

            const property = { type };
            if (example) {
                property.example = this.parseValueByType(example, type);
            }
            if (defaultValue) {
                property.default = this.parseValueByType(defaultValue, type);
            }
            properties[key] = property;
            if (required) {
                requiredProps.push(key);
            }
        });

        if (!Object.keys(properties).length) {
            return undefined;
        }

        const schema = { type: 'object', properties };
        if (requiredProps.length) {
            schema.required = requiredProps;
        }

        return {
            required: requiredProps.length > 0,
            content: {
                'application/json': {
                    schema
                }
            }
        };
    }

    buildRawRequestBody(endpointEl) {
        const rawTextarea = endpointEl.querySelector('[data-field="rawBody"]');
        const rawRequiredInput = endpointEl.querySelector('[data-field="rawRequired"]');
        const rawDefaultInput = endpointEl.querySelector('[data-field="rawDefault"]');

        const raw = rawTextarea?.value?.trim();
        if (!raw) {
            return undefined;
        }

        const isValid = this.validateRawSection(endpointEl);
        if (!isValid) {
            return undefined;
        }

        const parsedExample = this.safeJsonParse(raw);
        const exampleValue = parsedExample.success ? parsedExample.value : raw;
        let schema = parsedExample.success
            ? this.deriveSchemaFromValue(parsedExample.value)
            : { type: 'string' };

        const requiredList = rawRequiredInput?.value
            ?.split(',')
            .map((item) => item.trim())
            .filter(Boolean) ?? [];

        if (schema.type === 'object' && requiredList.length) {
            schema.required = Array.from(new Set(requiredList));
        }

        const defaultRaw = rawDefaultInput?.value?.trim();
        if (defaultRaw) {
            const parsedDefault = this.safeJsonParse(defaultRaw);
            if (parsedDefault.success) {
                schema.default = parsedDefault.value;
            }
        }

        const mediaTypeObject = this.stripEmpty({
            schema,
            example: exampleValue
        });

        const requestBody = this.stripEmpty({
            required: requiredList.length > 0,
            content: {
                'application/json': mediaTypeObject
            }
        });

        return requestBody;
    }


    parseScalarValue(value) {
        if (value === undefined || value === null) {
            return { type: 'string', value: '' };
        }

        const trimmed = String(value).trim();
        if (!trimmed) {
            return { type: 'string', value: '' };
        }

        const lowered = trimmed.toLowerCase();
        if (lowered === 'true') {
            return { type: 'boolean', value: true };
        }
        if (lowered === 'false') {
            return { type: 'boolean', value: false };
        }

        const numberValue = Number(trimmed);
        if (!Number.isNaN(numberValue)) {
            return {
                type: Number.isInteger(numberValue) ? 'integer' : 'number',
                value: numberValue
            };
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return { type: 'array', value: parsed };
            }
            if (parsed && typeof parsed === 'object') {
                return { type: 'object', value: parsed };
            }
        } catch (error) {
            // treat as plain string
        }

        return { type: 'string', value: trimmed };
    }

    parseValueByType(value, type) {
        if (!value) return value;

        switch (type) {
            case 'integer': {
                const parsed = Number.parseInt(value, 10);
                return Number.isNaN(parsed) ? value : parsed;
            }
            case 'number': {
                const parsed = Number.parseFloat(value);
                return Number.isNaN(parsed) ? value : parsed;
            }
            case 'boolean':
                if (value.toLowerCase() === 'true') return true;
                if (value.toLowerCase() === 'false') return false;
                return value;
            case 'array':
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : value;
                } catch (error) {
                    return value.split(',').map((item) => item.trim()).filter(Boolean);
                }
            case 'object':
                try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === 'object' ? parsed : value;
                } catch (error) {
                    return value;
                }
            default:
                return value;
        }
    }

    stringifyQueryValue(value, type = 'string') {
        if (value === undefined || value === null) {
            return '';
        }
        switch (type) {
            case 'boolean':
                return value ? 'true' : 'false';
            case 'array':
                return Array.isArray(value) ? value.join(',') : String(value);
            case 'object':
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            default:
                return String(value);
        }
    }

    safeJsonParse(value) {
        try {
            return { success: true, value: JSON.parse(value) };
        } catch (error) {
            return { success: false };
        }
    }

    validateRawSection(endpointEl, { silent = false } = {}) {
        const rawTextarea = endpointEl.querySelector('[data-field="rawBody"]');
        const errorEl = endpointEl.querySelector('[data-raw-error]');
        if (!rawTextarea || !errorEl) {
            return true;
        }

        const value = rawTextarea.value?.trim() ?? '';
        if (!value) {
            rawTextarea.classList.remove('is-invalid');
            errorEl.textContent = '';
            return true;
        }

        const parsed = this.safeJsonParse(value);
        if (parsed.success) {
            rawTextarea.classList.remove('is-invalid');
            errorEl.textContent = '';
            return true;
        }

        rawTextarea.classList.add('is-invalid');
        if (!silent) {
            errorEl.textContent = '유효한 JSON 형식이 아닙니다.';
        }
        return false;
    }

    prettifyRawJson(endpointEl) {
        const rawTextarea = endpointEl.querySelector('[data-field="rawBody"]');
        if (!rawTextarea) return;

        const value = rawTextarea.value?.trim();
        if (!value) {
            return;
        }

        const parsed = this.safeJsonParse(value);
        if (!parsed.success) {
            this.validateRawSection(endpointEl);
            return;
        }

        rawTextarea.value = JSON.stringify(parsed.value, null, 2);
        rawTextarea.classList.remove('is-invalid');
        const errorEl = endpointEl.querySelector('[data-raw-error]');
        if (errorEl) {
            errorEl.textContent = '';
        }

        this.updateBodyState(endpointEl);
        this.updateJsonPreview();
    }

    deriveSchemaFromValue(value) {
        if (Array.isArray(value)) {
            const first = value.length ? this.deriveSchemaFromValue(value[0]) : { type: 'string' };
            return this.stripEmpty({
                type: 'array',
                items: first,
                example: value
            });
        }

        if (value === null) {
            return { type: 'string', nullable: true, example: null };
        }

        switch (typeof value) {
            case 'object': {
                const properties = {};
                Object.entries(value).forEach(([key, nested]) => {
                    properties[key] = this.deriveSchemaFromValue(nested);
                });
                return this.stripEmpty({
                    type: 'object',
                    properties,
                    example: value
                });
            }
            case 'number':
                return {
                    type: Number.isInteger(value) ? 'integer' : 'number',
                    example: value
                };
            case 'boolean':
                return { type: 'boolean', example: value };
            default:
                return { type: 'string', example: value };
        }
    }

    updateParamVisibility(endpointEl) {
        const section = endpointEl.querySelector('[data-param-section]');
        if (!section) return;

        const show = this.isGetMethod(endpointEl);
        section.style.display = show ? '' : 'none';

        if (!show) {
            section.querySelectorAll('[data-param-field]').forEach((row) => {
                if (this.isParamRowEmpty(row)) {
                    row.remove();
                }
            });
        } else {
            this.ensureParamFieldPresence(endpointEl);
        }

        this.updateParamsState(endpointEl);
        this.updateSummary(endpointEl);
        this.updateJsonPreview();
    }

    convertRawBodyToForm(raw) {
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return [];
            }

            return Object.entries(parsed).map(([key, value]) => {
                const { type, example } = this.describeValueForForm(value);
                return {
                    key,
                    type,
                    example,
                    default: '',
                    required: false
                };
            });
        } catch (error) {
            return [];
        }
    }

    describeValueForForm(value) {
        if (value === null || value === undefined) {
            return { type: 'string', example: '' };
        }

        if (Array.isArray(value)) {
            return { type: 'array', example: JSON.stringify(value) };
        }

        switch (typeof value) {
            case 'string':
                return { type: 'string', example: value };
            case 'number':
                return {
                    type: Number.isInteger(value) ? 'integer' : 'number',
                    example: String(value)
                };
            case 'boolean':
                return { type: 'boolean', example: value ? 'true' : 'false' };
            case 'object':
                return { type: 'object', example: JSON.stringify(value) };
            default:
                return { type: 'string', example: String(value) };
        }
    }

    updateJsonPreview() {
        if (!this.previewEl) {
            return;
        }

        try {
            const spec = this.buildSpec();
            this.previewEl.textContent = JSON.stringify(spec, null, 2);
        } catch (error) {
            console.warn('JSON 미리보기 생성에 실패했습니다.', error);
            this.previewEl.textContent = '// 스펙 생성 중 오류가 발생했습니다.';
        }
    }

    stripEmpty(value) {
        if (Array.isArray(value)) {
            const cleaned = value
                .map((item) => this.stripEmpty(item))
                .filter((item) => item !== undefined);
            return cleaned.length ? cleaned : undefined;
        }

        if (value && typeof value === 'object' && value.constructor === Object) {
            const result = {};
            Object.entries(value).forEach(([key, val]) => {
                const cleaned = this.stripEmpty(val);
                if (cleaned === undefined) return;
                if (Array.isArray(cleaned) && cleaned.length === 0) return;
                if (cleaned && typeof cleaned === 'object' && Object.keys(cleaned).length === 0) return;
                result[key] = cleaned;
            });
            return Object.keys(result).length ? result : undefined;
        }

        if (value === '' || value === null || value === undefined) {
            return undefined;
        }

        return value;
    }
}



document.addEventListener('DOMContentLoaded', () => {
    apiDocsManager2 = new ApiDocsManager2();
});

window.ApiDocsManager2 = ApiDocsManager2;
