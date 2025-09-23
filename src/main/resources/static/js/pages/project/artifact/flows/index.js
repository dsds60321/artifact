// API 플로우 관리자 클래스
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

        // 서버 데이터 로드
        this.loadServerDataFromHtml();

        this.bindEvents();
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

        console.log('HTML에서 로드된 서버 데이터:', serverData);

        // 기본 정보 설정
        if (serverData.title) {
            const titleInput = document.getElementById('title');
            if (titleInput) {
                titleInput.value = serverData.title;
            }
        }

        if (serverData.theme) {
            this.selectTheme(serverData.theme);
        }

        if (serverData.layout) {
            const layoutSelect = document.getElementById('layout');
            if (layoutSelect) {
                layoutSelect.value = serverData.layout;
            }
        }

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

                // 노드 카운터 업데이트
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

                // 엣지 카운터 업데이트
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
            // 파싱 오류시 빈 데이터로 초기화
            this.nodes = [];
            this.edges = [];
        }
    }

    bindEvents() {
        // 테마 선택 이벤트
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectTheme(e.currentTarget.dataset.theme);
            });
        });

        // 노드 추가 버튼
        document.getElementById('addNodeBtn').addEventListener('click', () => {
            this.addNode();
        });

        // 엣지 추가 버튼
        document.getElementById('addEdgeBtn').addEventListener('click', () => {
            this.addEdge();
        });

        // 샘플 데이터 로드
        document.getElementById('loadSampleBtn').addEventListener('click', () => {
            this.loadSampleData();
        });

        // 전체 초기화
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAll();
        });

        // JSON 복사
        document.getElementById('copyJsonBtn').addEventListener('click', () => {
            this.copyJson();
        });

        // JSON 에디터 토글
        document.getElementById('toggleJsonEditor').addEventListener('click', () => {
            this.toggleJsonEditor();
        });

        // 미리보기
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.preview();
        });

        // 폼 제출 (저장)
        document.getElementById('flowchartForm').addEventListener('submit', (e) => {
            this.submitForm(e);
        });

        // 기본 정보 변경 감지
        ['title', 'layout'].forEach(field => {
            document.getElementById(field).addEventListener('input', () => {
                this.updateJsonPreview();
            });
        });

        // JSON 에디터 변경 감지
        document.getElementById('jsonEditor').addEventListener('input', () => {
            this.parseJsonFromEditor();
        });
    }

    // 테마 선택
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

        document.getElementById('theme').value = theme;
        this.updateJsonPreview();
    }

    // 노드 추가
    addNode() {
        const nodeId = `NODE_${++this.nodeCounter}`;
        const node = {
            id: nodeId,
            label: `새 노드 ${this.nodeCounter}`,
            shape: 'service',
            class: ''
        };

        this.nodes.push(node);
        this.renderNodesList();
        this.updateJsonPreview();
    }

    // 노드 제거
    removeNode(index) {
        if (index < 0 || index >= this.nodes.length) return;

        const nodeId = this.nodes[index].id;

        // 관련된 엣지들도 제거
        this.edges = this.edges.filter(edge =>
            edge.from !== nodeId && edge.to !== nodeId
        );

        this.nodes.splice(index, 1);
        this.renderNodesList();
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    // 노드 업데이트
    updateNode(index, field, value) {
        if (index < 0 || index >= this.nodes.length) return;

        this.nodes[index][field] = value;
        this.updateJsonPreview();

        // ID가 변경된 경우 엣지들도 업데이트
        if (field === 'id') {
            this.renderEdgesList(); // 드롭다운 목록 갱신
        }
    }

    // 엣지 추가
    addEdge() {
        if (this.nodes.length < 2) {
            alert('엣지를 추가하려면 최소 2개의 노드가 필요합니다.');
            return;
        }

        const edge = {
            from: this.nodes[0].id,
            to: this.nodes.length > 1 ? this.nodes[1].id : this.nodes[0].id,
            label: `연결 ${++this.edgeCounter}`,
            style: { type: 'normal' }
        };

        this.edges.push(edge);
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    // 엣지 제거
    removeEdge(index) {
        if (index < 0 || index >= this.edges.length) return;

        this.edges.splice(index, 1);
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    // 엣지 업데이트
    updateEdge(index, field, value) {
        if (index < 0 || index >= this.edges.length) return;

        if (field === 'styleType') {
            this.edges[index].style = { type: value };
        } else {
            this.edges[index][field] = value;
        }
        this.updateJsonPreview();
    }

    // 노드 목록 렌더링
    renderNodesList() {
        const container = document.getElementById('nodesList');

        if (this.nodes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sitemap"></i>
                    <div>아직 노드가 없습니다.</div>
                    <div>노드 추가 버튼을 클릭하여 시작하세요.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.nodes.map((node, index) => `
            <div class="node-item">
                <div class="item-header">
                    <div class="item-title">
                        <i class="fas fa-cube"></i>
                        노드 ${index + 1}
                    </div>
                    <button type="button" class="remove-btn" onclick="apiFlowManager.removeNode(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="form-group">
                        <label class="form-label">ID <span class="required">*</span></label>
                        <input type="text" class="form-control" value="${this.escapeHtml(node.id)}" 
                               onchange="apiFlowManager.updateNode(${index}, 'id', this.value)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">라벨 <span class="required">*</span></label>
                        <input type="text" class="form-control" value="${this.escapeHtml(node.label)}" 
                               onchange="apiFlowManager.updateNode(${index}, 'label', this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">모양</label>
                    <div class="shape-selector">
                        ${['service', 'external', 'db', 'process'].map(shape => `
                            <div class="shape-option ${node.shape === shape ? 'active' : ''}" 
                                 onclick="apiFlowManager.updateNode(${index}, 'shape', '${shape}')">
                                ${this.getShapeLabel(shape)}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">클래스</label>
                    <select class="form-control" onchange="apiFlowManager.updateNode(${index}, 'class', this.value)">
                        <option value="" ${!node.class ? 'selected' : ''}>기본</option>
                        <option value="primary" ${node.class === 'primary' ? 'selected' : ''}>Primary</option>
                        <option value="accent" ${node.class === 'accent' ? 'selected' : ''}>Accent</option>
                        <option value="muted" ${node.class === 'muted' ? 'selected' : ''}>Muted</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    // 엣지 목록 렌더링
    renderEdgesList() {
        const container = document.getElementById('edgesList');

        if (this.edges.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-link"></i>
                    <div>아직 연결이 없습니다.</div>
                    <div>연결 추가 버튼을 클릭하여 시작하세요.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.edges.map((edge, index) => `
            <div class="edge-item">
                <div class="item-header">
                    <div class="item-title">
                        <i class="fas fa-arrow-right"></i>
                        연결 ${index + 1}
                    </div>
                    <button type="button" class="remove-btn" onclick="apiFlowManager.removeEdge(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="form-group">
                        <label class="form-label">시작 노드 <span class="required">*</span></label>
                        <select class="form-control" onchange="apiFlowManager.updateEdge(${index}, 'from', this.value)">
                            ${this.nodes.map(node => `
                                <option value="${node.id}" ${edge.from === node.id ? 'selected' : ''}>
                                    ${this.escapeHtml(node.label)} (${this.escapeHtml(node.id)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">종료 노드 <span class="required">*</span></label>
                        <select class="form-control" onchange="apiFlowManager.updateEdge(${index}, 'to', this.value)">
                            ${this.nodes.map(node => `
                                <option value="${node.id}" ${edge.to === node.id ? 'selected' : ''}>
                                    ${this.escapeHtml(node.label)} (${this.escapeHtml(node.id)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">스타일</label>
                        <select class="form-control" onchange="apiFlowManager.updateEdge(${index}, 'styleType', this.value)">
                            <option value="normal" ${edge.style?.type === 'normal' || !edge.style?.type ? 'selected' : ''}>기본</option>
                            <option value="thick" ${edge.style?.type === 'thick' ? 'selected' : ''}>굵게</option>
                            <option value="dotted" ${edge.style?.type === 'dotted' ? 'selected' : ''}>점선</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">라벨</label>
                    <input type="text" class="form-control" value="${this.escapeHtml(edge.label || '')}" 
                           onchange="apiFlowManager.updateEdge(${index}, 'label', this.value)"
                           placeholder="연결 설명 (예: POST /signup JSON)">
                </div>
            </div>
        `).join('');
    }

    // 모양 라벨 반환
    getShapeLabel(shape) {
        const labels = {
            'service': '서비스',
            'external': '외부',
            'db': '데이터베이스',
            'process': '프로세스'
        };
        return labels[shape] || shape;
    }

    // HTML 이스케이프
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 폼 제출 (저장)
    submitForm(e) {
        e.preventDefault();

        const title = document.getElementById('title').value;
        if (!title.trim()) {
            alert('플로우차트 제목을 입력해주세요.');
            return;
        }

        if (this.nodes.length === 0) {
            alert('최소 1개의 노드를 추가해주세요.');
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

    // ... 나머지 기존 메서드들 (updateJsonPreview, loadSampleData, clearAll, copyJson, preview 등) 유지 ...

    // JSON 미리보기 업데이트
    updateJsonPreview() {
        const title = document.getElementById('title').value || '플로우차트';
        const layout = document.getElementById('layout').value || 'LR';

        const jsonData = {
            title: title,
            layout: layout,
            theme: this.currentTheme,
            nodes: this.nodes.map(node => {
                const cleanNode = { ...node };
                if (!cleanNode.class) delete cleanNode.class;
                return cleanNode;
            }),
            edges: this.edges.map(edge => {
                const cleanEdge = { ...edge };
                if (!cleanEdge.label) delete cleanEdge.label;
                if (cleanEdge.style?.type === 'normal') delete cleanEdge.style;
                return cleanEdge;
            })
        };

        // 테마 변수와 클래스 정의 추가
        if (this.currentTheme !== 'default') {
            jsonData.themeVariables = this.getThemeVariables(this.currentTheme);
            jsonData.classes = this.getThemeClasses(this.currentTheme);
        }

        const jsonString = JSON.stringify(jsonData, null, 2);
        document.querySelector('#jsonPreview pre code').textContent = jsonString;
        document.getElementById('jsonEditor').value = jsonString;
    }

    // 샘플 데이터 로드
    loadSampleData() {
        if (confirm('현재 데이터가 삭제되고 샘플 데이터로 교체됩니다. 계속하시겠습니까?')) {
            const sampleData = {
                "title": "회원가입 플로우(스타일 적용)",
                "layout": "LR",
                "theme": "default",
                "nodes": [
                    {"id":"A","label":"Client","shape":"external","class":"primary"},
                    {"id":"B","label":"Auth API","shape":"service","class":"primary"},
                    {"id":"V1","label":"Validate Input","shape":"service"},
                    {"id":"X","label":"Check Duplicate Email","shape":"service"},
                    {"id":"H","label":"Hash Password","shape":"service"},
                    {"id":"U","label":"Create User","shape":"service"},
                    {"id":"C","label":"Users DB","shape":"db","class":"accent"}
                ],
                "edges": [
                    {"from":"A","to":"B","label":"POST /signup JSON","style":{"type":"thick"}},
                    {"from":"B","to":"V1","label":"PARSE & SANITIZE"},
                    {"from":"V1","to":"X","label":"OK"},
                    {"from":"X","to":"C","label":"SELECT BY EMAIL","style":{"type":"dotted"}},
                    {"from":"C","to":"X","label":"RESULT","style":{"type":"dotted"}},
                    {"from":"X","to":"A","label":"EXISTS: 409 CONFLICT","style":{"type":"dotted"}},
                    {"from":"X","to":"H","label":"NOT EXISTS"},
                    {"from":"H","to":"U","label":"BCRYPT/SCRYPT"},
                    {"from":"U","to":"C","label":"INSERT USER"},
                    {"from":"C","to":"B","label":"OK"},
                    {"from":"B","to":"A","label":"201 CREATED","style":{"type":"thick"}}
                ]
            };

            this.loadDataFromJson(sampleData);
        }
    }

    // JSON 데이터로부터 로드
    loadDataFromJson(data) {
        // 기본 정보 설정
        document.getElementById('title').value = data.title || '';
        document.getElementById('layout').value = data.layout || 'LR';

        // 테마 설정
        if (data.theme) {
            this.selectTheme(data.theme);
        }

        // 노드와 엣지 설정
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];

        // 카운터 재설정
        this.nodeCounter = this.nodes.length;
        this.edgeCounter = this.edges.length;

        // UI 업데이트
        this.renderNodesList();
        this.renderEdgesList();
        this.updateJsonPreview();
    }

    // 테마 변수 반환
    getThemeVariables(theme) {
        const themes = {
            forest: {
                "primaryColor": "#E9F5EE",
                "primaryBorderColor": "#2E7D32",
                "lineColor": "#2E7D32",
                "fontFamily": "Inter, Pretendard, sans-serif"
            },
            dark: {
                "primaryColor": "#2D2D2D",
                "primaryBorderColor": "#404040",
                "lineColor": "#666666",
                "fontFamily": "Inter, Pretendard, sans-serif"
            },
            neutral: {
                "primaryColor": "#F5F5F5",
                "primaryBorderColor": "#9E9E9E",
                "lineColor": "#757575",
                "fontFamily": "Inter, Pretendard, sans-serif"
            },
            base: {
                "primaryColor": "#FFFFFF",
                "primaryBorderColor": "#D1D5DB",
                "lineColor": "#6B7280",
                "fontFamily": "Inter, Pretendard, sans-serif"
            }
        };
        return themes[theme] || {};
    }

    // 테마 클래스 반환
    getThemeClasses(theme) {
        return {
            "primary": { "fill": "#E3F2FD", "stroke": "#1976D2" },
            "accent": { "fill": "#FFF3E0", "stroke": "#F57C00" },
            "muted": { "fill": "#F5F5F5", "stroke": "#9E9E9E" }
        };
    }

    // 전체 초기화
    clearAll() {
        if (confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
            this.nodes = [];
            this.edges = [];
            this.nodeCounter = 0;
            this.edgeCounter = 0;

            document.getElementById('title').value = '';
            document.getElementById('layout').value = 'LR';
            this.selectTheme('default');

            this.renderNodesList();
            this.renderEdgesList();
            this.updateJsonPreview();
        }
    }

    // JSON 복사
    copyJson() {
        const jsonText = document.querySelector('#jsonPreview pre code').textContent;
        navigator.clipboard.writeText(jsonText).then(() => {
            const btn = document.getElementById('copyJsonBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> 복사됨!';
            btn.classList.add('btn-success');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
            }, 2000);
        });
    }

    // JSON 에디터 토글
    toggleJsonEditor() {
        const preview = document.getElementById('jsonPreview');
        const editor = document.getElementById('jsonEditor');
        const btn = document.getElementById('toggleJsonEditor');

        if (editor.style.display === 'none' || !editor.style.display) {
            preview.style.display = 'none';
            editor.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-eye"></i> 미리보기';
        } else {
            preview.style.display = 'block';
            editor.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-edit"></i> 직접 편집';
        }
    }

    // JSON 에디터에서 파싱
    parseJsonFromEditor() {
        // 실시간 파싱은 성능상 제외, 토글시에만 적용
    }

    // 미리보기
    preview() {
        const jsonText = document.querySelector('#jsonPreview pre code').textContent;

        try {
            const data = JSON.parse(jsonText);
            console.log('미리보기 데이터:', data);

            fetch('/api/generate/flowchart-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: jsonText
            })
                .then(response => response.json())
                .then(result => {
                    console.log('생성 결과:', result);
                    if (result && result.length > 0) {
                        const htmlUrl = result.find(r => r.fileName === 'api-flow.html')?.url;
                        if (htmlUrl) {
                            window.open(htmlUrl, '_blank');
                        }
                    } else {
                        alert('미리보기 생성에 실패했습니다.');
                    }
                })
                .catch(error => {
                    console.error('오류:', error);
                    alert('미리보기 생성 중 오류가 발생했습니다.');
                });

        } catch (error) {
            alert('JSON 형식이 올바르지 않습니다.');
        }
    }
}

// 글로벌 변수로 등록
window.ApiFlowManager = ApiFlowManager;