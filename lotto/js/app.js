/**
 * 메인 애플리케이션 로직
 * 사용자 인터페이스와 이벤트 처리
 */

class LottoApp {
    constructor() {
        this.currentNumbers = [];
        this.isDataLoaded = false;
        this.offlineMode = false;
    }

    async init() {
        try {
            showLoading('애플리케이션을 초기화하는 중...');

            // 오프라인 상태 감지
            this.setupOfflineDetection();

            // 데이터 로드
            await window.lottoGenerator.loadData();
            this.isDataLoaded = true;

            // Analytics 초기화
            window.lottoAnalytics = new LottoAnalytics(window.lottoGenerator);

            // UI 초기화
            this.initializeUI();

            // 이벤트 리스너 등록
            this.setupEventListeners();

            // 초기 데이터 표시
            this.loadStats();

            // 차트 번호 옵션 초기화
            this.initializeChartSelectors();

            hideLoading();
            console.log('애플리케이션 초기화 완료');

        } catch (error) {
            console.error('애플리케이션 초기화 실패:', error);
            hideLoading();
            this.showError('애플리케이션 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
        }
    }

    initializeUI() {
        // 사용자 설정 로드
        const settings = window.lottoStorage.getUserSettings();

        // 기본값 설정
        document.getElementById('count').value = settings.defaultCount;
        document.getElementById('recentDraws').value = settings.defaultRecentDraws;
        document.getElementById('avoidPastCombinations').checked = settings.avoidPastCombinations;

        // 최근 추첨 제외 설정 토글
        this.toggleRecentDraws();

        // 마지막 업데이트 시간 표시
        const lastUpdate = window.lottoStorage.getLastUpdate();
        if (lastUpdate) {
            document.getElementById('lastUpdate').textContent =
                `마지막 업데이트: ${formatDate(lastUpdate)}`;
        }
    }

    setupEventListeners() {
        // 번호 생성 버튼
        document.querySelector('button[onclick="generateNumbers()"]').onclick = () => this.generateNumbers();

        // 저장된 번호 관리
        document.querySelector('button[onclick="saveCurrentNumbers()"]').onclick = () => this.saveCurrentNumbers();
        document.querySelector('button[onclick="loadSavedNumbers()"]').onclick = () => this.loadSavedNumbers();
        document.querySelector('button[onclick="clearSavedNumbers()"]').onclick = () => this.clearSavedNumbers();

        // 데이터 관리
        document.querySelector('button[onclick="updateLottoData()"]').onclick = () => this.updateLottoData();
        document.querySelector('button[onclick="loadStats()"]').onclick = () => this.loadStats();

        // 차트 탭
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.onclick = () => this.switchChartTab(tab.textContent.includes('기본') ? 'statistics' :
                                                   tab.textContent.includes('추이') ? 'trend' :
                                                   tab.textContent.includes('상관') ? 'correlation' :
                                                   tab.textContent.includes('패턴') ? 'pattern' : 'hotcold');
        });

