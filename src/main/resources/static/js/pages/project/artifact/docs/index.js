let apiDocsManager;

// API 문서 관리자 클래스
class ApiDocsManager {
    constructor() {
        this.endpoints = [];
        this.endpointCounter = 0;
        this.projectIdx = null;
        this.docsIdx = null;
        this.init();
    }

    init() {
        console.log('API 문서 에디터 초기화');
        this.bindEvents();
        this.checkDemoMode();
    }

    bindEvents() {
        const form = document.getElementById('apiDocsForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveApiDocs();
            });
        }

        document.getElementById('addEndpointBtn').addEventListener('click', () => {
            this.addEndpoint();
        });

    }

    addEndpoint() {
        const endpoint = {
            id: ++this.endpointCounter,
            method: 'GET',
            path: '',
            summary: '',
            tags: [],
            params: [],
            responses: {}
        };
        this.endpoints.push(endpoint);
        this.renderEndpoints();
    }

    removeEndpoint(id) {
        if (confirm('이 엔드포인트를 삭제하시겠습니까?')) {
            this.endpoints = this.endpoints.filter(ep => ep.id !== id);
            this.renderEndpoints();
        }
    }

    addParam(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint) {
            endpoint.params.push({
                id: Date.now(),
                in: 'query',
                name: '',
                required: false,
                schema: { type: 'string' },
                description: ''
            });
            this.renderEndpoints();
        }
    }

    removeParam(endpointId, paramId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint) {
            endpoint.params = endpoint.params.filter(p => p.id !== paramId);
            this.renderEndpoints();
        }
    }

    addResponse(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint) {
            const code = prompt('응답 코드를 입력하세요 (예: 200, 400, 404)', '200');
            if (code) {
                endpoint.responses[code] = {
                    description: '',
                    content: {
                        'application/json': {
                            schema: {},
                            examples: {}
                        }
                    }
                };
                this.renderEndpoints();
            }
        }
    }

    removeResponse(endpointId, code) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint) {
            delete endpoint.responses[code];
            this.renderEndpoints();
        }
    }

    updateEndpointField(endpointId, field, value) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint) {
            if (field === 'tags') {
                endpoint.tags = value.split(',').map(t => t.trim()).filter(t => t);
            } else {
                endpoint[field] = value;
            }
        }
    }

    updateParamField(endpointId, paramId, field, value) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        const param = endpoint?.params.find(p => p.id === paramId);
        if (param) {
            if (field === 'required') {
                param.required = value;
            } else if (field === 'schema.type') {
                param.schema.type = value;
            } else {
                param[field] = value;
            }
        }
    }

    updateResponseField(endpointId, code, field, value) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (endpoint && endpoint.responses[code]) {
            if (field === 'description') {
                endpoint.responses[code].description = value;
            }
        }
    }

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
            return;
        }

        container.innerHTML = this.endpoints.map(endpoint => `
            <div class="endpoint-card">
                <div class="endpoint-header">
                    <div class="endpoint-summary">
                        <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                        ${endpoint.path || '/path'} - ${endpoint.summary || '요약 없음'}
                    </div>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.apiDocsManager.removeEndpoint(${endpoint.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="endpoint-body">
                    <div class="grid grid-cols-2 mb-3">
                        <div class="form-group">
                            <label class="form-label">메소드</label>
                            <select class="form-control" onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'method', this.value)">
                                <option value="GET" ${endpoint.method === 'GET' ? 'selected' : ''}>GET</option>
                                <option value="POST" ${endpoint.method === 'POST' ? 'selected' : ''}>POST</option>
                                <option value="PUT" ${endpoint.method === 'PUT' ? 'selected' : ''}>PUT</option>
                                <option value="DELETE" ${endpoint.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                                <option value="PATCH" ${endpoint.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">경로</label>
                            <input type="text" class="form-control" value="${endpoint.path}"
                                   onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'path', this.value)"
                                   placeholder="/api/orders">
                        </div>
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label">요약</label>
                        <input type="text" class="form-control" value="${endpoint.summary}"
                               onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'summary', this.value)"
                               placeholder="엔드포인트 요약">
                    </div>

                    <div class="form-group mb-3">
                        <label class="form-label">태그 (쉼표로 구분)</label>
                        <input type="text" class="form-control" value="${endpoint.tags.join(', ')}"
                               onchange="window.apiDocsManager.updateEndpointField(${endpoint.id}, 'tags', this.value)"
                               placeholder="Order, User">
                    </div>

                    <!-- 파라미터 -->
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label">파라미터</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addParam(${endpoint.id})">
                                <i class="fas fa-plus"></i> 추가
                            </button>
                        </div>
                        ${endpoint.params.map(param => `
                            <div class="param-item">
                                <div class="param-header">
                                    <div>
                                        <span class="param-type">${param.in}</span>
                                        <strong>${param.name || '이름없음'}</strong>
                                        ${param.required ? '<span class="badge badge-primary">필수</span>' : ''}
                                    </div>
                                    <button type="button" class="btn btn-sm btn-danger" onclick="window.apiDocsManager.removeParam(${endpoint.id}, ${param.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <div class="grid grid-cols-3 gap-2">
                                    <div>
                                        <input type="text" class="form-control" value="${param.name}"
                                               onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'name', this.value)"
                                               placeholder="파라미터명">
                                    </div>
                                    <div>
                                        <select class="form-control" onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'in', this.value)">
                                            <option value="query" ${param.in === 'query' ? 'selected' : ''}>query</option>
                                            <option value="path" ${param.in === 'path' ? 'selected' : ''}>path</option>
                                            <option value="header" ${param.in === 'header' ? 'selected' : ''}>header</option>
                                            <option value="body" ${param.in === 'body' ? 'selected' : ''}>body</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select class="form-control" onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'schema.type', this.value)">
                                            <option value="string" ${param.schema.type === 'string' ? 'selected' : ''}>string</option>
                                            <option value="integer" ${param.schema.type === 'integer' ? 'selected' : ''}>integer</option>
                                            <option value="number" ${param.schema.type === 'number' ? 'selected' : ''}>number</option>
                                            <option value="boolean" ${param.schema.type === 'boolean' ? 'selected' : ''}>boolean</option>
                                            <option value="object" ${param.schema.type === 'object' ? 'selected' : ''}>object</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <input type="text" class="form-control" value="${param.description || ''}"
                                           onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'description', this.value)"
                                           placeholder="파라미터 설명">
                                </div>
                                <div class="mt-2">
                                    <label>
                                        <input type="checkbox" ${param.required ? 'checked' : ''}
                                               onchange="window.apiDocsManager.updateParamField(${endpoint.id}, ${param.id}, 'required', this.checked)">
                                        필수
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- 응답 -->
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <label class="form-label">응답</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.apiDocsManager.addResponse(${endpoint.id})">
                                <i class="fas fa-plus"></i> 추가
                            </button>
                        </div>
                        ${Object.entries(endpoint.responses).map(([code, response]) => `
                            <div class="response-item">
                                <div class="response-header">
                                    <div>
                                        <span class="badge badge-primary">${code}</span>
                                        <strong>${response.description || '설명없음'}</strong>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-danger" onclick="window.apiDocsManager.removeResponse(${endpoint.id}, '${code}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <input type="text" class="form-control" value="${response.description || ''}"
                                       onchange="window.apiDocsManager.updateResponseField(${endpoint.id}, '${code}', 'description', this.value)"
                                       placeholder="응답 설명">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    saveApiDocs() {
        const title = document.getElementById('title')?.value;
        const version = document.getElementById('version')?.value;

        if (!title || !version) {
            NotificationManager.showError('제목과 버전을 입력해 주세요.');
            return;
        }

        if (this.endpoints.length === 0) {
            NotificationManager.showError('최소 하나의 엔드포인트를 추가해 주세요.');
            return;
        }

        const apiSpec = {
            projectIdx: this.projectIdx,
            docsIdx: this.docsIdx,
            title,
            version,
            endpoints: this.endpoints.map(ep => ({
                method: ep.method,
                path: ep.path,
                summary: ep.summary,
                tags: ep.tags,
                params: ep.params,
                responses: ep.responses
            }))
        };

        console.log('API 명세 저장:', apiSpec);

        // 실제 저장 API 호출
        fetch('/project/artifact/docs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiSpec)
        })
            .then(response => response.json())
            .then(result => {
                NotificationManager.showSuccess('저장되었습니다.');
                // 필요시 페이지 이동
            })
            .catch(error => {
                console.error('저장 실패:', error);
                NotificationManager.showError('저장에 실패했습니다.');
            });
    }

    checkDemoMode() {
        // 초기 더미 데이터
        if (new URLSearchParams(window.location.search).get('demo')) {
            const titleInput = document.getElementById('title');
            const versionInput = document.getElementById('version');

            if (titleInput) titleInput.value = '주문 API';
            if (versionInput) versionInput.value = '1.2.0';

            this.addEndpoint();
            setTimeout(() => {
                if (this.endpoints[0]) {
                    this.endpoints[0].method = 'GET';
                    this.endpoints[0].path = '/orders';
                    this.endpoints[0].summary = '주문 목록 조회';
                    this.endpoints[0].tags = ['Order'];
                    this.renderEndpoints();
                }
            }, 100);
        }
    }

    destroy() {
        // 정리 작업
        this.endpoints = [];
        this.endpointCounter = 0;
    }
}

// 글로벌 변수로 등록
document.addEventListener('DOMContentLoaded', () => {
    apiDocsManager = new ApiDocsManager();
});

window.ApiDocsManager = ApiDocsManager;