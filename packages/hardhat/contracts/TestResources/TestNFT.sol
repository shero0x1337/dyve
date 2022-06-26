// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract TestToken is ERC721{
    uint count = 0;
    constructor() ERC721("TSTFT", "Test NFT"){
        _mint(msg.sender, ++count);
    }

    function mintMe() external{
        _mint(msg.sender, ++count);
    }
}