pragma solidity ^0.4.23;

import '../ERC725/Identity.sol';
import '../ERC20/ERC20Interface.sol';

contract ExecuteSignedMessage is Identity {
    ////////////////////////
    // Events
    ///////////////////////
    event ExecutedSigned(bytes32 signHash, uint nonce, bool success);

    ///////////////////////
    // Modifiers
    //////////////////////

    ///////////////////////
    // Storage Variables
    //////////////////////

    uint256 currentNonce;
    uint256 currentTimestamp;

    mapping(uint256 => uint256) SigRequirementByKeyType;
    mapping(uint256 => bool) supportedOpType;

    /////////////////////
    // Struct
    ////////////////////

    //////////////////////////////
    // Public Functions
    /////////////////////////////

    constructor (uint256[] _requirementsByKeyType) Identity() public {
        for (uint16 i = 0; i < _requirementsByKeyType.length; i++) {
            SigRequirementByKeyType[i] = _requirementsByKeyType[i];
        }

        supportedOpType[0] = true; // only supported normal call type
    }

    function executeSigned(
        address to,
        address from,
        uint256 value,
        bytes data,
        uint nonce,
        uint gasPrice,
        uint gasLimit,
        address gasToken,
        uint8 operationType,
        bytes extraHash,
        bytes messageSignatures) public {

        uint256 startGas = gasleft();
        // do sanity checks
        require(from == address(this));
        require(nonce == currentNonce + 1 || nonce > currentTimestamp);
        require(supportedOpType[operationType]);
        require(gasleft() > gasLimit);

        // extract callPrefix on the
        // get the msgHash
        bytes32 msgHash = getMessageHash(to, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash);
        require(haveEnoughValidSignatures(operationType, msgHash, messageSignatures));

        if (operationType == 0) {
            executeCall(to, value, data);
        } // @TODO add other types of call

        uint256 refundAmount = (startGas - gasleft()) * gasPrice;
        if (gasToken == address(0)) { // gas refund is in ETH
            require(address(this).balance > refundAmount);
            msg.sender.transfer(refundAmount);
        } else { // gas refund is in ERC20
            require(ERC20Interface(gasToken).balanceOf(address(this)) > refundAmount);
            require(ERC20Interface(gasToken).transfer(msg.sender, refundAmount));
        }
    }

    function gasEstimate(
        address to,
        address from,
        uint256 value,
        bytes data,
        uint nonce,
        uint gasPrice,
        uint gasLimit,
        address gasToken,
        uint8 operationType,
        bytes extraHash,
        bytes messageSignatures) public returns (bool canExecute, uint gasCost) {
        uint256 startGas = gasleft();

        executeSigned(to, from, value, data, nonce, gasPrice, gasLimit, gasToken, operationType, extraHash, messageSignatures);

        gasCost = startGas - gasleft();

        return (true, gasCost);
    }

    function lastNonce() public view returns (uint nonce) {
        return currentNonce;
    }

    function lastTimestamp() public view returns (uint nonce) {
        return currentTimestamp;
    }

    function requiredSignatures(uint _type) public view returns (uint) {
        return SigRequirementByKeyType[_type];
    }

    ///////////////////////
    // Private Functions
    ///////////////////////

    function haveEnoughValidSignatures(
        uint256 _type,
        bytes32 _msgHash,
        bytes _messageSignatures) internal view returns (bool hasEnough) {


        uint256 numSignatures = _messageSignatures.length / 72;
        uint256 validSignatureCount = 0;

        for (uint pos = 0; pos < numSignatures; pos++) {
            uint8 v;
            bytes32 r;
            bytes32 s;

            assembly{
                r := mload(add(_messageSignatures, mul(32,pos)))
                s := mload(add(_messageSignatures, mul(64,pos)))
            // Here we are loading the last 32 bytes, including 31 bytes
            // of 's'. There is no 'mload8' to do this.
            //
            // 'byte' is not working due to the Solidity parser, so lets
            // use the second best option, 'and'
                v := and(mload(add(_messageSignatures, mul(65,pos))), 0xff)
            }
            if (keys[bytes32(ecrecover(_msgHash, v, r, s))].purposeExists[_type]) {
                validSignatureCount++;
            }
        }

        if (validSignatureCount > SigRequirementByKeyType[_type]) {
            return true;
        }

        return false;
    }

    function getMessageHash(
        address to,
        uint256 value,
        bytes data,
        uint nonce,
        uint gasPrice,
        uint gasLimit,
        address gasToken,
        uint8 operationType,
        bytes extraHash) internal view returns (bytes32 messageHash) {

        bytes4 callPrefix;

        assembly {
            callPrefix := mload(add(data, 32))
        }

        return keccak256(
            abi.encodePacked(
            byte(0x19),
            byte(0),
            address(this), // from
            to,
            value,
            keccak256(data), // data hash
            nonce,
            gasPrice,
            gasLimit,
            gasToken,
            operationType,
            callPrefix,
            extraHash
            )
        );
    }
}
