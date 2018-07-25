'use strict';

let assert = require('chai').assert;
let web3Utils = require('web3-utils');
let ethUtils = require('ethereumjs-util');
let consts = require('./consts.js');

module.exports = {

  createMsgHash: function({version, to, from, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash}) {

    const dataHash = web3Utils.soliditySha3({
      t: 'bytes', v: data
    })

    console.log(data.length);
    const callPrefix = data.length > 4 ? data.substring(0, 4) : '0x00';

    console.log(dataHash);
    console.log(callPrefix);
    return web3Utils.soliditySha3(
        { t: 'bytes', v: '0x19' },
        { t: 'bytes', v: version },
        { t: 'address', v: from }, // from
        { t: 'address', v: to },
        { t: 'uint256', v: value },
        { t: 'bytes32', v: dataHash },
        { t: 'uint256', v: nonce },
        { t: 'uint256', v: gasPrice },
        { t: 'uint256', v: gasLimit },
        { t: 'address', v: gasToken },
        { t: 'uint8', v: operationType },
        { t: 'bytes4', v: callPrefix },
        { t: 'bytes', v: extraHash }
      )
      .substring(2);
  },

  createSignedMsg: function(arryOfUserIndexes, msgHash) {

    let messageSignatures = '0x';
    for (let i = 0; i < arryOfUserIndexes.length; i++) {
      const sig = ethUtils.ecsign(
        Buffer.from(msgHash, 'hex'),
        Buffer.from(consts.PRIVATE_KEYS[arryOfUserIndexes[i]], 'hex')
      );
      messageSignatures += sig.r.toString('hex') + sig.s.toString('hex') + sig.v.toString(16)
    }

    return messageSignatures;
  },

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