/**
 * 로또 번호 생성 및 분석 핵심 로직
 * Python core.py를 JavaScript로 변환
 */

class LottoGenerator {
    constructor() {
        this.lottoData = null;
        this.excludedNumbers = new Set();
        this.pastCombinations = new Set();
        this.isDataLoaded = false;
        this.LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber';
    }

    async loadData() {
        try {
            showLoading('로또 데이터를 불러오는 중...');
            const response = await fetch('data/lotto-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.lottoData = await response.json();
            this.isDataLoaded = true;
            this.updatePastCombinations();

            hideLoading();
            updateDataStatus('online', `${this.lottoData.metadata.total_draws}회차 데이터 로드됨`);

            // 로드 완료 후 최신 데이터 확인
            this.checkForUpdates();

            return this.lottoData;
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            hideLoading();
            updateDataStatus('offline', '데이터 로드 실패');
            throw error;
        }
    }

    async fetchLatestDrawNumber() {
        try {
            const response = await fetch(`${this.LOTTO_API_URL}&method=getLottoNumber&drwNo=1`);
            if (!response.ok) {
                throw new Error(`API error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.drwNo;
        } catch (error) {
            console.warn('최신 회차 조회 실패 (CORS 제한 가능):', error);
            return null;
        }
    }

    async fetchWinningNumbers(drawNo) {
        try {
            const response = await fetch(`${this.LOTTO_API_URL}&drwNo=${drawNo}`);
            if (!response.ok) {
                throw new Error(`API error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.returnValue !== 'success') {
                throw new Error(`API returned error: ${data.returnValue}`);
            }

            return {
                draw_no: data.drwNo,
                draw_date: data.drwNoDate,
                numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
                bonus_number: data.bnusNo,
                first_prize_amount: data.firstWinamnt,
                first_prize_winners: data.firstPrzwnerCo,
                total_sales_amount: data.totSellamnt
            };
        } catch (error) {
            console.warn(`${drawNo}회차 데이터 조회 실패 (CORS 제한 가능):`, error);
            return null;
        }
    }

    async updateDataFromAPI() {
        try {
            showLoading('최신 데이터 확인 중...');

            const latestAPIDrawNo = await this.fetchLatestDrawNumber();
            if (!latestAPIDrawNo) {
                console.log('API에서 최신 회차를 가져올 수 없습니다.');
                hideLoading();
                return false;
            }

            const currentLatest = this.getLatestDrawNumber();
            if (latestAPIDrawNo <= currentLatest) {
                console.log('이미 최신 데이터입니다.');
                hideLoading();
                updateDataStatus('online', `${this.lottoData.metadata.total_draws}회차 데이터 (최신)`);
                return false;
            }

            console.log(`새로운 회차 발견: ${currentLatest + 1}회차부터 ${latestAPIDrawNo}회차까지`);

            const newDraws = [];
            for (let drawNo = currentLatest + 1; drawNo <= latestAPIDrawNo; drawNo++) {
                const drawData = await this.fetchWinningNumbers(drawNo);
                if (drawData) {
                    newDraws.push(drawData);
                    console.log(`${drawNo}회차 데이터 추가됨`);
                }
            }

            if (newDraws.length > 0) {
                this.lottoData.draws.push(...newDraws);
                this.lottoData.metadata.total_draws += newDraws.length;
                this.lottoData.metadata.latest_draw = latestAPIDrawNo;
                this.updatePastCombinations();

                updateDataStatus('online', `${this.lottoData.metadata.total_draws}회차 데이터 (${newDraws.length}개 회차 업데이트됨)`);
                console.log(`${newDraws.length}개의 새로운 회차가 추가되었습니다.`);

                hideLoading();
                return true;
            }

            hideLoading();
            return false;
        } catch (error) {
            console.error('API 데이터 업데이트 실패:', error);
            hideLoading();
            updateDataStatus('warning', 'API 업데이트 실패 (로컬 데이터 사용)');
            return false;
        }
    }

    async checkForUpdates() {
        if (!this.isDataLoaded) return;

        try {
            const latestAPIDrawNo = await this.fetchLatestDrawNumber();
            if (!latestAPIDrawNo) return;

            const currentLatest = this.getLatestDrawNumber();
            if (latestAPIDrawNo > currentLatest) {
                const newCount = latestAPIDrawNo - currentLatest;
                updateDataStatus('warning', `${newCount}개의 새로운 회차 발견 (업데이트 가능)`);

                // 자동 업데이트 버튼 활성화
                const updateBtn = document.getElementById('updateBtn');
                if (updateBtn) {
                    updateBtn.textContent = `새 데이터 업데이트 (${newCount}개 회차)`;
                    updateBtn.classList.add('highlight');
                }
            }
        } catch (error) {
            console.log('업데이트 확인 중 오류 (무시됨):', error);
        }
    }

    updatePastCombinations() {
        if (!this.lottoData) return;

        this.pastCombinations.clear();
        this.lottoData.draws.forEach(draw => {
            const combination = draw.numbers.slice().sort((a, b) => a - b).join(',');
            this.pastCombinations.add(combination);
        });
    }

    updateExcludedNumbers(recentDraws = 10) {
        if (!this.lottoData) return;

        this.excludedNumbers.clear();
        const recentData = this.lottoData.draws.slice(-recentDraws);

        recentData.forEach(draw => {
            draw.numbers.forEach(num => {
                this.excludedNumbers.add(num);
            });
            if (draw.bonus_number) {
                this.excludedNumbers.add(draw.bonus_number);
            }
        });

        console.log(`최근 ${recentDraws}회차에서 ${this.excludedNumbers.size}개 번호 제외:`,
                   Array.from(this.excludedNumbers).sort((a, b) => a - b));
    }

    generateNumbers(count = 5, avoidPastCombinations = true, recentDraws = 10) {
        if (!this.isDataLoaded) {
            throw new Error('데이터가 로드되지 않았습니다.');
        }

        if (avoidPastCombinations) {
            return this.generateUniqueCombinations(count);
        } else {
            this.updateExcludedNumbers(recentDraws);
            return this.generateNumbersByExcludedNumbers(count);
        }
    }

    generateNumbersByExcludedNumbers(count = 5) {
        const availableNumbers = [];
        for (let i = 1; i <= 45; i++) {
            if (!this.excludedNumbers.has(i)) {
                availableNumbers.push(i);
            }
        }

        if (availableNumbers.length < 6) {
            console.warn('사용 가능한 번호가 6개 미만입니다. 모든 번호를 사용합니다.');
            availableNumbers.length = 0;
            for (let i = 1; i <= 45; i++) {
                availableNumbers.push(i);
            }
        }

        const result = [];
        for (let i = 0; i < count; i++) {
            const numbers = this.shuffleArray([...availableNumbers]).slice(0, 6).sort((a, b) => a - b);
            result.push(numbers);
        }

        return result;
    }

    generateUniqueCombinations(count = 5, maxAttempts = 10000) {
        if (!this.pastCombinations.size) {
            console.warn('과거 당첨 조합 데이터가 없습니다. 일반 생성 방식을 사용합니다.');
            return this.generateNumbersByExcludedNumbers(count);
        }

        console.log(`과거 ${this.pastCombinations.size}개의 당첨 조합을 제외하고 생성합니다.`);

        const result = [];
        const generatedCombinations = new Set();

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let numbers = null;

            while (attempts < maxAttempts) {
                numbers = [];
                const allNumbers = Array.from({length: 45}, (_, i) => i + 1);
                const selected = this.shuffleArray(allNumbers).slice(0, 6).sort((a, b) => a - b);
                const combinationKey = selected.join(',');

                if (!this.pastCombinations.has(combinationKey) &&
                    !generatedCombinations.has(combinationKey)) {
                    numbers = selected;
                    generatedCombinations.add(combinationKey);
                    break;
                }

                attempts++;
            }

            if (attempts >= maxAttempts) {
                console.warn(`${i + 1}번째 조합 생성 실패: ${maxAttempts}번 시도 후에도 고유한 조합을 찾지 못했습니다.`);
                const allNumbers = Array.from({length: 45}, (_, i) => i + 1);
                numbers = this.shuffleArray(allNumbers).slice(0, 6).sort((a, b) => a - b);
            }

            result.push(numbers);
        }

        console.log(`${result.length}개의 고유한 조합을 생성했습니다.`);
        return result;
    }

    checkCombinationUniqueness(combination) {
        const combinationKey = combination.slice().sort((a, b) => a - b).join(',');
        return !this.pastCombinations.has(combinationKey);
    }

    getCombinationStatistics() {
        const totalPossible = 8145060; // C(45,6)
        const pastWinningCombinations = this.pastCombinations.size;

        return {
            totalPossibleCombinations: totalPossible,
            pastWinningCombinations: pastWinningCombinations,
            availableCombinations: totalPossible - pastWinningCombinations,
            winProbabilityReduction: (pastWinningCombinations / totalPossible) * 100
        };
    }

    getLatestDrawNumber() {
        return this.lottoData ? this.lottoData.metadata.latest_draw : 0;
    }

    getDatabaseStats() {
        if (!this.lottoData) return null;

        const draws = this.lottoData.draws.map(d => d.draw_no);
        const missingDraws = this.findMissingDraws(draws);

        return {
            total_draws: this.lottoData.metadata.total_draws,
            latest_draw: this.lottoData.metadata.latest_draw,
            first_draw: this.lottoData.metadata.first_draw,
            missing_draws: missingDraws
        };
    }

    findMissingDraws(existingDraws) {
        if (!existingDraws.length) return [];

        const min = Math.min(...existingDraws);
        const max = Math.max(...existingDraws);
        const expected = Array.from({length: max - min + 1}, (_, i) => min + i);
        const existing = new Set(existingDraws);

        return expected.filter(draw => !existing.has(draw));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getDrawData(drawNo) {
        if (!this.lottoData) return null;
        return this.lottoData.draws.find(draw => draw.draw_no === drawNo);
    }

    getDrawsInRange(startDraw, endDraw) {
        if (!this.lottoData) return [];

        return this.lottoData.draws.filter(draw =>
            draw.draw_no >= startDraw && draw.draw_no <= endDraw
        );
    }

    getRecentDraws(count = 10) {
        if (!this.lottoData) return [];
        return this.lottoData.draws.slice(-count);
    }
}

// 전역 인스턴스
window.lottoGenerator = new LottoGenerator();

// 유틸리티 함수들
function showLoading(message = '로딩 중...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (text) text.textContent = message;
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function updateDataStatus(status, message) {
    const statusElement = document.getElementById('dataStatus');
    if (statusElement) {
        statusElement.className = `status ${status}`;
        statusElement.textContent = message;
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function calculateFileSize(jsonData) {
    const jsonString = JSON.stringify(jsonData);
    const bytes = new Blob([jsonString]).size;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}