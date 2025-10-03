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

    // 아티팩트 등록
    async createArtifact() {
        FormUtils.quickSetup('frm', {
            title : {
                required : '제목을 입력해주세요'
            }
        });

        let isValid = FormUtils.validate('frm');

        if (!document.frm.subType.value) {
            NotificationManager.showError('산출물 종류를 선택해주세요');
            isValid = false;
            return;
        }

        if (!isValid) return;

        FormUtils.onSubmit('frm', async (formData) => {
            LoadingManager.show();
            // API 호출 로직
            const { data } = await httpClient.post(`/project/artifact/new`, formData);
            data.success ? NotificationManager.showSuccess(data.message) : NotificationManager.showError(data.message);
            setTimeout(() => {
                location.reload();
            }, 500);
        });
    }

    // docs 선택


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

        // 산출물 생성 모달
        document.getElementById('add-artifact').addEventListener('click', async ({target}) => {
            try {
                const {data} = await axios.get(`/project/artifact/new/${target.dataset.projectIdx}`);
                ModalManager.openModal({content: data, callBack: async () => {

                    // 산출물 종류 선택
                    const artifactTypesElems = document.querySelectorAll('.project-type-option');
                        artifactTypesElems.forEach(elem => {
                        elem.addEventListener('click', () =>{
                            artifactTypesElems.forEach(elem => elem.classList.remove('selected'));
                            document.frm.subType.value =  elem.dataset.type;
                            elem.classList.add('selected');
                        })
                    });

                  document.querySelector('#modal-submit').addEventListener('click', async () => {
                      await this.createArtifact()
                   });


                }});
            } catch (error) {
                NotificationManager.showError('산출물 생성 모달을 불러오는데 실패했습니다.');
            }
        });


        // GPT
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
                const type = e.currentTarget.dataset.type;
                await this.deleteArtifact(type, artifactId);
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
        this.showContent(item);
    }


    showContent(item) {
        this.currentSection = item.dataset.section;

        // 모든 콘텐츠 숨기기
        document.querySelectorAll('.content-section').forEach(content => {
            content.classList.remove('active');
        });

        if (this.currentSection === 'overview') {
            document.getElementById('overview-content').classList.add('active');
            document.getElementById('current-section-title').textContent = '프로젝트 개요';
        } else if (this.currentSection.startsWith('artifact-')) {
            this.loadArtifactContent(item);
        }
    }

    async loadArtifactContent(item) {
        const type = item.dataset.type;
        const idx = item.dataset.artifactId;

        try {
            const {data} = await axios.get(`/project/artifact/${type}/${idx}`);

            const contentDiv = document.getElementById('artifact-content');

            const {html, scripts} = this.extractScriptsFromHtml(data);


            contentDiv.innerHTML = this.renderArtifactContent(type, html);
            contentDiv.classList.add('active');
            this.executeScripts(scripts);

        } catch (error) {
            NotificationManager.showError('산출물 정보를 불러오는데 실패했습니다.');
        }
    };


    // HTML에서 스크립트 태그를 추출하는 함수
    extractScriptsFromHtml(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        const scriptTags = tempDiv.querySelectorAll('script');
        const scripts = [];

        // 스크립트 내용 추출
        scriptTags.forEach(script => {
            if (script.src) {
                // 외부 스크립트
                scripts.push({type: 'src', content: script.src});
            } else {
                // 인라인 스크립트
                scripts.push({type: 'inline', content: script.innerHTML});
            }
            // 스크립트 태그 제거
            script.remove();
        });

        return {
            html: tempDiv.innerHTML,
            scripts: scripts
        };
    }


// 추출된 스크립트들을 실행하는 함수
    executeScripts(scripts) {
        scripts.forEach((script, index) => {
            setTimeout(() => {
                if (script.type === 'src') {
                    // 외부 스크립트 로드
                    const scriptElement = document.createElement('script');
                    scriptElement.src = script.content;
                    document.head.appendChild(scriptElement);
                } else {
                    // 인라인 스크립트 실행
                    try {
                        const func = new Function(script.content);
                        func();
                    } catch (e) {
                        console.error('스크립트 실행 오류:', e);
                    }
                }
            }, index * 10); // 순차적 실행을 위한 약간의 딜레이
        });
    }


    renderArtifactContent(type, content) {
        // 산출물 타입에 따라 다른 렌더링
        switch (type.toUpperCase()) {
            case 'DOCS':
                return this.renderHtml(type, content);
            case 'FLOWS':
                return this.renderHtml(type, content);
            default:
                return `<p>지원하지 않는 산출물 타입입니다.</p>`;
        }
    }

    renderHtml(type, content) {

        function getHeader(type) {
            const map = {
                'DOCS' : {
                    'icon'  : 'fa-file-code',
                    'title' : 'API_DOCS'
                },
                'FLOWS' : {
                    'icon'  : 'fa-project-diagram',
                    'title' : 'API_FLOWS'
                }
            }

            const config = map[type.toUpperCase()] || map['DOCS'];


            return `
                <div class="header">
                    <div class="container max-w-100">
                        <h1><i class="fas ${config.icon}"></i> <span>${config.title}</span></h1>
                        <div class="breadcrumb">
                            <span>${config.title}</span>
                        </div>
                    </div>
                </div>`

        }

        return `
            <div class="artifact-header">
                ${getHeader(type)}
            </div>
            <div class="artifact-body">
                ${content}
                
            </div>
        `;
    }


    editArtifact(artifactId) {
        window.location.href = `/artifacts/${artifactId}/edit`;
    }

    async deleteArtifact(type, artifactId) {
        const confirmed = await NotificationManager.showDeleteConfirm(
            '이 산출물을 삭제하시겠습니까?'
        );

        if (confirmed) {
            try {
                const { data } = await axios.delete(`/project/artifact/${type}/${artifactId}`);
                NotificationManager.showSuccess(data.message);
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