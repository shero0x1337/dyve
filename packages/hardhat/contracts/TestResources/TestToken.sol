// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract TestToken is ERC20{

    constructor() ERC20("TST", "Test Token"){
        _mint(msg.sender, 100 ether);
    }

    function mintMe() external{
        _mint(msg.sender, 100 ether);
    }
}