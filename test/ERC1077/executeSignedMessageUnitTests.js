let identityWithExeSignMsg = artifacts.require('ERC1077/ExecuteSignedMessage.sol');
let utils = require('../utils/utils');

let identityInstance;

contract('Execute Signed Message Contract (ERC1077): lastNonce Unit Test', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {
  });
});

contract('Execute Signed Message Contract (ERC1077): lastTimestamp Unit Test', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {

  });
});

contract('Execute Signed Message Contract (ERC1077): requiredSignatures Unit Test', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {

  });
});

contract('Execute Signed Message Contract (ERC1077): gasEstimate Unit Test', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {
  });
});

contract('Execute Signed Message Contract (ERC1077): executeSigned Unit Test', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {

  });
});

