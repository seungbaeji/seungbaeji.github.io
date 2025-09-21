/**
 * Chart.js를 이용한 차트 생성 및 관리
 */

class LottoCharts {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#4CAF50',
            warning: '#FF9800',
            danger: '#F44336',
            info: '#2196F3'
        };
    }

    // 트렌드 차트 생성
    createTrendChart(number, limit = 50) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // 기존 차트 제거
        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        const trendData = window.lottoAnalytics.getNumberTrend(number, limit);
        const labels = trendData.map(d => `${d.draw_no}회`);
        const data = trendData.map(d => d.appeared ? 1 : 0);

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `번호 ${number} 출현 여부`,
                    data: data,
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primary + '20',
                    borderWidth: 2,
                    fill: true,
                    stepped: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value === 1 ? '출현' : '미출현';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const appeared = context.parsed.y === 1;
                                return `${context.label}: ${appeared ? '출현' : '미출현'}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 상관관계 차트 생성
    createCorrelationChart(startDraw = null, endDraw = null, topPairs = 20) {
        const canvas = document.getElementById('correlationChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.correlation) {
            this.charts.correlation.destroy();
        }

        const correlationData = window.lottoAnalytics.getNumberCorrelation(startDraw, endDraw);
        const topData = correlationData.slice(0, topPairs);

        const labels = topData.map(d => `${d.number1}-${d.number2}`);
        const data = topData.map(d => d.count);

        this.charts.correlation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '함께 출현한 횟수',
                    data: data,
                    backgroundColor: this.colors.info + '80',
                    borderColor: this.colors.info,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    // 패턴 차트 생성
    createPatternChart(type, startDraw = null, endDraw = null) {
        const canvas = document.getElementById('patternChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.pattern) {
            this.charts.pattern.destroy();
        }

        let chartData, chartTitle;

        switch (type) {
            case 'consecutive':
                chartData = window.lottoAnalytics.getConsecutivePattern(startDraw, endDraw);
                chartTitle = '연속번호 패턴';
                break;
            case 'odd-even':
                chartData = window.lottoAnalytics.getOddEvenPattern(startDraw, endDraw);
                chartTitle = '홀짝 패턴';
                break;
            case 'zone':
                const zoneData = window.lottoAnalytics.getZoneDistribution(startDraw, endDraw);
                this.createZoneChart(zoneData);
                return;
            case 'sum':
                chartData = window.lottoAnalytics.getSumDistribution(startDraw, endDraw);
                chartTitle = '합계 분포';
                break;
            default:
                return;
        }

        const labels = chartData.map(d => d.pattern || d.range);
        const data = chartData.map(d => d.count);

        this.charts.pattern = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: data,
                    backgroundColor: [
                        this.colors.primary + '80',
                        this.colors.secondary + '80',
                        this.colors.success + '80',
                        this.colors.warning + '80',
                        this.colors.danger + '80',
                        this.colors.info + '80'
                    ],
                    borderColor: [
                        this.colors.primary,
                        this.colors.secondary,
                        this.colors.success,
                        this.colors.warning,
                        this.colors.danger,
                        this.colors.info
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const percentage = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = ((percentage / total) * 100).toFixed(1);
                                return `${context.label}: ${percentage}회 (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 패턴 통계 표시
        this.displayPatternStats(chartData, chartTitle);
    }

    // 구간 분포 차트 (특별 처리)
    createZoneChart(zoneAnalysis) {
        const canvas = document.getElementById('patternChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.pattern) {
            this.charts.pattern.destroy();
        }

        const { averages } = zoneAnalysis;

        this.charts.pattern = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1-15구간', '16-30구간', '31-45구간'],
                datasets: [{
                    label: '평균 출현 개수',
                    data: [averages.zone1, averages.zone2, averages.zone3],
                    backgroundColor: [
                        this.colors.primary + '80',
                        this.colors.success + '80',
                        this.colors.warning + '80'
                    ],
                    borderColor: [
                        this.colors.primary,
                        this.colors.success,
                        this.colors.warning
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 6
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });

        // 구간별 통계 표시
        const statsHtml = `
            <div class="pattern-stats">
                <h4>구간별 평균 출현 개수</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="value">${averages.zone1.toFixed(2)}</span>
                        <span class="label">1-15구간</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${averages.zone2.toFixed(2)}</span>
                        <span class="label">16-30구간</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">${averages.zone3.toFixed(2)}</span>
                        <span class="label">31-45구간</span>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('patternStats').innerHTML = statsHtml;
    }

    // 핫/콜드 차트 생성
    createHotColdChart(recentDraws = 20) {
        const canvas = document.getElementById('hotColdChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.hotCold) {
            this.charts.hotCold.destroy();
        }

        const { hot, cold } = window.lottoAnalytics.getHotColdNumbers(recentDraws);

        this.charts.hotCold = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [...hot.map(h => `${h.number}`), ...cold.map(c => `${c.number}`)],
                datasets: [{
                    label: '출현 횟수',
                    data: [...hot.map(h => h.count), ...cold.map(c => c.count)],
                    backgroundColor: [
                        ...Array(10).fill(this.colors.danger + '80'),
                        ...Array(10).fill(this.colors.info + '80')
                    ],
                    borderColor: [
                        ...Array(10).fill(this.colors.danger),
                        ...Array(10).fill(this.colors.info)
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const isHot = context.dataIndex < 10;
                                const type = isHot ? 'HOT' : 'COLD';
                                return `${type} - ${context.parsed.y}회 출현`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 패턴 통계 표시
    displayPatternStats(data, title) {
        const total = data.reduce((sum, item) => sum + item.count, 0);

        const statsHtml = `
            <div class="pattern-stats">
                <h4>${title} 분석 결과</h4>
                <div class="stats-grid">
                    ${data.map(item => `
                        <div class="stat-item">
                            <span class="value">${item.count}</span>
                            <span class="label">${item.pattern || item.range}</span>
                            <span class="percentage">${((item.count / total) * 100).toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('patternStats').innerHTML = statsHtml;
    }

    // 차트 제거
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }

    // 모든 차트 제거
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartName => {
            this.destroyChart(chartName);
        });
    }
}

// 전역 인스턴스
window.lottoCharts = new LottoCharts();