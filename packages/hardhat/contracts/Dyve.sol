// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IDyve.sol";
import "./Orders.sol";

interface IMarketplace{
    function sellNFT(address _nft, uint _id, address _token) external;
}

contract Dyve is IDyve, ERC721{
    using Orders for Orders.Order;
    
    mapping(bytes32 => Orders.Order) public orderLookup;
    mapping(address => bytes32[]) public ordersByCollection;
    mapping(address => bytes32[]) public ordersByLender;

    IERC20 public immutable token;
    IMarketplace public immutable market;

    constructor(IERC20 _token, address _marketplace) ERC721("DYVE Short Position", "DYVE"){
        token = _token;
        market = IMarketplace(_marketplace);
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
        ordersByCollection[collection].push(hash);
        ordersByLender[msg.sender].push(hash);
    }

    /**
    * @dev short a listed NFT by it's hash
     */
    function short(bytes32 _hash) external override{
        Orders.Order storage order = orderLookup[_hash];

        token.transferFrom(msg.sender, address(this), order.reqCollateral);
        token.transferFrom(msg.sender, order.maker, order.premium);

        IERC721(order.collection).transferFrom(order.maker, address(this), order.id);
        IERC721(order.collection).approve(address(market), order.id);

        _mint(msg.sender, uint256(_hash));

        market.sellNFT(order.collection, order.id, address(token));
    }

    /**
    * @dev close an active short position
    * @param _id is the id of the new NFT from the same collection to trade back in
     */
    function close(bytes32 _hash, uint _id) external override{
        Orders.Order storage order = orderLookup[_hash];
        if(order.endTimestamp < block.timestamp){
            token.transfer(order.maker, order.reqCollateral);
        }else{
            require(msg.sender == ownerOf(uint256(_hash)), "Must be the owner of the short position to close");
            IERC721(order.collection).transferFrom(msg.sender, order.maker, _id);
        }
        _burn(uint256(_hash));

    }

    /**
    * @dev cancel an active listing that is NOT yet shorted
     */
    function cancel(bytes32 _hash) external override{
        Orders._cancel(orderLookup[_hash]);
    }

    function testSetup() external{
        Orders.Order memory order1 = Orders.Order(msg.sender, address(this), 0, 1 ether, block.timestamp+4000, 0.5 ether, Orders.STATUS.LISTED);
        Orders.Order memory order2 = Orders.Order(msg.sender, address(this), 1, 1.2 ether, block.timestamp+2500, 0.5 ether, Orders.STATUS.SHORTED);
        Orders.Order memory order3 = Orders.Order(msg.sender, address(this), 2, 0.8 ether, block.timestamp+5327, 0.5 ether, Orders.STATUS.CLOSED);

        orderLookup[keccak256("1")] = order1;
        ordersByCollection[address(this)].push(keccak256("1"));
        ordersByLender[msg.sender].push(keccak256("1"));

        orderLookup[keccak256("2")] = order2;
        ordersByCollection[address(this)].push(keccak256("2"));
        ordersByLender[msg.sender].push(keccak256("2"));

        orderLookup[keccak256("3")] = order3;
        ordersByCollection[address(this)].push(keccak256("3"));
        ordersByLender[msg.sender].push(keccak256("3"));


    }
}