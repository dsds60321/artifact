// API 문서 관리자 클래스
class ApiFlowManager {
    constructor() {
        console.log('실행')
        this.init();
    }

    init() {
        console.log('API 문서 에디터 초기화');
    }

}

// 글로벌 변수로 등록
window.ApiFlowManager = ApiFlowManager;