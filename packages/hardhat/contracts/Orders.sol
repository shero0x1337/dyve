// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

library Orders{
    enum STATUS {NONE, LISTED, SHORTED, CLOSED, CANCELED}

    struct Order{
        address maker; 
        address collection;
        uint id;
        uint reqCollateral;
        uint endTimestamp;
        uint premium;
        STATUS status;
    }

    /**
    * @dev before order change pass in the local memory order to check it
     */
    function _beforeNewOrder(Order memory order) internal view{
        require(order.status == STATUS.NONE, "Order already given status, cannot initialize order");
        require(order.endTimestamp > block.timestamp, "Cannot init order with due date in the future");
    }

    function _short(Order storage order) internal{
        require(order.status == STATUS.LISTED, "Order must have LISTED status to short");
        require(order.endTimestamp > block.timestamp, "Cannot short an expired order");
        order.status = STATUS.SHORTED;
    }

    /**
    * @dev can only cancel an order in LISTED status, returns true if cancel is suceess */
    function _cancel(Order storage order) internal returns(bool){
        if(order.status == STATUS.LISTED){
            order.status = STATUS.CANCELED;
            return true;
        }
        else return false;
    }



}