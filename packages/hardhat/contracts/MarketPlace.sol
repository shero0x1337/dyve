// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IDyve.sol";
import "./Orders.sol";

contract Marketplace {


    /**
    * @dev sell any nft 
     */
    function sellNFT(address _nft, uint _id, address _token, uint tokenAmount) external {
        IERC721(_nft).transferFrom(msg.sender, address(this), _id);
        require(IERC20(_token).transferFrom(address(this), msg.sender, tokenAmount), "Unable to transfer to caller");
    }
}
    