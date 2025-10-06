// 전역 변수 선언
let apiFlowManager;

/**
 * API 플로우 관리자 클래스
 * - 노드 추가 시 기존 항목 유지
 * - 모양 선택 이벤트 정상 작동
 * - 서버 데이터 로드 후 이벤트 바인딩 보장
 * - innerHTML로 삽입된 스크립트 자동 실행
 */
class ApiFlowManager {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.currentTheme = 'default';
        this.nodeCounter = 0;
        this.edgeCounter = 0;
        this.projectIdx = null;
        this.flowIdx = null;
        this.isEditMode = false;
        this.init();
    }

    init() {
        console.log('API Flow 에디터 초기화');

        // 서버 데이터 먼저 로드
        this.loadServerDataFromHtml();

        // 기본 이벤트 바인딩
        this.bindEvents();

        // 항상 렌더링 수행 (데이터 존재 여부와 상관없이)
        this.renderNodesList();
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    /**
     * 서버에서 전달받은 데이터 로드
     */
    loadServerDataFromHtml() {
        const serverDataElement = document.getElementById('server-data');

        if (!serverDataElement) {
            console.warn('서버 데이터 요소를 찾을 수 없습니다.');
            return;
        }

        // HTML data 속성에서 데이터 읽기
        const serverData = {
            title: serverDataElement.dataset.title || '',
            theme: serverDataElement.dataset.theme || 'default',
            layout: serverDataElement.dataset.layout || 'LR',
            flowData: serverDataElement.dataset.flowData || '',
            flowIdx: serverDataElement.dataset.flowIdx || null,
            projectIdx: serverDataElement.dataset.projectIdx || null,
            isEditMode: serverDataElement.dataset.isEditMode === 'true'
        };

        // 멤버 변수 설정
        this.projectIdx = serverData.projectIdx ? parseInt(serverData.projectIdx) : null;
        this.flowIdx = serverData.flowIdx ? parseInt(serverData.flowIdx) : null;
        this.isEditMode = serverData.isEditMode;

        console.log('서버 데이터 로드:', serverData);

        // 기본 정보 설정
        this.setFormValues(serverData);

        // 플로우 데이터 파싱 및 로드
        if (serverData.flowData && serverData.flowData.trim() !== '') {
            this.parseAndLoadFlowData(serverData.flowData);
        }

        console.log('서버 데이터 로드 완료:', {
            isEditMode: this.isEditMode,
            flowIdx: this.flowIdx,
            projectIdx: this.projectIdx,
            nodes: this.nodes.length,
            edges: this.edges.length
        });
    }

    /**
     * 폼 값 설정
     */
    setFormValues(serverData) {
        // 제목 설정
        if (serverData.title) {
            const titleInput = document.getElementById('title');
            if (titleInput) titleInput.value = serverData.title;
        }

        // 테마 설정
        if (serverData.theme) {
            this.selectTheme(serverData.theme);
        }

        // 레이아웃 설정
        if (serverData.layout) {
            const layoutSelect = document.getElementById('layout');
            if (layoutSelect) layoutSelect.value = serverData.layout;
        }
    }

    /**
     * JSON 플로우 데이터 파싱 및 로드
     */
    parseAndLoadFlowData(flowDataJson) {
        try {
            const flowData = JSON.parse(flowDataJson);

            // 노드 데이터 로드
            if (flowData.nodes && Array.isArray(flowData.nodes)) {
                this.nodes = flowData.nodes.map(node => ({
                    id: node.id || `NODE_${++this.nodeCounter}`,
                    label: node.label || 'Untitled Node',
                    shape: node.shape || 'service',
                    class: node.class || ''
                }));
                this.nodeCounter = Math.max(this.nodeCounter, this.nodes.length);
            }

            // 엣지 데이터 로드
            if (flowData.edges && Array.isArray(flowData.edges)) {
                this.edges = flowData.edges.map(edge => ({
                    from: edge.from,
                    to: edge.to,
                    label: edge.label || '',
                    style: edge.style || { type: 'normal' }
                }));
                this.edgeCounter = Math.max(this.edgeCounter, this.edges.length);
            }

            // 테마 정보 로드
            if (flowData.theme) {
                this.selectTheme(flowData.theme);
            }

            console.log('플로우 데이터 파싱 완료:', {
                nodes: this.nodes.length,
                edges: this.edges.length,
                theme: flowData.theme
            });

        } catch (error) {
            console.error('플로우 데이터 파싱 오류:', error);
            this.nodes = [];
            this.edges = [];
        }
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 테마 선택 이벤트
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectTheme(e.currentTarget.dataset.theme);
            });
        });

        // 노드 추가 버튼
        this.bindElementEvent('addNodeBtn', 'click', () => this.addNode());

        // 엣지 추가 버튼
        this.bindElementEvent('addEdgeBtn', 'click', () => this.addEdge());

        // 선택적 버튼들 (존재하는 경우만 바인딩)
        this.bindElementEvent('loadSampleBtn', 'click', () => this.loadSampleData());
        this.bindElementEvent('clearAllBtn', 'click', () => this.clearAll());
        this.bindElementEvent('copyJsonBtn', 'click', () => this.copyJson());
        this.bindElementEvent('toggleJsonEditor', 'click', () => this.toggleJsonEditor());
        this.bindElementEvent('downloadBtn', 'click', () => this.downloadFile());

        // 폼 제출
        this.bindElementEvent('flowchartForm', 'submit', (e) => this.submitForm(e));

        // 기본 정보 변경 감지
        ['title', 'layout'].forEach(field => {
            this.bindElementEvent(field, 'input', () => this.updateJsonPreview());
        });

        // JSON 에디터 변경 감지
        this.bindElementEvent('jsonEditor', 'input', () => this.parseJsonFromEditor());
    }

    /**
     * 요소가 존재하는 경우에만 이벤트 바인딩하는 헬퍼 함수
     */
    bindElementEvent(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        }
    }

    /**
     * 테마 선택
     */
    selectTheme(theme) {
        this.currentTheme = theme;

        // UI 업데이트
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });

        const selectedTheme = document.querySelector(`[data-theme="${theme}"]`);
        if (selectedTheme) {
            selectedTheme.classList.add('active');
        }

        const themeInput = document.getElementById('theme');
        if (themeInput) {
            themeInput.value = theme;
        }

        this.updateJsonPreview();
    }

    /**
     * 노드 추가 - 기존 항목 유지하면서 새 노드만 추가
     */
    addNode() {
        const nodeId = `NODE_${++this.nodeCounter}`;
        const node = {
            id: nodeId,
            label: `새 노드 ${this.nodeCounter}`,
            shape: 'service',
            class: ''
        };

        this.nodes.push(node);
        this.appendNewNode(node, this.nodes.length - 1);
        this.updateJsonPreview();
    }

    /**
     * 새로운 노드를 기존 목록에 추가
     */
    appendNewNode(node, index) {
        const container = document.getElementById('nodesList');
        if (!container) return;

        // 빈 상태 메시지 제거
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // 새 노드 HTML 생성 및 추가
        const nodeHtml = this.createNodeHtml(node, index);
        container.insertAdjacentHTML('beforeend', nodeHtml);

        // 새로 추가된 노드에만 이벤트 바인딩
        this.bindNodeEvents(container.lastElementChild);
    }

    /**
     * 노드 HTML 생성
     */
    createNodeHtml(node, index) {
        return `
        <div class="node-item" data-node-index="${index}">
            <div class="item-header">
                <div class="item-title">
                    <i class="fas fa-cube"></i>
                    노드 ${index + 1}
                </div>
                
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" title="접기/펼치기" onclick="window.apiFlowsManager.toggleResponse(this)">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    
                    <button type="button" class="btn btn-sm btn-secondary"  onclick="window.apiFlowsManager.addNode()">
                        <i class="fas fa-plus"></i>
                    </button>
                            
                    <button type="button" class="remove-btn" data-action="remove-node" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="flow-content">
                <div class="grid grid-cols-2 gap-3">
                    <div class="form-group">
                        <label class="form-label">ID <span class="required">*</span></label>
                        <input type="text" class="form-control" value="${this.escapeHtml(node.id)}" 
                               data-action="update-node" data-index="${index}" data-field="id">
                    </div>
                    <div class="form-group">
                        <label class="form-label">라벨 <span class="required">*</span></label>
                        <input type="text" class="form-control" value="${this.escapeHtml(node.label)}" 
                               data-action="update-node" data-index="${index}" data-field="label">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">모양</label>
                    <div class="shape-selector">
                        ${['service', 'external', 'db', 'process'].map(shape => `
                            <div class="shape-option ${node.shape === shape ? 'active' : ''}" 
                                 data-action="update-node" data-index="${index}" data-field="shape" data-value="${shape}">
                                ${this.getShapeLabel(shape)}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">클래스</label>
                    <select class="form-control" data-action="update-node" data-index="${index}" data-field="class">
                        <option value="" ${!node.class ? 'selected' : ''}>기본</option>
                        <option value="primary" ${node.class === 'primary' ? 'selected' : ''}>Primary</option>
                        <option value="accent" ${node.class === 'accent' ? 'selected' : ''}>Accent</option>
                        <option value="muted" ${node.class === 'muted' ? 'selected' : ''}>Muted</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    }

    /**
     * 노드 목록 렌더링
     */
    renderNodesList() {
        const container = document.getElementById('nodesList');
        if (!container) {
            console.error('nodesList 컨테이너를 찾을 수 없습니다.');
            return;
        }

        if (this.nodes.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sitemap"></i>
                <div>아직 노드가 없습니다.</div>
                <div>노드 추가 버튼을 클릭하여 시작하세요.</div>
            </div>`;
            return;
        }

        container.innerHTML = this.nodes.map((node, index) =>
            this.createNodeHtml(node, index)
        ).join('');

        // 모든 노드에 이벤트 바인딩
        container.querySelectorAll('.node-item').forEach(nodeElement => {
            this.bindNodeEvents(nodeElement);
        });

        console.log(`노드 목록 렌더링 완료: ${this.nodes.length}개`);
    }

    /**
     * 노드 이벤트 바인딩 - 중복 바인딩 방지 및 모양 선택 이벤트 포함
     */
    bindNodeEvents(nodeElement) {
        // 중복 바인딩 방지
        if (nodeElement.hasAttribute('data-events-bound')) {
            return;
        }

        // 노드 제거 버튼
        const removeBtn = nodeElement.querySelector('[data-action="remove-node"]');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeNode(index);
            });
        }

        // 모든 업데이트 가능한 요소들
        const updateElements = nodeElement.querySelectorAll('[data-action="update-node"]');
        updateElements.forEach(element => {
            const index = parseInt(element.dataset.index);
            const field = element.dataset.field;

            if (element.tagName === 'INPUT') {
                element.addEventListener('input', (e) => {
                    this.updateNode(index, field, e.target.value);
                });
            } else if (element.tagName === 'SELECT') {
                element.addEventListener('change', (e) => {
                    this.updateNode(index, field, e.target.value);
                });
            } else if (element.classList.contains('shape-option')) {
                // 모양 선택 이벤트 - 핵심 수정 부분
                element.addEventListener('click', (e) => {
                    const value = e.currentTarget.dataset.value;

                    // 노드 데이터 업데이트 (shape 필드에 값 저장)
                    this.updateNode(index, field, value);

                    // 시각적 업데이트 (active 클래스 변경)
                    const shapeSelector = e.currentTarget.parentElement;
                    shapeSelector.querySelectorAll('.shape-option').forEach(option => {
                        option.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                });
            }
        });

        // 바인딩 완료 표시
        nodeElement.setAttribute('data-events-bound', 'true');
    }

    /**
     * 노드 업데이트 - nodes 배열의 shape 값 업데이트 보장
     */
    updateNode(index, field, value) {
        if (index < 0 || index >= this.nodes.length) return;

        console.log(`노드 업데이트: index=${index}, field=${field}, value=${value}`);

        // nodes 배열 객체의 필드 값 업데이트
        this.nodes[index][field] = value;

        this.updateJsonPreview();

        // ID 변경 시 엣지 목록도 업데이트
        if (field === 'id') {
            this.renderEdgesList();
        }
    }

    /**
     * 노드 제거
     */
    removeNode(index) {
        if (index < 0 || index >= this.nodes.length) return;

        const nodeId = this.nodes[index].id;

        // 관련 엣지들 제거
        this.edges = this.edges.filter(edge =>
            edge.from !== nodeId && edge.to !== nodeId
        );

        // 노드 데이터 제거
        this.nodes.splice(index, 1);

        // 전체 재렌더링 (인덱스 문제 해결)
        this.renderNodesList();
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    /**
     * 엣지 추가
     */
    addEdge() {
        if (this.nodes.length < 2) {
            alert('엣지를 추가하려면 최소 2개의 노드가 필요합니다.');
            return;
        }

        const edge = {
            from: this.nodes[0].id,
            to: this.nodes[1].id,
            label: `연결 ${++this.edgeCounter}`,
            style: { type: 'normal' }
        };

        this.edges.push(edge);
        this.appendNewEdge(edge, this.edges.length - 1);
        this.updateJsonPreview();
    }

    /**
     * 새로운 엣지 추가
     */
    appendNewEdge(edge, index) {
        const container = document.getElementById('edgesList');
        if (!container) return;

        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const edgeHtml = this.createEdgeHtml(edge, index);
        container.insertAdjacentHTML('beforeend', edgeHtml);
        this.bindEdgeEvents(container.lastElementChild);
    }

    toggleResponse(elem) {
        const icon = elem.querySelector('i.fas');
        const wrapper = elem.closest('.node-item, .edge-item'); // 버튼을 품고 있는 카드
        if (!wrapper) return;

        const content = wrapper.querySelector('.flow-content');
        if (!content) return;

        const isCollapsed = icon.classList.contains('fa-chevron-down');
        if (isCollapsed) {
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            content.style.display = '';
        } else {
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
            content.style.display = 'none';
        }

    }

    /**
     * 엣지 HTML 생성
     */
    createEdgeHtml(edge, index) {
        const fromOptions = this.nodes.map(node =>
            `<option value="${node.id}" ${edge.from === node.id ? 'selected' : ''}>${node.label || node.id}</option>`
        ).join('');

        const toOptions = this.nodes.map(node =>
            `<option value="${node.id}" ${edge.to === node.id ? 'selected' : ''}>${node.label || node.id}</option>`
        ).join('');

        return `
        <div class="edge-item" data-edge-index="${index}">
            <div class="item-header">
                <div class="item-title">
                    <i class="fas fa-arrow-right"></i>
                    연결 ${index + 1}
                </div>
                
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" title="접기/펼치기" onclick="window.apiFlowsManager.toggleResponse(this)">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                        
                    <button type="button" class="btn btn-sm btn-secondary"  onclick="window.apiFlowsManager.addEdge()">
                        <i class="fas fa-plus"></i>
                    </button>
                    
                    <button type="button" class="remove-btn" data-action="remove-edge" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="flow-content">
                <div class="grid grid-cols-3 gap-3">
                    <div class="form-group">
                        <label class="form-label">시작 노드</label>
                        <select class="form-control" data-action="update-edge" data-index="${index}" data-field="from">
                            ${fromOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">끝 노드</label>
                        <select class="form-control" data-action="update-edge" data-index="${index}" data-field="to">
                            ${toOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">스타일</label>
                        <select class="form-control" data-action="update-edge" data-index="${index}" data-field="styleType">
                            <option value="normal" ${edge.style.type === 'normal' ? 'selected' : ''}>일반</option>
                            <option value="dotted" ${edge.style.type === 'dotted' ? 'selected' : ''}>점선</option>
                            <option value="thick" ${edge.style.type === 'thick' ? 'selected' : ''}>굵게</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">라벨</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(edge.label || '')}"
                           data-action="update-edge" data-index="${index}" data-field="label"
                           placeholder="연결 라벨">
                </div>
            </div>
        </div>`;
    }

    /**
     * 엣지 목록 렌더링
     */
    renderEdgesList() {
        const container = document.getElementById('edgesList');
        if (!container) {
            console.error('edgesList 컨테이너를 찾을 수 없습니다.');
            return;
        }

        if (this.edges.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-link"></i>
                <div>아직 연결이 없습니다.</div>
                <div>연결 추가 버튼을 클릭하여 시작하세요.</div>
            </div>`;
            return;
        }

        container.innerHTML = this.edges.map((edge, index) =>
            this.createEdgeHtml(edge, index)
        ).join('');

        container.querySelectorAll('.edge-item').forEach(edgeElement => {
            this.bindEdgeEvents(edgeElement);
        });
    }

    /**
     * 엣지 이벤트 바인딩
     */
    bindEdgeEvents(edgeElement) {
        if (edgeElement.hasAttribute('data-events-bound')) return;

        // 엣지 제거 버튼
        const removeBtn = edgeElement.querySelector('[data-action="remove-edge"]');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeEdge(index);
            });
        }

        // 엣지 업데이트 요소들
        const updateElements = edgeElement.querySelectorAll('[data-action="update-edge"]');
        updateElements.forEach(element => {
            const index = parseInt(element.dataset.index);
            const field = element.dataset.field;

            if (element.tagName === 'INPUT') {
                element.addEventListener('input', (e) => {
                    this.updateEdge(index, field, e.target.value);
                });
            } else if (element.tagName === 'SELECT') {
                element.addEventListener('change', (e) => {
                    this.updateEdge(index, field, e.target.value);
                });
            }
        });

        edgeElement.setAttribute('data-events-bound', 'true');
    }

    /**
     * 엣지 업데이트
     */
    updateEdge(index, field, value) {
        if (index < 0 || index >= this.edges.length) return;

        if (field === 'styleType') {
            this.edges[index].style = { type: value };
        } else {
            this.edges[index][field] = value;
        }
        this.updateJsonPreview();
    }

    /**
     * 엣지 제거
     */
    removeEdge(index) {
        if (index < 0 || index >= this.edges.length) return;

        this.edges.splice(index, 1);
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    /**
     * 유틸리티 메서드들
     */
    getShapeLabel(shape) {
        const shapeLabels = {
            'service': '서비스',
            'external': '외부',
            'db': '데이터베이스',
            'process': '프로세스'
        };
        return shapeLabels[shape] || shape;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * JSON 미리보기 업데이트
     */
    updateJsonPreview() {
        const flowData = {
            title: document.getElementById('title')?.value || '',
            layout: document.getElementById('layout')?.value || 'LR',
            theme: this.currentTheme,
            nodes: this.nodes,
            edges: this.edges
        };

        const jsonPreview = document.getElementById('jsonPreview');
        if (jsonPreview) {
            jsonPreview.innerHTML = `<pre><code>${JSON.stringify(flowData, null, 2)}</code></pre>`;
        }

    }

    /**
     * 구현해야 할 메서드들 (기본 구조만 제공)
     */
    loadSampleData() {
        if (!confirm('현재 플로우를 초기화하고 샘플 데이터를 불러올까요?')) {
            return;
        }

        const sampleData = {
            title: '샘플 주문 처리 플로우',
            layout: 'LR',
            theme: 'default',
            nodes: [
                { id: 'CLIENT', label: '클라이언트', shape: 'external', class: '' },
                { id: 'GATEWAY', label: 'API 게이트웨이', shape: 'service', class: 'primary' },
                { id: 'ORDER', label: '주문 서비스', shape: 'process', class: '' },
                { id: 'PAYMENT', label: '결제 서비스', shape: 'process', class: 'accent' },
                { id: 'DB', label: '주문 DB', shape: 'db', class: '' }
            ],
            edges: [
                { from: 'CLIENT', to: 'GATEWAY', label: 'REST 호출', style: { type: 'normal' } },
                { from: 'GATEWAY', to: 'ORDER', label: '주문 생성', style: { type: 'normal' } },
                { from: 'ORDER', to: 'PAYMENT', label: '결제 요청', style: { type: 'normal' } },
                { from: 'PAYMENT', to: 'ORDER', label: '결제 결과', style: { type: 'dotted' } },
                { from: 'ORDER', to: 'DB', label: '데이터 저장', style: { type: 'thick' } }
            ]
        };

        this.nodes = sampleData.nodes.map(node => ({ ...node }));
        this.edges = sampleData.edges.map(edge => ({ ...edge, style: { ...edge.style } }));
        this.nodeCounter = this.nodes.length;
        this.edgeCounter = this.edges.length;

        const titleInput = document.getElementById('title');
        if (titleInput) {
            titleInput.value = sampleData.title;
        }

        const layoutSelect = document.getElementById('layout');
        if (layoutSelect) {
            layoutSelect.value = sampleData.layout;
        }

        this.selectTheme(sampleData.theme);
        this.renderNodesList();
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    clearAll() {
        if (confirm('모든 데이터를 초기화하시겠습니까?')) {
            this.nodes = [];
            this.edges = [];
            this.nodeCounter = 0;
            this.edgeCounter = 0;
            this.renderNodesList();
            this.renderEdgesList();
            this.updateJsonPreview();
        }
    }

    copyJson() {
        const jsonText = JSON.stringify({
            title: document.getElementById('title')?.value || '',
            layout: document.getElementById('layout')?.value || 'LR',
            theme: this.currentTheme,
            nodes: this.nodes,
            edges: this.edges
        }, null, 2);

        navigator.clipboard.writeText(jsonText).then(() => {
            console.log('JSON 복사 완료');
        });
    }

    toggleJsonEditor() {
        const jsonPreview = document.getElementById('jsonPreview');
        const jsonEditor = document.getElementById('jsonEditor');

        if (jsonPreview && jsonEditor) {
            if (jsonEditor.style.display === 'none') {
                jsonEditor.style.display = 'block';
                jsonPreview.style.display = 'none';
            } else {
                jsonEditor.style.display = 'none';
                jsonPreview.style.display = 'block';
            }
        }
    }

    async downloadFile() {
        // 미리보기 구현
        if (!this.validForm()) {
            return;
        }

        const jsonText = document.querySelector('#jsonPreview pre code').textContent;
        const request = JSON.parse(jsonText);

        // 프로젝트 정보 추가
        if (this.projectIdx) {
            request.projectIdx = this.projectIdx;
        }

        if (this.flowIdx && this.isEditMode) {
            request.flowIdx = this.flowIdx;
        }

        const {data} = await axios.post('/api/generate/flowchart-url', request);
        if (!data.success || !data.data?.url) {
            NotificationManager.showError(data.message || '다운로드 URL을 가져오지 못했습니다.');
            return;
        } else {
            NotificationManager.showSuccess(data.message);
        }



        await UTIL.file.download({url : data.data.url, fileName : data.data.fileName || 'api-flow'});
    }

    validForm() {
        const title = document.getElementById('title').value;
        if (!title.trim()) {
            NotificationManager.showError('플로우차트 제목을 입력해주세요.');
            return false;
        }

        if (this.nodes.length === 0) {
            NotificationManager.showError('최소 1개의 노드를 추가해주세요.');
            return false;
        }


        return true;
    }

    submitForm(e) {
        e.preventDefault();

        if (!this.validForm()) {
            return;
        }

        const jsonText = document.querySelector('#jsonPreview pre code').textContent;

        try {
            const data = JSON.parse(jsonText);

            // 프로젝트 정보 추가
            if (this.projectIdx) {
                data.projectIdx = this.projectIdx;
            }

            if (this.flowIdx && this.isEditMode) {
                data.flowIdx = this.flowIdx;
            }

            console.log('저장할 데이터:', data);

            // 서버에 데이터 저장
            fetch('/project/artifact/flows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    console.log('저장 결과:', result);
                    if (result.success) {
                        alert(`플로우가 성공적으로 ${this.isEditMode ? '수정' : '저장'}되었습니다!`);

                        // 새로 생성된 경우 편집 모드로 전환
                        if (!this.isEditMode && result.data) {
                            this.flowIdx = result.data;
                            this.isEditMode = true;
                            // URL 업데이트 (선택사항)
                            // window.location.href = `/project/artifact/flows/${result.data}`;
                        }
                    } else {
                        alert('저장에 실패했습니다: ' + result.message);
                    }
                })
                .catch(error => {
                    console.error('오류:', error);
                    alert('서버 오류가 발생했습니다.');
                });

        } catch (error) {
            alert('JSON 형식이 올바르지 않습니다.');
        }
    }

    parseJsonFromEditor() {
        console.log('JSON 에디터 파싱');
        // JSON 에디터 파싱 로직 구현
    }
}

// DOM 로드 후 인스턴스 생성 및 전역 등록
document.addEventListener('DOMContentLoaded', () => {
    apiFlowManager = new ApiFlowManager();

    // 전역 스코프에 등록 (하나만!)
    window.apiFlowManager = apiFlowManager;
});

// 클래스도 전역 스코프에 등록 (필요한 경우)
window.ApiFlowManager = ApiFlowManager;
