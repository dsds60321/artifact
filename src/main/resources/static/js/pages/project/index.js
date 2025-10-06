class Index {
    constructor() {
        this.usageGuide = null;
        this.handleGuideKeydown = null;
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

        const modal = document.getElementById('usageGuideModal');
        if (!modal) return;

        this.usageGuide = {
            modal,
            steps: sortedSteps,
            currentStep: 0,
            imageEl: modal.querySelector('[data-guide-image]'),
            titleEl: modal.querySelector('[data-guide-title]'),
            descriptionEl: modal.querySelector('[data-guide-description]'),
            currentEl: modal.querySelector('[data-guide-current]'),
            totalEl: modal.querySelector('[data-guide-total]'),
            prevBtn: modal.querySelector('[data-guide-prev]'),
            nextBtn: modal.querySelector('[data-guide-next]'),
            skipBtn: modal.querySelector('[data-guide-skip]'),
            closeBtn: modal.querySelector('[data-guide-close]')
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

        const { prevBtn, nextBtn, skipBtn, closeBtn } = this.usageGuide;

        prevBtn?.addEventListener('click', () => this.goToGuideStep(this.usageGuide.currentStep - 1));
        nextBtn?.addEventListener('click', () => this.goToGuideStep(this.usageGuide.currentStep + 1));
        skipBtn?.addEventListener('click', () => this.closeUsageGuide());
        closeBtn?.addEventListener('click', () => this.closeUsageGuide());

        this.usageGuide.modal.addEventListener('click', (event) => {
            if (event.target === this.usageGuide.modal) {
                this.closeUsageGuide();
            }
        });

        this.handleGuideKeydown = (event) => {
            if (!this.usageGuide || !this.usageGuide.modal.classList.contains('is-open')) return;

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
            } else {
                imageEl.removeAttribute('src');
                imageEl.alt = '등록된 이미지가 없습니다.';
                imageEl.setAttribute('hidden', 'true');
            }
        }

        if (titleEl) {
            titleEl.textContent = step.title || '제목을 입력해주세요';
        }

        if (descriptionEl) {
            descriptionEl.textContent = step.description || '설명 문구를 입력해주세요.';
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

        if (this.handleGuideKeydown) {
            document.removeEventListener('keydown', this.handleGuideKeydown);
            this.handleGuideKeydown = null;
        }
    }
}

// 전역 인스턴스 생성
let indexPage;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    indexPage = new Index();
});
