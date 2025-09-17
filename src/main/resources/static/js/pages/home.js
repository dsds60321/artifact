class Home {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {

        // 새 프로젝트
        document.getElementById('new-project').addEventListener('click', async () => {
            const {data} = await axios.get('/project/new');
            ModalManager.openModal({ content : data});
        });

        // 프로젝트 삭제
        document.querySelectorAll('#delete-project').forEach(elem => {
            elem.addEventListener('click', async ({target}) => {
                await NotificationManager.showConfirm('프로젝트 삭제', '해당 프로젝트를 정말 삭제하시겠습까?');
            });
        })

        // 산출물 추가
        document.querySelectorAll('#new-artifact').forEach(elem => {
           elem.addEventListener('click', async ({target}) => {
               if (!target.dataset.projectIdx) {
                   NotificationManager.showAlert('산출물을 추가 할 프로젝트를 찾지 못했습니다.')
                   return;
               }
               const {data} = await axios.get(`/artifact/new/${target.dataset.projectIdx}`);
               ModalManager.openModal({ content : data});
           })
        });
    }
}

// 전역 인스턴스 생성
let home;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    home = new Home();
});
