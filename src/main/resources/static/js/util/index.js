const UTIL = {
    file : {
        download : async function ({url, fileName, isOpen = true}) {
            try {
                const fileResponse = await axios.get(url, {responseType: 'blob'});
                const blobUrl = window.URL.createObjectURL(fileResponse.data);

                const downloadLink = document.createElement('a');
                downloadLink.href = blobUrl;
                downloadLink.download = fileName || `api-spec_${new Date().getTime()}`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                window.URL.revokeObjectURL(blobUrl);

                if (isOpen) {
                    window.open(url, '_blank');
                }

            } catch (e) {
                console.error(e);
                NotificationManager.showError('서버로부터 오류가 발생했습니다. 관리자에게 문의해주시기 바랍니다.');
            }

        }
    }
}