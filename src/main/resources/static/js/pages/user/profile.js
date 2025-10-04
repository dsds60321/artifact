class UserProfilePage {
    constructor() {
        this.profileForm = document.getElementById('profileForm');
        this.planForm = document.getElementById('planForm');
        this.profileSubmitButton = document.getElementById('profileSubmit');
        this.planSubmitButton = document.getElementById('planSubmit');
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
        if (!selected) {
            NotificationManager.showWarning('변경할 플랜을 선택해주세요.');
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
}

let userProfilePage;

document.addEventListener('DOMContentLoaded', () => {
    userProfilePage = new UserProfilePage();
});
