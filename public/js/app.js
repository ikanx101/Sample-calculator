(function () {
  'use strict';

  var calc = window.SampleSizeCalculator;

  var els = {
    modeUnknown: document.getElementById('population-mode-unknown'),
    modeKnown: document.getElementById('population-mode-known'),
    populationWrap: document.getElementById('population-size-wrap'),
    populationSize: document.getElementById('population-size'),
    marginOfError: document.getElementById('margin-of-error'),
    marginOfErrorRange: document.getElementById('margin-of-error-range'),
    confidenceLevelGroup: document.getElementById('confidence-level'),
    responseDistribution: document.getElementById('response-distribution'),
    responseDistributionRange: document.getElementById('response-distribution-range'),
    errorBox: document.getElementById('error-box'),
    resultNumber: document.getElementById('result-number'),
    resultDetail: document.getElementById('result-detail'),
    chartABlock: document.getElementById('chart-a-block'),
    meterFill: document.getElementById('meter-fill'),
    meterCaption: document.getElementById('meter-caption'),
    chartSensitivityCanvas: document.getElementById('chart-sensitivity')
  };

  var numberFormat = new Intl.NumberFormat('id-ID');
  var rootStyle = getComputedStyle(document.documentElement);

  function cssVar(name) {
    return rootStyle.getPropertyValue(name).trim();
  }

  function hexToRgba(hex, alpha) {
    var m = hex.replace('#', '');
    var r = parseInt(m.substring(0, 2), 16);
    var g = parseInt(m.substring(2, 4), 16);
    var b = parseInt(m.substring(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function populateConfidenceLevels() {
    var levels = Object.keys(calc.Z_SCORES).map(Number).sort(function (a, b) { return a - b; });
    els.confidenceLevelGroup.innerHTML = '';
    levels.forEach(function (level) {
      var label = document.createElement('label');
      label.className = 'segment';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'confidence-level';
      input.value = String(level);
      if (level === 90) {
        input.checked = true;
      }

      var span = document.createElement('span');
      span.textContent = level + '%';

      label.appendChild(input);
      label.appendChild(span);
      els.confidenceLevelGroup.appendChild(label);

      input.addEventListener('change', recalculate);
    });
  }

  function getConfidenceLevel() {
    var checked = els.confidenceLevelGroup.querySelector('input:checked');
    return checked ? parseFloat(checked.value) : 90;
  }

  function syncPair(numberInput, rangeInput) {
    numberInput.addEventListener('input', function () {
      rangeInput.value = numberInput.value;
      recalculate();
    });
    rangeInput.addEventListener('input', function () {
      numberInput.value = rangeInput.value;
      recalculate();
    });
  }

  function readInputs() {
    var populationMode = els.modeKnown.checked ? 'known' : 'unknown';
    return {
      populationMode: populationMode,
      populationSize: parseFloat(els.populationSize.value),
      marginOfError: parseFloat(els.marginOfError.value) / 100,
      confidenceLevel: getConfidenceLevel(),
      responseDistribution: parseFloat(els.responseDistribution.value) / 100
    };
  }

  function updatePopulationFieldVisibility() {
    els.populationWrap.classList.toggle('hidden', !els.modeKnown.checked);
  }

  function renderMeter(input, result) {
    if (input.populationMode !== 'known') {
      els.chartABlock.classList.add('hidden');
      return;
    }
    els.chartABlock.classList.remove('hidden');

    var n = result.n;
    var N = input.populationSize;
    var pct = N > 0 ? Math.min((n / N) * 100, 100) : 0;

    els.meterFill.style.width = pct.toFixed(1) + '%';
    els.meterCaption.innerHTML =
      '<strong>' + numberFormat.format(n) + '</strong> dari ' +
      numberFormat.format(N) + ' populasi (' + pct.toFixed(1) + '%)';
  }

  var sensitivityChart = null;
  var currentHighlightLabel = '';

  var highlightLabelPlugin = {
    id: 'highlightLabel',
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta(0);
      var idx = chart.$highlightIndex;
      if (idx === undefined || idx === null || !meta.data[idx] || !currentHighlightLabel) {
        return;
      }
      var point = meta.data[idx];
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = cssVar('--ink');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(currentHighlightLabel, point.x, point.y - 12);
      ctx.restore();
    }
  };

  function renderSensitivityChart(input) {
    var eSteps = [];
    for (var e = 1; e <= 20; e += 0.5) {
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

    currentHighlightLabel = values[closestIndex] !== null ? 'n = ' + numberFormat.format(values[closestIndex]) : '';

    var accent = cssVar('--accent');
    var gridline = cssVar('--gridline');
    var muted = cssVar('--ink-muted');
    var surface = cssVar('--surface');

    var pointRadii = eSteps.map(function (_, idx) { return idx === closestIndex ? 5 : 0; });
    var pointHoverRadii = eSteps.map(function () { return 5; });

    var data = {
      labels: eSteps.map(function (v) { return v + '%'; }),
      datasets: [
        {
          label: 'Ukuran sampel (n)',
          data: values,
          borderColor: accent,
          backgroundColor: hexToRgba(accent, 0.1),
          pointRadius: pointRadii,
          pointHoverRadius: pointHoverRadii,
          pointBackgroundColor: accent,
          pointBorderColor: surface,
          pointBorderWidth: 2,
          borderWidth: 2,
          tension: 0.25,
          fill: true
        }
      ]
    };

    if (sensitivityChart) {
      sensitivityChart.data = data;
      sensitivityChart.$highlightIndex = closestIndex;
      sensitivityChart.update();
      return;
    }

    sensitivityChart = new Chart(els.chartSensitivityCanvas, {
      type: 'line',
      data: data,
      plugins: [highlightLabelPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } },
        scales: {
          x: {
            title: { display: true, text: 'Margin of error (%)', color: muted, font: { size: 11 } },
            ticks: { color: muted, maxRotation: 0, autoSkip: true, font: { size: 10 } },
            grid: { display: false },
            border: { color: gridline }
          },
          y: {
            title: { display: true, text: 'Ukuran sampel (n)', color: muted, font: { size: 11 } },
            ticks: { color: muted, font: { size: 10 } },
            beginAtZero: true,
            grid: { color: gridline },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: function (items) { return 'Margin of error: ' + items[0].label; },
              label: function (ctx) {
                return 'n = ' + numberFormat.format(ctx.parsed.y);
              }
            }
          }
        }
      }
    });
    sensitivityChart.$highlightIndex = closestIndex;
    sensitivityChart.update();
  }

  function recalculate() {
    var input = readInputs();
    var result = calc.calculateSampleSize(input);

    if (result.errors.length) {
      els.errorBox.textContent = result.errors.join(' ');
      els.errorBox.classList.remove('hidden');
      els.resultNumber.textContent = '–';
      els.resultDetail.textContent = '';
      return;
    }

    els.errorBox.classList.add('hidden');
    els.resultNumber.textContent = numberFormat.format(result.n);
    els.resultDetail.textContent =
      'Dibulatkan ke atas dari ' + result.nRaw.toFixed(2) + ' (Z = ' + result.z + ')';

    renderMeter(input, result);
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

    els.populationSize.addEventListener('input', recalculate);
    syncPair(els.marginOfError, els.marginOfErrorRange);
    syncPair(els.responseDistribution, els.responseDistributionRange);

    recalculate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