        // 차트 로드 버튼들
        document.querySelector('button[onclick="loadStatistics()"]').onclick = () => this.loadStatistics();
        document.querySelector('button[onclick="clearStatistics()"]').onclick = () => this.clearStatistics();
        document.querySelector('button[onclick="loadTrendChart()"]').onclick = () => this.loadTrendChart();
        document.querySelector('button[onclick="loadCorrelationChart()"]').onclick = () => this.loadCorrelationChart();
        document.querySelector('button[onclick="loadPatternChart()"]').onclick = () => this.loadPatternChart();
        document.querySelector('button[onclick="loadHotColdChart()"]').onclick = () => this.loadHotColdChart();
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.offlineMode = false;
            this.updateOfflineStatus();
        });

        window.addEventListener('offline', () => {
            this.offlineMode = true;
            this.updateOfflineStatus();
        });

        this.updateOfflineStatus();
    }

    updateOfflineStatus() {
        const statusElement = document.getElementById('offlineStatus');
        if (statusElement) {
            statusElement.textContent = this.offlineMode ? '오프라인' : '온라인';
            statusElement.className = `status ${this.offlineMode ? 'offline' : 'online'}`;
        }
    }

    generateNumbers() {
        try {
            if (!this.isDataLoaded) {
                this.showError('데이터가 로드되지 않았습니다.');
                return;
            }

            const count = parseInt(document.getElementById('count').value) || 5;
            const recentDraws = parseInt(document.getElementById('recentDraws').value) || 10;
            const avoidPastCombinations = document.getElementById('avoidPastCombinations').checked;

            showLoading('번호를 생성하는 중...');

            // 설정 저장
            window.lottoStorage.saveUserSettings({
                defaultCount: count,
                defaultRecentDraws: recentDraws,
                avoidPastCombinations: avoidPastCombinations
            });

            const numbers = window.lottoGenerator.generateNumbers(count, avoidPastCombinations, recentDraws);
            this.currentNumbers = numbers;

            this.displayGeneratedNumbers(numbers);

            hideLoading();

        } catch (error) {
            console.error('번호 생성 실패:', error);
            hideLoading();
            this.showError('번호 생성에 실패했습니다.');
        }
    }

    displayGeneratedNumbers(numberSets) {
        const resultDiv = document.getElementById('result');
        if (!resultDiv) return;

        let html = '<div class="generated-numbers">';
        html += '<h3>🎲 생성된 로또 번호</h3>';

        numberSets.forEach((numbers, index) => {
            const isUnique = window.lottoGenerator.checkCombinationUniqueness(numbers);
            html += `
                <div class="number-set ${!isUnique ? 'duplicate' : ''}">
                    <span class="set-label">${index + 1}번째 조합${!isUnique ? ' (과거 당첨조합!)' : ''}</span>
                    <div class="numbers">
                        ${numbers.map(num => `<span class="number">${num}</span>`).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultDiv.innerHTML = html;
    }

    saveCurrentNumbers() {
        if (!this.currentNumbers.length) {
            this.showError('생성된 번호가 없습니다.');
            return;
        }

        try {
            this.currentNumbers.forEach((numbers, index) => {
                const name = `생성번호 ${new Date().toLocaleDateString()} #${index + 1}`;
                window.lottoStorage.saveNumbers(numbers, name);
            });

            this.showSuccess(`${this.currentNumbers.length}개 번호 조합이 저장되었습니다.`);
            this.loadSavedNumbers();

        } catch (error) {
            console.error('번호 저장 실패:', error);
            this.showError('번호 저장에 실패했습니다.');
        }
    }

    loadSavedNumbers() {
        try {
            const savedNumbers = window.lottoStorage.getSavedNumbers();
            const container = document.getElementById('savedNumbers');

            if (!savedNumbers.length) {
                container.innerHTML = '<p>저장된 번호가 없습니다.</p>';
                return;
            }

            let html = '<div class="saved-numbers">';
            html += '<h4>💾 저장된 번호 조합</h4>';

            savedNumbers.forEach(numberSet => {
                const isUnique = window.lottoGenerator.checkCombinationUniqueness(numberSet.numbers);
                html += `
                    <div class="saved-number-set">
                        <div class="set-header">
                            <span class="set-name">${numberSet.name}</span>
                            <span class="set-date">${formatDate(numberSet.saved_at)}</span>
                            <button onclick="app.deleteSavedNumbers('${numberSet.id}')" class="delete-btn">❌</button>
                        </div>
                        <div class="numbers ${!isUnique ? 'duplicate' : ''}">
                            ${numberSet.numbers.map(num => `<span class="number">${num}</span>`).join('')}
                            ${!isUnique ? '<span class="warning">⚠️ 과거 당첨조합</span>' : ''}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('저장된 번호 로드 실패:', error);
            this.showError('저장된 번호를 불러오는데 실패했습니다.');
        }
    }

    deleteSavedNumbers(id) {
        if (confirm('이 번호 조합을 삭제하시겠습니까?')) {
            if (window.lottoStorage.deleteNumberSet(id)) {
                this.loadSavedNumbers();
                this.showSuccess('번호 조합이 삭제되었습니다.');
            } else {
                this.showError('번호 조합 삭제에 실패했습니다.');
            }
        }
    }

    clearSavedNumbers() {
        if (confirm('모든 저장된 번호를 삭제하시겠습니까?')) {
            if (window.lottoStorage.clearSavedNumbers()) {
                this.loadSavedNumbers();
                this.showSuccess('모든 저장된 번호가 삭제되었습니다.');
            } else {
                this.showError('저장된 번호 삭제에 실패했습니다.');
            }
        }
    }

    async updateLottoData() {
        if (this.offlineMode) {
            this.showError('오프라인 상태에서는 데이터를 업데이트할 수 없습니다.');
            return;
        }

        try {
            showLoading('최신 데이터를 확인하는 중...');

            // 실제 구현에서는 API를 통해 새 데이터 확인
            // 현재는 정적 사이트이므로 재로드만 수행
            await window.lottoGenerator.loadData();

            window.lottoStorage.setLastUpdate();
            this.loadStats();

            hideLoading();
            this.showSuccess('데이터가 최신 상태입니다.');

        } catch (error) {
            console.error('데이터 업데이트 실패:', error);
            hideLoading();
            this.showError('데이터 업데이트에 실패했습니다.');
        }
    }

    loadStats() {
        try {
            const stats = window.lottoGenerator.getDatabaseStats();
            const metadata = window.lottoGenerator.lottoData?.metadata;

            if (stats && metadata) {
                document.getElementById('total-draws').textContent = formatNumber(stats.total_draws);
                document.getElementById('latest-draw').textContent = formatNumber(stats.latest_draw);

                const dataSize = calculateFileSize(window.lottoGenerator.lottoData);
                document.getElementById('data-size').textContent = dataSize;
            }

        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    toggleRecentDraws() {
        const checkbox = document.getElementById('avoidPastCombinations');
        const recentDrawsInput = document.getElementById('recentDraws');
        const label = document.getElementById('recentDrawsLabel');

        if (checkbox && recentDrawsInput && label) {
            if (checkbox.checked) {
                recentDrawsInput.style.display = 'none';
                label.style.display = 'none';
            } else {
                recentDrawsInput.style.display = 'inline-block';
                label.style.display = 'inline-block';
            }
        }
    }

    initializeChartSelectors() {
        // 트렌드 차트 번호 선택 옵션 생성
        const trendSelect = document.getElementById('trendNumber');
        if (trendSelect) {
            for (let i = 1; i <= 45; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}번`;
                trendSelect.appendChild(option);
            }
        }
    }

    switchChartTab(tabName) {
        // 탭 활성화
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        // 컨텐츠 표시
        document.querySelectorAll('.chart-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-content`).classList.add('active');
    }

    loadStatistics() {
        try {
            const startDraw = parseInt(document.getElementById('statsStartDraw').value) || null;
            const endDraw = parseInt(document.getElementById('statsEndDraw').value) || null;

            const basicStats = window.lottoAnalytics.getBasicStatistics(startDraw, endDraw);
            const frequency = window.lottoAnalytics.getNumberFrequency(startDraw, endDraw);

            this.displayBasicStatistics(basicStats, frequency);

        } catch (error) {
            console.error('통계 로드 실패:', error);
            this.showError('통계 로드에 실패했습니다.');
        }
    }

    clearStatistics() {
        document.getElementById('statsStartDraw').value = '';
        document.getElementById('statsEndDraw').value = '';
        this.loadStatistics();
    }

    displayBasicStatistics(basicStats, frequency) {
        const container = document.getElementById('statisticsResult');
        if (!container || !basicStats) return;

        const topNumbers = frequency.slice(0, 10);
        const bottomNumbers = frequency.slice(-10).reverse();

        const html = `
            <div class="statistics-result">
                <div class="stats-overview">
                    <h4>📊 기본 통계 (${basicStats.startDraw}~${basicStats.endDraw}회차)</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="value">${basicStats.totalDraws}</span>
                            <span class="label">총 회차</span>
                        </div>
                        <div class="stat-item">
                            <span class="value">${formatNumber(basicStats.averageSales)}</span>
                            <span class="label">평균 판매액</span>
                        </div>
                        <div class="stat-item">
                            <span class="value">${formatNumber(basicStats.averagePrize)}</span>
                            <span class="label">평균 1등 상금</span>
                        </div>
                        <div class="stat-item">
                            <span class="value">${basicStats.averageWinners}</span>
                            <span class="label">평균 1등 당첨자</span>
                        </div>
                    </div>
                </div>

                <div class="frequency-analysis">
                    <div class="top-numbers">
                        <h5>🔥 가장 많이 나온 번호</h5>
                        <div class="number-frequency">
                            ${topNumbers.map(item => `
                                <div class="freq-item">
                                    <span class="number">${item.number}</span>
                                    <span class="count">${item.count}회</span>
                                    <span class="percentage">${item.percentage.toFixed(1)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="bottom-numbers">
                        <h5>❄️ 가장 적게 나온 번호</h5>
                        <div class="number-frequency">
                            ${bottomNumbers.map(item => `
                                <div class="freq-item">
                                    <span class="number">${item.number}</span>
                                    <span class="count">${item.count}회</span>
                                    <span class="percentage">${item.percentage.toFixed(1)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    loadTrendChart() {
        const number = parseInt(document.getElementById('trendNumber').value);
        const limit = parseInt(document.getElementById('trendLimit').value) || 50;

        if (!number) {
            this.showError('분석할 번호를 선택해주세요.');
            return;
        }

        window.lottoCharts.createTrendChart(number, limit);
    }

    loadCorrelationChart() {
        const startDraw = parseInt(document.getElementById('corrStartDraw').value) || null;
        const endDraw = parseInt(document.getElementById('corrEndDraw').value) || null;
        const topPairs = parseInt(document.getElementById('corrTopPairs').value) || 20;

        window.lottoCharts.createCorrelationChart(startDraw, endDraw, topPairs);
    }

    loadPatternChart() {
        const startDraw = parseInt(document.getElementById('patternStartDraw').value) || null;
        const endDraw = parseInt(document.getElementById('patternEndDraw').value) || null;
        const type = document.getElementById('patternType').value;

        window.lottoCharts.createPatternChart(type, startDraw, endDraw);
    }

    loadHotColdChart() {
        const recentDraws = parseInt(document.getElementById('hotColdDraws').value) || 20;
        window.lottoCharts.createHotColdChart(recentDraws);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        // 간단한 알림 표시
        const alertClass = type === 'error' ? 'alert-danger' :
                          type === 'success' ? 'alert-success' : 'alert-info';

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        if (type === 'error') {
            alertDiv.style.backgroundColor = '#f8d7da';
            alertDiv.style.color = '#721c24';
            alertDiv.style.borderLeft = '4px solid #dc3545';
        } else if (type === 'success') {
            alertDiv.style.backgroundColor = '#d4edda';
            alertDiv.style.color = '#155724';
            alertDiv.style.borderLeft = '4px solid #28a745';
        } else {
            alertDiv.style.backgroundColor = '#d1ecf1';
            alertDiv.style.color = '#0c5460';
            alertDiv.style.borderLeft = '4px solid #17a2b8';
        }

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// 전역 함수들 (HTML에서 호출)
function generateNumbers() { window.app.generateNumbers(); }
function saveCurrentNumbers() { window.app.saveCurrentNumbers(); }
function loadSavedNumbers() { window.app.loadSavedNumbers(); }
function clearSavedNumbers() { window.app.clearSavedNumbers(); }
function updateLottoData() { window.app.updateLottoData(); }
function loadStats() { window.app.loadStats(); }
function toggleRecentDraws() { window.app.toggleRecentDraws(); }
function switchChartTab(tab) { window.app.switchChartTab(tab); }
function loadStatistics() { window.app.loadStatistics(); }
function clearStatistics() { window.app.clearStatistics(); }
function loadTrendChart() { window.app.loadTrendChart(); }
function loadCorrelationChart() { window.app.loadCorrelationChart(); }
function loadPatternChart() { window.app.loadPatternChart(); }
function loadHotColdChart() { window.app.loadHotColdChart(); }

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new LottoApp();
    await window.app.init();
});