'use strict';

let config = require('./config'),
    math = require('./math');

function mustBeNumber(v) {
    if (isNaN(v))
        throw new Error('Must be a number, not NaN');
    
    return new config.Number(v);
}

/**
 * Create an UncertainNumber.
 *
 * @param {(Number|string})} value - The value.
 * @param {(Number|string})} [uncertainty=0] - The uncertainty.
 */
function UncertainNumber(value, uncertainty) {
    this.value = mustBeNumber(value);
    this.uncertainty = mustBeNumber(uncertainty || 0);
}

/**
 * Returns true if the uncertainty is zero.
 */
UncertainNumber.prototype.isExact = function() {
    return this.uncertainty.eq(0);
};

/*
 * Various ways of propagating uncertainty.
 */

function additiveUncertainty(fn, a, b) {
    let A = a.value,
        B = b.value || b,
        R = A[fn](B),
        uA = a.uncertainty,
        uB = b.uncertainty || 0,
        uR = uA.pow(2).plus(uB.pow(2)).sqrt();
    return new UncertainNumber(R, uR);
}

function multiplicativeUncertainty(fn, a, b) {
    let A = a.value,
        B = b.value || b,
        R = A[fn](B),
        uA = a.uncertainty,
        uB = b.uncertainty || 0,
        uR = uB.eq(0)
            ? uA.times(B.abs())
            : uA.dividedBy(A).pow(2).plus(uB.dividedBy(B).pow(2)).sqrt().times(R.abs());
    return new UncertainNumber(R, uR);
}

function polynomialUncertainty(fn, a, b) {
    let A = a.value,
        B = b.value || b,
        R = A[fn](B),
        uA = a.uncertainty,
        //uB = b.uncertainty || 0,
        uR = B.abs().times(uA.dividedBy(A.abs())).times(R.abs());
    
    return new UncertainNumber(R, uR);
}

/*
 * Arithmetic functions that propagate uncertainity.
 */

UncertainNumber.prototype.plus = function(other) { return additiveUncertainty('plus', this, other); };
UncertainNumber.prototype.minus = function(other) { return additiveUncertainty('minus', this, other); };
UncertainNumber.prototype.times = function(other) { return multiplicativeUncertainty('times', this, other); };
UncertainNumber.prototype.dividedBy = function(other) { return multiplicativeUncertainty('dividedBy', this, other); };
UncertainNumber.prototype.pow = function(other) {
    let n = (other.value || other).toNumber();
    return polynomialUncertainty('pow', this, n);
};
UncertainNumber.prototype.abs = function() {return new UncertainNumber(this.value.abs(), this.uncertainty); };
UncertainNumber.prototype.sqrt = function() { return polynomialUncertainty('sqrt', this, 0.5); };

/*
 * Some standard Object methods.
 */

/**
 * Returns the value as javascript number, if it is exact.  Otherwise, throws.
 */
UncertainNumber.prototype.toNumber = function() {
    if (this.isExact())
        return this.value.toNumber();

    throw new Error('An uncertain number can not be transformed into a javascript number');
};

UncertainNumber.prototype.toString = function() {
    if (this.isExact())
        return this.value.toString();
    
    return this.value + ' ± ' + this.uncertainty;
};

/*
 * Comparision
 */
UncertainNumber.prototype.cmp = function(other) {
    let D = this.minus(other);
    if (D.value.abs().lte(D.uncertainty))
        return 0;
    return D.value.cmp(0);
};

/*
 * Get standard math functions.
 */
math.applyNames(UncertainNumber);

/*
 * Exports the constructor for an UncertainNumber.
 */
module.exports = UncertainNumber;
