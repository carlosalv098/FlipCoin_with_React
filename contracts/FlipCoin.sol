// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;

import '../node_modules/@openzeppelin/contracts/math/SafeMath.sol';
import '../node_modules/@openzeppelin/contracts/ownership/Ownable.sol';
import './provableAPI.sol';

contract FlipCoin is Ownable, usingProvable{
    
    using SafeMath for uint;
    
    address public contractOwner;
    uint public minimumBet;
    uint public contractBalance;
    bytes32 public queryId;
    uint private constant NUM_RANDOM_BYTES_REQUESTED = 1;


    struct Bet {
        address player;
        uint amount;
        uint choice;
        bool betFinished;
        uint queryPrice;
    }

    mapping (bytes32 => Bet) public bets;
    mapping (address => uint) public playersBalance;

    constructor () public {
        contractOwner = msg.sender;
        minimumBet = 1000000000000000;
        provable_setProof(proofType_Ledger);
    }

    event LogNewProbableQuery(address indexed player, 
                                uint indexed amount,  
                                uint indexed choice);
    event generatedRandomNumber(uint indexed random_Number);
    event betResult(address indexed player, 
                    uint indexed amount, 
                    bool betStatus,
                    bool indexed result);
    event contractFunded(address indexed owner, uint indexed amount);
    event playerWithdraw(address indexed player, uint indexed amount);
    event contractWithdraw(address indexed owner, uint indexed amount);
    event proofVerificationFail(bytes32 indexed Id);


    function createBet (uint _choice) public payable{
        require (_choice == 0 || _choice == 1, 'You have to choose Head or Tail');
        require (msg.value >= minimumBet, 'Minimum bet has to be above 0.001 ETH');
        require (contractBalance >= msg.value, 'Not enough balance in the contract');
        
        uint QUERY_EXECUTION_DELAY = 0;
        uint GAS_FOR_CALLBACK = 200000;

        queryId = provable_newRandomDSQuery(QUERY_EXECUTION_DELAY, NUM_RANDOM_BYTES_REQUESTED, GAS_FOR_CALLBACK);
        contractBalance = contractBalance.sub(msg.value);

        if(_choice == 0){
            bets[queryId] = Bet(msg.sender, msg.value, 0, false, provable_getPrice("Random"));
            emit LogNewProbableQuery(msg.sender, msg.value, 0);
        } else {
            bets[queryId] = Bet(msg.sender, msg.value, 1, false, provable_getPrice("Random"));
            emit LogNewProbableQuery(msg.sender, msg.value, 1);
        }
    }

    function __callback (
        bytes32 _queryId, 
        string memory _result, 
        bytes memory _proof) public {
        require (msg.sender == provable_cbAddress());

        if (provable_randomDS_proofVerify__returnCode(_queryId, _result, _proof) == 0){
            uint randomNumber = uint(keccak256(abi.encodePacked(_result))) % 2;
            assert(randomNumber == 0 || randomNumber == 1);
            emit generatedRandomNumber(randomNumber);
            address _player = bets[_queryId].player;
            uint _amount = bets[_queryId].amount;
            uint _choice = bets[_queryId].choice;
            uint _oracleCost = bets[_queryId].queryPrice;
            uint _totalAmount = _amount.mul(2).sub(_oracleCost);
            assert(_totalAmount <= _amount.mul(2));
            _checkResult(_queryId, _player, _totalAmount, randomNumber, _choice);
        }
        else {
            emit proofVerificationFail(_queryId);
        }
    }

    function _checkResult (
        bytes32 _queryId,
        address _player,
        uint _totalAmount,
        uint _randomNumber,
        uint _choice) public {
        require(bets[_queryId].betFinished == false, 'Bet already finished');
        
        Bet storage bet = bets[_queryId];
        bet.betFinished = true;

        //whoever wins pays the Oracle fee
        if (_randomNumber == 0 && _choice == 0) {
            playersBalance[_player] = playersBalance[_player].add(_totalAmount);
            emit betResult(_player, _totalAmount, bets[_queryId].betFinished, true);
        }
        else if (_randomNumber == 0 && _choice == 1) {
            contractBalance = contractBalance.add(_totalAmount);
            emit betResult(_player, _totalAmount, bets[_queryId].betFinished, false);
        }
        else if (_randomNumber == 1 && _choice == 1) {
            playersBalance[_player] = playersBalance[_player].add(_totalAmount);
            emit betResult(_player, _totalAmount, bets[_queryId].betFinished, true);
        }
        else {
            contractBalance = contractBalance.add(_totalAmount);
            emit betResult(_player, _totalAmount, bets[_queryId].betFinished, false);
        }
    }

    function fundContract () public payable returns (uint){
        contractBalance = contractBalance.add(msg.value);
        emit contractFunded(msg.sender, msg.value);
        return contractBalance;
    }
    
    function payoutPlayer () public returns (uint){
        require(playersBalance[msg.sender] > 0, 'Not enough Balance');
        uint amount = playersBalance[msg.sender];
        playersBalance[msg.sender] = 0;
        msg.sender.transfer(amount);
        emit playerWithdraw(msg.sender, amount);
        return playersBalance[msg.sender];
    }
    
    function payoutOwner () public onlyOwner() returns (uint){
        require(contractBalance >= 0, 'Contract does not have balance');
        uint amount = contractBalance;
        contractBalance = 0;
        msg.sender.transfer(amount);
        emit contractWithdraw(msg.sender, amount);
        return contractBalance;
    }
}