if (window.__docsRequestScriptLoaded) {
    console.debug('Docs request script already loaded, skip redefinition.');
} else {
    window.__docsRequestScriptLoaded = true;

    (function () {
        class DocsRequestManager {
            constructor() {
                this.sequence = Date.now();
                this.requests = [];
                this.form = document.getElementById('apiDocsForm');
                this.addButton = document.getElementById('addRequestCardBtn');
                this.listEl = document.getElementById('requestBuilderList');
                this.emptyEl = document.getElementById('requestBuilderEmpty');
                this.previewEl = document.getElementById('apiJsonPreview');
                this.downloadBtn = document.getElementById('downloadBtn');
                this.projectIdx = this.readNumericInput('projectIdx');
                this.docsIdx = this.readNumericInput('docsIdx');

                this.bindEvents();
                this.loadInitialData();
                if (this.requests.length === 0) {
                    this.addRequest();
                } else {
                    this.renderRequests();
                    this.updatePreview();
                }
            }

            bindEvents() {
                if (this.addButton) {
                    this.addButton.addEventListener('click', () => this.addRequest());
                }
                if (this.form) {
                    this.form.addEventListener('submit', (event) => {
                        event.preventDefault();
                        this.saveDocs();
                    });
                }
                if (this.downloadBtn) {
                    this.downloadBtn.addEventListener('click', () => this.downloadDocs());
                }
                if (this.listEl) {
                    this.listEl.addEventListener('click', (event) => this.handleListClick(event));
                    this.listEl.addEventListener('input', (event) => this.handleListInput(event));
                    this.listEl.addEventListener('change', (event) => this.handleListChange(event));
                }
            }

            readNumericInput(name) {
                const input = document.querySelector(`input[name="${name}"]`);
                if (!input) return null;
                const value = input.value?.trim();
                if (!value) return null;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
            }

            loadInitialData() {
                const holder = document.getElementById('apiDocsInitialData');
                if (!holder) return;
                const raw = holder.textContent?.trim();
                holder.remove();
                if (!raw || raw === 'null') return;
                try {
                    const spec = JSON.parse(raw);
                    if (!spec || typeof spec !== 'object') return;
                    const endpoints = Array.isArray(spec.endpoints) ? spec.endpoints : [];
                    endpoints.forEach((endpoint) => {
                        const request = this.convertEndpointToRequest(endpoint);
                        this.requests.push(request);
                    });
                } catch (error) {
                    console.warn('초기 명세 파싱 실패', error);
                }
            }

            convertEndpointToRequest(endpoint = {}) {
                const request = this.createEmptyRequest();
                request.method = (endpoint.method || 'GET').toUpperCase();
                request.url = endpoint.path || '';

                const params = Array.isArray(endpoint.params) ? endpoint.params : [];
                params.forEach((param) => {
                    if (!param || typeof param !== 'object' || !param.name) return;
                    const pair = { key: param.name || '', value: param.example ?? param.default ?? '' };
                    const location = (param.in || 'query').toLowerCase();
                    if (location === 'header') {
                        request.headers.push(pair);
                    } else {
                        request.params.push(pair);
                    }
                });

                const requestBody = endpoint.requestBody;
                if (requestBody && typeof requestBody === 'object') {
                    const content = requestBody.content && typeof requestBody.content === 'object' ? requestBody.content : {};
                    const [[contentType, contentValue]] = Object.entries(content);
                    if (contentType) {
                        if (contentType.includes('multipart/form-data')) {
                            request.bodyType = 'form-data';
                            const example = this.extractExample(contentValue);
                            Object.entries(example).forEach(([key, value]) => {
                                request.bodyFormData.push({ key, value: this.stringifyValue(value) });
                            });
                        } else if (contentType.includes('application/x-www-form-urlencoded')) {
                            request.bodyType = 'x-www-form-urlencoded';
                            const example = this.extractExample(contentValue);
                            Object.entries(example).forEach(([key, value]) => {
                                request.bodyUrlEncoded.push({ key, value: this.stringifyValue(value) });
                            });
                        } else if (contentType.includes('application/json')) {
                            request.bodyType = 'raw';
                            request.bodyRawType = 'json';
                            const example = this.extractExample(contentValue);
                            request.bodyRawText = JSON.stringify(example, null, 2);
                        } else {
                            request.bodyType = 'raw';
                            request.bodyRawType = 'text';
                            const example = this.extractExample(contentValue);
                            request.bodyRawText = this.stringifyValue(example);
                        }
                    }
                }

                this.ensureTrailingBlankRows(request);
                return request;
            }

            extractExample(contentEntry) {
                if (!contentEntry || typeof contentEntry !== 'object') return {};
                if (contentEntry.example !== undefined) {
                    return contentEntry.example;
                }
                if (contentEntry.examples && typeof contentEntry.examples === 'object') {
                    const first = Object.values(contentEntry.examples)[0];
                    if (first && typeof first === 'object' && 'value' in first) {
                        return first.value;
                    }
                }
                return {};
            }

            stringifyValue(value) {
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') {
                    try {
                        return JSON.stringify(value);
                    } catch (error) {
                        return '';
                    }
                }
                return String(value);
            }

            createEmptyRequest() {
                return {
                    id: this.generateId(),
                    method: 'GET',
                    url: '',
                    activeTab: 'params',
                    params: [],
                    headers: [],
                    bodyType: 'none',
                    bodyRawType: 'json',
                    bodyRawText: '',
                    bodyRawError: '',
                    bodyFormData: [],
                    bodyUrlEncoded: []
                };
            }

            addRequest() {
                const request = this.createEmptyRequest();
                this.ensureTrailingBlankRows(request);
                this.requests.push(request);
                this.renderRequests();
                this.updatePreview();
            }

            removeRequest(id) {
                this.requests = this.requests.filter((request) => request.id !== id);
                this.renderRequests();
                this.updatePreview();
            }

            ensureTrailingBlankRows(request) {
                const ensure = (list) => {
                    const filtered = list.filter((item) => item && (item.key || item.value));
                    filtered.push({ key: '', value: '' });
                    return filtered;
                };
                request.params = ensure(request.params || []);
                request.headers = ensure(request.headers || []);
                request.bodyFormData = ensure(request.bodyFormData || []);
                request.bodyUrlEncoded = ensure(request.bodyUrlEncoded || []);
            }

            handleListClick(event) {
                const button = event.target.closest('[data-action]');
                if (!button) return;
                const requestEl = button.closest('[data-request-id]');
                if (!requestEl) return;
                const requestId = Number(requestEl.dataset.requestId);
                const request = this.requests.find((item) => item.id === requestId);
                if (!request) return;

                const { action } = button.dataset;
                if (action === 'remove-request') {
                    this.removeRequest(requestId);
                    return;
                }
                if (action === 'switch-tab') {
                    const target = button.dataset.tabTarget || 'params';
                    request.activeTab = target;
                    this.renderRequests();
                    return;
                }
                if (action === 'remove-row') {
                    const section = button.dataset.section;
                    const index = Number(button.dataset.index);
                    this.removeRow(request, section, index);
                    return;
                }
                if (action === 'beautify-json') {
                    this.beautifyJson(request);
                }
            }

            handleListInput(event) {
                const target = event.target;
                const requestEl = target.closest('[data-request-id]');
                if (!requestEl) return;
                const requestId = Number(requestEl.dataset.requestId);
                const request = this.requests.find((item) => item.id === requestId);
                if (!request) return;

                if (target.dataset.role === 'url') {
                    request.url = target.value;
                    this.updatePreview();
                    return;
                }
                if (target.dataset.role === 'method') {
                    request.method = target.value.toUpperCase();
                    this.renderRequests();
                    this.updatePreview();
                    return;
                }
                if (target.dataset.role === 'body-raw-text') {
                    request.bodyRawText = target.value;
                    request.bodyRawError = '';
                    this.updatePreview();
                    return;
                }

                const index = Number(target.dataset.index);
                if (Number.isNaN(index)) return;
                const section = target.dataset.section;
                if (!section) return;
                const list = this.getListBySection(request, section);
                if (!list) return;

                const field = target.dataset.field || 'key';
                if (!list[index]) {
                    list[index] = { key: '', value: '' };
                }
                list[index][field] = target.value;

                const wasLastRow = index === list.length - 1;
                const hasValue = Boolean(list[index].key) || Boolean(list[index].value);
                let caret = null;
                if ('selectionStart' in target) {
                    caret = target.selectionStart;
                }

                if (wasLastRow && hasValue) {
                    list.push({ key: '', value: '' });
                    this.renderRequests({
                        focus: { requestId, section, field, index, caret }
                    });
                }

                this.updatePreview();
            }

            handleListChange(event) {
                const target = event.target;
                const requestEl = target.closest('[data-request-id]');
                if (!requestEl) return;
                const requestId = Number(requestEl.dataset.requestId);
                const request = this.requests.find((item) => item.id === requestId);
                if (!request) return;

                if (target.dataset.role === 'body-type') {
                    request.bodyType = target.value;
                    this.renderRequests();
                    this.updatePreview();
                    return;
                }
                if (target.dataset.role === 'body-raw-type') {
                    request.bodyRawType = target.value;
                    this.renderRequests();
                    this.updatePreview();
                }
            }

            removeRow(request, section, index) {
                const list = this.getListBySection(request, section);
                if (!list) return;
                if (index < 0 || index >= list.length) return;
                list.splice(index, 1);
                this.ensureTrailingBlankRows(request);
                this.renderRequests();
                this.updatePreview();
            }

            getListBySection(request, section) {
                switch (section) {
                    case 'params':
                        return request.params;
                    case 'headers':
                        return request.headers;
                    case 'bodyFormData':
                        return request.bodyFormData;
                    case 'bodyUrlEncoded':
                        return request.bodyUrlEncoded;
                    default:
                        return null;
                }
            }

            beautifyJson(request) {
                const raw = request.bodyRawText?.trim();
                if (!raw) {
                    request.bodyRawError = 'JSON 본문을 입력하세요.';
                    this.renderRequests();
                    return;
                }
                try {
                    const parsed = JSON.parse(raw);
                    request.bodyRawText = JSON.stringify(parsed, null, 2);
                    request.bodyRawError = '';
                    this.renderRequests();
                    this.updatePreview();
                } catch (error) {
                    request.bodyRawError = '유효한 JSON 형식이 아닙니다.';
                    this.renderRequests();
                }
            }

            renderRequests(options = {}) {
                if (!this.listEl) return;
                this.requests.forEach((request) => this.ensureTrailingBlankRows(request));
                if (this.requests.length === 0) {
                    this.listEl.innerHTML = '';
                    if (this.emptyEl) this.emptyEl.style.display = '';
                    return;
                }
                if (this.emptyEl) this.emptyEl.style.display = 'none';
                const html = this.requests.map((request, index) => this.renderRequestCard(request, index)).join('');
                this.listEl.innerHTML = html;

                if (options.focus) {
                    const { requestId, section, field, index, caret } = options.focus;
                    if (section && field !== undefined && index !== undefined) {
                        const selector = `[data-request-id="${requestId}"] [data-section="${section}"][data-field="${field}"][data-index="${index}"]`;
                        const input = this.listEl.querySelector(selector);
                        if (input instanceof HTMLInputElement) {
                            input.focus();
                            if (typeof caret === 'number') {
                                const pos = Math.min(caret, input.value.length);
                                input.setSelectionRange(pos, pos);
                            }
                        }
                    }
                }
            }

            renderRequestCard(request, index) {
                const tabButton = (key, label) => `
                    <button type="button" class="request-tab-btn ${request.activeTab === key ? 'active' : ''}" data-action="switch-tab" data-tab-target="${key}">${label}</button>
                `;
                const renderRows = (list, section) => list
                    .map((item, rowIndex) => `
                        <tr>
                            <td>
                                <input type="text" class="form-control form-control-sm" data-role="${section === 'params' || section === 'headers' ? 'text-input' : 'text-input'}" data-section="${section}" data-field="key" data-index="${rowIndex}" value="${this.escapeHtml(item.key || '')}">
                            </td>
                            <td>
                                <input type="text" class="form-control form-control-sm" data-role="text-input" data-section="${section}" data-field="value" data-index="${rowIndex}" value="${this.escapeHtml(item.value || '')}">
                            </td>
                            <td class="request-table-actions">
                                <button type="button" class="btn btn-link text-danger request-row-remove" data-action="remove-row" data-section="${section}" data-index="${rowIndex}" aria-label="행 삭제">
                                    <i class="fas fa-times"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');

                const bodyType = request.bodyType;
                const rawType = request.bodyRawType;
                const bodyRawError = request.bodyRawError;

                return `
                    <div class="request-card" data-request-id="${request.id}">
                        <div class="request-card-header">
                            <div class="request-card-title">
                                <span class="badge bg-primary">${index + 1}</span>
                                <span>${this.escapeHtml(request.method)} ${this.escapeHtml(request.url || '/path')}</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-request">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="request-card-body">
                            <div class="request-basic-row">
                                <select class="form-select form-select-sm" data-role="method">
                                    ${['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => `<option value="${method}" ${request.method === method ? 'selected' : ''}>${method}</option>`).join('')}
                                </select>
                                <input type="text" class="form-control" data-role="url" placeholder="https://api.example.com/v1/resource" value="${this.escapeHtml(request.url)}">
                            </div>
                            <div>
                                <div class="request-tab-list" role="tablist">
                                    ${tabButton('params', 'Params')}
                                    ${tabButton('headers', 'Headers')}
                                    ${tabButton('body', 'Body')}
                                </div>
                                <div class="request-tab-panel ${request.activeTab === 'params' ? 'active' : ''}" data-panel="params">
                                    <div class="request-table-wrapper">
                                        <table class="table request-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col">Key</th>
                                                    <th scope="col">Value</th>
                                                    <th scope="col" class="request-table-actions"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${renderRows(request.params, 'params')}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p class="request-helpers">URL 쿼리 파라미터를 입력하세요.</p>
                                </div>
                                <div class="request-tab-panel ${request.activeTab === 'headers' ? 'active' : ''}" data-panel="headers">
                                    <div class="request-table-wrapper">
                                        <table class="table request-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col">Key</th>
                                                    <th scope="col">Value</th>
                                                    <th scope="col" class="request-table-actions"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${renderRows(request.headers, 'headers')}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p class="request-helpers">요청 헤더를 입력하세요.</p>
                                </div>
                    <div class="request-tab-panel ${request.activeTab === 'body' ? 'active' : ''}" data-panel="body">
                        <div class="request-body-type-group">
                            ${this.renderBodyTypeRadio(request, 'none', 'none')}
                            ${this.renderBodyTypeRadio(request, 'form-data', 'form-data')}
                            ${this.renderBodyTypeRadio(request, 'x-www-form-urlencoded', 'x-www-form-urlencoded')}
                            ${this.renderBodyTypeRadio(request, 'raw', 'raw')}
                                    </div>
                                    <div class="request-body-option" data-body-option="none" style="display: ${bodyType === 'none' ? '' : 'none'};">
                                        <p class="request-helpers mb-0">이 요청에는 Body가 포함되지 않습니다.</p>
                                    </div>
                                    <div class="request-body-option" data-body-option="form-data" style="display: ${bodyType === 'form-data' ? '' : 'none'};">
                                        <div class="request-table-wrapper">
                                            <table class="table request-table">
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Key</th>
                                                        <th scope="col">Value</th>
                                                        <th scope="col" class="request-table-actions"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${renderRows(request.bodyFormData, 'bodyFormData')}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p class="request-helpers">multipart/form-data 형식을 구성하세요.</p>
                                    </div>
                                    <div class="request-body-option" data-body-option="x-www-form-urlencoded" style="display: ${bodyType === 'x-www-form-urlencoded' ? '' : 'none'};">
                                        <div class="request-table-wrapper">
                                            <table class="table request-table">
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Key</th>
                                                        <th scope="col">Value</th>
                                                        <th scope="col" class="request-table-actions"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${renderRows(request.bodyUrlEncoded, 'bodyUrlEncoded')}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p class="request-helpers">application/x-www-form-urlencoded 데이터를 입력하세요.</p>
                                    </div>
                                    <div class="request-body-option" data-body-option="raw" style="display: ${bodyType === 'raw' ? '' : 'none'};">
                                       <div class="request-raw-toolbar">
                                           <div>
                                               <div class="form-check form-check-inline">
                                                   <input class="form-check-input" type="radio" name="request-${request.id}-raw-type" value="json" data-role="body-raw-type" ${rawType === 'json' ? 'checked' : ''}>
                                                   <label class="form-check-label">JSON</label>
                                               </div>
                                               <div class="form-check form-check-inline">
                                                   <input class="form-check-input" type="radio" name="request-${request.id}-raw-type" value="text" data-role="body-raw-type" ${rawType === 'text' ? 'checked' : ''}>
                                                   <label class="form-check-label">Text</label>
                                               </div>
                                           </div>
                                           <button type="button" class="btn btn-sm btn-outline-primary" data-action="beautify-json" style="display: ${rawType === 'json' ? '' : 'none'};">
                                               <i class="fas fa-magic"></i> Beautify
                                           </button>
                                       </div>
                                        <textarea class="form-control request-raw-textarea" data-role="body-raw-text">${this.escapeHtml(request.bodyRawText || '')}</textarea>
                                        ${bodyRawError ? `<div class="request-error-message">${this.escapeHtml(bodyRawError)}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            renderBodyTypeRadio(request, value, label) {
                const checked = request.bodyType === value ? 'checked' : '';
                return `
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="request-${request.id}-body-type" value="${value}" data-role="body-type" ${checked}>
                        <label class="form-check-label">${label}</label>
                    </div>
                `;
            }

            updatePreview() {
                if (!this.previewEl) return;
                try {
                    const spec = this.buildSpec();
                    this.previewEl.textContent = JSON.stringify(spec, null, 2);
                } catch (error) {
                    this.previewEl.textContent = '// 스펙을 생성할 수 없습니다.';
                    console.error('스펙 생성 실패', error);
                }
            }

            buildSpec() {
                const title = document.getElementById('title')?.value?.trim() || '';
                const version = document.getElementById('version')?.value?.trim() || '';
                const endpoints = this.requests.map((request) => this.convertRequestToEndpoint(request));
                return {
                    title,
                    version,
                    endpoints
                };
            }

            convertRequestToEndpoint(request) {
                const method = (request.method || 'GET').toUpperCase();
                const path = request.url || '/';
                const parameters = [];

                request.params
                    .filter((item) => item.key)
                    .forEach((item) => {
                        parameters.push({
                            in: 'query',
                            name: item.key,
                            required: false,
                            schema: { type: 'string' },
                            example: item.value || ''
                        });
                    });

                request.headers
                    .filter((item) => item.key)
                    .forEach((item) => {
                        parameters.push({
                            in: 'header',
                            name: item.key,
                            required: false,
                            schema: { type: 'string' },
                            example: item.value || ''
                        });
                    });

                const endpoint = {
                    method,
                    path,
                    params: parameters,
                    responses: {
                        200: {
                            description: 'OK'
                        }
                    }
                };

                const requestBody = this.buildRequestBody(request);
                if (requestBody) {
                    endpoint.requestBody = requestBody;
                }

                return endpoint;
            }

            buildRequestBody(request) {
                if (request.bodyType === 'none') return null;
                if (request.bodyType === 'form-data') {
                    const items = request.bodyFormData.filter((item) => item.key);
                    if (items.length === 0) return null;
                    const properties = {};
                    const example = {};
                    items.forEach((item) => {
                        properties[item.key] = { type: 'string' };
                        if (item.value) example[item.key] = item.value;
                    });
                    return {
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties
                                },
                                example
                            }
                        }
                    };
                }
                if (request.bodyType === 'x-www-form-urlencoded') {
                    const items = request.bodyUrlEncoded.filter((item) => item.key);
                    if (items.length === 0) return null;
                    const properties = {};
                    const example = {};
                    items.forEach((item) => {
                        properties[item.key] = { type: 'string' };
                        if (item.value) example[item.key] = item.value;
                    });
                    return {
                        content: {
                            'application/x-www-form-urlencoded': {
                                schema: {
                                    type: 'object',
                                    properties
                                },
                                example
                            }
                        }
                    };
                }
                if (request.bodyType === 'raw') {
                    if (request.bodyRawType === 'json') {
                        const raw = request.bodyRawText?.trim();
                        if (!raw) return null;
                        try {
                            const parsed = JSON.parse(raw);
                            return {
                                content: {
                                    'application/json': {
                                        schema: Array.isArray(parsed)
                                            ? { type: 'array' }
                                            : typeof parsed === 'object' && parsed !== null
                                                ? { type: 'object' }
                                                : { type: typeof parsed },
                                        example: parsed
                                    }
                                }
                            };
                        } catch (error) {
                            return {
                                content: {
                                    'application/json': {
                                        schema: { type: 'string' },
                                        example: raw
                                    }
                                }
                            };
                        }
                    }
                    const text = request.bodyRawText || '';
                    if (!text) return null;
                    return {
                        content: {
                            'text/plain': {
                                schema: { type: 'string' },
                                example: text
                            }
                        }
                    };
                }
                return null;
            }

            buildPayload() {
                const spec = this.buildSpec();
                const payload = { ...spec };
                if (this.projectIdx !== null) payload.projectIdx = this.projectIdx;
                if (this.docsIdx !== null) payload.docsIdx = this.docsIdx;
                return payload;
            }

            async downloadDocs() {
                if (!this.ensureValidState()) return;
                try {
                    const payload = this.buildPayload();
                    const response = await axios.post('/api/generate/docs-url', payload);
                    const data = response.data;
                    if (!data?.success || !data?.data?.url) {
                        this.notifyError(data?.message || '다운로드 URL을 가져오지 못했습니다.');
                        return;
                    }
                    this.notifySuccess(data.message || '다운로드를 시작합니다.');
                    await UTIL.file.download({
                        url: data.data.url,
                        fileName: data.data.fileName || 'api-docs'
                    });
                } catch (error) {
                    console.error('다운로드 실패', error);
                    this.notifyError('다운로드에 실패했습니다.');
                }
            }

            ensureValidState() {
                const title = document.getElementById('title')?.value?.trim();
                const version = document.getElementById('version')?.value?.trim();
                if (!title || !version) {
                    this.notifyError('제목과 버전을 입력해 주세요.');
                    return false;
                }
                if (this.requests.length === 0) {
                    this.notifyError('최소 하나의 요청을 추가해 주세요.');
                    return false;
                }
                const hasUrl = this.requests.some((request) => request.url && request.url.trim());
                if (!hasUrl) {
                    this.notifyError('요청 URL을 입력해 주세요.');
                    return false;
                }
                return true;
            }

            saveDocs() {
                if (!this.ensureValidState()) return;
                const payload = this.buildPayload();
                fetch('/project/artifact/docs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('문서 저장에 실패했습니다.');
                        }
                        return response.json();
                    })
                    .then((result) => {
                        if (!result?.success) {
                            throw new Error(result?.message || '문서 저장에 실패했습니다.');
                        }
                        this.notifySuccess(result.message || '저장되었습니다.');
                    })
                    .catch((error) => {
                        console.error('저장 실패', error);
                        this.notifyError(error.message || '저장에 실패했습니다.');
                    });
            }

            notifyError(message) {
                if (window.NotificationManager?.showError) {
                    window.NotificationManager.showError(message);
                } else {
                    alert(message);
                }
            }

            notifySuccess(message) {
                if (window.NotificationManager?.showSuccess) {
                    window.NotificationManager.showSuccess(message);
                } else {
                    alert(message);
                }
            }

            generateId() {
                this.sequence += 1;
                return this.sequence;
            }

            escapeHtml(value) {
                if (value === null || value === undefined) return '';
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (!window.docsRequestManager) {
                window.docsRequestManager = new DocsRequestManager();
            }
        });

        window.DocsRequestManager = DocsRequestManager;
    })();
}
