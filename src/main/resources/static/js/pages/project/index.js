class Index {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
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
}

// 전역 인스턴스 생성
let indexPage;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    indexPage = new Index();
});