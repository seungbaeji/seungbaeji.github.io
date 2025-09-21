/**
 * 로컬 스토리지 관리 및 사용자 데이터 저장
 */

class LottoStorage {
    constructor() {
        this.storageKeys = {
            SAVED_NUMBERS: 'lotto_saved_numbers',
            USER_SETTINGS: 'lotto_user_settings',
            LAST_UPDATE: 'lotto_last_update'
        };
    }

    // 번호 저장
    saveNumbers(numbers, name = null) {
        const savedNumbers = this.getSavedNumbers();
        const timestamp = new Date().toISOString();
        const id = Date.now().toString();

        const numberSet = {
            id: id,
            numbers: numbers,
            name: name || `번호조합 ${savedNumbers.length + 1}`,
            saved_at: timestamp,
            generated_at: timestamp
        };

        savedNumbers.push(numberSet);
        this.setSavedNumbers(savedNumbers);

        return numberSet;
    }

    // 저장된 번호 조회
    getSavedNumbers() {
        try {
            const saved = localStorage.getItem(this.storageKeys.SAVED_NUMBERS);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('저장된 번호 로드 실패:', error);
            return [];
        }
    }

    // 저장된 번호 설정
    setSavedNumbers(numbers) {
        try {
            localStorage.setItem(this.storageKeys.SAVED_NUMBERS, JSON.stringify(numbers));
            return true;
        } catch (error) {
            console.error('번호 저장 실패:', error);
            return false;
        }
    }

    // 특정 번호 조합 삭제
    deleteNumberSet(id) {
        const savedNumbers = this.getSavedNumbers();
        const filtered = savedNumbers.filter(set => set.id !== id);
        return this.setSavedNumbers(filtered);
    }

    // 번호 조합 이름 변경
    updateNumberSetName(id, newName) {
        const savedNumbers = this.getSavedNumbers();
        const numberSet = savedNumbers.find(set => set.id === id);

        if (numberSet) {
            numberSet.name = newName;
            return this.setSavedNumbers(savedNumbers);
        }

        return false;
    }

    // 모든 저장된 번호 삭제
    clearSavedNumbers() {
        try {
            localStorage.removeItem(this.storageKeys.SAVED_NUMBERS);
            return true;
        } catch (error) {
            console.error('저장된 번호 삭제 실패:', error);
            return false;
        }
    }

    // 사용자 설정 저장
    saveUserSettings(settings) {
        try {
            const currentSettings = this.getUserSettings();
            const updatedSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.storageKeys.USER_SETTINGS, JSON.stringify(updatedSettings));
            return true;
        } catch (error) {
            console.error('설정 저장 실패:', error);
            return false;
        }
    }

    // 사용자 설정 조회
    getUserSettings() {
        try {
            const settings = localStorage.getItem(this.storageKeys.USER_SETTINGS);
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('설정 로드 실패:', error);
            return this.getDefaultSettings();
        }
    }

    // 기본 설정 반환
    getDefaultSettings() {
        return {
            defaultCount: 5,
            defaultRecentDraws: 10,
            avoidPastCombinations: true,
            autoLoad: true,
            showStatistics: true,
            theme: 'auto'
        };
    }

    // 마지막 업데이트 시간 저장
    setLastUpdate(timestamp = null) {
        const updateTime = timestamp || new Date().toISOString();
        try {
            localStorage.setItem(this.storageKeys.LAST_UPDATE, updateTime);
            return true;
        } catch (error) {
            console.error('업데이트 시간 저장 실패:', error);
            return false;
        }
    }

    // 마지막 업데이트 시간 조회
    getLastUpdate() {
        try {
            return localStorage.getItem(this.storageKeys.LAST_UPDATE);
        } catch (error) {
            console.error('업데이트 시간 로드 실패:', error);
            return null;
        }
    }

    // 스토리지 사용량 체크
    getStorageUsage() {
        try {
            let totalSize = 0;
            const usage = {};

            Object.values(this.storageKeys).forEach(key => {
                const value = localStorage.getItem(key);
                const size = value ? new Blob([value]).size : 0;
                usage[key] = {
                    size: size,
                    sizeKB: (size / 1024).toFixed(2)
                };
                totalSize += size;
            });

            return {
                individual: usage,
                total: {
                    size: totalSize,
                    sizeKB: (totalSize / 1024).toFixed(2),
                    sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
                }
            };
        } catch (error) {
            console.error('스토리지 사용량 확인 실패:', error);
            return null;
        }
    }

    // 데이터 내보내기 (백업)
    exportData() {
        try {
            const data = {
                savedNumbers: this.getSavedNumbers(),
                userSettings: this.getUserSettings(),
                lastUpdate: this.getLastUpdate(),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('데이터 내보내기 실패:', error);
            return null;
        }
    }

    // 데이터 가져오기 (복원)
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (data.savedNumbers) {
                this.setSavedNumbers(data.savedNumbers);
            }

            if (data.userSettings) {
                this.saveUserSettings(data.userSettings);
            }

            if (data.lastUpdate) {
                this.setLastUpdate(data.lastUpdate);
            }

            return true;
        } catch (error) {
            console.error('데이터 가져오기 실패:', error);
            return false;
        }
    }

    // 스토리지 초기화
    clearAllData() {
        try {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('데이터 초기화 실패:', error);
            return false;
        }
    }

    // 번호 조합 검증
    validateNumberSet(numbers) {
        if (!Array.isArray(numbers)) return false;
        if (numbers.length !== 6) return false;

        const uniqueNumbers = new Set(numbers);
        if (uniqueNumbers.size !== 6) return false;

        return numbers.every(num =>
            Number.isInteger(num) && num >= 1 && num <= 45
        );
    }

    // 중복 번호 조합 체크
    isDuplicateNumberSet(numbers) {
        const savedNumbers = this.getSavedNumbers();
        const numberString = numbers.slice().sort((a, b) => a - b).join(',');

        return savedNumbers.some(set =>
            set.numbers.slice().sort((a, b) => a - b).join(',') === numberString
        );
    }

    // 저장 용량 제한 체크
    isStorageLimitReached() {
        try {
            const testKey = 'storage_test';
            const testData = 'x'.repeat(1024); // 1KB 테스트

            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);

            return false;
        } catch (error) {
            return true;
        }
    }
}

// 전역 인스턴스
window.lottoStorage = new LottoStorage();