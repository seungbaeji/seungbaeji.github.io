/**
 * 로또 분석 및 통계 기능
 * Python database.py의 분석 기능들을 JavaScript로 변환
 */

class LottoAnalytics {
  constructor(lottoGenerator) {
    this.generator = lottoGenerator;
  }

  // 번호별 출현 빈도 분석
  getNumberFrequency(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const frequency = {};

    // 1-45 번호 초기화
    for (let i = 1; i <= 45; i++) {
      frequency[i] = 0;
    }

    draws.forEach((draw) => {
      draw.numbers.forEach((num) => {
        frequency[num]++;
      });
    });

    // 정렬된 결과 반환
    return Object.entries(frequency)
      .map(([number, count]) => ({
        number: parseInt(number),
        count: count,
        percentage: draws.length > 0 ? (count / draws.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // 번호 쌍 상관관계 분석
  getNumberCorrelation(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const pairCount = {};

    draws.forEach((draw) => {
      const numbers = draw.numbers.sort((a, b) => a - b);

      // 모든 번호 쌍에 대해 카운트
      for (let i = 0; i < numbers.length - 1; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = `${numbers[i]}-${numbers[j]}`;
          pairCount[pair] = (pairCount[pair] || 0) + 1;
        }
      }
    });

    return Object.entries(pairCount)
      .map(([pair, count]) => {
        const [num1, num2] = pair.split('-').map((n) => parseInt(n));
        return {
          number1: num1,
          number2: num2,
          count: count,
          percentage: draws.length > 0 ? (count / draws.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // 연속번호 패턴 분석
  getConsecutivePattern(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const patterns = {
      '0개': 0,
      '1개': 0,
      '2개': 0,
      '3개': 0,
      '4개+': 0,
    };

    draws.forEach((draw) => {
      const numbers = draw.numbers.sort((a, b) => a - b);
      let consecutiveCount = 0;
      let maxConsecutive = 0;
      let currentConsecutive = 1;

      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === numbers[i - 1] + 1) {
          currentConsecutive++;
        } else {
          if (currentConsecutive >= 2) {
            consecutiveCount += currentConsecutive - 1;
          }
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          currentConsecutive = 1;
        }
      }

      if (currentConsecutive >= 2) {
        consecutiveCount += currentConsecutive - 1;
      }
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);

      const key =
        consecutiveCount === 0
          ? '0개'
          : consecutiveCount === 1
          ? '1개'
          : consecutiveCount === 2
          ? '2개'
          : consecutiveCount === 3
          ? '3개'
          : '4개+';
      patterns[key]++;
    });

    return Object.entries(patterns).map(([pattern, count]) => ({
      pattern,
      count,
      percentage: draws.length > 0 ? (count / draws.length) * 100 : 0,
    }));
  }

  // 홀짝 패턴 분석
  getOddEvenPattern(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const patterns = {};

    draws.forEach((draw) => {
      const oddCount = draw.numbers.filter((num) => num % 2 === 1).length;
      const evenCount = 6 - oddCount;
      const pattern = `홀${oddCount}짝${evenCount}`;
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });

    return Object.entries(patterns)
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: draws.length > 0 ? (count / draws.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // 구간 분포 분석 (1-15, 16-30, 31-45)
  getZoneDistribution(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const zoneData = [];

    draws.forEach((draw) => {
      const zones = { zone1: 0, zone2: 0, zone3: 0 };

      draw.numbers.forEach((num) => {
        if (num <= 15) zones.zone1++;
        else if (num <= 30) zones.zone2++;
        else zones.zone3++;
      });

      zoneData.push({
        draw_no: draw.draw_no,
        zone1: zones.zone1,
        zone2: zones.zone2,
        zone3: zones.zone3,
      });
    });

    // 구간별 평균 계산
    const averages = {
      zone1: zoneData.reduce((sum, d) => sum + d.zone1, 0) / zoneData.length,
      zone2: zoneData.reduce((sum, d) => sum + d.zone2, 0) / zoneData.length,
      zone3: zoneData.reduce((sum, d) => sum + d.zone3, 0) / zoneData.length,
    };

    return { zoneData, averages };
  }

  // 합계 분포 분석
  getSumDistribution(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);
    const sumCounts = {};

    draws.forEach((draw) => {
      const sum = draw.numbers.reduce((a, b) => a + b, 0);
      const range = this.getSumRange(sum);
      sumCounts[range] = (sumCounts[range] || 0) + 1;
    });

    return Object.entries(sumCounts)
      .map(([range, count]) => ({
        range,
        count,
        percentage: draws.length > 0 ? (count / draws.length) * 100 : 0,
      }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split('-')[0]);
        const bStart = parseInt(b.range.split('-')[0]);
        return aStart - bStart;
      });
  }

  getSumRange(sum) {
    if (sum < 100) return '~99';
    if (sum < 120) return '100-119';
    if (sum < 140) return '120-139';
    if (sum < 160) return '140-159';
    if (sum < 180) return '160-179';
    if (sum < 200) return '180-199';
    return '200~';
  }

  // 핫/콜드 번호 분석
  getHotColdNumbers(recentDraws = 20) {
    const draws = this.generator.lottoData.draws.slice(-recentDraws);
    const frequency = this.getNumberFrequency(draws[0]?.draw_no, draws[draws.length - 1]?.draw_no);

    const sorted = frequency.sort((a, b) => b.count - a.count);
    const hot = sorted.slice(0, 10);
    const cold = sorted.slice(-10).reverse();

    return { hot, cold, recentDraws, totalDraws: draws.length };
  }

  // 특정 번호의 출현 추이
  getNumberTrend(number, recentDraws = 50) {
    const draws = this.generator.lottoData.draws.slice(-recentDraws);
    const trend = [];

    draws.forEach((draw) => {
      trend.push({
        draw_no: draw.draw_no,
        draw_date: draw.draw_date,
        appeared: draw.numbers.includes(number),
      });
    });

    return trend;
  }

  // 범위 내 추첨 데이터 가져오기
  getDrawsInRange(startDraw = null, endDraw = null) {
    if (!this.generator.lottoData) return [];

    let draws = this.generator.lottoData.draws;

    if (startDraw !== null) {
      draws = draws.filter((draw) => draw.draw_no >= startDraw);
    }

    if (endDraw !== null) {
      draws = draws.filter((draw) => draw.draw_no <= endDraw);
    }

    return draws;
  }

  // 기본 통계 정보
  getBasicStatistics(startDraw = null, endDraw = null) {
    const draws = this.getDrawsInRange(startDraw, endDraw);

    if (draws.length === 0) {
      return null;
    }

    const totalSales = draws.reduce((sum, draw) => sum + (draw.total_sales_amount || 0), 0);
    const totalPrize = draws.reduce((sum, draw) => sum + (draw.first_prize_amount || 0), 0);
    const totalWinners = draws.reduce((sum, draw) => sum + (draw.first_prize_winners || 0), 0);

    return {
      totalDraws: draws.length,
      startDraw: Math.min(...draws.map((d) => d.draw_no)),
      endDraw: Math.max(...draws.map((d) => d.draw_no)),
      totalSales: totalSales,
      averageSales: Math.round(totalSales / draws.length),
      totalPrize: totalPrize,
      averagePrize: Math.round(totalPrize / draws.length),
      totalWinners: totalWinners,
      averageWinners: Math.round(totalWinners / draws.length),
    };
  }

  // 번호 조합 중복 검사
  checkCombinationExists(numbers) {
    const combination = numbers
      .slice()
      .sort((a, b) => a - b)
      .join(',');
    return this.generator.pastCombinations.has(combination);
  }
}

// 전역 인스턴스 생성
window.lottoAnalytics = null;

// 데이터 로드 후 analytics 인스턴스 생성
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.lottoGenerator.loadData();
    window.lottoAnalytics = new LottoAnalytics(window.lottoGenerator);
    console.log('Analytics 모듈이 초기화되었습니다.');
  } catch (error) {
    console.error('Analytics 초기화 실패:', error);
  }
});
