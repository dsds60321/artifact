/**
 * 공통 UI 및 레이아웃 관리 JavaScript
 * 모달, 확인창, 알림, 유틸리티 함수들을 포함
 */

// ======================== 모달 관리 ========================

class ModalManager {
    static openModal({ id = 'common-modal', content }) {
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
        }
    }

    static closeModal(modalId) {
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
    static validateForm(formId, rules = {}) {
        const form = document.getElementById(formId);
        if (!form) return false;

        let isValid = true;
        const errors = {};

        // 기본 HTML5 validation
        if (!form.checkValidity()) {
            isValid = false;
        }

        // 커스텀 validation rules
        Object.keys(rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            const rule = rules[fieldName];

            if (field && rule) {
                const value = field.value.trim();

                if (rule.required && !value) {
                    errors[fieldName] = rule.required;
                    isValid = false;
                } else if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
                    errors[fieldName] = rule.patternError || '올바른 형식이 아닙니다.';
                    isValid = false;
                } else if (rule.minLength && value.length < rule.minLength) {
                    errors[fieldName] = `최소 ${rule.minLength}자 이상 입력해주세요.`;
                    isValid = false;
                } else if (rule.custom && !rule.custom(value)) {
                    errors[fieldName] = rule.customError || '유효하지 않은 값입니다.';
                    isValid = false;
                }
            }
        });

        // 에러 표시
        this.displayErrors(formId, errors);

        return isValid;
    }

    static displayErrors(formId, errors) {
        const form = document.getElementById(formId);
        if (!form) return;

        // 기존 에러 메시지 제거
        form.querySelectorAll('.field-error').forEach(el => el.remove());

        // 새 에러 메시지 표시
        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                const errorEl = document.createElement('div');
                errorEl.className = 'field-error text-sm text-danger mt-1';
                errorEl.textContent = errors[fieldName];
                field.parentNode.appendChild(errorEl);
                field.classList.add('is-invalid');
            }
        });
    }

    static clearErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    static getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
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