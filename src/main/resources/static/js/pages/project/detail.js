class Detail {
    constructor() {
        this.currentSection = 'overview';
        this.init();
    }

    init() {
        this.bindCss();
        this.bindEvents();
        this.initSidebar();
    }

    bindCss() {
        document.querySelectorAll('.artifact-icon').forEach(elem => {
           if (elem.classList.contains('DOCS')) {
               elem.style.color = '#10b981';
               elem.querySelector('i').classList.add('fas', 'fa-file-code');
           }  else if (elem.classList.contains('FLOW')) {
               elem.style.color = '#3b82f6';
               elem.querySelector('i').classList.add('fas', 'fa-project-diagram');
           }
        });
    }

    bindEvents() {
        // 사이드바 섹션 토글
        document.querySelectorAll('.nav-section-header').forEach(header => {
            header.addEventListener('click', (e) => {
                this.toggleSection(e.currentTarget);
            });
        });

        // 네비게이션 아이템 클릭
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectNavItem(e.currentTarget);
            });
        });

        // 산출물 편집
        document.querySelectorAll('.edit-artifact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const artifactId = e.currentTarget.dataset.artifactId;
                this.editArtifact(artifactId);
            });
        });

        // 산출물 삭제
        document.querySelectorAll('.delete-artifact').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const artifactId = e.currentTarget.dataset.artifactId;
                await this.deleteArtifact(artifactId);
            });
        });
    }

    initSidebar() {
        // 기본적으로 모든 섹션 펼치기
        document.querySelectorAll('.nav-section-content').forEach(content => {
            content.classList.add('expanded');
        });

        document.querySelectorAll('.nav-section-header').forEach(header => {
            header.classList.add('expanded');
        });
    }

    toggleSection(header) {
        const toggle = header.dataset.toggle;
        const content = document.getElementById(`${toggle}-list`);
        const icon = header.querySelector('.toggle-icon');

        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            header.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            header.classList.add('expanded');
        }
    }

    selectNavItem(item) {
        // 기존 active 제거
        document.querySelectorAll('.nav-item.active').forEach(activeItem => {
            activeItem.classList.remove('active');
        });

        // 새로운 active 설정
        item.classList.add('active');

        const section = item.dataset.section;
        this.showContent(section);
    }

    showContent(section) {
        this.currentSection = section;

        // 모든 콘텐츠 숨기기
        document.querySelectorAll('.content-section').forEach(content => {
            content.classList.remove('active');
        });

        if (section === 'overview') {
            document.getElementById('overview-content').classList.add('active');
            document.getElementById('current-section-title').textContent = '프로젝트 개요';
        } else if (section.startsWith('artifact-')) {
            this.loadArtifactContent(section);
        }
    }

    async loadArtifactContent(section) {
        const artifactId = section.replace('artifact-', '');

        try {
            const response = await axios.get(`/api/artifacts/${artifactId}`);
            const artifact = response.data;

            document.getElementById('current-section-title').textContent = artifact.title;

            const contentDiv = document.getElementById('artifact-content');
            contentDiv.innerHTML = this.renderArtifactContent(artifact);
            contentDiv.classList.add('active');

        } catch (error) {
            NotificationManager.showError('산출물 정보를 불러오는데 실패했습니다.');
        }
    }

    renderArtifactContent(artifact) {
        // 산출물 타입에 따라 다른 렌더링
        switch (artifact.subType) {
            case 'DOCS':
                return this.renderApiDocsContent(artifact);
            case 'FLOW':
                return this.renderFlowContent(artifact);
            default:
                return `<p>지원하지 않는 산출물 타입입니다.</p>`;
        }
    }

    renderApiDocsContent(artifact) {
        return `
            <div class="artifact-content">
                <div class="artifact-header">
                    <div class="artifact-info">
                        <h3>${artifact.title}</h3>
                        <p class="artifact-description">${artifact.description || '설명 없음'}</p>
                    </div>
                    <div class="artifact-actions">
                        <button class="btn btn-primary" onclick="projectDetail.editArtifact('${artifact.id}')">
                            <i class="fas fa-edit"></i> 편집
                        </button>
                    </div>
                </div>
                <div class="artifact-body">
                    <!-- API 문서 내용 -->
                    <div class="api-endpoints">
                        <!-- 엔드포인트 목록 등 -->
                    </div>
                </div>
            </div>
        `;
    }

    renderFlowContent(artifact) {
        return `
            <div class="artifact-content">
                <div class="artifact-header">
                    <div class="artifact-info">
                        <h3>${artifact.title}</h3>
                        <p class="artifact-description">${artifact.description || '설명 없음'}</p>
                    </div>
                    <div class="artifact-actions">
                        <button class="btn btn-primary" onclick="projectDetail.editArtifact('${artifact.id}')">
                            <i class="fas fa-edit"></i> 편집
                        </button>
                    </div>
                </div>
                <div class="artifact-body">
                    <!-- Flow 다이어그램 등 -->
                    <div class="flow-diagram">
                        <!-- Mermaid 다이어그램 등 -->
                    </div>
                </div>
            </div>
        `;
    }

    editArtifact(artifactId) {
        window.location.href = `/artifacts/${artifactId}/edit`;
    }

    async deleteArtifact(artifactId) {
        const confirmed = await NotificationManager.showDeleteConfirm(
            '이 산출물을 삭제하시겠습니까?'
        );

        if (confirmed) {
            try {
                await axios.delete(`/api/artifacts/${artifactId}`);
                NotificationManager.showSuccess('산출물이 삭제되었습니다.');
                location.reload();
            } catch (error) {
                NotificationManager.showError('산출물 삭제에 실패했습니다.');
            }
        }
    }
}

// 전역 인스턴스
let projectDetail;

document.addEventListener('DOMContentLoaded', () => {
    projectDetail = new Detail();
});