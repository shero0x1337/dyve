// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IDyve is IERC721{

    /**
    * @dev function to list new NFT to be shorted
    * @param _data consists of data to store by the hash of this data
    *   (uint) required collateral
        (uint) endTimestamp
        (uint) required premium */
    function list(bytes calldata _data) external;

    /**
    * @dev short a listed NFT by it's hash
     */
    function short(bytes32 _hash) external;

    /**
    * @dev close an active short position
     */
    function close(bytes32 _hash) external;

    /**
    * @dev cancel an active listing that is NOT yet shorted
     */
    function cancel(bytes32 _hash) external;
}