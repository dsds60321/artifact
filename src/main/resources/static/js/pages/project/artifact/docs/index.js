let apiDocsManager;

class ApiDocsManager {
    constructor() {
        this.endpoints = [];
        this.sequence = Date.now();
        this.projectIdx = this.readNumericInput('projectIdx');
        this.docsIdx = this.readNumericInput('docsIdx');

        this.bindEvents();
        this.loadInitialData();
    }

    /* -------------------------------------------------------------
     * 초기화 & 공통 유틸
     * ----------------------------------------------------------- */
    bindEvents() {
        // 저장
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.saveApiDocs();
            });
        }


        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                await this.downloadFile()
            });
        }


        const addEndpointBtn = document.getElementById('addEndpointBtn');
        if (addEndpointBtn) {
            addEndpointBtn.addEventListener('click', () => this.addEndpoint());
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
        const titleInput = document.getElementById('title');
        const versionInput = document.getElementById('version');
        const initialSpec = this.readInitialSpec();

        if (initialSpec) {
            if (titleInput && initialSpec.title) titleInput.value = initialSpec.title;
            if (versionInput && initialSpec.version) versionInput.value = initialSpec.version;
            if (Array.isArray(initialSpec.endpoints)) {
                this.endpoints = initialSpec.endpoints.map((endpoint) => this.normalizeEndpoint(endpoint));
            }
        }

        if (this.endpoints.length === 0) {
            this.endpoints = [];
        }

        this.checkDemoMode();
        this.renderEndpoints();
    }

    readInitialSpec() {
        const script = document.getElementById('apiDocsInitialData');
        if (!script) return null;
        const raw = script.textContent?.trim();
        if (!raw || raw === 'null') return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('초기 명세 JSON 파싱 실패', error);
            return null;
        } finally {
            script.remove();
        }
    }

    clone(value) {
        if (value === null || value === undefined) return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            console.warn('객체 복제 실패, 원본을 그대로 사용합니다.', error);
            return value;
        }
    }

    generateId() {
        this.sequence += 1;
        return this.sequence;
    }

    findEndpoint(endpointId) {
        return this.endpoints.find((endpoint) => endpoint.id === endpointId);
    }

    findParam(endpointId, paramId) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return null;
        return endpoint.params.find((param) => param.id === paramId) || null;
    }

    findResponse(endpointId, code) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return null;
        return endpoint.responses[String(code)] || null;
    }

    ensureResponseContent(response, contentType) {
        if (!response.content) response.content = {};
        if (!response.content[contentType]) {
            response.content[contentType] = {
                schema: { type: 'object', properties: {}, required: [] },
                examples: {}
            };
        }
        const content = response.content[contentType];
        if (!content.schema) content.schema = { type: 'object', properties: {}, required: [] };
        if (!content.examples) content.examples = {};
        return content;
    }

    parseContext(contextKey) {
        const segments = contextKey.split('|');
        const kind = segments[0];
        if (kind === 'param') {
            return {
                kind,
                endpointId: Number(segments[1]),
                paramId: Number(segments[2])
            };
        }
        if (kind === 'response') {
            return {
                kind,
                endpointId: Number(segments[1]),
                code: decodeURIComponent(segments[2]),
                contentType: decodeURIComponent(segments[3])
            };
        }
        if (kind === 'example') {
            return {
                kind,
                endpointId: Number(segments[1]),
                code: decodeURIComponent(segments[2]),
                contentType: decodeURIComponent(segments[3]),
                exampleName: decodeURIComponent(segments[4])
            };
        }
        if (kind === 'request') {
            return {
                kind,
                endpointId: Number(segments[1])
            };
        }
        return { kind: 'unknown' };
    }

    decodePath(token) {
        if (token === undefined || token === null) return 'root';
        try {
            return decodeURIComponent(token);
        } catch (error) {
            return token;
        }
    }

    pathToArray(path) {
        if (!path || path === 'root') return [];
        const parts = path.split('.');
        return parts.slice(1);
    }

    concatPath(base, suffix) {
        return base === 'root' ? `root.${suffix}` : `${base}.${suffix}`;
    }

    getSchemaContext(contextKey) {
        const ctx = this.parseContext(contextKey);
        if (ctx.kind === 'param') {
            const endpoint = this.findEndpoint(ctx.endpointId);
            if (!endpoint) return null;
            const param = endpoint.params.find((p) => p.id === ctx.paramId);
            if (!param) return null;
            if (!param.schema || typeof param.schema !== 'object') {
                param.schema = { type: param.in === 'body' ? 'object' : 'string' };
            }
            return {
                kind: ctx.kind,
                endpoint,
                param,
                schemaRoot: param.schema
            };
        }
        if (ctx.kind === 'response') {
            const endpoint = this.findEndpoint(ctx.endpointId);
            if (!endpoint) return null;
            const response = endpoint.responses[ctx.code];
            if (!response) return null;
            const content = this.ensureResponseContent(response, ctx.contentType);
            return {
                kind: ctx.kind,
                endpoint,
                response,
                contentType: ctx.contentType,
                content,
                schemaRoot: content.schema
            };
        }
        if (ctx.kind === 'request') {
            const endpoint = this.findEndpoint(ctx.endpointId);
            if (!endpoint) return null;
            if (!endpoint.requestBody) {
                endpoint.requestBody = this.createDefaultRequestBody();
            }
            if (!endpoint.requestBody.schema || typeof endpoint.requestBody.schema !== 'object') {
                endpoint.requestBody.schema = { type: 'object', properties: {}, required: [] };
                this.normalizeSchemaNode(endpoint.requestBody.schema);
            }
            return {
                kind: ctx.kind,
                endpoint,
                requestBody: endpoint.requestBody,
                schemaRoot: endpoint.requestBody.schema
            };
        }
        return null;
    }

    getSchemaAtPath(schemaRoot, path) {
        const pathParts = this.pathToArray(path);
        if (pathParts.length === 0) {
            return { schema: schemaRoot, parent: null, key: null };
        }
        let current = schemaRoot;
        let parent = null;
        let key = null;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (part === 'properties') {
                i += 1;
                const propName = pathParts[i];
                if (!current.properties) current.properties = {};
                if (!current.properties[propName]) current.properties[propName] = { type: 'string' };
                parent = current.properties;
                key = propName;
                current = current.properties[propName];
                continue;
            }
            if (part === 'items') {
                if (!current.items) current.items = { type: 'string' };
                parent = current;
                key = 'items';
                current = current.items;
                continue;
            }
            parent = current;
            key = part;
            current = current[part];
            if (current === undefined) {
                current = parent[key] = {};
            }
        }
        return { schema: current, parent, key };
    }

    prepareSchemaForType(schema, type) {
        schema.type = type;
        if (type === 'object') {
            if (!schema.properties) schema.properties = {};
            if (!Array.isArray(schema.required)) schema.required = [];
            delete schema.items;
            delete schema.enum;
            delete schema.minItems;
            delete schema.maxItems;
            delete schema.uniqueItems;
            delete schema.minimum;
            delete schema.maximum;
            delete schema.pattern;
            delete schema.minLength;
            delete schema.maxLength;
            delete schema.format;
            delete schema.default;
        } else if (type === 'array') {
            if (!schema.items) schema.items = { type: 'string' };
            delete schema.properties;
            delete schema.required;
            delete schema.enum;
            delete schema.pattern;
            delete schema.minLength;
            delete schema.maxLength;
            delete schema.minimum;
            delete schema.maximum;
            delete schema.format;
        } else {
            delete schema.properties;
            delete schema.required;
            delete schema.items;
            if (type === 'string') {
                // keep pattern/length options
            } else {
                delete schema.pattern;
                delete schema.minLength;
                delete schema.maxLength;
            }
            if (type === 'integer' || type === 'number') {
                delete schema.enum;
            }
        }
    }

    createDefaultRequestBody() {
        const schema = { type: 'object', properties: {}, required: [], __collapsed: false };
        this.normalizeSchemaNode(schema);
        return {
            enabled: false,
            required: false,
            description: '',
            contentType: 'application/json',
            schema,
            example: undefined,
            __collapsed: false
        };
    }

    extractRequestBody(params = []) {
        const filteredParams = [];
        let legacyParam = null;
        params.forEach((param) => {
            if (!param || typeof param !== 'object') return;
            const location = (param.in || '').toLowerCase();
            if ((location === 'requestbody' || location === 'body') && legacyParam === null) {
                legacyParam = param;
            } else if (location === 'requestbody' || location === 'body') {
                // 무시하되 첫 번째 파라미터만 사용
            } else {
                filteredParams.push(param);
            }
        });
        return { params: filteredParams, legacyParam };
    }

    normalizeRequestBody(rawBody, legacyParam) {
        const base = this.createDefaultRequestBody();
        if (!rawBody && !legacyParam) {
            return base;
        }

        const result = {
            ...base,
            enabled: Boolean(rawBody?.content || rawBody?.enabled || legacyParam),
            required: Boolean(rawBody?.required ?? legacyParam?.required),
            description: rawBody?.description || legacyParam?.description || '',
            __collapsed: Boolean(rawBody?.__collapsed)
        };

        let contentEntry = null;
        if (rawBody?.content && typeof rawBody.content === 'object') {
            const entries = Object.entries(rawBody.content);
            if (entries.length > 0) {
                contentEntry = entries[0];
            }
        }

        if (!contentEntry && legacyParam) {
            const type = legacyParam.contentType || (Array.isArray(legacyParam.contentTypes) ? legacyParam.contentTypes[0] : null);
            contentEntry = [type || 'application/json', {
                schema: legacyParam.schema,
                example: legacyParam.example
            }];
            if (legacyParam.required !== undefined && rawBody?.required === undefined) {
                result.required = Boolean(legacyParam.required);
            }
        }

        if (contentEntry) {
            const [contentType, contentData] = contentEntry;
            result.contentType = contentType || 'application/json';
            const schema = this.clone(contentData?.schema) || { type: 'object', properties: {}, required: [] };
            this.normalizeSchemaNode(schema);
            result.schema = schema;
            if (contentData?.example !== undefined) {
                result.example = this.clone(contentData.example);
            } else if (contentData?.examples) {
                const firstExample = Object.values(contentData.examples)[0];
                if (firstExample && typeof firstExample === 'object' && firstExample.value !== undefined) {
                    result.example = this.clone(firstExample.value);
                }
            }
        }

        return result;
    }

    /* -------------------------------------------------------------
     * 엔드포인트 / 파라미터 / 응답 기본 조작
     * ----------------------------------------------------------- */
    normalizeEndpoint(endpoint = {}) {
        const rawParams = Array.isArray(endpoint.params) ? endpoint.params : [];
        const { params: filteredParams, legacyParam } = this.extractRequestBody(rawParams);
        const normalized = {
            id: this.generateId(),
            method: endpoint.method || 'GET',
            path: endpoint.path || '',
            summary: endpoint.summary || '',
            tags: Array.isArray(endpoint.tags) ? endpoint.tags.slice() : [],
            params: filteredParams.map((param) => this.normalizeParam(param)),
            responses: this.normalizeResponses(endpoint.responses || {})
        };
        normalized.requestBody = this.normalizeRequestBody(endpoint.requestBody, legacyParam);
        normalized.__collapsed = Boolean(endpoint.__collapsed);
        return normalized;
    }

    normalizeParam(param = {}) {
        const schema = this.clone(param.schema) || {};
        const location = String(param.in || 'query');
        if (!schema.type) {
            const lowered = location.toLowerCase();
            schema.type = lowered === 'body' || lowered === 'requestbody' ? 'object' : 'string';
        }
        this.normalizeSchemaNode(schema);
        let normalizedLocation = location;
        if (normalizedLocation.toLowerCase() === 'requestbody' || normalizedLocation.toLowerCase() === 'body') {
            normalizedLocation = 'query';
        }
        return {
            id: this.generateId(),
            in: normalizedLocation || 'query',
            name: param.name || '',
            required: normalizedLocation === 'path' ? true : Boolean(param.required),
            description: param.description || '',
            schema,
            example: param.example !== undefined ? this.clone(param.example) : undefined,
            __collapsed: Boolean(param.__collapsed)
        };
    }

    normalizeResponses(responses = {}) {
        const normalized = {};
        Object.entries(responses).forEach(([code, response]) => {
            const res = response && typeof response === 'object' ? response : {};
            const normalizedResponse = {
                description: res.description || '',
                content: this.normalizeResponseContent(res.content)
            };
            if (res.headers) normalizedResponse.headers = this.clone(res.headers);
            if (res.links) normalizedResponse.links = this.clone(res.links);
            normalizedResponse.__collapsed = Boolean(res.__collapsed);
            normalized[code] = normalizedResponse;
        });
        return normalized;
    }

    normalizeResponseContent(content) {
        if (!content || typeof content !== 'object') return {};
        const normalized = {};
        Object.entries(content).forEach(([contentType, payload]) => {
            const schema = this.clone(payload?.schema) || { type: 'object' };
            this.normalizeSchemaNode(schema);
            const examples = this.normalizeExamples(payload?.examples || {});
            normalized[contentType] = {
                schema,
                examples
            };
        });
        return normalized;
    }

    normalizeExamples(examples) {
        const normalized = {};
        Object.entries(examples).forEach(([name, example]) => {
            const value = this.clone(example?.value);
            const normalizedValue = value === undefined ? {} : value;
            normalized[name] = {
                summary: example?.summary || '',
                value: normalizedValue,
                __collapsed: Boolean(example?.__collapsed)
            };
        });
        return normalized;
    }

    normalizeSchemaNode(schema) {
        if (!schema || typeof schema !== 'object') return;
        if (schema.type === 'object') {
            if (!schema.properties) schema.properties = {};
            if (!Array.isArray(schema.required)) schema.required = [];
            schema.__collapsed = Boolean(schema.__collapsed);
            Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                if (typeof propSchema === 'object' && propSchema) {
                    this.normalizeSchemaNode(propSchema);
                } else {
                    schema.properties[propName] = { type: 'string', __collapsed: false };
                }
            });
        } else if (schema.type === 'array') {
            schema.__collapsed = Boolean(schema.__collapsed);
            if (!schema.items || typeof schema.items !== 'object') {
                schema.items = { type: 'string', __collapsed: false };
            }
            this.normalizeSchemaNode(schema.items);
        } else {
            schema.__collapsed = Boolean(schema.__collapsed);
        }
    }

    addEndpoint() {
        const endpoint = {
            id: this.generateId(),
            method: 'GET',
            path: '',
            summary: '',
            tags: [],
            params: [],
            requestBody: this.createDefaultRequestBody(),
            responses: {
                '200': {
                    description: 'OK',
                    content: {
                        'application/json': {
                            schema: { type: 'object', properties: {}, required: [] },
                            examples: {}
                        }
                    }
                }
            }
        };
        endpoint.__collapsed = false;
        this.endpoints.push(endpoint);
        this.renderEndpoints();
    }

    removeEndpoint(id) {
        if (!confirm('이 엔드포인트를 삭제하시겠습니까?')) return;
        this.endpoints = this.endpoints.filter((endpoint) => endpoint.id !== id);
        this.renderEndpoints();
    }

    toggleEndpoint(id) {
        const endpoint = this.findEndpoint(id);
        if (!endpoint) return;
        endpoint.__collapsed = !endpoint.__collapsed;
        this.renderEndpoints();
    }

    addParam(endpointId) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        endpoint.params.push({
            id: this.generateId(),
            in: 'query',
            name: '',
            required: false,
            description: '',
            schema: { type: 'string' },
            __collapsed: false
        });
        this.renderEndpoints();
    }

    removeParam(endpointId, paramId) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        endpoint.params = endpoint.params.filter((param) => param.id !== paramId);
        this.renderEndpoints();
    }

    toggleParam(endpointId, paramId) {
        const param = this.findParam(endpointId, paramId);
        if (!param) return;
        param.__collapsed = !param.__collapsed;
        this.renderEndpoints();
    }

    addResponse(endpointId) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const code = prompt('추가할 응답 코드를 입력하세요 (예: 201, 400)', '200');
        if (!code) return;
        if (endpoint.responses[code]) {
            this.notifyError('이미 존재하는 응답 코드입니다.');
            return;
        }
        endpoint.responses[code] = {
            description: '',
            content: {
                'application/json': {
                    schema: { type: 'object', properties: {}, required: [] },
                    examples: {}
                }
            },
            __collapsed: false
        };
        this.renderEndpoints();
    }

    removeResponse(endpointId, code) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        delete endpoint.responses[code];
        this.renderEndpoints();
    }

    toggleResponse(endpointId, code) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        response.__collapsed = !response.__collapsed;
        this.renderEndpoints();
    }

    addResponseContentType(endpointId, code) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        if (!response.content) response.content = {};
        let base = 'application/json';
        let suffix = 1;
        while (response.content[base]) {
            base = `application/json+alt${suffix}`;
            suffix += 1;
        }
        response.content[base] = {
            schema: { type: 'object', properties: {}, required: [] },
            examples: {}
        };
        this.renderEndpoints();
    }

    removeResponseContentType(endpointId, code, contentType) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response || !response.content) return;
        if (Object.keys(response.content).length === 1) {
            this.notifyError('최소 한 개의 콘텐츠 타입이 필요합니다.');
            return;
        }
        delete response.content[contentType];
        this.renderEndpoints();
    }

    renameResponseContentType(endpointId, code, oldType, newType) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response || !response.content) return;
        const trimmed = newType.trim();
        if (!trimmed || trimmed === oldType) return;
        if (response.content[trimmed]) {
            this.notifyError('이미 존재하는 콘텐츠 타입입니다.');
            return;
        }
        response.content[trimmed] = response.content[oldType];
        delete response.content[oldType];
        this.renderEndpoints();
    }

    addResponseExample(endpointId, code, contentType) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        const content = this.ensureResponseContent(response, contentType);
        let base = 'example';
        let suffix = 1;
        while (content.examples[`${base}${suffix}`]) {
            suffix += 1;
        }
        const key = `${base}${suffix}`;
        content.examples[key] = {
            summary: '',
            value: {},
            __collapsed: false
        };
        this.renderEndpoints();
    }

    removeResponseExample(endpointId, code, contentType, exampleName) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        const content = this.ensureResponseContent(response, contentType);
        delete content.examples[exampleName];
        this.renderEndpoints();
    }

    renameResponseExample(endpointId, code, contentType, oldName, newName) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        const content = this.ensureResponseContent(response, contentType);
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) return;
        if (content.examples[trimmed]) {
            this.notifyError('이미 존재하는 예시 이름입니다.');
            return;
        }
        content.examples[trimmed] = content.examples[oldName];
        delete content.examples[oldName];
        this.renderEndpoints();
    }

    updateResponseDescription(endpointId, code, value) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        response.description = value;
        this.renderJsonPreview();
    }

    updateResponseExampleSummary(endpointId, code, contentType, exampleName, value) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const response = endpoint.responses[code];
        if (!response) return;
        const content = this.ensureResponseContent(response, contentType);
        const example = content.examples[exampleName];
        if (!example) return;
        example.summary = value;
        this.renderJsonPreview();
    }

    updateParamField(endpointId, paramId, field, value) {
        const param = this.findParam(endpointId, paramId);
        if (!param) return;
        switch (field) {
            case 'in':
                {
                    const allowed = ['query', 'path', 'header', 'cookie'];
                    const normalized = allowed.includes(value) ? value : 'query';
                    param.in = normalized;
                    if (normalized === 'path') {
                        param.required = true;
                    }
                    this.renderEndpoints();
                    return;
                }
            case 'name':
            case 'description':
                param[field] = value;
                break;
            case 'required':
                param.required = Boolean(value);
                break;
            default:
                param[field] = value;
        }
        this.renderJsonPreview();
    }

    updateParamSchemaType(endpointId, paramId, type) {
        const param = this.findParam(endpointId, paramId);
        if (!param) return;
        if (!param.schema || typeof param.schema !== 'object') {
            param.schema = { type };
        }
        this.prepareSchemaForType(param.schema, type);
        this.renderEndpoints();
    }

    updateParamExample(endpointId, paramId, rawValue) {
        const param = this.findParam(endpointId, paramId);
        if (!param) return;
        const schemaType = param.schema?.type || 'string';
        if (!rawValue.trim()) {
            delete param.example;
            this.renderJsonPreview();
            return;
        }
        try {
            if (schemaType === 'integer' || schemaType === 'number') {
                const num = Number(rawValue);
                if (Number.isNaN(num)) throw new Error('숫자가 아닙니다.');
                param.example = num;
            } else if (schemaType === 'boolean') {
                param.example = rawValue === 'true';
            } else {
                param.example = rawValue;
            }
        } catch (error) {
            this.notifyError('예시 값이 스키마 타입과 맞지 않습니다.');
        }
        this.renderJsonPreview();
    }

    ensureRequestBody(endpoint) {
        if (!endpoint.requestBody) {
            endpoint.requestBody = this.createDefaultRequestBody();
        }
        if (!endpoint.requestBody.schema || typeof endpoint.requestBody.schema !== 'object') {
            endpoint.requestBody.schema = { type: 'object', properties: {}, required: [] };
            this.normalizeSchemaNode(endpoint.requestBody.schema);
        }
        return endpoint.requestBody;
    }

    toggleRequestBodyEnabled(endpointId, enabled) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const requestBody = this.ensureRequestBody(endpoint);
        requestBody.enabled = Boolean(enabled);
        this.renderEndpoints();
    }

    updateRequestBodyField(endpointId, field, value) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const requestBody = this.ensureRequestBody(endpoint);
        if (field === 'required') {
            requestBody.required = Boolean(value);
        } else if (field === 'contentType') {
            requestBody.contentType = value.trim() || 'application/json';
        } else if (field === 'description') {
            requestBody.description = value;
        }
        this.renderJsonPreview();
    }

    updateRequestBodyExample(endpointId, rawValue) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        const requestBody = this.ensureRequestBody(endpoint);
        const text = rawValue.trim();
        if (!text) {
            delete requestBody.example;
            this.renderJsonPreview();
            return;
        }
        try {
            requestBody.example = JSON.parse(text);
            this.renderJsonPreview();
        } catch (error) {
            this.notifyError('JSON 형식이 올바르지 않습니다.');
        }
    }

    /* -------------------------------------------------------------
     * 스키마 편집 로직
     * ----------------------------------------------------------- */
    makeParamSchemaContext(endpointId, paramId) {
        return `param|${endpointId}|${paramId}`;
    }

    makeResponseSchemaContext(endpointId, code, contentType) {
        return `response|${endpointId}|${encodeURIComponent(code)}|${encodeURIComponent(contentType)}`;
    }

    makeRequestBodySchemaContext(endpointId) {
        return `request|${endpointId}`;
    }

    handleSchemaTypeChange(contextKey, encodedPath, newType) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        this.prepareSchemaForType(target.schema, newType);
        this.renderEndpoints();
    }

    updateSchemaStringField(contextKey, encodedPath, field, value) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        const trimmed = value.trim();
        if (!trimmed) {
            delete target.schema[field];
        } else {
            target.schema[field] = trimmed;
        }
        this.renderJsonPreview();
    }

    updateSchemaNumberField(contextKey, encodedPath, field, value) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        const trimmed = value.trim();
        if (!trimmed) {
            delete target.schema[field];
        } else {
            const num = Number(trimmed);
            if (Number.isNaN(num)) {
                this.notifyError('숫자를 입력해 주세요.');
                return;
            }
            target.schema[field] = num;
        }
        this.renderJsonPreview();
    }

    updateSchemaBooleanField(contextKey, encodedPath, field, checked) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        if (checked) {
            target.schema[field] = true;
        } else {
            delete target.schema[field];
        }
        this.renderJsonPreview();
    }

    updateSchemaEnum(contextKey, encodedPath, rawValue) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        const values = rawValue
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length);
        if (values.length === 0) {
            delete target.schema.enum;
        } else {
            target.schema.enum = values;
        }
        this.renderJsonPreview();
    }

    toggleSchemaRequired(contextKey, encodedPath, propertyName, checked) {
        const path = this.decodePath(encodedPath);
        const decodedProperty = this.decodePath(propertyName);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const objectTarget = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!objectTarget) return;
        if (!Array.isArray(objectTarget.schema.required)) {
            objectTarget.schema.required = [];
        }
        const required = objectTarget.schema.required;
        const index = required.indexOf(decodedProperty);
        if (checked && index === -1) {
            required.push(decodedProperty);
        } else if (!checked && index !== -1) {
            required.splice(index, 1);
        }
        this.renderJsonPreview();
    }

    addSchemaProperty(contextKey, encodedPath) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const objectTarget = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!objectTarget) return;
        if (!objectTarget.schema.properties) objectTarget.schema.properties = {};
        let base = 'property';
        let suffix = 1;
        while (objectTarget.schema.properties[`${base}${suffix}`]) {
            suffix += 1;
        }
        const name = `${base}${suffix}`;
        objectTarget.schema.properties[name] = { type: 'string', __collapsed: false };
        if (!Array.isArray(objectTarget.schema.required)) {
            objectTarget.schema.required = [];
        }
        this.renderEndpoints();
    }

    renameSchemaProperty(contextKey, encodedPath, oldNameEncoded, newNameRaw) {
        const path = this.decodePath(encodedPath);
        const oldName = this.decodePath(oldNameEncoded);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        const trimmed = newNameRaw.trim();
        if (!trimmed || trimmed === oldName) return;
        if (!target.schema.properties || target.schema.properties[trimmed]) {
            this.notifyError('이미 존재하는 속성 이름입니다.');
            this.renderEndpoints();
            return;
        }
        target.schema.properties[trimmed] = target.schema.properties[oldName];
        delete target.schema.properties[oldName];
        if (Array.isArray(target.schema.required)) {
            const index = target.schema.required.indexOf(oldName);
            if (index !== -1) {
                target.schema.required[index] = trimmed;
            }
        }
        this.renderEndpoints();
    }

    removeSchemaProperty(contextKey, path, propertyName) {
        const decodedPath = this.decodePath(path);
        const decodedName = this.decodePath(propertyName);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, decodedPath);
        if (!target || !target.schema.properties) return;
        delete target.schema.properties[decodedName];
        if (Array.isArray(target.schema.required)) {
            const index = target.schema.required.indexOf(decodedName);
            if (index !== -1) {
                target.schema.required.splice(index, 1);
            }
        }
        this.renderEndpoints();
    }

    toggleSchemaNode(contextKey, encodedPath) {
        const path = this.decodePath(encodedPath);
        const schemaCtx = this.getSchemaContext(contextKey);
        if (!schemaCtx) return;
        const target = this.getSchemaAtPath(schemaCtx.schemaRoot, path);
        if (!target) return;
        const node = target.schema;
        node.__collapsed = !Boolean(node.__collapsed);
        this.renderEndpoints();
    }

    toggleExampleNode(contextKey) {
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        exampleCtx.example.__collapsed = !Boolean(exampleCtx.example.__collapsed);
        this.renderEndpoints();
    }

    /* -------------------------------------------------------------
     * 예시 값 편집 로직
     * ----------------------------------------------------------- */
    makeExampleContext(endpointId, code, contentType, exampleName) {
        return `example|${endpointId}|${encodeURIComponent(code)}|${encodeURIComponent(contentType)}|${encodeURIComponent(exampleName)}`;
    }

    getExampleContext(contextKey) {
        const ctx = this.parseContext(contextKey);
        if (ctx.kind !== 'example') return null;
        const endpoint = this.findEndpoint(ctx.endpointId);
        if (!endpoint) return null;
        const response = endpoint.responses[ctx.code];
        if (!response) return null;
        const content = this.ensureResponseContent(response, ctx.contentType);
        const example = content.examples[ctx.exampleName];
        if (!example) return null;
        return {
            endpoint,
            response,
            content,
            example,
            context: ctx
        };
    }

    resolveExampleValue(exampleContext, path) {
        const parts = this.pathToArray(path);
        let current = exampleContext.example.value;
        let parent = null;
        let key = null;
        for (const part of parts) {
            parent = current;
            if (Array.isArray(current) && /^\d+$/.test(part)) {
                const index = Number(part);
                if (current[index] === undefined) current[index] = '';
                key = index;
                current = current[index];
                continue;
            }
            if (!Array.isArray(current) && (typeof current !== 'object' || current === null)) {
                return { parent: null, key: null, value: undefined };
            }
            if (!Object.prototype.hasOwnProperty.call(current, part)) {
                current[part] = '';
            }
            key = part;
            current = current[part];
        }
        return { parent, key, value: current };
    }

    detectValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        const type = typeof value;
        if (type === 'object') return 'object';
        if (type === 'number') return 'number';
        if (type === 'boolean') return 'boolean';
        return 'string';
    }

    setExampleValueType(contextKey, encodedPath, newType) {
        const path = this.decodePath(encodedPath);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const { parent, key } = this.resolveExampleValue(exampleCtx, path);
        if (!parent && path !== 'root') return;
        let newValue;
        switch (newType) {
            case 'object':
                newValue = {};
                break;
            case 'array':
                newValue = [];
                break;
            case 'number':
                newValue = 0;
                break;
            case 'boolean':
                newValue = true;
                break;
            case 'null':
                newValue = null;
                break;
            default:
                newValue = '';
        }
        if (path === 'root') {
            exampleCtx.example.value = newValue;
        } else if (Array.isArray(parent) && typeof key === 'number') {
            parent[key] = newValue;
        } else if (parent && typeof parent === 'object') {
            parent[key] = newValue;
        }
        this.renderEndpoints();
    }

    updateExamplePrimitive(contextKey, encodedPath, rawValue) {
        const path = this.decodePath(encodedPath);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const { parent, key, value } = this.resolveExampleValue(exampleCtx, path);
        if (path === 'root') {
            exampleCtx.example.value = rawValue;
            this.renderJsonPreview();
            return;
        }
        if (Array.isArray(parent) && typeof key === 'number') {
            const type = this.detectValueType(value);
            parent[key] = this.castPrimitive(rawValue, type);
        } else if (parent && typeof parent === 'object') {
            const type = this.detectValueType(value);
            parent[key] = this.castPrimitive(rawValue, type);
        }
        this.renderJsonPreview();
    }

    castPrimitive(rawValue, type) {
        if (type === 'number') {
            const num = Number(rawValue);
            if (Number.isNaN(num)) {
                this.notifyError('숫자를 입력해 주세요.');
                return 0;
            }
            return num;
        }
        if (type === 'boolean') {
            return rawValue === 'true';
        }
        if (type === 'null') {
            return null;
        }
        return rawValue;
    }

    addExampleProperty(contextKey, encodedPath) {
        const path = this.decodePath(encodedPath);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const target = this.resolveExampleValue(exampleCtx, path);
        if (!target) return;
        if (path === 'root') {
            if (this.detectValueType(exampleCtx.example.value) !== 'object') {
                exampleCtx.example.value = {};
            }
        }
        const container = path === 'root' ? exampleCtx.example.value : target.value;
        if (!container || typeof container !== 'object' || Array.isArray(container)) return;
        let base = 'field';
        let suffix = 1;
        while (Object.prototype.hasOwnProperty.call(container, `${base}${suffix}`)) {
            suffix += 1;
        }
        container[`${base}${suffix}`] = '';
        this.renderEndpoints();
    }

    removeExampleProperty(contextKey, encodedPath, propertyName) {
        const path = this.decodePath(encodedPath);
        const decodedName = this.decodePath(propertyName);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const target = this.resolveExampleValue(exampleCtx, path);
        if (!target) return;
        const container = path === 'root' ? exampleCtx.example.value : target.value;
        if (!container || typeof container !== 'object' || Array.isArray(container)) return;
        delete container[decodedName];
        this.renderEndpoints();
    }

    renameExampleProperty(contextKey, encodedPath, oldNameEncoded, newNameRaw) {
        const path = this.decodePath(encodedPath);
        const oldName = this.decodePath(oldNameEncoded);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const target = this.resolveExampleValue(exampleCtx, path);
        if (!target) return;
        const container = path === 'root' ? exampleCtx.example.value : target.value;
        if (!container || typeof container !== 'object' || Array.isArray(container)) return;
        const trimmed = newNameRaw.trim();
        if (!trimmed || trimmed === oldName) return;
        if (Object.prototype.hasOwnProperty.call(container, trimmed)) {
            this.notifyError('이미 존재하는 속성 이름입니다.');
            return;
        }
        container[trimmed] = container[oldName];
        delete container[oldName];
        this.renderEndpoints();
    }

    addExampleArrayItem(contextKey, encodedPath) {
        const path = this.decodePath(encodedPath);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const target = this.resolveExampleValue(exampleCtx, path);
        let arrayRef;
        if (path === 'root') {
            if (!Array.isArray(exampleCtx.example.value)) {
                exampleCtx.example.value = [];
            }
            arrayRef = exampleCtx.example.value;
        } else {
            arrayRef = target.value;
        }
        if (!Array.isArray(arrayRef)) return;
        arrayRef.push('');
        this.renderEndpoints();
    }

    removeExampleArrayItem(contextKey, encodedPath, index) {
        const path = this.decodePath(encodedPath);
        const exampleCtx = this.getExampleContext(contextKey);
        if (!exampleCtx) return;
        const target = this.resolveExampleValue(exampleCtx, path);
        const arrayRef = path === 'root' ? exampleCtx.example.value : target.value;
        if (!Array.isArray(arrayRef)) return;
        arrayRef.splice(index, 1);
        this.renderEndpoints();
    }

    /* -------------------------------------------------------------
     * 렌더링 로직
     * ----------------------------------------------------------- */
    renderEndpoints() {
        const container = document.getElementById('endpointsList');
        if (!container) return;

        if (this.endpoints.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-code"></i>
                    <p>엔드포인트를 추가해 주세요.</p>
                </div>
            `;
            this.renderJsonPreview();
            return;
        }

        container.innerHTML = this.endpoints.map((endpoint) => this.renderEndpointCard(endpoint)).join('');
        this.renderJsonPreview();
    }

    renderEndpointCard(endpoint) {
        const collapsed = Boolean(endpoint.__collapsed);
        const bodyStyle = collapsed ? 'style="display:none;"' : '';
        const toggleIcon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
        return `
            <div class="endpoint-card">
                <div class="endpoint-header">
                    <div class="endpoint-summary">
                        <span class="method-badge method-${endpoint.method.toLowerCase()}">${this.escapeHtml(endpoint.method)}</span>
                        ${this.escapeHtml(endpoint.path || '/path')} - ${this.escapeHtml(endpoint.summary || '요약 없음')}
                    </div>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-secondary" title="접기/펼치기" onclick="window.apiDocsManager.toggleEndpoint(${endpoint.id})">
                            <i class="fas ${toggleIcon}"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" title="엔드포인트 추가" onclick="window.apiDocsManager.addEndpoint()">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button type="button" class="remove-btn" title="엔드포인트 삭제" onclick="window.apiDocsManager.removeEndpoint(${endpoint.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="endpoint-body" ${bodyStyle}>
                    <div class="grid grid-cols-2 mb-3">
                        <div class="form-group">
                            <label class="form-label">메소드</label>
                            <select class="form-control" onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'method', this.value)">
                                ${['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => `<option value="${method}" ${endpoint.method === method ? 'selected' : ''}>${method}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">경로</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(endpoint.path)}"
                                   onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'path', this.value)"
                                   placeholder="/api/orders">
                        </div>
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label">요약</label>
                        <input type="text" class="form-control" value="${this.escapeHtml(endpoint.summary)}"
                               onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'summary', this.value)"
                               placeholder="엔드포인트 요약">
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label">태그 (쉼표로 구분)</label>
                        <input type="text" class="form-control" value="${this.escapeHtml(endpoint.tags.join(', '))}"
                               onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'tags', this.value)"
                               placeholder="Order, User">
                    </div>

                    ${this.renderParamsSection(endpoint)}
                    ${this.renderRequestBodySection(endpoint)}
                    ${this.renderResponsesSection(endpoint)}
                </div>
            </div>
        `;
    }

    updateEndpointField(endpointId, field, value) {
        const endpoint = this.findEndpoint(endpointId);
        if (!endpoint) return;
        if (field === 'tags') {
            endpoint.tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length);
        } else {
            endpoint[field] = value;
        }
        this.renderJsonPreview();
    }

    renderParamsSection(endpoint) {
        const rows = endpoint.params.map((param) => this.renderParamRow(endpoint, param)).join('');
        const emptyRow = `
            <tr>
                <td colspan="6" class="text-center text-muted py-3">파라미터를 추가해 주세요.</td>
            </tr>
        `;
        return `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">파라미터</label>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addParam(${endpoint.id})">
                        <i class="fas fa-plus"></i> 추가
                    </button>
                </div>
                <div class="table-responsive param-table-wrapper">
                    <table class="table table-sm align-middle param-table">
                        <thead>
                            <tr>
                                <th style="width:18%">이름</th>
                                <th style="width:14%">위치</th>
                                <th style="width:16%">타입</th>
                                <th style="width:10%" class="text-center">필수</th>
                                <th>설명</th>
                                <th style="width:14%" class="text-end">설정</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || emptyRow}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderParamRow(endpoint, param) {
        const schemaType = param.schema?.type || 'string';
        const contextKey = this.makeParamSchemaContext(endpoint.id, param.id);
        const collapsed = Boolean(param.__collapsed);
        const detailStyle = collapsed ? 'style="display:none;"' : '';
        const typeOptions = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
        const paramTypeSelect = typeOptions.map((type) => `<option value="${type}" ${schemaType === type ? 'selected' : ''}>${type}</option>`).join('');
        const exampleValue = param.example !== undefined ? this.escapeHtml(String(param.example)) : '';
        const locationOptions = ['query', 'path', 'header', 'cookie'];
        const locationSelect = locationOptions.map((type) => `<option value="${type}" ${param.in === type ? 'selected' : ''}>${type}</option>`).join('');
        return `
            <tr>
                <td>
                    <input type="text" class="form-control form-control-sm" value="${this.escapeHtml(param.name)}" placeholder="파라미터명"
                           onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'name', this.value)">
                </td>
                <td>
                    <select class="form-control form-control-sm" onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'in', this.value)">
                        ${locationSelect}
                    </select>
                </td>
                <td>
                    <select class="form-control form-control-sm" onchange="window.apiDocsManager.updateParamSchemaType(${endpoint.id}, ${param.id}, this.value)">
                        ${paramTypeSelect}
                    </select>
                </td>
                <td class="text-center">
                    <input type="checkbox" ${param.required ? 'checked' : ''} onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'required', this.checked)">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" value="${this.escapeHtml(param.description)}" placeholder="파라미터 설명"
                           onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'description', this.value)">
                </td>
                <td class="text-end">
                    <div class="btn-group">
                        <button type="button" class="btn btn-outline-secondary btn-sm" title="스키마 편집" onclick="window.apiDocsManager.toggleParam(${endpoint.id}, ${param.id})">
                            <i class="fas fa-sliders-h"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" title="삭제" onclick="window.apiDocsManager.removeParam(${endpoint.id}, ${param.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
            <tr class="param-detail-row" ${detailStyle}>
                <td colspan="6">
                    <div class="param-detail">
                        <div class="mb-3">
                            <label class="form-label">스키마</label>
                            ${this.renderSchemaEditor(contextKey, param.schema, 'root')}
                        </div>
                        <div>
                            <label class="form-label">예시 값</label>
                            <input type="text" class="form-control" value="${exampleValue}" placeholder="예: KRW"
                                   onchange="window.apiDocsManager.updateParamExample(${endpoint.id}, ${param.id}, this.value)">
                            <small class="text-muted">타입과 일치하는 값을 입력하세요.</small>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderRequestBodySection(endpoint) {
        const requestBody = this.ensureRequestBody(endpoint);
        const schemaContext = this.makeRequestBodySchemaContext(endpoint.id);
        const exampleText = this.escapeHtml(this.formatJsonExample(requestBody.example));
        const content = requestBody.enabled ? `
            <div class="card request-body-card">
                <div class="card-body">
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="form-label">설명</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(requestBody.description)}" placeholder="요청 본문 설명"
                                   onchange="window.apiDocsManager.updateRequestBodyField(${endpoint.id}, 'description', this.value)">
                        </div>
                        <div>
                            <label class="form-label">콘텐츠 타입</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(requestBody.contentType)}" placeholder="application/json"
                                   onchange="window.apiDocsManager.updateRequestBodyField(${endpoint.id}, 'contentType', this.value)">
                        </div>
                        <div class="d-flex align-items-center justify-content-between" style="gap:8px;">
                            <div>
                                <label class="form-label mb-0">필수 여부</label>
                                <div class="text-muted small">요청 시 반드시 포함</div>
                            </div>
                            <input type="checkbox" ${requestBody.required ? 'checked' : ''}
                                   onchange="window.apiDocsManager.updateRequestBodyField(${endpoint.id}, 'required', this.checked)">
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="form-label">스키마</label>
                        ${this.renderSchemaEditor(schemaContext, requestBody.schema, 'root')}
                    </div>
                    <div class="mt-3">
                        <label class="form-label">예시 (JSON)</label>
                        <textarea class="form-control font-monospace" rows="6" placeholder='{"name":"홍길동"}'
                                  onchange="window.apiDocsManager.updateRequestBodyExample(${endpoint.id}, this.value)">${exampleText}</textarea>
                        <small class="text-muted">JSON 형식으로 입력해 주세요. 비워두면 예시가 제외됩니다.</small>
                    </div>
                </div>
            </div>
        ` : `<div class="empty-state small">POST/PUT 요청 본문이 필요하다면 스위치를 켜주세요.</div>`;
        return `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">요청 본문</label>
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" ${requestBody.enabled ? 'checked' : ''}
                               onchange="window.apiDocsManager.toggleRequestBodyEnabled(${endpoint.id}, this.checked)">
                        <label class="form-check-label">사용</label>
                    </div>
                </div>
                ${content}
            </div>
        `;
    }

    renderResponsesSection(endpoint) {
        const entries = Object.entries(endpoint.responses || {});
        if (entries.length === 0) {
            return `
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label mb-0">응답</label>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addResponse(${endpoint.id})">
                            <i class="fas fa-plus"></i> 추가
                        </button>
                    </div>
                    <div class="empty-state small">응답을 추가해 주세요.</div>
                </div>
            `;
        }
        return `
            <div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">응답</label>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addResponse(${endpoint.id})">
                        <i class="fas fa-plus"></i> 추가
                    </button>
                </div>
                ${entries.map(([code, response]) => this.renderResponse(endpoint, code, response)).join('')}
            </div>
        `;
    }

    renderResponse(endpoint, code, response) {
        const description = response.description || '';
        const content = response.content || {};
        const contentHtml = Object.entries(content).map(([contentType, contentData]) => this.renderResponseContent(endpoint, code, contentType, contentData)).join('');
        const collapsed = Boolean(response.__collapsed);
        const bodyStyle = collapsed ? 'style="display:none;"' : '';
        const toggleIcon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
        return `
            <div class="response-item">
                <div class="response-header">
                    <div>
                        <span class="badge badge-primary">${this.escapeHtml(code)}</span>
                        <strong>${this.escapeHtml(description || '설명없음')}</strong>
                    </div>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-secondary" title="접기/펼치기" onclick="window.apiDocsManager.toggleResponse(${endpoint.id}, '${this.escapeAttribute(code)}')">
                            <i class="fas ${toggleIcon}"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" title="응답 추가" onclick="window.apiDocsManager.addResponse(${endpoint.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                        
                        <button type="button" class="remove-btn" title="응답 삭제" onclick="window.apiDocsManager.removeResponse(${endpoint.id}, '${this.escapeAttribute(code)}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="response-content" ${bodyStyle}>
                <div class="mt-2">
                    <label class="form-label">설명</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(description)}"
                           onchange="window.apiDocsManager.updateResponseDescription(${endpoint.id}, '${this.escapeAttribute(code)}', this.value)"
                           placeholder="응답 설명">
                </div>
                <div class="mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label mb-0">콘텐츠 타입</label>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addResponseContentType(${endpoint.id}, '${this.escapeAttribute(code)}')">
                            <i class="fas fa-plus"></i> 추가
                        </button>
                    </div>
                    ${contentHtml}
                </div>
                </div>
            </div>
        `;
    }

    renderResponseContent(endpoint, code, contentType, contentData) {
        const contextKey = this.makeResponseSchemaContext(endpoint.id, code, contentType);
        const encodedCode = this.escapeAttribute(code);
        const encodedContentType = this.escapeAttribute(contentType);
        const schemaHtml = this.renderSchemaEditor(contextKey, contentData.schema || { type: 'object' }, 'root');
        const examplesHtml = this.renderExamples(endpoint, code, contentType, contentData.examples || {});
        return `
            <div class="card mt-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="form-group w-100 me-2">
                            <label class="form-label">콘텐츠 타입</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(contentType)}"
                                   onchange="window.apiDocsManager.renameResponseContentType(${endpoint.id}, '${encodedCode}', '${encodedContentType}', this.value)">
                        </div>
                        <button type="button" class="btn btn-outline-danger btn-sm mt-4" onclick="window.apiDocsManager.removeResponseContentType(${endpoint.id}, '${encodedCode}', '${encodedContentType}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="mt-3">
                        <label class="form-label">스키마</label>
                        ${schemaHtml}
                    </div>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label mb-0">예시</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addResponseExample(${endpoint.id}, '${encodedCode}', '${encodedContentType}')">
                                <i class="fas fa-plus"></i> 추가
                            </button>
                        </div>
                        ${examplesHtml}
                    </div>
                </div>
            </div>
        `;
    }

    renderExamples(endpoint, code, contentType, examples) {
        const entries = Object.entries(examples || {});
        if (entries.length === 0) {
            return '<div class="empty-state small">예시를 추가해 주세요.</div>';
        }
        return entries.map(([name, example]) => this.renderExample(endpoint, code, contentType, name, example)).join('');
    }

    renderExample(endpoint, code, contentType, name, example) {
        const contextKey = this.makeExampleContext(endpoint.id, code, contentType, name);
        const valueType = this.detectValueType(example.value);
        const collapsed = Boolean(example.__collapsed);
        const bodyStyle = collapsed ? 'style="display:none;"' : '';
        const toggleIcon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
        const encodedCode = this.escapeAttribute(code);
        const encodedContentType = this.escapeAttribute(contentType);
        const encodedName = this.escapeAttribute(name);
        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="form-group me-2 w-25">
                            <label class="form-label">이름</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(name)}"
                                   onchange="window.apiDocsManager.renameResponseExample(${endpoint.id}, '${encodedCode}', '${encodedContentType}', '${encodedName}', this.value)">
                        </div>
                        <div class="form-group me-2 w-50">
                            <label class="form-label">요약</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(example.summary || '')}"
                                   onchange="window.apiDocsManager.updateResponseExampleSummary(${endpoint.id}, '${encodedCode}', '${encodedContentType}', '${encodedName}', this.value)"
                                   placeholder="예: 성공 응답">
                        </div>
                        <div class="btn-group">
                            <button type="button" class="btn btn-outline-secondary btn-sm mt-4" title="접기/펼치기" onclick="window.apiDocsManager.toggleExampleNode('${contextKey}')">
                                <i class="fas ${toggleIcon}"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-sm mt-4" onclick="window.apiDocsManager.removeResponseExample(${endpoint.id}, '${encodedCode}', '${encodedContentType}', '${encodedName}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-3" ${bodyStyle}>
                        ${this.renderValueEditor(contextKey, 'root', example.value, valueType)}
                    </div>
                </div>
            </div>
        `;
    }

    renderValueEditor(contextKey, path, value, valueType) {
        const encodedPath = this.escapeAttribute(path);
        const options = ['object', 'array', 'string', 'number', 'boolean', 'null'];
        const typeSelect = `
            <label class="form-label">타입</label>
            <select class="form-control" onchange="window.apiDocsManager.setExampleValueType('${contextKey}', '${encodedPath}', this.value)">
                ${options.map((type) => `<option value="${type}" ${valueType === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
        `;

        if (valueType === 'object') {
            const entries = Object.entries(value || {});
            const propertiesHtml = entries.map(([key, val]) => {
                const childPath = this.concatValuePath(path, key);
                const encodedChildPath = this.escapeAttribute(childPath);
                const encodedKey = this.escapeAttribute(key);
                const childType = this.detectValueType(val);
                return `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="form-group me-2 w-25">
                                    <label class="form-label">속성 이름</label>
                                    <input type="text" class="form-control" value="${this.escapeHtml(key)}"
                                           onchange="window.apiDocsManager.renameExampleProperty('${contextKey}', '${encodedPath}', '${encodedKey}', this.value)">
                                </div>
                                <button type="button" class="btn btn-outline-danger btn-sm mt-4" onclick="window.apiDocsManager.removeExampleProperty('${contextKey}', '${encodedPath}', '${encodedKey}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="mt-2">
                                ${this.renderValueEditor(contextKey, childPath, val, childType)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <div class="mt-3">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addExampleProperty('${contextKey}', '${encodedPath}')">
                                <i class="fas fa-plus"></i> 속성 추가
                            </button>
                        </div>
                        <div class="mt-3">
                            ${propertiesHtml || '<div class="empty-state small">속성을 추가해 주세요.</div>'}
                        </div>
                    </div>
                </div>
            `;
        }

        if (valueType === 'array') {
            const items = Array.isArray(value) ? value : [];
            const itemsHtml = items.map((item, index) => {
                const childPath = this.concatValuePath(path, String(index));
                const encodedChildPath = this.escapeAttribute(childPath);
                const childType = this.detectValueType(item);
                return `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-secondary">#${index + 1}</span>
                                <button type="button" class="btn btn-outline-danger btn-sm" onclick="window.apiDocsManager.removeExampleArrayItem('${contextKey}', '${encodedPath}', ${index})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="mt-2">
                                ${this.renderValueEditor(contextKey, childPath, item, childType)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <div class="mt-3">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addExampleArrayItem('${contextKey}', '${encodedPath}')">
                                <i class="fas fa-plus"></i> 항목 추가
                            </button>
                        </div>
                        <div class="mt-3">
                            ${itemsHtml || '<div class="empty-state small">항목을 추가해 주세요.</div>'}
                        </div>
                    </div>
                </div>
            `;
        }

        if (valueType === 'boolean') {
            return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <div class="mt-3">
                            <label class="form-label">값</label>
                            <select class="form-control" onchange="window.apiDocsManager.updateExamplePrimitive('${contextKey}', '${encodedPath}', this.value)">
                                <option value="true" ${value === true ? 'selected' : ''}>true</option>
                                <option value="false" ${value === false ? 'selected' : ''}>false</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }

        if (valueType === 'number') {
            return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <div class="mt-3">
                            <label class="form-label">값</label>
                            <input type="number" class="form-control" value="${value !== undefined ? value : 0}"
                                   onchange="window.apiDocsManager.updateExamplePrimitive('${contextKey}', '${encodedPath}', this.value)">
                        </div>
                    </div>
                </div>
            `;
        }

        if (valueType === 'null') {
            return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <p class="text-muted mt-3">값이 null 입니다.</p>
                    </div>
                </div>
            `;
        }

        // string 기본
        return `
                <div class="card">
                    <div class="card-body">
                        ${typeSelect}
                        <div class="mt-3">
                            <label class="form-label">값</label>
                            <textarea class="form-control" rows="2" onchange="window.apiDocsManager.updateExamplePrimitive('${contextKey}', '${encodedPath}', this.value)">${this.escapeHtml(value ?? '')}</textarea>
                        </div>
                    </div>
                </div>
            `;
    }

    concatValuePath(base, segment) {
        return base === 'root' ? `root.${segment}` : `${base}.${segment}`;
    }

    renderSchemaEditor(contextKey, schema, path) {
        if (!schema.type) schema.type = 'object';
        const encodedPath = this.escapeAttribute(path);
        const typeOptions = ['object', 'array', 'string', 'integer', 'number', 'boolean'];
        const typeSelect = `
            <label class="form-label">타입</label>
            <select class="form-control" onchange="window.apiDocsManager.handleSchemaTypeChange('${contextKey}', '${encodedPath}', this.value)">
                ${typeOptions.map((type) => `<option value="${type}" ${schema.type === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
        `;

        let specific = '';

        if (schema.type === 'object') {
            if (!schema.properties) schema.properties = {};
            if (!Array.isArray(schema.required)) schema.required = [];
            const entries = Object.entries(schema.properties);
            const propertiesHtml = entries.map(([propName, propSchema]) => {
                const propertyPath = this.concatPath(path, `properties.${propName}`);
                const encodedPropertyPath = this.escapeAttribute(propertyPath);
                const encodedPropName = this.escapeAttribute(propName);
                const required = schema.required.includes(propName);
                const childCollapsed = Boolean(propSchema.__collapsed);
                const toggleIcon = childCollapsed ? 'fa-chevron-down' : 'fa-chevron-up';
                const contentStyle = childCollapsed ? 'style="display:none;"' : '';
                return `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="form-group me-2 w-25">
                                    <label class="form-label">속성 이름</label>
                                    <input type="text" class="form-control" value="${this.escapeHtml(propName)}"
                                           onchange="window.apiDocsManager.renameSchemaProperty('${contextKey}', '${encodedPath}', '${encodedPropName}', this.value)">
                                </div>
                                <div class="form-group me-2">
                                    <label class="form-label">필수</label>
                                    <input type="checkbox" ${required ? 'checked' : ''}
                                           onchange="window.apiDocsManager.toggleSchemaRequired('${contextKey}', '${encodedPath}', '${encodedPropName}', this.checked)">
                                </div>
                                <div class="btn-group">
                                    <button type="button" class="btn btn-outline-secondary btn-sm" title="접기/펼치기" onclick="window.apiDocsManager.toggleSchemaNode('${contextKey}', '${encodedPropertyPath}')">
                                        <i class="fas ${toggleIcon}"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-danger btn-sm mt-4" onclick="window.apiDocsManager.removeSchemaProperty('${contextKey}', '${encodedPath}', '${encodedPropName}')">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="mt-2 schema-node" ${contentStyle}>
                                ${this.renderSchemaEditor(contextKey, propSchema, propertyPath)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            specific = `
                <div class="mt-3">
                    <label class="form-label">설명</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(schema.description || '')}"
                           onchange="window.apiDocsManager.updateSchemaStringField('${contextKey}', '${encodedPath}', 'description', this.value)">
                </div>
                <div class="mt-3">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addSchemaProperty('${contextKey}', '${encodedPath}')">
                        <i class="fas fa-plus"></i> 속성 추가
                    </button>
                </div>
                <div class="mt-3">
                    ${propertiesHtml || '<div class="empty-state small">속성을 추가해 주세요.</div>'}
                </div>
            `;
        } else if (schema.type === 'array') {
            if (!schema.items || typeof schema.items !== 'object') schema.items = { type: 'string', __collapsed: false };
            const itemsPath = this.concatPath(path, 'items');
            const collapsed = Boolean(schema.__collapsed);
            const contentStyle = collapsed ? 'style="display:none;"' : '';
            const toggleIcon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
            specific = `
                <div class="grid grid-cols-3 gap-2 mt-3">
                    <div>
                        <label class="form-label">최소 항목수</label>
                        <input type="number" class="form-control" value="${schema.minItems ?? ''}"
                               onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'minItems', this.value)">
                    </div>
                    <div>
                        <label class="form-label">최대 항목수</label>
                        <input type="number" class="form-control" value="${schema.maxItems ?? ''}"
                               onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'maxItems', this.value)">
                    </div>
                    <div class="d-flex align-items-center" style="gap:8px;margin-top:24px;">
                        <label class="form-label mb-0">중복 금지</label>
                        <input type="checkbox" ${schema.uniqueItems ? 'checked' : ''}
                               onchange="window.apiDocsManager.updateSchemaBooleanField('${contextKey}', '${encodedPath}', 'uniqueItems', this.checked)">
                    </div>
                </div>
                <div class="mt-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <label class="form-label mb-0">항목 스키마</label>
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.apiDocsManager.toggleSchemaNode('${contextKey}', '${encodedPath}')">
                            <i class="fas ${toggleIcon}"></i>
                        </button>
                    </div>
                    <div class="mt-2" ${contentStyle}>
                        ${this.renderSchemaEditor(contextKey, schema.items, itemsPath)}
                    </div>
                </div>
            `;
        } else {
            const collapsed = Boolean(schema.__collapsed);
            const contentStyle = collapsed ? 'style="display:none;"' : '';
            const toggleIcon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
            let advanced = '';
            if (schema.type === 'string') {
                advanced += `
                    <div class="grid grid-cols-3 gap-2 mt-3">
                        <div>
                            <label class="form-label">포맷</label>
                            <input type="text" class="form-control" value="${this.escapeHtml(schema.format || '')}"
                                   onchange="window.apiDocsManager.updateSchemaStringField('${contextKey}', '${encodedPath}', 'format', this.value)">
                        </div>
                        <div>
                            <label class="form-label">최소 길이</label>
                            <input type="number" class="form-control" value="${schema.minLength ?? ''}"
                                   onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'minLength', this.value)">
                        </div>
                        <div>
                            <label class="form-label">최대 길이</label>
                            <input type="number" class="form-control" value="${schema.maxLength ?? ''}"
                                   onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'maxLength', this.value)">
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="form-label">패턴 (정규식)</label>
                        <input type="text" class="form-control" value="${this.escapeHtml(schema.pattern || '')}"
                               onchange="window.apiDocsManager.updateSchemaStringField('${contextKey}', '${encodedPath}', 'pattern', this.value)">
                    </div>
                    <div class="mt-3">
                        <label class="form-label">열거 값 (쉼표 구분)</label>
                        <input type="text" class="form-control" value="${this.escapeHtml((schema.enum || []).join(', '))}"
                               onchange="window.apiDocsManager.updateSchemaEnum('${contextKey}', '${encodedPath}', this.value)">
                    </div>
                `;
            }
            if (schema.type === 'integer' || schema.type === 'number') {
                advanced += `
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <div>
                            <label class="form-label">최소 값</label>
                            <input type="number" class="form-control" value="${schema.minimum ?? ''}"
                                   onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'minimum', this.value)">
                        </div>
                        <div>
                            <label class="form-label">최대 값</label>
                            <input type="number" class="form-control" value="${schema.maximum ?? ''}"
                                   onchange="window.apiDocsManager.updateSchemaNumberField('${contextKey}', '${encodedPath}', 'maximum', this.value)">
                        </div>
                    </div>
                `;
            }
            specific = `
                <div class="mt-3">
                    <label class="form-label">설명</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(schema.description || '')}"
                           onchange="window.apiDocsManager.updateSchemaStringField('${contextKey}', '${encodedPath}', 'description', this.value)">
                </div>
                <div class="mt-3">
                    <label class="form-label">기본값</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(schema.default ?? '')}"
                           onchange="window.apiDocsManager.updateSchemaStringField('${contextKey}', '${encodedPath}', 'default', this.value)">
                </div>
                <div class="mt-3">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.apiDocsManager.toggleSchemaNode('${contextKey}', '${encodedPath}')">
                        <i class="fas ${toggleIcon}"></i> 세부 옵션 보기
                    </button>
                </div>
                <div class="mt-3" ${contentStyle}>
                    ${advanced || '<p class="text-muted">추가 설정이 없습니다.</p>'}
                </div>
            `;
        }

        return `
            <div class="card">
                <div class="card-body">
                    ${typeSelect}
                    ${specific}
                </div>
            </div>
        `;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        return encodeURIComponent(String(value ?? ''));
    }

    formatJsonExample(value) {
        if (value === undefined) return '';
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '';
        }
    }

    /* -------------------------------------------------------------
     * JSON 생성 & 저장
     * ----------------------------------------------------------- */
    buildSpec() {
        const titleInput = document.getElementById('title');
        const versionInput = document.getElementById('version');
        const title = titleInput?.value?.trim() || '';
        const version = versionInput?.value?.trim() || '';

        const endpoints = this.endpoints.map((endpoint) => this.serializeEndpoint(endpoint));
        const spec = {
            title,
            version,
            endpoints
        };
        return this.stripMeta(spec);
    }

    serializeEndpoint(endpoint) {
        const result = {
            method: endpoint.method || 'GET',
            path: endpoint.path || '',
            responses: {}
        };
        if (endpoint.summary) result.summary = endpoint.summary;
        if (endpoint.tags?.length) result.tags = endpoint.tags.slice();

        if (endpoint.params?.length) {
            result.params = endpoint.params.map((param) => {
                const paramSpec = {
                    in: param.in || 'query',
                    name: param.name || '',
                    required: param.in === 'path' ? true : Boolean(param.required),
                    schema: this.clone(param.schema) || { type: 'string' }
                };
                if (param.description) paramSpec.description = param.description;
                if (param.example !== undefined) paramSpec.example = this.clone(param.example);
                return paramSpec;
            });
        }

        if (endpoint.requestBody?.enabled) {
            const contentType = endpoint.requestBody.contentType || 'application/json';
            const bodyContent = {
                schema: this.clone(endpoint.requestBody.schema) || { type: 'object' }
            };
            if (endpoint.requestBody.example !== undefined) {
                bodyContent.example = this.clone(endpoint.requestBody.example);
            }
            const requestBodySpec = {
                content: {
                    [contentType]: bodyContent
                }
            };
            if (endpoint.requestBody.description) {
                requestBodySpec.description = endpoint.requestBody.description;
            }
            if (endpoint.requestBody.required) {
                requestBodySpec.required = true;
            }
            result.requestBody = requestBodySpec;
        }

        Object.entries(endpoint.responses || {}).forEach(([code, response]) => {
            const responseSpec = {
                description: response.description || ''
            };
            if (response.content) {
                responseSpec.content = this.clone(response.content);
            }
            if (response.headers) responseSpec.headers = this.clone(response.headers);
            if (response.links) responseSpec.links = this.clone(response.links);
            result.responses[code] = responseSpec;
        });

        return this.stripMeta(result);
    }

    buildPayload() {
        const spec = this.buildSpec();
        const payload = { ...spec };
        if (this.projectIdx !== null) payload.projectIdx = this.projectIdx;
        if (this.docsIdx !== null) payload.docsIdx = this.docsIdx;
        return payload;
    }

    stripMeta(value) {
        if (Array.isArray(value)) {
            const cleaned = value
                .map((item) => this.stripMeta(item))
                .filter((item) => item !== undefined);
            return cleaned;
        }
        if (value && typeof value === 'object') {
            const result = {};
            Object.entries(value).forEach(([key, val]) => {
                if (key.startsWith('__')) return;
                const cleaned = this.stripMeta(val);
                if (cleaned === undefined) return;
                if (Array.isArray(cleaned) && cleaned.length === 0) return;
                if (cleaned && typeof cleaned === 'object' && Object.keys(cleaned).length === 0) return;
                result[key] = cleaned;
            });
            return result;
        }
        if (value === '' || value === null) {
            return undefined;
        }
        return value;
    }

    renderJsonPreview() {
        const preview = document.getElementById('apiJsonPreview');
        if (!preview) return;
        try {
            const spec = this.buildSpec();
            preview.textContent = JSON.stringify(spec, null, 2);
        } catch (error) {
            preview.textContent = '// JSON 미리보기를 생성할 수 없습니다.';
            console.error('JSON 미리보기 생성 실패', error);
        }
    }

    validForm() {
        const title = document.getElementById('title').value;
        if (!title.trim()) {
            NotificationManager.showError('플로우차트 제목을 입력해주세요.');
            return false;
        }

        if (this.endpoints.length === 0) {
            NotificationManager.showError('최소 1개의 엔드포인트를 추가해주세요.');
            return false;
        }


        return true;
    }

    async downloadFile() {
        // 미리보기 구현
        if (!this.validForm()) {
            return;
        }

        try {
            const payload = this.buildPayload();

            const {data} = await axios.post('/api/generate/docs-url', payload);
            if (!data.success || !data.data?.url) {
                NotificationManager.showError(data.message || '다운로드 URL을 가져오지 못했습니다.');
                return;
            }

            await UTIL.file.download({url : data.data.url, fileName : data.data.fileName || 'api-docs'});

        } catch (e) {
            console.error(e);
            NotificationManager.showError('오류가 발생했습니다. 관리자에게 문의해주시기 바랍니다.');
        }
    }

    saveApiDocs() {
        const titleInput = document.getElementById('title');
        const versionInput = document.getElementById('version');
        const title = titleInput?.value?.trim();
        const version = versionInput?.value?.trim();

        if (!title || !version) {
            this.notifyError('제목과 버전을 입력해 주세요.');
            return;
        }

        if (this.endpoints.length === 0) {
            this.notifyError('최소 하나의 엔드포인트를 추가해 주세요.');
            return;
        }

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
                console.log('API 명세 저장:', result);
                this.notifySuccess('저장되었습니다.');
            })
            .catch((error) => {
                console.error('저장 실패:', error);
                this.notifyError(error.message || '저장에 실패했습니다.');
            });
    }

    checkDemoMode() {
        if (this.endpoints.length > 0) return;
        const search = new URLSearchParams(window.location.search);
        if (!search.get('demo')) return;

        const titleInput = document.getElementById('title');
        const versionInput = document.getElementById('version');
        if (titleInput) titleInput.value = '주문 API';
        if (versionInput) versionInput.value = '1.0.0';

        this.endpoints = [
            this.normalizeEndpoint({
                method: 'GET',
                path: '/orders',
                summary: '데모 엔드포인트',
                tags: ['Demo'],
                params: [
                    {
                        in: 'query',
                        name: 'page',
                        required: false,
                        schema: { type: 'integer', minimum: 1 },
                        description: '페이지 번호'
                    }
                ],
                responses: {
                    '200': {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' }
                                    }
                                },
                                examples: {
                                    demo: {
                                        summary: '샘플',
                                        value: { message: 'hello' },
                                        __collapsed: false
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ];
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

}

document.addEventListener('DOMContentLoaded', () => {
    apiDocsManager = new ApiDocsManager();
});

window.ApiDocsManager = ApiDocsManager;
