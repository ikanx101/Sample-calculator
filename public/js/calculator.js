(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SampleSizeCalculator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tabel z-score untuk setiap tingkat kepercayaan.
  // Dropdown di UI dibuat otomatis dari key-key di objek ini.
  var Z_SCORES = {
    90: 1.645,
    95: 1.96,
    99: 2.576
  };

  function getZScore(confidenceLevel) {
    var z = Z_SCORES[confidenceLevel];
    if (z === undefined) {
      throw new Error('Tingkat kepercayaan tidak didukung: ' + confidenceLevel);
    }
    return z;
  }

  function validateInputs(input) {
    var errors = [];
    if (!(input.marginOfError > 0 && input.marginOfError < 1)) {
      errors.push('Margin of error harus di antara 0% dan 100% (eksklusif).');
    }
    if (!(input.responseDistribution > 0 && input.responseDistribution < 1)) {
      errors.push('Distribusi respons (p) harus di antara 0% dan 100% (eksklusif).');
    }
    if (input.populationMode === 'known') {
      if (!(Number.isFinite(input.populationSize) && input.populationSize > 0)) {
        errors.push('Jumlah populasi (N) harus lebih besar dari 0.');
      }
    }
    if (Z_SCORES[input.confidenceLevel] === undefined) {
      errors.push('Tingkat kepercayaan tidak dikenali.');
    }
    return errors;
  }

  /**
   * @param {Object} input
   * @param {number} input.marginOfError        - e, sebagai pecahan (0.05 = 5%)
   * @param {number} input.confidenceLevel      - salah satu key di Z_SCORES, misal 95
   * @param {number} input.responseDistribution - p, sebagai pecahan (0.5 = 50%)
   * @param {'known'|'unknown'} input.populationMode
   * @param {number} [input.populationSize]     - N, wajib jika populationMode === 'known'
   * @returns {{ n: number|null, nRaw: number|null, nUnadjusted: number|null, z: number|null, errors: string[] }}
   */
  function calculateSampleSize(input) {
    var errors = validateInputs(input);
    if (errors.length) {
      return { n: null, nRaw: null, nUnadjusted: null, z: null, errors: errors };
    }

    var z = getZScore(input.confidenceLevel);
    var p = input.responseDistribution;
    var e = input.marginOfError;

    // Rumus dasar untuk populasi tak terhingga/tidak diketahui
    var nUnadjusted = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(e, 2);

    var nRaw = nUnadjusted;
    if (input.populationMode === 'known') {
      var N = input.populationSize;
      // Koreksi populasi terhingga (finite population correction)
      nRaw = nUnadjusted / (1 + ((nUnadjusted - 1) / N));
    }

    return {
      n: Math.ceil(nRaw),
      nRaw: nRaw,
      nUnadjusted: nUnadjusted,
      z: z,
      errors: []
    };
  }

  return {
    Z_SCORES: Z_SCORES,
    getZScore: getZScore,
    calculateSampleSize: calculateSampleSize,
    validateInputs: validateInputs
  };
});
