class SignUp {
    constructor() {
        this.state = {
            currentStep: 1,
            userData: {},
            emailVerification: {
                requested: false,
                verified: false,
                requestId: null
            }
        };

        this.elements = {};
        this.emailResendTimer = null;
        this.emailResendRemaining = 0;

        this.cacheElements();
        this.bindEvents();
        this.updateStepVisibility();
        this.checkPasswordStrength('');
    }

    cacheElements() {
        this.elements = {
            steps: Array.from(document.querySelectorAll('.register-step')),
            indicators: Array.from(document.querySelectorAll('.step-indicator .step')),
            forms: {
                step1: document.getElementById('registerForm1'),
                step2: document.getElementById('registerForm2'),
                step3: document.getElementById('registerForm3')
            },
            buttons: {
                previous: Array.from(document.querySelectorAll('.js-previous-step')),
                sendCode: document.getElementById('sendVerificationButton'),
                verifyCode: document.getElementById('verifyCodeButton'),
                termsConfirm: document.getElementById('termsConfirmButton')
            },
            inputs: {
                lastName: document.getElementById('lastName'),
                firstName: document.getElementById('firstName'),
                userId: document.getElementById('userId'),
                email: document.getElementById('email'),
                phone: document.getElementById('phone'),
                password: document.getElementById('password'),
                passwordConfirm: document.getElementById('passwordConfirm'),
                emailCode: document.getElementById('emailVerificationCode')
            },
            password: {
                strengthFill: document.getElementById('passwordStrengthFill'),
                requirements: {
                    length: document.getElementById('lengthReq'),
                    upper: document.getElementById('upperReq'),
                    lower: document.getElementById('lowerReq'),
                    number: document.getElementById('numberReq'),
                    special: document.getElementById('specialReq')
                }
            },
            agreements: {
                all: document.getElementById('agreeAll'),
                terms: document.getElementById('agreeTerms'),
                privacy: document.getElementById('agreePrivacy'),
                marketing: document.getElementById('agreeMarketing')
            },
            email: {
                codeGroup: document.getElementById('emailCodeGroup'),
                message: document.getElementById('emailVerificationMessage')
            },
            modal: {
                container: document.getElementById('termsModal'),
                title: document.getElementById('termsTitle'),
                content: document.getElementById('termsContent')
            },
            togglePasswordButtons: Array.from(document.querySelectorAll('.toggle-password')),
            termsLinks: Array.from(document.querySelectorAll('.terms-link'))
        };
    }

