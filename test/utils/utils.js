'use strict';

let assert = require('chai').assert;

module.exports = {

  createSignedMessage: ()

  assertThrows: function(promise, err) {
    return promise
      .then(function() {
        assert.isNotOk(true, err);
      })
      .catch(function(e) {
        assert.include(
          e.message,
          'invalid opcode',
          "contract didn't throw as expected"
        );
      });
  },

  assertRevert: function(promise, err) {
    return promise
      .then(function() {
        assert.isNotOk(true, err);
      })
      .catch(function(e) {
        assert.include(
          e.message,
          'revert',
          "contract didn't throw as expected"
        );
      });
  },
};