pragma solidity ^0.4.23;

interface ERC1077Interface {

    ////////////////////////
    // Events
    ///////////////////////
    event ExecutedSigned(bytes32 signHash, uint nonce, bool success);



    //////////////////////////////
    // Public Functions
    /////////////////////////////

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
        bytes messageSignatures) external;

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
        bytes messageSignatures) external returns (bool canExecute, uint gasCost);

    function lastNonce() external returns (uint nonce);

    function lastTimestamp() external returns (uint nonce);

    function requiredSignatures(uint _type) external returns (uint);
}
