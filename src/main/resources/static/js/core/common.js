/**
 * 공통 UI 및 레이아웃 관리 JavaScript
 * 모달, 확인창, 알림, 유틸리티 함수들을 포함
 */

// ======================== 모달 관리 ========================

class ModalManager {
    static openModal({ id = 'common-modal', content , callBack}) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            modal.innerHTML = content;
            // 모달 외부 클릭 시 닫기
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(id);
                }
            });

            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(id);
                }
            });

            callBack();
        }
    }

    static closeModal(modalId = 'common-modal') {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            // 폼이 있다면 리셋
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    static closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        });
    }

    // 동적 모달 생성
    static createModal(id, title, content, actions = []) {
        const modalHtml = `
            <div id="${id}" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="card">
                        <div class="card-header">
                            <h2>${title}</h2>
                        </div>
                        <div class="card-body">
                            ${content}
                            <div class="d-flex justify-content-end gap-2 mt-4">
                                ${actions.map(action => `
                                    <button type="${action.type || 'button'}" 
                                            class="btn ${action.class || 'btn-secondary'}" 
                                            onclick="${action.onclick || ''}">
                                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                                        ${action.text}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return document.getElementById(id);
    }
}

// ======================== 알림 및 확인창 관리 ========================

class NotificationManager {
    static showSuccess(message, duration = 3000) {
        Toastify({
            text: message,
            duration: duration,
            gravity: "top",
            position: "right",
            backgroundColor: "#10b981",
            stopOnFocus: true,
            className: "success-toast"
        }).showToast();
    }

    static showError(message, duration = 4000) {
        Toastify({
            text: message,
            duration: duration,
            gravity: "top",
            position: "right",
            backgroundColor: "#ef4444",
            stopOnFocus: true,
            className: "error-toast"
        }).showToast();
    }

    static showWarning(message, duration = 3500) {
        Toastify({
            text: message,
            duration: duration,
            gravity: "top",
            position: "right",
            backgroundColor: "#f59e0b",
            stopOnFocus: true,
            className: "warning-toast"
        }).showToast();
    }

    static showInfo(message, duration = 3000) {
        Toastify({
            text: message,
            duration: duration,
            gravity: "top",
            position: "right",
            backgroundColor: "#3b82f6",
            stopOnFocus: true,
            className: "info-toast"
        }).showToast();
    }

    // 기존 호환성을 위한 showAlert
    static showAlert(message, type = 'info', duration = 3000) {
        switch(type) {
            case 'success': this.showSuccess(message, duration); break;
            case 'error': this.showError(message, duration); break;
            case 'warning': this.showWarning(message, duration); break;
            default: this.showInfo(message, duration); break;
        }
    }

    // SweetAlert2 기반 확인창
    static async showConfirm(title, text, options = {}) {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: options.confirmText || '확인',
            cancelButtonText: options.cancelText || '취소',
            reverseButtons: true,
            focusCancel: true
        });

        return result.isConfirmed;
    }

    // 삭제 확인 전용
    static async showDeleteConfirm(message = '정말로 삭제하시겠습니까?') {
        const result = await Swal.fire({
            title: '삭제 확인',
            text: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            reverseButtons: true,
            focusCancel: true
        });

        return result.isConfirmed;
    }

    // 성공 알림 다이얼로그
    static showSuccessDialog(title, text) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'success',
            confirmButtonColor: '#10b981',
            confirmButtonText: '확인'
        });
    }

    // 에러 알림 다이얼로그
    static showErrorDialog(title, text) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            confirmButtonText: '확인'
        });
    }
}


// ======================== 로딩 관리 ========================

class LoadingManager {
    static show(text) {
        NProgress.start();

        // 텍스트가 있으면 커스텀 로딩 표시
        if (text) {
            const loadingEl = document.createElement('div');
            loadingEl.id = 'custom-loading';
            loadingEl.innerHTML = `
                <div style="
                    position: fixed; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div class="loading"></div>
                    <span>${text}</span>
                </div>
            `;
            document.body.appendChild(loadingEl);
        }
    }

    static hide() {
        NProgress.done();

        const customLoading = document.getElementById('custom-loading');
        if (customLoading) {
            customLoading.remove();
        }
    }

    static hideAll() {
        this.hide();
    }
}


// ======================== 폼 유틸리티 ========================

