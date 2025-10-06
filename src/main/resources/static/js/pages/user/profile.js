class UserProfilePage {
    constructor() {
        this.profileForm = document.getElementById('profileForm');
        this.planForm = document.getElementById('planForm');
        this.profileSubmitButton = document.getElementById('profileSubmit');
        this.planSubmitButton = document.getElementById('planSubmit');
        this.userRole = (this.planForm?.dataset.userRole || '').toUpperCase();
        this.userEmail = this.planForm?.dataset.userEmail || '';
        this.adminEmail = this.planForm?.dataset.adminEmail || '';

        this.init();
    }

    init() {
        this.bindProfileForm();
        this.bindPlanForm();
    }

    bindProfileForm() {
        if (!this.profileForm) {
            return;
        }

        FormUtils.quickSetup(this.profileForm, {
            email: {
                required: '이메일을 입력해주세요.',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: '올바른 이메일 형식을 입력해주세요.'
            },
            nickname: {
                required: '닉네임을 입력해주세요.',
                maxlength: 32
            },
            phone: {
                pattern: /^[0-9\-+() ]{0,20}$/,
                message: '전화번호 형식이 올바르지 않습니다.'
            },
            bio: {
                maxlength: 255
            }
        });

        if (this.profileSubmitButton) {
            this.profileSubmitButton.addEventListener('click', () => this.submitProfile());
        }
    }

    async submitProfile() {
        if (!this.profileForm) {
            return;
        }

        const isValid = FormUtils.validate(this.profileForm);
        if (!isValid) {
            return;
        }

        const payload = FormUtils.getFormData(this.profileForm, {
            includeEmpty: true,
            trim: true
        });
        delete payload.userId;

        try {
            LoadingManager.show();
            const { data } = await httpClient.post('/user/profile/info', payload);
            if (data.success) {
                NotificationManager.showSuccess(data.message || '프로필 정보가 업데이트되었습니다.');
                this.updateHeaderNickname(data.data);
            } else {
                NotificationManager.showError(data.message || '프로필 정보를 저장하지 못했습니다.');
            }
        } catch (error) {
            console.error('[Profile] update error', error);
        } finally {
            LoadingManager.hide();
        }
    }

    updateHeaderNickname(userInfo) {
        if (!userInfo) {
            return;
        }

        const displayName = userInfo.nickname || userInfo.userId;
        const headerLabel = document.querySelector('.user-menu__id');
        if (headerLabel && displayName) {
            headerLabel.textContent = displayName;
        }
    }

    bindPlanForm() {
        if (!this.planForm) {
            return;
        }

        const radios = this.planForm.querySelectorAll('input[name="planId"]');
        radios.forEach((radio) => {
            radio.addEventListener('change', () => this.highlightSelectedPlan(radio));
        });

        const checkedRadio = this.planForm.querySelector('input[name="planId"]:checked');
        if (checkedRadio) {
            this.highlightSelectedPlan(checkedRadio);
        }

        if (this.planSubmitButton) {
            this.planSubmitButton.addEventListener('click', () => this.submitPlan());
        }
    }

    highlightSelectedPlan(radio) {
        if (!this.planForm || !radio) {
            return;
        }

        this.planForm.querySelectorAll('.plan-option').forEach((option) => {
            option.classList.remove('plan-option--selected');
        });

        const selectedOption = radio.closest('.plan-option');
        if (selectedOption) {
            selectedOption.classList.add('plan-option--selected');
        }
    }

    async submitPlan() {
        if (!this.planForm) {
            return;
        }

        const selected = this.planForm.querySelector('input[name="planId"]:checked');
        const curPlanId = this.planForm.querySelector('#origin-planId').value;
        if (!selected) {
            NotificationManager.showWarning('변경할 플랜을 선택해주세요.');
            return;
        }

        if (selected.value === curPlanId) {
            NotificationManager.showWarning('해당 플랜은 현재 사용중 입니다.')
            return;
        }

        const planInfo = this.extractPlanInfo(selected);

        if (this.userRole !== 'ADMIN') {
            this.openPlanRequestModal(planInfo);
            return;
        }

        const payload = { planId: Number(selected.value) };

        try {
            LoadingManager.show();
            const { data } = await httpClient.post('/user/profile/plan', payload);
            if (data.success) {
                NotificationManager.showSuccess(data.message || '플랜이 변경되었습니다.');
                setTimeout(() => window.location.reload(), 600);
            } else {
                NotificationManager.showError(data.message || '플랜 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('[Profile] plan change error', error);
        } finally {
            LoadingManager.hide();
        }
    }

    extractPlanInfo(radio) {
        if (!radio) {
            return { id: null, name: '', price: '' };
        }

        const option = radio.closest('.plan-option');
        return {
            id: Number(radio.value),
            name: option?.querySelector('.plan-option__name')?.textContent?.trim() || '',
            price: option?.querySelector('.plan-option__price')?.textContent?.trim() || ''
        };
    }

    openPlanRequestModal(planInfo) {
        const adminEmail = this.adminEmail || 'admin@example.com';
        const defaultEmail = this.userEmail || '';

        const modalContent = `
            <div class="plan-request-modal">
                <div class="card plan-request-card">
                    <div class="card-header">
                        <h3>관리자 승인 필요</h3>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">
                            선택하신 플랜은 관리자 승인 후에 적용됩니다. 아래 정보를 확인하고 관리자에게 메일을 발송해주세요.
                        </p>
                        <div class="plan-request-summary">
                            <div><span class="label">요청 플랜</span><span>${planInfo.name || '미정'}</span></div>
                            ${planInfo.price ? `<div><span class="label">예상 요금</span><span>${planInfo.price}</span></div>` : ''}
                        </div>
                        <form id="planRequestForm" class="plan-request-form">
                            <div class="form-group">
                                <label for="planRequestEmail" class="form-label">연락받을 이메일</label>
                                <input type="email" id="planRequestEmail" name="email" class="form-control"
                                       placeholder="name@example.com" value="${defaultEmail}">
                            </div>
                            <div class="form-group">
                                <label for="planRequestMessage" class="form-label">요청 내용</label>
                                <textarea id="planRequestMessage" class="form-control" rows="4"
                                          placeholder="변경을 요청하는 사유를 작성해주세요."></textarea>
                            </div>
                            <div class="plan-request-actions">
                                <button type="button" class="btn btn-secondary" id="planRequestCancel">취소</button>
                                <button type="submit" class="btn btn-primary">메일 작성하기</button>
                            </div>
                        </form>
                        <p class="plan-request-hint text-muted mt-3">
                            관리자 이메일: <strong>${adminEmail}</strong>
                        </p>
                    </div>
                </div>
            </div>
        `;

        ModalManager.openModal({
            content: modalContent,
            callBack: () => {
                const modal = document.getElementById('common-modal');
                const form = modal.querySelector('#planRequestForm');
                const cancelButton = modal.querySelector('#planRequestCancel');

                if (cancelButton) {
                    cancelButton.addEventListener('click', () => ModalManager.closeModal());
                }

                if (form) {
                    form.addEventListener('submit', async (event) => {
                        event.preventDefault();
                        const emailInput = form.querySelector('#planRequestEmail');
                        const messageInput = form.querySelector('#planRequestMessage');

                        const email = emailInput?.value.trim() || '';
                        if (!email) {
                            NotificationManager.showWarning('연락받을 이메일을 입력해주세요.');
                            emailInput?.focus();
                            return;
                        }

                        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailPattern.test(email)) {
                            NotificationManager.showWarning('올바른 이메일 형식을 입력해주세요.');
                            emailInput?.focus();
                            return;
                        }

                        const userMessage = messageInput?.value.trim() || '';
                        const payload = this.buildPlanRequestPayload({
                            email,
                            message: userMessage,
                            planInfo
                        });

                        await this.requestPlanApproval(payload);
                    });
                }
            }
        });
    }

    buildPlanRequestPayload({ email, message, planInfo }) {
        return {
            from: email,
            content: message || '',
            plan: planInfo?.name || '',
            price: planInfo?.price || '',
            message: planInfo?.id ? `선택한 플랜 ID: ${planInfo.id}` : ''
        };
    }

    async requestPlanApproval(payload) {
        try {
            LoadingManager.show();
            const { data } = await httpClient.post('/email/plan', payload);
            if (data.success) {
                NotificationManager.showSuccess(data.message || '플랜 업그레이드 요청 메일을 발송했습니다.');
                ModalManager.closeModal();
            } else {
                NotificationManager.showError(data.message || '메일 발송에 실패했습니다.');
            }
        } catch (error) {
            console.error('[Profile] plan request email error', error);
            NotificationManager.showError('메일 발송 중 오류가 발생했습니다.');
        } finally {
            LoadingManager.hide();
        }
    }
}

let userProfilePage;

document.addEventListener('DOMContentLoaded', () => {
    userProfilePage = new UserProfilePage();
});
