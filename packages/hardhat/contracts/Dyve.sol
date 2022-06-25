// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IDyve.sol";
import "./Orders.sol";

contract Dyve is IDyve, ERC721{
    using Orders for Orders.Order;
    
    mapping(bytes32 => Orders.Order) public orderLookup;
    IERC20 public token;

    constructor(IERC20 _token) ERC721("DYVE Short Position", "DYVE"){
        token = _token;
    }

    /**
    * @dev function to list new NFT to be shorted
    * @param _data consists of data to store by the hash of this data
    *   (uint) required collateral
        (uint) endTimestamp
        (uint) required premium */
    function list(bytes calldata _data) external override{
        bytes32 hash = keccak256(_data);

        address collection;
        uint256 id;
        uint256 reqCol;
        uint256 endTime;
        uint256 premium;
        (collection, id, reqCol, endTime, premium) = abi.decode(_data, (address, uint, uint, uint, uint));

        require(IERC721(collection).getApproved(id) == address(this), "To list you must first approve this contract to spend your NFT");
        require(IERC721(collection).ownerOf(id) == msg.sender, "Must be the owner of the token to list it");

        Orders.Order memory order = Orders.Order(msg.sender, collection, id, reqCol, endTime, premium, Orders.STATUS.LISTED);
        order._beforeNewOrder();

        orderLookup[hash] = order;
    }

    /**
    * @dev short a listed NFT by it's hash
     */
    function short(bytes32 _hash) external override{
        Orders.Order storage order = orderLookup[_hash];

        token.transferFrom(msg.sender, address(this), order.reqCollateral);
        token.transferFrom(msg.sender, order.maker, order.premium);

        IERC721(order.collection).transferFrom(order.maker, address(this), order.id);

        _mint(msg.sender, uint256(_hash));
    }

    /**
    * @dev close an active short position
     */
    function close(bytes32 _hash) external override{

    }

    /**
    * @dev cancel an active listing that is NOT yet shorted
     */
    function cancel(bytes32 _hash) external override{
        Orders._cancel(orderLookup[_hash]);
    }
}