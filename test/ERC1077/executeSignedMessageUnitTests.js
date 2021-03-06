let identityWithExeSignMsg = artifacts.require('ERC1077/ExecuteSignedMessage.sol');
let utils = require('../utils/utils');
let ERC20 = artifacts.require('test/ERC20Test.sol');

let identityInstance;
let erc20Instance;

function callExecuteSigned (
  { to, from, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash, messageSignatures}, callInfo) {
  return identityInstance.executeSigned(to, from, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash, messageSignatures, callInfo);
}

function createMsgHash (
  { to, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash}) {
  return identityInstance.getMessageHash.call(to, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash)
}

async function signMessageAndCallExecuteSigned(singersIndex, param, callInfo) {
  let msgHash = await createMsgHash(param);
  param.messageSignatures = utils.createSignedMsg(singersIndex, msgHash.substring(2));
  return callExecuteSigned(param, callInfo)
}

contract('Execute Signed Message Contract (ERC1077): lastNonce, lastTimeStamp, requiredSignatures Unit Tests', function(accounts) {
  let param = {};
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new([1, 2]);

    param.to = identityInstance.address;
    param.version = 0;
    param.from = identityInstance.address;
    param.value = 1e13;
    param.data = '0x';
    param.nonce = 1;
    param.gasPrice = 1e7;
    param.gasLimit = 4e6; // 4 million
    param.gasToken = '0';
    param.operationType = 0;
    param.extraHash = '0x';

    // add account[1] and account[2] as active_keys to identity first
    const key1 = await identityInstance.addressToBytes32.call(accounts[1]);
    const key2 = await identityInstance.addressToBytes32.call(accounts[2]);
    const purposeToAdd = 2; // active Key
    const keyType =1;

    await identityInstance.addKey(key1, purposeToAdd, keyType);
    await identityInstance.addKey(key2, purposeToAdd, keyType);

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('checks that lastNonce return correct Nonce', async function() {
    let currentNonce = (await identityInstance.lastNonce.call()).toNumber();
    assert.equal(currentNonce, 0);

    param.nonce = currentNonce + 1
    let msgHash = await createMsgHash(param);

    param.messageSignatures = utils.createSignedMsg([1, 0], msgHash.substring(2));
    await callExecuteSigned(param);

    currentNonce = (await identityInstance.lastNonce.call()).toNumber();
    assert.equal(currentNonce, 1);
  });

  it('checks that lastTimestamp return correct timestamp', async function() {
    let currentNonce = (await identityInstance.lastTimestamp.call()).toNumber();
    assert.equal(currentNonce, 0);

    param.nonce = (Date.now() / 1000).toFixed(0);
    let msgHash = await createMsgHash(param);

    param.messageSignatures = utils.createSignedMsg([1, 0], msgHash.substring(2));
    await callExecuteSigned(param);

    currentNonce = (await identityInstance.lastTimestamp.call()).toNumber();
    assert.equal(currentNonce, param.nonce);
  });

  it('checks that requiredSignatures return correct amount based on inputs', async function() {
  });
});

contract('Execute Signed Message Contract (ERC1077): executeSigned Unit Test', function(accounts) {
  let param = {};
  beforeEach(async function() {
    identityInstance = await identityWithExeSignMsg.new([1, 2]);
    erc20Instance = await ERC20.new(identityInstance.address); // give identity 1e20 tokens upon creation


    param.to = accounts[9];
    param.version = 0;
    param.from = identityInstance.address;
    param.value = 1e13;
    param.data = '0x';
    param.nonce = 1;
    param.gasPrice = 1e7;
    param.gasLimit = 4e6; // 4 million
    param.gasToken = '0';
    param.operationType = 0;
    param.extraHash = '0x';

    // add account[1] and account[2] as active_keys to identity first
    const key1 = await identityInstance.addressToBytes32.call(accounts[1]);
    const key2 = await identityInstance.addressToBytes32.call(accounts[2]);
    const purposeToAdd = 2; // active Key
    const keyType =1;

    await identityInstance.addKey(key1, purposeToAdd, keyType);
    await identityInstance.addKey(key2, purposeToAdd, keyType);

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('throws if from address is not from the contract address', async function() {
    param.from = accounts[1];
    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param));

    param.from = identityInstance.address;
    await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('throws if nonce is neither lastTxnonce + 1 nor greater than time now', async function() {
    param.nonce = (await identityInstance.lastNonce.call()) + 3

    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param));

    param.nonce = (await identityInstance.lastNonce.call()) + 1;
    await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('throws if operation type is not supported', async function() {
    param.operationType = 2;
    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param));

    param.operationType = 0;
    await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('throws if gasAmount passed in is less than specified gasLimit', async function() {
    let callInfo = {gas: param.gasLimit * 0.9}
    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param, callInfo));

    callInfo = {gas: param.gasLimit * 1.1}
      // you have to pass in more gas than specified because by the time, it gets to checks, the gasLeft will be below limit
    await signMessageAndCallExecuteSigned([1, 2], param, callInfo);
  });

  it('throws if not enough valid signatures have been given', async function() {
    // signers are not key holders
    await utils.assertRevert(signMessageAndCallExecuteSigned([3, 4, 5], param));
    // only one valid key
    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 3, 4], param));
    await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('checks that signatures are not valid if msgHash is incorrect', async function() {
    let msgHash = await createMsgHash(param);
    param.messageSignatures = utils.createSignedMsg([1, 2], msgHash.substring(2));

    // change the message so that msgHash will be different
    param.value = param.value - 1;

    await utils.assertRevert(callExecuteSigned(param));

    //revert the message back and test that it works now
    param.value = param.value + 1;
    await callExecuteSigned(param);
  });

  it('throws if wallet does not have refundAmount in ETH', async function() {
      param.value = await web3.eth.getBalance(identityInstance.address);
      await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param));

      param.value = param.value * 0.9;
      await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('throws if wallet does not have refundAmount in ERC20', async function() {
    erc20Instance = await ERC20.new(accounts[0]); // wallet address will have zero tokens
    param.gasToken = erc20Instance.address;
    await utils.assertRevert(signMessageAndCallExecuteSigned([1, 2], param));

    erc20Instance = await ERC20.new(identityInstance.address); // wallet address will have 1e20 tokens
    param.gasToken = erc20Instance.address;
    await signMessageAndCallExecuteSigned([1, 2], param);
  });

  it('checks that refund amount is sent to the msg.sender properly in ETH', async function() {
    const callerGasBefore = await web3.eth.getBalance(accounts[5]);
    const callInfo = { from: accounts[5], gasPrice: 1e5 }
    await signMessageAndCallExecuteSigned([1, 2], param, callInfo);
    const callerGasAfter = await web3.eth.getBalance(accounts[5]);

    assert.isOk(callerGasAfter.sub(callerGasBefore).toNumber() > 0);
  });

  it('checks that refund amount is sent to the msg.sender properly in ERC20', async function() {
    const callerGasBefore = await erc20Instance.balanceOf(accounts[5]);
    const callInfo = { from: accounts[5], gasPrice: 1e7 }
    param.gasToken = erc20Instance.address;
    await signMessageAndCallExecuteSigned([1, 2], param, callInfo);
    const callerGasAfter = await erc20Instance.balanceOf(accounts[5]);

    assert.isOk(callerGasAfter.sub(callerGasBefore).toNumber() > 0);
  });

});

