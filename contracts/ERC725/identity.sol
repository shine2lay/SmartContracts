pragma solidity ^0.4.24;

contract identity {

    ////////////////////////////
    // Constants
    ///////////////////////////

    uint256 constant MANAGEMENT_KEY = 1;
    uint256 constant ACTION_KEY = 2;
    uint256 constant ENCRYPTION_KEY = 4;

    ////////////////////////////
    // Events
    ///////////////////////////

    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Approved(uint256 indexed executionId, bool approved);

    event test(uint256 length, bool purposeExists);

    ////////////////////////////
    // Modifiers
    ///////////////////////////

    modifier onlyByManagementKeyOrSelf() {
        require(msg.sender == address(this) || keys[bytes32(msg.sender)].purposeExists[1]);
        _;
    }

    ////////////////////////////
    // Storage Variables
    ///////////////////////////

    mapping(bytes32 => Key) keys;
    bytes32[] public keyList;

    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;

    ////////////////////////////
    // Structs
    ///////////////////////////

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool rejected;
        bool executed;
    }

    struct Key {
        mapping(uint256 => bool) purposeExists;
        uint256[] purposes; //e.g., MANAGEMENT_KEY = 1, ACTION_KEY = 2, etc.
        uint256 keyType; // e.g. 1 = ECDSA, 2 = RSA, etc.
        // note the bytes32 key has been removed since we could use mapping key as the key identifier
    }

    ////////////////////////////
    // Public Functions
    ///////////////////////////

    constructor () public {
        bytes32 creatorKey = addressToBytes32(msg.sender);
        keys[creatorKey].purposes.push(1); // give the creator of the contract management key permission
        keys[creatorKey].purposeExists[1] = true;
        keys[creatorKey].keyType = 1;
        keyList.push(creatorKey);
    }

    function getKey(bytes32 _key) public view returns(uint256[] purposes, uint256 keyType, bytes32 key) {
        return (keys[_key].purposes, keys[_key].keyType, _key);
    }

    function keyHasPurpose(bytes32 _key, uint256 purpose) public constant returns(bool exists) {
        return keys[_key].purposeExists[purpose];
    }

    function getKeysByPurpose(uint256 _purpose) public returns(bytes32[] _keys) {
        // i think its cheaper to have a 2 memory array then to use storage
        // and because this function is mainly meant for read purposes only
        uint256[] memory foundKeysIndex = new uint256[](keyList.length);

        uint256 foundKeyCount = 0;
        emit test(keyList.length, true);
        for (uint256 i = 0; i < keyList.length; i++) {
            if (keys[keyList[i]].purposeExists[_purpose]) {
                foundKeysIndex[foundKeyCount] = i;
                foundKeyCount++;
            }
        }
        _keys = new bytes32[](foundKeyCount);

        for (uint256 j = 0; j < foundKeyCount; j++) {
            _keys[j] = keyList[foundKeysIndex[j]];
        }
    }

    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType)
      onlyByManagementKeyOrSelf
      public returns (bool success) {
        require(!keys[_key].purposeExists[_purpose]);
        require(keys[_key].keyType == 0 || keys[_key].keyType == _keyType);

        keys[_key].purposes.push(_purpose);
        keys[_key].keyType = _keyType;
        keys[_key].purposeExists[_purpose] = true;
        keyList.push(_key);

        emit KeyAdded(_key, _purpose, _keyType);
        return true;
    }

    function removeKey(bytes32 _key, uint256 _purpose)
      onlyByManagementKeyOrSelf
      public returns (bool success) {
        require(keys[_key].purposeExists[_purpose], "Purpose does not exist for this key");

        Key storage keyToRemove = keys[_key];

        // find the correct one in the array and delete the purpose
        for (uint256 i = 0; i < keyToRemove.purposes.length; i++) {
            if (keyToRemove.purposes[i] == _purpose) {
                if (keyToRemove.purposes.length > 1) {
                    keyToRemove.purposes[i] = keyToRemove.purposes[keyToRemove.purposes.length - 1];
                }
                delete keyToRemove.purposes[keyToRemove.purposes.length - 1];
                keyToRemove.purposes.length--;

                break;
            }
        }
        keyToRemove.purposeExists[_purpose] = false;

        if (keyToRemove.purposes.length == 0) {
            // remove keyType
            delete keyToRemove.keyType;
            // remove the _key from keylist if all the purpose were deleted
            for (uint256 j = 0; j < keyList.length; j++) {
                if (keyList[j] == _key) {
                    if (keyList.length > 1) {
                        keyList[i] = keyList[keyList.length - 1];
                    }
                    delete keyList[j];
                    keyList.length--;
                    break;
                }
            }
        }

        require(keyList.length > 0); // don't remove the last key
        emit KeyRemoved(_key, _purpose, keyToRemove.keyType);
        return true;
    }

    function execute(address _to, uint256 _value, bytes _data) public returns (uint256 executionId) {
        uint256 _executionId = transactionCount + 1;
        transactions[_executionId].to = _to;
        transactions[_executionId].value = _value;
        transactions[_executionId].data = _data;

        emit ExecutionRequested(_executionId, _to, _value, _data);
        // check the managementKey Level and call approve with true if true
        Key storage senderKey = keys[addressToBytes32(msg.sender)];
        if (senderKey.purposeExists[1] || senderKey.purposeExists[2]) {
            approve(_executionId, true);
        }
        transactionCount++;

        return _executionId;
    }

    function approve(uint256 _id, bool _approve) public returns (bool success) {
        Key storage senderKey = keys[addressToBytes32(msg.sender)];
        require (!transactions[_id].rejected); // if tx has been rejected, revert
        require (!transactions[_id].executed);
        require (senderKey.purposeExists[1] || senderKey.purposeExists[2]);

        if (!_approve) {
            transactions[_id].rejected = true;
            return false;
        } else {
            if (transactions[_id].to == address(this)) {
                require (senderKey.purposeExists[1]);
            }

            executeCall(transactions[_id].to, transactions[_id].value, transactions[_id].data);

            transactions[_id].executed = true;

            emit Executed(_id, transactions[_id].to, transactions[_id].value, transactions[_id].data);

            return true;
        }

    }

    function addressToBytes32(address toCast) public pure returns(bytes32 key) {
        return bytes32(toCast);
    }

    function () public payable {
    }

    ////////////////////////////
    // Private Functions
    ///////////////////////////

    function executeCall(address _to, uint256 _value, bytes _data) internal {
        bool result;
        uint256 dataLength = _data.length;

        assembly {
            let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(_data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
            sub(gas, 34710),   // 34710 is the value that solidity is currently emitting
            // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
            // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
            _to,
            _value,
            _data,
            dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
            x,
            0                  // Output is ignored, therefore the output size is zero
            )
        }

        if (!result) {
            revert();
        }
    }
}
