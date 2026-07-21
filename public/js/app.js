(function () {
  'use strict';

  var calc = window.SampleSizeCalculator;

  var els = {
    modeUnknown: document.getElementById('population-mode-unknown'),
    modeKnown: document.getElementById('population-mode-known'),
    populationWrap: document.getElementById('population-size-wrap'),
    populationSize: document.getElementById('population-size'),
    marginOfError: document.getElementById('margin-of-error'),
    confidenceLevel: document.getElementById('confidence-level'),
    responseDistribution: document.getElementById('response-distribution'),
    errorBox: document.getElementById('error-box'),
    resultNumber: document.getElementById('result-number'),
    resultDetail: document.getElementById('result-detail'),
    resultPopulationRatio: document.getElementById('result-population-ratio'),
    chartABlock: document.getElementById('chart-a-block'),
    chartPopulationCanvas: document.getElementById('chart-population'),
    chartSensitivityCanvas: document.getElementById('chart-sensitivity')
  };

  var numberFormat = new Intl.NumberFormat('id-ID');

  function populateConfidenceLevels() {
    var levels = Object.keys(calc.Z_SCORES).map(Number).sort(function (a, b) { return a - b; });
    els.confidenceLevel.innerHTML = '';
    levels.forEach(function (level) {
      var option = document.createElement('option');
      option.value = String(level);
      option.textContent = level + '%';
      if (level === 90) {
        option.selected = true;
      }
      els.confidenceLevel.appendChild(option);
    });
  }

  function readInputs() {
    var populationMode = els.modeKnown.checked ? 'known' : 'unknown';
    return {
      populationMode: populationMode,
      populationSize: parseFloat(els.populationSize.value),
      marginOfError: parseFloat(els.marginOfError.value) / 100,
      confidenceLevel: parseFloat(els.confidenceLevel.value),
      responseDistribution: parseFloat(els.responseDistribution.value) / 100
    };
  }

  function updatePopulationFieldVisibility() {
    els.populationWrap.classList.toggle('hidden', !els.modeKnown.checked);
  }

  var populationChart = null;
  var sensitivityChart = null;

  function renderPopulationChart(input, result) {
    if (input.populationMode !== 'known') {
      els.chartABlock.classList.add('hidden');
      return;
    }
    els.chartABlock.classList.remove('hidden');

    var n = result.n;
    var N = input.populationSize;
    var remaining = Math.max(N - n, 0);

    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var track = style.getPropertyValue('--track').trim();

    var data = {
      labels: ['Populasi'],
      datasets: [
        {
          label: 'Sampel dibutuhkan',
          data: [n],
          backgroundColor: accent,
          stack: 'total'
        },
        {
          label: 'Sisa populasi',
          data: [remaining],
          backgroundColor: track,
          stack: 'total'
        }
      ]
    };

    if (populationChart) {
      populationChart.data = data;
      populationChart.update();
      return;
    }

    populationChart = new Chart(els.chartPopulationCanvas, {
      type: 'bar',
      data: data,
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, beginAtZero: true },
          y: { stacked: true, display: false }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + numberFormat.format(ctx.parsed.x);
              }
            }
          }
        }
      }
    });
  }

  function renderSensitivityChart(input) {
    var eSteps = [];
    for (var e = 1; e <= 15; e += 0.5) {
      eSteps.push(e);
    }

    var values = eSteps.map(function (ePercent) {
      var r = calc.calculateSampleSize({
        populationMode: input.populationMode,
        populationSize: input.populationSize,
        marginOfError: ePercent / 100,
        confidenceLevel: input.confidenceLevel,
        responseDistribution: input.responseDistribution
      });
      return r.errors.length ? null : r.n;
    });

    var currentEPercent = input.marginOfError * 100;
    var closestIndex = eSteps.reduce(function (best, val, idx) {
      return Math.abs(val - currentEPercent) < Math.abs(eSteps[best] - currentEPercent) ? idx : best;
    }, 0);

    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var border = style.getPropertyValue('--border').trim();

    var pointRadii = eSteps.map(function (_, idx) { return idx === closestIndex ? 6 : 0; });
    var pointColors = eSteps.map(function (_, idx) { return idx === closestIndex ? accent : accent; });

    var data = {
      labels: eSteps.map(function (v) { return v + '%'; }),
      datasets: [
        {
          label: 'Ukuran sampel (n)',
          data: values,
          borderColor: accent,
          backgroundColor: accent,
          pointRadius: pointRadii,
          pointBackgroundColor: pointColors,
          borderWidth: 2,
          tension: 0.25,
          fill: false
        }
      ]
    };

    if (sensitivityChart) {
      sensitivityChart.data = data;
      sensitivityChart.update();
      return;
    }

    sensitivityChart = new Chart(els.chartSensitivityCanvas, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Margin of error (%)' },
            grid: { color: border }
          },
          y: {
            title: { display: true, text: 'Ukuran sampel (n)' },
            beginAtZero: true,
            grid: { color: border }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return 'n = ' + numberFormat.format(ctx.parsed.y);
              }
            }
          }
        }
      }
    });
  }

  function recalculate() {
    var input = readInputs();
    var result = calc.calculateSampleSize(input);

    if (result.errors.length) {
      els.errorBox.textContent = result.errors.join(' ');
      els.errorBox.classList.remove('hidden');
      els.resultNumber.textContent = '–';
      els.resultDetail.textContent = '';
      els.resultPopulationRatio.textContent = '';
      return;
    }

    els.errorBox.classList.add('hidden');
    els.resultNumber.textContent = numberFormat.format(result.n);
    els.resultDetail.textContent =
      'Dibulatkan ke atas dari ' + result.nRaw.toFixed(2) + ' (Z = ' + result.z + ')';

    if (input.populationMode === 'known') {
      var ratio = (result.n / input.populationSize) * 100;
      els.resultPopulationRatio.textContent =
        'Setara dengan ' + ratio.toFixed(1) + '% dari total populasi (' +
        numberFormat.format(input.populationSize) + ' orang/unit).';
    } else {
      els.resultPopulationRatio.textContent = '';
    }

    renderPopulationChart(input, result);
    renderSensitivityChart(input);
  }

  function init() {
    populateConfidenceLevels();
    updatePopulationFieldVisibility();

    [els.modeUnknown, els.modeKnown].forEach(function (el) {
      el.addEventListener('change', function () {
        updatePopulationFieldVisibility();
        recalculate();
      });
    });

    [els.populationSize, els.marginOfError, els.confidenceLevel, els.responseDistribution]
      .forEach(function (el) {
        el.addEventListener('input', recalculate);
        el.addEventListener('change', recalculate);
      });

    recalculate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
