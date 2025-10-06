class Index {
    constructor() {
        this.usageGuide = null;
        this.handleGuideKeydown = null;
        this.GUIDE_STORAGE_KEY = 'artifact.projectGuide.dismissed';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupUsageGuide();
    }

    // 프로젝트 등록
    async createProject() {
        FormUtils.quickSetup('frm', {
            title : {
                required : '제목을 입력해주세요'
            },
            version : {
                required:  '버전 정보를 입력해주세요.'
            }
        });

        const isValid = FormUtils.validate('frm');
        if (!isValid) return;

        FormUtils.onSubmit('frm', async (formData) => {
            LoadingManager.show();
            // API 호출 로직
            const { data } = await httpClient.post('/project', formData);
            if (data.success) {
                NotificationManager.showSuccess(data.message);
                setTimeout(() => {
                    location.reload();
                }, 500);
            }
        });
    }

    // 프로젝트 삭제
    async deleteProject(idx) {
        try {
            const { data } = await httpClient.delete(`/project/${idx}`);
            data.success ? NotificationManager.showSuccess(data.message) : NotificationManager.showError(data.message);
        } catch (e) {
            NotificationManager.showError('오류가 발생했습니다.')
        } finally {
            LoadingManager.hide();
            location.reload();
        }
    }

    bindEvents() {

        // 새 프로젝트 (헤더의 버튼)
        document.querySelectorAll('#new-project').forEach(elem => {
            elem.addEventListener('click', async () => {
                try {
                    const {data} = await axios.get('/project/new');
                    ModalManager.openModal({ content : data , callBack : () => {
                            document.querySelector('#modal-submit').addEventListener('click', async () => {
                                await this.createProject()
                            });
                        }});
                } catch (error) {
                    NotificationManager.showError('프로젝트 생성 모달을 불러오는데 실패했습니다.');
                }
            });
        })


        // 프로젝트 삭제
        document.querySelectorAll('#delete-project').forEach(elem => {
            elem.addEventListener('click', async ({target}) => {
                const projectIdx = target.closest('.btn-delete').dataset.projectIdx ||
                    target.dataset.projectIdx;

                const confirmed = await NotificationManager.showDeleteConfirm(
                    '해당 프로젝트를 정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.'
                );

                if (confirmed) {
                    await this.deleteProject(projectIdx);
                }
            });
        });
    }

    setupUsageGuide() {
        const steps = Array.isArray(window.PROJECT_USAGE_GUIDE) ? window.PROJECT_USAGE_GUIDE : [];
        if (!steps.length) return;

        const sortedSteps = steps
            .slice()
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        const signature = this.createGuideSignature(sortedSteps);
        if (this.shouldSkipGuide(signature)) {
            return;
        }

        const modal = document.getElementById('usageGuideModal');
        const zoomModal = document.getElementById('usageGuideZoom');
        if (!modal) return;

        this.usageGuide = {
            modal,
            steps: sortedSteps,
            currentStep: 0,
            signature,
            imageEl: modal.querySelector('[data-guide-image]'),
            titleEl: modal.querySelector('[data-guide-title]'),
            descriptionEl: modal.querySelector('[data-guide-description]'),
            currentEl: modal.querySelector('[data-guide-current]'),
            totalEl: modal.querySelector('[data-guide-total]'),
            prevBtn: modal.querySelector('[data-guide-prev]'),
            nextBtn: modal.querySelector('[data-guide-next]'),
            skipBtn: modal.querySelector('[data-guide-skip]'),
            closeBtn: modal.querySelector('[data-guide-close]'),
            zoomModal,
            zoomImageEl: zoomModal?.querySelector('[data-guide-zoom-image]') || null,
            zoomCloseEls: zoomModal ? zoomModal.querySelectorAll('[data-guide-zoom-close]') : []
        };

        if (this.usageGuide.totalEl) {
            this.usageGuide.totalEl.textContent = steps.length;
        }

        this.registerGuideEvents();
        this.renderGuideStep(0);
        this.openUsageGuide();
    }

    registerGuideEvents() {
        if (!this.usageGuide) return;

        const { prevBtn, nextBtn, skipBtn, closeBtn, imageEl, zoomModal, zoomCloseEls } = this.usageGuide;

        prevBtn?.addEventListener('click', () => this.goToGuideStep(this.usageGuide.currentStep - 1));
        nextBtn?.addEventListener('click', () => this.goToGuideStep(this.usageGuide.currentStep + 1));
        skipBtn?.addEventListener('click', () => this.skipGuide());
        closeBtn?.addEventListener('click', () => this.closeUsageGuide());

        imageEl?.addEventListener('click', () => this.openGuideImageZoom());

        zoomCloseEls?.forEach((element) => {
            element.addEventListener('click', () => this.closeGuideImageZoom());
        });

        zoomModal?.addEventListener('click', (event) => {
            if (event.target === zoomModal) {
                this.closeGuideImageZoom();
            }
        });

        this.usageGuide.modal.addEventListener('click', (event) => {
            if (event.target === this.usageGuide.modal) {
                this.closeUsageGuide();
            }
        });

        this.handleGuideKeydown = (event) => {
            if (!this.usageGuide || !this.usageGuide.modal.classList.contains('is-open')) return;

            if (this.usageGuide.zoomModal?.classList.contains('is-open')) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.closeGuideImageZoom();
                }
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.goToGuideStep(this.usageGuide.currentStep + 1);
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.goToGuideStep(this.usageGuide.currentStep - 1);
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeUsageGuide();
            }
        };

        document.addEventListener('keydown', this.handleGuideKeydown);
    }

    renderGuideStep(index) {
        if (!this.usageGuide) return;

        const { steps, imageEl, titleEl, descriptionEl, currentEl, prevBtn, nextBtn } = this.usageGuide;
        const lastIndex = steps.length - 1;
        const clampedIndex = Math.max(0, Math.min(index, lastIndex));
        const step = steps[clampedIndex];

        this.usageGuide.currentStep = clampedIndex;

        if (imageEl) {
            if (step.imageUrl) {
                imageEl.src = step.imageUrl;
                imageEl.removeAttribute('hidden');
                imageEl.alt = step.title ? `${step.title} 안내 이미지` : '사용법 안내 이미지';
                imageEl.classList.add('is-zoomable');
            } else {
                imageEl.removeAttribute('src');
                imageEl.alt = '등록된 이미지가 없습니다.';
                imageEl.setAttribute('hidden', 'true');
                imageEl.classList.remove('is-zoomable');
            }
        }

        if (titleEl) {
            titleEl.textContent = step.title || '제목을 입력해주세요';
        }

        if (descriptionEl) {
            descriptionEl.textContent = step.content || '설명 문구를 입력해주세요.';
        }

        if (currentEl) {
            currentEl.textContent = clampedIndex + 1;
        }

        if (prevBtn) {
            prevBtn.disabled = clampedIndex === 0;
        }

        if (nextBtn) {
            nextBtn.textContent = clampedIndex === lastIndex ? '완료' : '다음';
        }
    }

    goToGuideStep(index) {
        if (!this.usageGuide) return;

        if (index >= this.usageGuide.steps.length) {
            this.closeUsageGuide();
            return;
        }

        if (index < 0) {
            this.renderGuideStep(0);
            return;
        }

        this.renderGuideStep(index);
    }

    openUsageGuide() {
        if (!this.usageGuide) return;
        this.usageGuide.modal.classList.add('is-open');
    }

    closeUsageGuide() {
        if (!this.usageGuide) return;
        this.usageGuide.modal.classList.remove('is-open');
        this.closeGuideImageZoom();

        if (this.handleGuideKeydown) {
            document.removeEventListener('keydown', this.handleGuideKeydown);
            this.handleGuideKeydown = null;
        }
    }

    skipGuide() {
        if (!this.usageGuide) return;
        this.persistGuideDismissal(this.usageGuide.signature);
        this.closeUsageGuide();
    }

    openGuideImageZoom() {
        if (!this.usageGuide || !this.usageGuide.zoomModal || !this.usageGuide.zoomImageEl) return;

        const step = this.usageGuide.steps[this.usageGuide.currentStep];
        if (!step?.imageUrl) return;

        this.usageGuide.zoomImageEl.src = step.imageUrl;
        this.usageGuide.zoomImageEl.alt = step.title ? `${step.title} 확대 이미지` : '사용법 안내 확대 이미지';
        this.usageGuide.zoomModal.classList.add('is-open');
        this.usageGuide.zoomModal.setAttribute('aria-hidden', 'false');
    }

    closeGuideImageZoom() {
        if (!this.usageGuide?.zoomModal || !this.usageGuide.zoomImageEl) return;

        this.usageGuide.zoomModal.classList.remove('is-open');
        this.usageGuide.zoomModal.setAttribute('aria-hidden', 'true');
        this.usageGuide.zoomImageEl.removeAttribute('src');
    }

    createGuideSignature(steps) {
        if (!Array.isArray(steps) || !steps.length) return null;

        try {
            const payload = steps.map((step) => [
                step?.title || '',
                step?.content || '',
                step?.imageUrl || '',
                Number(step?.order) || 0
            ]);
            return JSON.stringify(payload);
        } catch (error) {
            console.warn('가이드 서명 생성 실패', error);
            return null;
        }
    }

    shouldSkipGuide(signature) {
        if (!signature) return false;

        try {
            const raw = window.localStorage.getItem(this.GUIDE_STORAGE_KEY);
            if (!raw) return false;

            const stored = JSON.parse(raw);
            return stored?.signature === signature;
        } catch (error) {
            console.warn('가이드 노출 상태 확인 실패', error);
            return false;
        }
    }

    persistGuideDismissal(signature) {
        if (!signature) return;

        try {
            const payload = {
                signature,
                dismissedAt: new Date().toISOString()
            };
            window.localStorage.setItem(this.GUIDE_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('가이드 노출 상태 저장 실패', error);
        }
    }
}

// 전역 인스턴스 생성
let indexPage;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    indexPage = new Index();
});
