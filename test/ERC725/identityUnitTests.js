let identity = artifacts.require('ERC725/identity.sol');
let utils = require('../utils/utils');

let identityInstance;

contract('Identity Contract (ERC725)', function(accounts) {
  beforeEach(async function() {
    identityInstance = await identity.new();

    await web3.eth.sendTransaction({to: identityInstance.address, from: accounts[9], value: 1e17})
  });

  it('getKey: returns right key based on the key', async function() {
    const keyToCheck = await identityInstance.addressToBytes32.call(accounts[0])
    const key = await identityInstance.getKey.call(keyToCheck);
    const purposes = key && key[0];
    const keyType = key && key[1].toNumber();
    const keyValue = key && key[2];

    assert.equal(purposes.length, 1);
    assert.equal(purposes[0].toNumber(), 1);
    assert.equal(keyType, 1);
    assert.equal(keyValue, keyToCheck);
  });

  it('getKey: returns proper error if key does not exist', async function() {
    const keyToCheck = await identityInstance.addressToBytes32.call(accounts[1])
    const key = await identityInstance.getKey.call(keyToCheck);
    const purposes = key && key[0];
    const keyType = key && key[1].toNumber();
    const keyValue = key && key[2];

    assert.equal(purposes.length, 0);
    assert.equal(keyType, 0);
    assert.equal(keyValue, keyToCheck);
  });

  it('keyHasPurpose: return true if key does have the purpose', async function() {
    const keyToCheck = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToCheck = 1;
    const keyHasPurpose = await identityInstance.keyHasPurpose.call(keyToCheck, purposeToCheck);

    assert.isOk(keyHasPurpose);
  });

  it('keyHasPurpose: return false if key does not have the purpose', async function() {
    const keyToCheck = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToCheck = 2;
    let keyHasPurpose = await identityInstance.keyHasPurpose.call(keyToCheck, purposeToCheck);

    assert.isNotOk(keyHasPurpose);
  });

  it('getKeyByPurpose: return correct keys', async function() {
    const expectedKey = await identityInstance.addressToBytes32.call(accounts[0])

    const purposeToCheck = 1;
    let keysByPurpose = await identityInstance.getKeysByPurpose.call(purposeToCheck);
    assert.equal(keysByPurpose.length, 1);
    assert.equal(keysByPurpose[0], expectedKey);

    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 1;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType);

    keysByPurpose = await identityInstance.getKeysByPurpose.call(purposeToCheck);
    assert.equal(keysByPurpose.length, 2);
    assert.equal(keysByPurpose[0], expectedKey);
    assert.equal(keysByPurpose[1], keyToAdd);
  });

  it('addKey: checks that the key is added properly', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const keyBefore = await identityInstance.getKey.call(keyToAdd);
    const purposeToAdd = 2;
    const keyType = 2;
    // check that the current key has one purpose
    assert.equal(keyBefore[0].length, 0);
    assert.equal(keyBefore[1].toNumber(), 0);

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType);

    const keyAfter = await identityInstance.getKey.call(keyToAdd);
    assert.equal(keyAfter[0].length, 1);
    assert.equal(keyAfter[1].toNumber(), keyType);
  });

  it('addKey: check that purpose is added correctly if key already exists', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const keyBefore = await identityInstance.getKey.call(keyToAdd);
    const purposeToAdd = 2;
    const keyType = 1;
    // check that the current key has one purpose
    assert.equal(keyBefore[0].length, 1);
    assert.equal(keyBefore[0][0].toNumber(), 1);

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType);

    const keyAfter = await identityInstance.getKey.call(keyToAdd);
    assert.equal(keyAfter[0].length, 2);
    assert.equal(keyAfter[0][0].toNumber(), 1);
    assert.equal(keyAfter[0][1].toNumber(), 2);
  });

  it('addKey: revert if key and purpose already exists', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    let purposeToAdd = 1;
    const keyType = 1;

    await utils.assertRevert(identityInstance.addKey(keyToAdd, purposeToAdd, keyType));
    // test to make sure when purpose is changed, it works now
    purposeToAdd = 2;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)
  });

  it('addKey: revert if not called from the management Key', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    let purposeToAdd = 2;
    const keyType = 1;

    await utils.assertRevert(identityInstance.addKey(keyToAdd, purposeToAdd, keyType, {from: accounts[1]}));

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType, {from: accounts[0]});
  });

  it('addKey: revert if key exists and keyType does not match up', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToAdd = 2;
    let keyType = 3;

    await utils.assertRevert(identityInstance.addKey(keyToAdd, purposeToAdd, keyType));
    // test to make sure when keyType is changed, it works now
    keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)
  });

  it('addKey: checks that keyAdded event is fired', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToAdd = 2;
    const keyType = 1;

    const res = await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    assert.equal(res.logs.length, 1);
    assert.equal(res.logs[0].event, 'KeyAdded');
  });

  it('removeKey: checks that only the correct purpose is removed if there are multiple', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToAdd = 2;
    const keyType = 1;

    // add a purpose first
    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const keyBefore = await identityInstance.getKey.call(keyToAdd)

    // check to make sure it contain 2 purposes
    assert.equal(keyBefore[0].length, 2)

    await identityInstance.removeKey(keyToAdd, purposeToAdd)
    const keyAfter = await identityInstance.getKey.call(keyToAdd)

    assert.equal(keyAfter[0].length, 1)
    assert.notEqual(keyAfter[0][0].toNumber(), 2) // make sure the remaining purpose is not 2
  });

  it('removeKey: checks that if key only have one one purpose, the whole key is removed (including keyType)', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 1;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const keyBefore = await identityInstance.getKey.call(keyToAdd)

    // check to make sure it contain only 1 purpose
    assert.equal(keyBefore[0].length, 1)

    await identityInstance.removeKey(keyToAdd, purposeToAdd)

    const keyAfter = await identityInstance.getKey.call(keyToAdd)

    assert.equal(keyAfter[0].length, 0)
    assert.equal(keyAfter[1].toNumber(), 0) // make sure key type is 0
  });

  it('removeKey: throws if purpose does not exists', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToAdd = 2;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const keyToRemove = await identityInstance.addressToBytes32.call(accounts[0])
    let purposeToRemove = 3;

    await utils.assertRevert(identityInstance.removeKey(keyToRemove, purposeToRemove));

    purposeToRemove = 2;
    await identityInstance.removeKey(keyToRemove, purposeToRemove);
  });

  it('removeKey: throws to prevent last key from being removed', async function() {
    const keyToRemove = await identityInstance.addressToBytes32.call(accounts[0])
    let purposeToRemove = 1;

    await utils.assertRevert(identityInstance.removeKey(keyToRemove, purposeToRemove));
  });

  it('removeKey: checks that keyRemoved event is fired', async function() {
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[0])
    const purposeToAdd = 2;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const keyToRemove = await identityInstance.addressToBytes32.call(accounts[0])
    let purposeToRemove = 2;

    const res = await identityInstance.removeKey(keyToRemove, purposeToRemove);
    assert.equal(res.logs.length, 1);
    assert.equal(res.logs[0].event, 'KeyRemoved');
  });

  it('execute: checks that transaction is added correctly', async function() {
    // add a non-actionable key first
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 3;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});
    const tx = await identityInstance.transactions.call(1);

    assert.equal(tx[0], destinationToSend); // to
    assert.equal(tx[1], valueToSend); // value
    assert.equal(tx[2], callDataToSend); // data
    assert.equal(tx[3], false); // approved
    assert.equal(tx[4], false); // executed
  });

  it('execute: checks that approve function is called if called from actionable keys', async function() {
    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend);
    const tx = await identityInstance.transactions.call(1);

    assert.equal(tx[0], destinationToSend); // to
    assert.equal(tx[1], valueToSend); // value
    assert.equal(tx[2], callDataToSend); // data
    assert.equal(tx[3], true); // approved
    assert.equal(tx[4], true); // executed
  });

  it('execute: checks that executionRequested event is fired', async function() {
    // add a non-actionable key first
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 3;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    const res = await identityInstance.execute(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});

    assert.equal(res.logs.length, 1);
    assert.equal(res.logs[0].event, 'ExecutionRequested');
  });

  it('approve: throws if transaction is already executed', async function() {
    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    const executionId = await identityInstance.execute.call(destinationToSend, valueToSend, callDataToSend);
    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend);

    await utils.assertRevert(identityInstance.approve(executionId, true));
  });

  it('approve: throws if transaction to self if not approved by manageable key', async function() {
    // add an action key first
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 2;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const destinationToSend = identityInstance.address;
    const valueToSend = 0; // 0.1 ETH
    const callDataToSend = identityInstance.contract.addKey.getData(keyToAdd, purposeToAdd, keyType);

    const executionId = await identityInstance.execute.call(destinationToSend, valueToSend, callDataToSend);
    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend, {from: accounts[2]});

    await utils.assertRevert(identityInstance.approve(executionId, true, {from: accounts[1]}));

    await identityInstance.approve(executionId, true);
  });

  it('approve: checks that executed variable is set appropriately', async function() {
    // add a non-actionable key first
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 3;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    const executionId = await identityInstance.execute.call(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});

    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});

    await identityInstance.approve(executionId, true);
    const tx = await identityInstance.transactions.call(1);

    assert.equal(tx[4], true); // executed
  });

  it('approve: checks that executed event is fired', async function() {
    // add a non-actionable key first
    const keyToAdd = await identityInstance.addressToBytes32.call(accounts[1])
    const purposeToAdd = 3;
    const keyType = 1;

    await identityInstance.addKey(keyToAdd, purposeToAdd, keyType)

    const destinationToSend = accounts[9];
    const valueToSend = 1e17; // 0.1 ETH
    const callDataToSend = '0x';

    const executionId = await identityInstance.execute.call(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});
    await identityInstance.execute(destinationToSend, valueToSend, callDataToSend, {from: accounts[1]});

    const res = await identityInstance.approve(executionId, true);

    assert.equal(res.logs.length, 1);
    assert.equal(res.logs[0].event, 'Executed');
  });
});
