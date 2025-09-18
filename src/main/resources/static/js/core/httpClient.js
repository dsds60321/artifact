/**
 * 커스텀 HTTP 클라이언트
 * Spring Security 세션 인증과 함께 작동하도록 설정된 axios 인스턴스
 */

class HttpClient {
    constructor() {
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            withCredentials: true // 쿠키와 세션 정보를 자동으로 포함
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        // 요청 인터셉터
        this.client.interceptors.request.use(
            (config) => {
                // CSRF 토큰 자동 추가
                const csrfToken = this.getCsrfToken();
                if (csrfToken) {
                    config.headers['X-CSRF-TOKEN'] = csrfToken;
                }

                // 요청 로깅 (개발환경에서만)
                if (window.location.hostname === 'localhost') {
                    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
                }

                return config;
            },
            (error) => {
                console.error('[HTTP Request Error]', error);
                return Promise.reject(error);
            }
        );

        // 응답 인터셉터
        this.client.interceptors.response.use(
            (response) => {
                // 성공 응답 로깅 (개발환경에서만)
                if (window.location.hostname === 'localhost') {
                    console.log(`[HTTP Response] ${response.status} ${response.config.url}`, response.data);
                }

                return response;
            },
            (error) => {
                return this.handleResponseError(error);
            }
        );
    }

    /**
     * CSRF 토큰 가져오기
     * Spring Security의 CSRF 토큰을 메타 태그나 쿠키에서 추출
     */
    getCsrfToken() {
        // 1. 메타 태그에서 찾기
        const metaToken = document.querySelector('meta[name="_csrf"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }

        // 2. 쿠키에서 찾기 (XSRF-TOKEN)
        const cookieToken = this.getCookieValue('XSRF-TOKEN');
        if (cookieToken) {
            return decodeURIComponent(cookieToken);
        }

        // 3. 숨겨진 input에서 찾기
        const hiddenInput = document.querySelector('input[name="_csrf"]');
        if (hiddenInput) {
            return hiddenInput.value;
        }

        return null;
    }

    /**
     * 쿠키 값 가져오기
     */
    getCookieValue(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    /**
     * 응답 에러 처리
     */
    handleResponseError(error) {
        console.error('[HTTP Response Error]', error);

        if (error.response) {
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    // 인증 실패 - 로그인 페이지로 리다이렉트
                    this.handleUnauthorized();
                    break;

                case 403:
                    // 권한 없음
                    NotificationManager.showError('접근 권한이 없습니다.');
                    break;

                case 404:
                    NotificationManager.showError('요청한 리소스를 찾을 수 없습니다.');
                    break;

                case 422:
                    // 검증 오류 (Spring Validation)
                    if (data && data.errors) {
                        this.handleValidationErrors(data.errors);
                    } else {
                        NotificationManager.showError(data.message || '입력값을 확인해주세요.');
                    }
                    break;

                case 429:
                    NotificationManager.showError('너무 많은 요청입니다. 잠시 후 다시 시도해주세요.');
                    break;

                case 500:
                    NotificationManager.showError('서버 오류가 발생했습니다. 관리자에게 문의하세요.');
                    break;

                default:
                    const message = data?.message || `오류가 발생했습니다. (${status})`;
                    NotificationManager.showError(message);
            }
        } else if (error.request) {
            // 네트워크 오류
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                NotificationManager.showError('요청 시간이 초과되었습니다.');
            } else {
                NotificationManager.showError('네트워크 연결을 확인해주세요.');
            }
        } else {
            NotificationManager.showError('알 수 없는 오류가 발생했습니다.');
        }

        return Promise.reject(error);
    }

    /**
     * 인증 실패 처리
     */
    handleUnauthorized() {
        // 현재 페이지가 로그인 페이지가 아니면 리다이렉트
        if (!window.location.pathname.includes('/sign/in') && !window.location.pathname.includes('/welcome')) {
            NotificationManager.showWarning('로그인이 필요합니다.');

            setTimeout(() => {
                window.location.href = '/sign/in?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
        }
    }

    /**
     * 검증 오류 처리
     */
    handleValidationErrors(errors) {
        if (Array.isArray(errors)) {
            // Spring Validation 오류 형식
            const errorMessages = {};
            errors.forEach(error => {
                errorMessages[error.field] = error.defaultMessage;
            });

            // 현재 활성화된 폼에 에러 표시
            const activeForm = document.querySelector('form:not([hidden])') ||
                document.querySelector('.modal:not([style*="display: none"]) form');

            if (activeForm && activeForm.id) {
                FormUtils.displayErrors(activeForm.id, errorMessages);
            }
        } else if (typeof errors === 'object') {
            // 객체 형태의 오류
            const activeForm = document.querySelector('form:not([hidden])') ||
                document.querySelector('.modal:not([style*="display: none"]) form');

            if (activeForm && activeForm.id) {
                FormUtils.displayErrors(activeForm.id, errors);
            }
        }
    }

    /**
     * GET 요청
     */
    async get(url, config = {}) {
        try {
            return await this.client.get(url, config);
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST 요청
     */
    async post(url, data = {}, config = {}) {
        try {
            return await this.client.post(url, data, config);
        } catch (error) {
            throw error;
        }
    }

    /**
     * PUT 요청
     */
    async put(url, data = {}, config = {}) {
        try {
            return await this.client.put(url, data, config);
        } catch (error) {
            throw error;
        }
    }

    /**
     * PATCH 요청
     */
    async patch(url, data = {}, config = {}) {
        try {
            return await this.client.patch(url, data, config);
        } catch (error) {
            throw error;
        }
    }

    /**
     * DELETE 요청
     */
    async delete(url, config = {}) {
        try {
            return await this.client.delete(url, config);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 파일 업로드를 위한 POST 요청
     */
    async uploadFile(url, formData, config = {}) {
        const uploadConfig = {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000, // 파일 업로드는 더 긴 타임아웃
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                if (config.onUploadProgress) {
                    config.onUploadProgress(percentCompleted);
                }
            },
            ...config
        };

        return await this.client.post(url, formData, uploadConfig);
    }

    /**
     * 다운로드를 위한 GET 요청
     */
    async downloadFile(url, filename, config = {}) {
        const downloadConfig = {
            responseType: 'blob',
            timeout: 120000, // 다운로드는 더 긴 타임아웃
            ...config
        };

        try {
            const response = await this.client.get(url, downloadConfig);

            // Blob URL 생성하여 다운로드
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            return response;
        } catch (error) {
            throw error;
        }
    }
}

// 전역 인스턴스 생성
const httpClient = new HttpClient();

// 전역으로 사용할 수 있도록 export
window.httpClient = httpClient;

// 기존 axios 사용법과 호환성을 위해 전역 axios를 덮어쓰기 (선택사항)
if (typeof window.axios !== 'undefined') {
    // 기존 axios 메소드들을 httpClient로 프록시
    window.axios = {
        get: (...args) => httpClient.get(...args),
        post: (...args) => httpClient.post(...args),
        put: (...args) => httpClient.put(...args),
        patch: (...args) => httpClient.patch(...args),
        delete: (...args) => httpClient.delete(...args),
        create: () => httpClient.client,
        defaults: httpClient.client.defaults,
        interceptors: httpClient.client.interceptors
    };
}