class FormUtils {
    // 기본 validation 규칙들
    static validationRules = {
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: '올바른 이메일 형식을 입력해주세요.'
        },
        phone: {
            pattern: /^01[0-9]-?\d{3,4}-?\d{4}$/,
            message: '올바른 휴대폰 번호를 입력해주세요.'
        },
        password: {
            pattern: /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message: '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.'
        },
        username: {
            pattern: /^[a-zA-Z0-9_]{4,20}$/,
            message: '사용자명은 4-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.'
        },
        korean: {
            pattern: /^[가-힣\s]+$/,
            message: '한글만 입력 가능합니다.'
        },
        number: {
            pattern: /^\d+$/,
            message: '숫자만 입력 가능합니다.'
        }
    };

    // 폼별 검증 규칙 저장소
    static validators = new Map();

    /**
     * 네이티브 JavaScript로 폼 검증
     * @param {string|HTMLElement} formElement - 폼 ID 또는 폼 엘리먼트
     * @param {Object} options - 검증 옵션
     * @returns {boolean} 검증 결과
     */
    static validate(formElement, options = {}) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) {
            console.error('Form not found');
            return false;
        }

        // 기존 에러 제거
        this.clearErrors(form);

        const formId = form.id || 'form-' + Date.now();
        const validator = this.validators.get(formId);

        if (!validator) {
            console.warn('No validation rules found for form. Use quickSetup() first.');
            return this.basicValidation(form);
        }

        let isValid = true;
        const errors = {};

        // 각 필드 검증
        Object.keys(validator.rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            const rules = validator.rules[fieldName];
            const messages = validator.messages[fieldName];

            if (field) {
                const value = field.value.trim();
                const fieldError = this.validateField(field, value, rules, messages);

                if (fieldError) {
                    errors[fieldName] = fieldError;
                    isValid = false;
                }
            }
        });

        // 에러 표시
        if (!isValid) {
            this.displayErrors(form, errors);

            // 첫 번째 에러 필드에 포커스
            const firstErrorField = form.querySelector('.is-invalid');
            if (firstErrorField && options.focusInvalid !== false) {
                firstErrorField.focus();
            }
        }

        return isValid;
    }

    /**
     * 단일 필드 검증
     */
    static validateField(field, value, rules, messages) {
        // Required 체크
        if (rules.required && !value) {
            return messages.required || '필수 입력 항목입니다.';
        }

        // 빈 값이면 다른 검증은 스킵 (required가 아닌 경우)
        if (!value) return null;

        // 최소 길이
        if (rules.minlength && value.length < rules.minlength) {
            return messages.minlength || `최소 ${rules.minlength}자 이상 입력해주세요.`;
        }

        // 최대 길이
        if (rules.maxlength && value.length > rules.maxlength) {
            return messages.maxlength || `최대 ${rules.maxlength}자까지 입력 가능합니다.`;
        }

        // 패턴 검증
        if (rules.pattern && !rules.pattern.test(value)) {
            return messages.pattern || '올바른 형식이 아닙니다.';
        }

        // equalTo 검증 (비밀번호 확인 등)
        if (rules.equalTo) {
            const targetField = document.querySelector(rules.equalTo);
            if (targetField && targetField.value !== value) {
                return messages.equalTo || '입력값이 일치하지 않습니다.';
            }
        }

        return null;
    }

    /**
     * 기본 HTML5 검증
     */
    static basicValidation(form) {
        const isValid = form.checkValidity();

        if (!isValid) {
            // HTML5 검증 에러 표시
            const invalidFields = form.querySelectorAll(':invalid');
            invalidFields.forEach(field => {
                field.classList.add('is-invalid');

                // 커스텀 에러 메시지 표시
                if (!field.nextElementSibling?.classList.contains('field-error')) {
                    const errorEl = document.createElement('div');
                    errorEl.className = 'field-error text-danger mt-1';
                    errorEl.textContent = field.validationMessage;
                    field.parentNode.insertBefore(errorEl, field.nextSibling);
                }
            });
        }

        return isValid;
    }

    /**
     * 빠른 검증 규칙 설정
     * @param {string|HTMLElement} formElement - 폼 ID 또는 폼 엘리먼트
     * @param {Object} fieldRules - 필드별 규칙 매핑
     */
    static quickSetup(formElement, fieldRules = {}) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) {
            console.error('Form not found');
            return;
        }

        const formId = form.id || 'form-' + Date.now();
        if (!form.id) form.id = formId;

        const rules = {};
        const messages = {};

        Object.keys(fieldRules).forEach(fieldName => {
            const fieldRule = fieldRules[fieldName];

            if (typeof fieldRule === 'string') {
                // 미리 정의된 규칙 사용
                const predefined = this.validationRules[fieldRule];
                if (predefined) {
                    rules[fieldName] = { pattern: predefined.pattern };
                    messages[fieldName] = { pattern: predefined.message };
                }
            } else if (typeof fieldRule === 'object') {
                // 커스텀 규칙 사용
                rules[fieldName] = {};
                messages[fieldName] = {};

                if (fieldRule.required) {
                    rules[fieldName].required = true;
                    messages[fieldName].required = typeof fieldRule.required === 'string'
                        ? fieldRule.required : '필수 입력 항목입니다.';
                }

                if (fieldRule.type && this.validationRules[fieldRule.type]) {
                    const predefined = this.validationRules[fieldRule.type];
                    rules[fieldName].pattern = predefined.pattern;
                    messages[fieldName].pattern = fieldRule.message || predefined.message;
                }

                if (fieldRule.minlength) {
                    rules[fieldName].minlength = fieldRule.minlength;
                    messages[fieldName].minlength = `최소 ${fieldRule.minlength}자 이상 입력해주세요.`;
                }

                if (fieldRule.maxlength) {
                    rules[fieldName].maxlength = fieldRule.maxlength;
                    messages[fieldName].maxlength = `최대 ${fieldRule.maxlength}자까지 입력 가능합니다.`;
                }

                if (fieldRule.equalTo) {
                    rules[fieldName].equalTo = fieldRule.equalTo;
                    messages[fieldName].equalTo = fieldRule.equalToMessage || '입력값이 일치하지 않습니다.';
                }

                if (fieldRule.pattern) {
                    rules[fieldName].pattern = fieldRule.pattern;
                    messages[fieldName].pattern = fieldRule.message || '올바른 형식이 아닙니다.';
                }
            }
        });

        // 검증 규칙 저장
        this.validators.set(formId, { rules, messages });

        // 실시간 검증 설정
        this.setupRealTimeValidation(form, { debounceDelay: 300 });

        return { rules, messages };
    }

    /**
     * 실시간 검증 설정
     */
    static setupRealTimeValidation(form, options = {}) {
        const config = {
            debounceDelay: 300,
            validateOnBlur: true,
            validateOnInput: true,
            ...options
        };

        const formId = form.id;
        const validator = this.validators.get(formId);
        if (!validator) return;

        const debouncedValidate = this.debounce((field) => {
            this.validateSingleField(form, field, validator);
        }, config.debounceDelay);

        // 각 필드에 이벤트 리스너 추가
        Object.keys(validator.rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                if (config.validateOnBlur) {
                    field.addEventListener('blur', () => {
                        this.validateSingleField(form, field, validator);
                    });
                }

                if (config.validateOnInput) {
                    field.addEventListener('input', () => {
                        // 에러가 있는 필드만 실시간 검증
                        if (field.classList.contains('is-invalid')) {
                            debouncedValidate(field);
                        }
                    });
                }
            }
        });
    }

    /**
     * 단일 필드 검증 및 에러 표시
     */
    static validateSingleField(form, field, validator) {
        const fieldName = field.name || field.id;
        const rules = validator.rules[fieldName];
        const messages = validator.messages[fieldName];

        if (!rules) return true;

        const value = field.value.trim();
        const error = this.validateField(field, value, rules, messages);

        // 기존 에러 제거
        this.clearFieldError(field);

        if (error) {
            // 에러 표시
            this.displayFieldError(field, error);
            return false;
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            return true;
        }
    }

    /**
     * 단일 필드 에러 제거
     */
    static clearFieldError(field) {
        field.classList.remove('is-invalid', 'is-valid');

        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // 라벨 에러 스타일 제거
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            label.classList.remove('text-danger');
        }
    }

    /**
     * 단일 필드 에러 표시
     */
    static displayFieldError(field, message) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        // 에러 메시지 추가
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error text-danger mt-1';
        errorEl.textContent = message;

        // Bootstrap input-group 처리
        const inputGroup = field.closest('.input-group');
        if (inputGroup) {
            inputGroup.parentNode.insertBefore(errorEl, inputGroup.nextSibling);
        } else {
            field.parentNode.insertBefore(errorEl, field.nextSibling);
        }

        // 라벨에 에러 스타일 추가
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            label.classList.add('text-danger');
        }
    }

    /**
     * 폼 데이터 수집 (개선된 버전)
     */
    static getFormData(formElement, options = {}) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) return {};

        const config = {
            includeEmpty: false,
            trim: true,
            parseNumbers: false,
            exclude: [],
            ...options
        };

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            // 제외할 필드 스킵
            if (config.exclude.includes(key)) continue;

            // 빈 값 처리
            if (!config.includeEmpty && !value.trim()) continue;

            // 값 정제
            if (config.trim && typeof value === 'string') {
                value = value.trim();
            }

            // 숫자 파싱
            if (config.parseNumbers && !isNaN(value) && value !== '') {
                value = Number(value);
            }

            // 이미 존재하는 키면 배열로 변환 (체크박스 등)
            if (data.hasOwnProperty(key)) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * 에러 메시지 표시
     */
    static displayErrors(formElement, errors) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) return;

        this.clearErrors(form);

        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                this.displayFieldError(field, errors[fieldName]);
            }
        });
    }

    /**
     * 에러 메시지 제거
     */
    static clearErrors(formElement) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) return;

        // 모든 에러 관련 클래스와 요소 제거
        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
            el.classList.remove('is-invalid', 'is-valid');
        });
        form.querySelectorAll('label.text-danger').forEach(el => {
            el.classList.remove('text-danger');
        });
    }

    /**
     * 폼 제출 헬퍼
     */
    static onSubmit(formElement, submitCallback, options = {}) {
        const form = typeof formElement === 'string'
            ? document.getElementById(formElement)
            : formElement;

        if (!form) return;

        const config = {
            validateFirst: true,
            showLoading: true,
            loadingText: '처리 중...',
            preventDefault: true,
            ...options
        };

        form.addEventListener('submit', async (e) => {
            if (config.preventDefault) {
                e.preventDefault();
            }

            try {
                // 검증 실행
                if (config.validateFirst) {
                    const isValid = this.validate(form);
                    if (!isValid) {
                        return false;
                    }
                }

                // 로딩 표시
                if (config.showLoading) {
                    LoadingManager.show(config.loadingText);
                }

                // 폼 데이터 수집
                const formData = this.getFormData(form, config.dataOptions || {});

                // 콜백 실행
                await submitCallback(formData, form, e);

            } catch (error) {
                console.error('Form submit error:', error);
                NotificationManager.showError('처리 중 오류가 발생했습니다.');
            } finally {
                if (config.showLoading) {
                    LoadingManager.hide();
                }
            }
        });
    }

    /**
     * 디바운스 함수
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // 기존 메소드와의 호환성
    static validateForm(formId, rules = {}) {
        console.warn('validateForm은 더 이상 권장되지 않습니다. quickSetup()과 validate()를 사용해주세요.');

        // 빠른 마이그레이션을 위한 폴백
        if (Object.keys(rules).length > 0) {
            this.quickSetup(formId, rules);
        }
        return this.validate(formId);
    }
}



// ======================== 유틸리티 함수들 ========================

class Utils {
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    }

    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(() => {
                NotificationManager.showAlert('클립보드에 복사되었습니다.', 'success');
            });
        } else {
            // 폴백
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            NotificationManager.showAlert('클립보드에 복사되었습니다.', 'success');
        }
    }

    static generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    static sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// ======================== 전역 이벤트 리스너 ========================

document.addEventListener('DOMContentLoaded', function() {
    // 모든 모달의 외부 클릭 및 ESC 키 이벤트 설정
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id;
            if (modalId) {
                ModalManager.closeModal(modalId);
            }
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // 최상단 모달만 닫기
            const visibleModals = Array.from(document.querySelectorAll('.modal'))
                .filter(modal => modal.style.display !== 'none');
            if (visibleModals.length > 0) {
                const topModal = visibleModals[visibleModals.length - 1];
                ModalManager.closeModal(topModal.id);
            }
        }
    });
});

// ======================== 전역 함수들 (기존 코드와의 호환성) ========================

// 기존 함수들을 새 클래스 메소드로 매핑
function showModal(modalId) {
    ModalManager.openModal(modalId);
}

function hideModal(modalId) {
    ModalManager.closeModal(modalId);
}

function showAlert(message, type = 'info') {
    NotificationManager.showAlert(message, type);
}

function showConfirm(message, callback) {
    NotificationManager.showConfirm(message, callback);
}

// 전역으로 사용할 수 있도록 export
window.ModalManager = ModalManager;
window.NotificationManager = NotificationManager;
window.LoadingManager = LoadingManager;
window.FormUtils = FormUtils;
window.Utils = Utils;