    bindEvents() {
        const { forms, buttons, inputs, agreements, togglePasswordButtons, termsLinks } = this.elements;

        forms.step1?.addEventListener('submit', (event) => this.handleStep1Submit(event));
        forms.step2?.addEventListener('submit', (event) => this.handleStep2Submit(event));
        forms.step3?.addEventListener('submit', (event) => this.handleStep3Submit(event));

        buttons.previous.forEach((button) =>
            button.addEventListener('click', () => this.previousStep())
        );

        togglePasswordButtons.forEach((button) => {
            const target = button.dataset.target;
            if (!target) {
                return;
            }

            button.addEventListener('click', () => this.togglePassword(target));
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.togglePassword(target);
                }
            });
        });

        inputs.password?.addEventListener('input', (event) => this.checkPasswordStrength(event.target.value));

        agreements.all?.addEventListener('change', () => this.toggleAllAgreements());
        [agreements.terms, agreements.privacy, agreements.marketing]
            .filter(Boolean)
            .forEach((checkbox) => checkbox.addEventListener('change', () => this.updateAllAgreement()));

        buttons.sendCode?.addEventListener('click', () => this.handleSendVerificationCode());
        buttons.verifyCode?.addEventListener('click', () => this.handleVerifyCode());
        inputs.email?.addEventListener('input', () => this.resetEmailVerificationState());

        inputs.emailCode?.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.handleVerifyCode();
            }
        });

        buttons.termsConfirm?.addEventListener('click', () => this.hideTerms());
        termsLinks.forEach((link) =>
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const type = link.dataset.terms;
                if (type) {
                    this.showTerms(type);
                }
            })
        );

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.elements.modal.container?.style.display === 'flex') {
                this.hideTerms();
            }
        });
    }

    nextStep() {
        if (this.state.currentStep >= 3) {
            return;
        }
        this.state.currentStep += 1;
        this.updateStepVisibility();
    }

    previousStep() {
        if (this.state.currentStep <= 1) {
            return;
        }
        this.state.currentStep -= 1;
        this.updateStepVisibility();
    }

    updateStepVisibility() {
        this.elements.steps.forEach((stepElement, index) => {
            stepElement.classList.toggle('active', index + 1 === this.state.currentStep);
        });

        this.elements.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index + 1 === this.state.currentStep);
        });
    }

    togglePassword(targetId) {
        const input = document.getElementById(targetId);
        const toggleIcon = document.getElementById(`${targetId}Toggle`);

        if (!input || !toggleIcon) {
            return;
        }

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleIcon.classList.toggle('fa-eye', !isPassword);
        toggleIcon.classList.toggle('fa-eye-slash', isPassword);
    }

    checkPasswordStrength(password) {
        const { requirements } = this.elements.password;
        let score = 0;

        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        Object.entries(checks).forEach(([key, passed]) => {
            const element = requirements[key];
            if (!element) {
                return;
            }

            element.classList.toggle('met', passed);

            const icon = element.querySelector('i');
            if (!icon) {
                return;
            }

            icon.classList.toggle('fa-check-circle', passed);
            icon.classList.toggle('fa-circle', !passed);

            if (passed) {
                score += 1;
            }
        });

        const strengthFill = this.elements.password.strengthFill;
        if (!strengthFill) {
            return true;
        }

        strengthFill.className = 'password-strength-fill';
        if (score < 3) {
            strengthFill.classList.add('strength-weak');
        } else if (score < 5) {
            strengthFill.classList.add('strength-medium');
        } else {
            strengthFill.classList.add('strength-strong');
        }

        return score >= 4;
    }

    toggleAllAgreements() {
        const allChecked = this.elements.agreements.all?.checked ?? false;
        ['terms', 'privacy', 'marketing'].forEach((key) => {
            if (this.elements.agreements[key]) {
                this.elements.agreements[key].checked = allChecked;
            }
        });
    }

    updateAllAgreement() {
        const { terms, privacy, marketing, all } = this.elements.agreements;
        if (!all) {
            return;
        }
        const isAllChecked = [terms, privacy, marketing]
            .filter(Boolean)
            .every((checkbox) => checkbox.checked);
        all.checked = isAllChecked;
    }

    showTerms(type) {
        const { container, title, content } = this.elements.modal;
        if (!container || !title || !content) {
            return;
        }

        if (type === 'terms') {
            title.textContent = '이용약관';
            content.innerHTML = `
                <h4>제1조 (목적)</h4>
                <p>이 약관은 API 명세서 생성기 서비스의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
                <h4>제2조 (용어의 정의)</h4>
                <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
                <ul>
                    <li>서비스: API 명세서 생성 및 관리 서비스</li>
                    <li>회원: 서비스에 가입하여 이용하는 자</li>
                    <li>콘텐츠: 회원이 서비스를 통해 생성한 API 명세서 등</li>
                </ul>
                <h4>제3조 (서비스의 제공)</h4>
                <p>회사는 다음과 같은 서비스를 제공합니다.</p>
                <ul>
                    <li>API 명세서 작성 및 편집</li>
                    <li>프로젝트 관리</li>
                    <li>문서 내보내기 및 공유</li>
                </ul>
            `;
        } else if (type === 'privacy') {
            title.textContent = '개인정보처리방침';
            content.innerHTML = `
                <h4>1. 개인정보 수집 항목</h4>
                <p>다음과 같은 개인정보를 수집합니다:</p>
                <ul>
                    <li>필수항목: 이름, 이메일, 비밀번호</li>
                    <li>선택항목: 전화번호</li>
                </ul>
                <h4>2. 개인정보 수집 목적</h4>
                <ul>
                    <li>회원 식별 및 인증</li>
                    <li>서비스 제공 및 관리</li>
                    <li>고객 문의 응답</li>
                </ul>
                <h4>3. 개인정보 보유기간</h4>
                <p>회원 탈퇴 시까지 또는 법정 보유기간에 따라 보관합니다.</p>
            `;
        }

        container.style.display = 'flex';
    }

    hideTerms() {
        const { container } = this.elements.modal;
        if (!container) {
            return;
        }
        container.style.display = 'none';
    }

    handleStep1Submit(event) {
        event.preventDefault();
        const { lastName, firstName, email, phone } = this.elements.inputs;
        const userIdInput = this.elements.inputs.userId;

        if (!lastName?.value || !firstName?.value || !userIdInput?.value || !email?.value) {
            alert('필수 항목을 모두 입력해 주세요.');
            return;
        }

        const userIdValue = userIdInput.value.trim();
        if (!this.isValidUserId(userIdValue)) {
            alert('아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.');
            userIdInput.focus();
            return;
        }

        if (!this.state.emailVerification.verified) {
            this.setEmailVerificationMessage('이메일 인증을 완료해 주세요.', 'error');
            this.elements.inputs.email?.focus();
            return;
        }

        this.state.userData = {
            lastName: lastName.value.trim(),
            firstName: firstName.value.trim(),
            userId: userIdValue,
            email: email.value.trim(),
            phone: phone?.value.trim() ?? ''
        };

        this.nextStep();
    }

    handleStep2Submit(event) {
        event.preventDefault();
        const { password, passwordConfirm } = this.elements.inputs;

        const passwordValue = password?.value ?? '';
        const confirmValue = passwordConfirm?.value ?? '';

        if (!this.checkPasswordStrength(passwordValue)) {
            alert('비밀번호가 보안 요구사항을 만족하지 않습니다.');
            return;
        }

        if (passwordValue !== confirmValue) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        this.state.userData.password = passwordValue;
        this.state.userData.passwordConfirm = confirmValue;
        this.nextStep();
    }

    handleStep3Submit(event) {
        event.preventDefault();
        const { terms, privacy, marketing } = this.elements.agreements;

        if (!terms?.checked || !privacy?.checked) {
            alert('필수 약관에 동의해 주세요.');
            return;
        }

        this.state.userData.agreeTerms = terms?.checked ?? false;
        this.state.userData.agreePrivacy = privacy?.checked ?? false;
        this.state.userData.agreeMarketing = marketing?.checked ?? false;
        this.registerUser();
    }

    async handleSendVerificationCode() {
        const { inputs, buttons, email } = this.elements;

        const emailValue = inputs.email?.value.trim();
        const firstNameValue = inputs.firstName?.value.trim();
        const lastNameValue = inputs.lastName?.value.trim();
        const userIdValue = inputs.userId?.value.trim();

        if (!emailValue) {
            this.setEmailVerificationMessage('이메일 주소를 입력해 주세요.', 'error');
            inputs.email?.focus();
            return;
        }

        if (!this.isValidEmail(emailValue)) {
            this.setEmailVerificationMessage('올바른 이메일 형식을 입력해 주세요.', 'error');
            inputs.email?.focus();
            return;
        }

        if (!firstNameValue) {
            this.setEmailVerificationMessage('이름을 입력해 주세요.', 'error');
            inputs.firstName?.focus();
            return;
        }

        if (!lastNameValue) {
            this.setEmailVerificationMessage('성을 입력해 주세요.', 'error');
            inputs.lastName?.focus();
            return;
        }

        if (!userIdValue) {
            this.setEmailVerificationMessage('아이디를 입력해 주세요.', 'error');
            inputs.userId?.focus();
            return;
        }

        this.setEmailVerificationLoading(true);
        this.setEmailVerificationMessage('인증코드를 발송하는 중입니다...', '');

        try {
            const response = await this.postJson('/sign/email/verification-code', { id : userIdValue, nickName : lastNameValue  + firstNameValue, email: emailValue });
            this.state.emailVerification.requested = true;
            this.state.emailVerification.requestId = response?.data?.requestId ?? null;

            this.toggleEmailCodeGroup(true);
            email.message?.classList.add('success');
            this.setEmailVerificationMessage('인증코드를 발송했습니다. 5분 이내에 입력해 주세요.', 'success');
            inputs.emailCode?.focus();
            this.startResendCountdown(60);
        } catch (error) {
            this.setEmailVerificationMessage(error.message || '인증코드 발송에 실패했습니다.', 'error');
        } finally {
            this.setEmailVerificationLoading(false);
        }
    }

    async handleVerifyCode() {
        const { inputs } = this.elements;
        const emailValue = inputs.email?.value.trim();
        const codeValue = inputs.emailCode?.value.trim();

        if (!this.state.emailVerification.requested) {
            this.setEmailVerificationMessage('먼저 인증코드를 발송해 주세요.', 'error');
            return;
        }

        if (!codeValue || codeValue.length < 6) {
            this.setEmailVerificationMessage('6자리 인증코드를 입력해 주세요.', 'error');
            inputs.emailCode?.focus();
            return;
        }

        try {
            this.setEmailVerificationMessage('인증코드를 확인하는 중입니다...', '');
            const payload = {
                email: emailValue,
                code: codeValue,
                requestId: this.state.emailVerification.requestId
            };
            await this.postJson('/sign/email/verification', payload);

            this.state.emailVerification.verified = true;
            this.setEmailVerificationMessage('이메일 인증이 완료되었습니다.', 'success');
            inputs.email?.setAttribute('readonly', 'true');
            inputs.emailCode?.setAttribute('readonly', 'true');
            if (this.elements.buttons.sendCode) {
                this.clearResendCountdown();
                this.elements.buttons.sendCode.disabled = true;
                this.elements.buttons.sendCode.textContent = '인증 완료';
            }
            if (this.elements.buttons.verifyCode) {
                this.elements.buttons.verifyCode.disabled = true;
            }
        } catch (error) {
            this.setEmailVerificationMessage(error.message || '인증코드가 올바르지 않습니다.', 'error');
        }
    }

    toggleEmailCodeGroup(show) {
        const { codeGroup } = this.elements.email;
        if (!codeGroup) {
            return;
        }
        codeGroup.style.display = show ? 'flex' : 'none';
    }

    setEmailVerificationMessage(message, status) {
        const { message: messageElement } = this.elements.email;
        if (!messageElement) {
            return;
        }

        messageElement.textContent = message;
        messageElement.classList.remove('success', 'error');
        if (status) {
            messageElement.classList.add(status);
        }
    }

    setEmailVerificationLoading(isLoading) {
        const { buttons } = this.elements;
        if (!buttons.sendCode) {
            return;
        }

        buttons.sendCode.disabled = isLoading || this.emailResendRemaining > 0;
        if (isLoading) {
            buttons.sendCode.textContent = '발송 중...';
        } else if (this.emailResendRemaining > 0) {
            buttons.sendCode.textContent = `재전송 (${this.emailResendRemaining}s)`;
        } else {
            buttons.sendCode.textContent = this.state.emailVerification.requested ? '재전송' : '인증코드 발송';
        }
    }

    startResendCountdown(seconds) {
        this.clearResendCountdown();
        this.emailResendRemaining = seconds;
        this.updateResendButtonText();

        this.emailResendTimer = setInterval(() => {
            this.emailResendRemaining -= 1;
            this.updateResendButtonText();
            if (this.emailResendRemaining <= 0) {
                this.clearResendCountdown();
            }
        }, 1000);
    }

    updateResendButtonText() {
        const { buttons } = this.elements;
        if (!buttons.sendCode) {
            return;
        }

        if (this.emailResendRemaining > 0) {
            buttons.sendCode.textContent = `재전송 (${this.emailResendRemaining}s)`;
            buttons.sendCode.disabled = true;
        } else {
            buttons.sendCode.textContent = this.state.emailVerification.requested ? '재전송' : '인증코드 발송';
            buttons.sendCode.disabled = false;
        }
    }

    clearResendCountdown() {
        if (this.emailResendTimer) {
            clearInterval(this.emailResendTimer);
            this.emailResendTimer = null;
        }
        this.emailResendRemaining = 0;
        this.updateResendButtonText();
    }

    resetEmailVerificationState() {
        const { inputs, buttons } = this.elements;

        if (!this.state.emailVerification.requested) {
            return;
        }

        this.state.emailVerification = {
            requested: false,
            verified: false,
            requestId: null
        };

        this.toggleEmailCodeGroup(false);
        inputs.email?.removeAttribute('readonly');
        inputs.emailCode?.removeAttribute('readonly');
        if (inputs.emailCode) {
            inputs.emailCode.value = '';
        }
        if (buttons.sendCode) {
            buttons.sendCode.disabled = false;
            buttons.sendCode.textContent = '인증코드 발송';
        }
        if (buttons.verifyCode) {
            buttons.verifyCode.disabled = false;
        }
        this.clearResendCountdown();
        this.setEmailVerificationMessage('', '');
    }

    isValidEmail(email) {
        const pattern = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/;
        return pattern.test(email);
    }

    isValidUserId(userId) {
        const pattern = /^[A-Za-z0-9_]{4,20}$/;
        return pattern.test(userId);
    }

    async postJson(url, body) {
        let response;

        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (error) {
            throw new Error('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }

        let payload;
        try {
            payload = await response.json();
        } catch (error) {
            throw new Error('서버 응답을 해석할 수 없습니다.');
        }

        if (!response.ok || payload?.success === false) {
            const message = payload?.message || '요청 처리가 실패했습니다.';
            throw new Error(message);
        }

        return payload;
    }

    registerUser() {
        const form = document.getElementById('signUpSubmitForm');
        if (!form) {
            console.error('회원가입 폼을 찾을 수 없습니다.');
            return;
        }

        const setValue = (name, value) => {
            const input = form.querySelector(`[name="${name}"]`);
            if (!input) {
                return;
            }
            input.value = value ?? '';
        };

        setValue('userId', this.state.userData.userId);
        setValue('firstName', this.state.userData.firstName);
        setValue('lastName', this.state.userData.lastName);
        setValue('email', this.state.userData.email);
        setValue('phone', this.state.userData.phone);
        setValue('password', this.state.userData.password);
        setValue('passwordConfirm', this.state.userData.passwordConfirm);
        setValue('agreeTerms', this.state.userData.agreeTerms ? 'true' : 'false');
        setValue('agreePrivacy', this.state.userData.agreePrivacy ? 'true' : 'false');
        setValue('agreeMarketing', this.state.userData.agreeMarketing ? 'true' : 'false');

        form.submit();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SignUp();
});
