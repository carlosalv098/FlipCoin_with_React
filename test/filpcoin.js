const { assert } = require('chai');


// test where created during the development of the smart contract but with the oracle implementation
// this tests no longer works


const FlipCoin = artifacts.require('./FlipCoin.sol');

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('FlipCoin', ([owner, player1, player2]) => {

    let flipcoin;

    beforeEach(async () => {
        flipcoin = await FlipCoin.deployed();
    })

    describe('deployment', async () => {
        it('is deployed succesfully', async () => {
            const address = await flipcoin.address
            assert.notEqual(address, 0x0)
            assert.notEqual(address, '')
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
        it('minimum bet is set correctly to 0.001 ETH', async () => {
            const minimumBet = await flipcoin.minimumBet()
            assert.equal(minimumBet.toNumber(), 1000000000000000)
        })
        it('once is deployed, contract can receive funds', async () => {
            const balanceBefore = await flipcoin.contractBalance();
            await flipcoin.fundContract({from: owner, value: web3.utils.toWei('0.1')})
            const balanceAfter = await flipcoin.contractBalance();
            assert(balanceAfter > balanceBefore, 'balance has to increase')
        })
    })

    describe('create bet', async () => {
        it('creates bet correctly', async () => {
            await flipcoin.createBet(1, {from: player1, value: web3.utils.toWei('0.001', 'ether')})
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)         
            assert.equal(bet.player, player1, 'player set correctly')
            assert.equal(bet.amount.toNumber(), '1000000000000000', 'amount placed correctly')
            assert.equal(bet.choice, 1, 'placed set correctly')
            assert.equal(bet.betFinished, false, 'state placed correctly')
        })
    })

    describe('does not accept incorrect input', async() => {
        it('fails when receiving incorrect amount', async () => {
            await flipcoin.createBet(1, 
                                    {from: player1, 
                                     value: web3.utils.toWei('0.0001', 'ether')})
                                     .should.be.rejected
        })
        it('fails when bet exceds contracts balance', async() => {
            await flipcoin.createBet(1, 
                                    {from: player1, 
                                     value: web3.utils.toWei('0.3', 'ether')})
                                     .should.be.rejected
        })
        it('fails when player does not select head or tails', async () => {
            await flipcoin.createBet(2, 
                                    {from: player1, 
                                    value: web3.utils.toWei('0.001', 'ether')})
                                    .should.be.rejected
        })
    })

    describe('execution function', async () => {
        it('sets correctly bet status after bet has finished', async () => {
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)
            const amount = await bet.amount
            // random number set to 0, to simulate the player lose 
            await flipcoin._checkResult(id, bet.player, amount*2, 0, 1)     
            const bet1 = await flipcoin.bets(id)
            assert.equal(bet1.betFinished, true, 'bet status not changed correctly')
        })
        it('if player wins, increase balance correctly', async () => {
            await flipcoin.createBet(1, {from: player1, value: web3.utils.toWei('0.001', 'ether')})
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)
            const amount = await bet.amount
            const plyrBalanceAfter = await flipcoin.playersBalance(bet.player)
            // random number set to 1, to simulate the player won 
            await flipcoin._checkResult(id, bet.player, amount*2, 1, 1)
            const plyrBalanceBefore = await flipcoin.playersBalance(bet.player)
            assert.equal(plyrBalanceBefore.toNumber(), plyrBalanceAfter.toNumber() + 2000000000000000)
        })
        it('if player wins, contract balance remains equal', async () => {
            await flipcoin.createBet(1, {from: player1, value: web3.utils.toWei('0.001', 'ether')})
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)
            const amount = await bet.amount
            let contractBalanceBefore = await flipcoin.contractBalance()
            contractBalanceBefore = contractBalanceBefore.toString().slice(0,4)
            //console.log(contractBalanceBefore)
            // random number set to 1, to simulate the player won 
            await flipcoin._checkResult(id, bet.player, amount*2, 1, 1)
            let contractBalanceAfter = await flipcoin.contractBalance()
            contractBalanceAfter = contractBalanceAfter.toString().slice(0,4)
            //console.log(contractBalanceAfter)            
            assert.equal(contractBalanceAfter, contractBalanceBefore)
        })
        it('if player looses, contract balance increases', async () => {
            await flipcoin.createBet(1, {from: player1, value: web3.utils.toWei('0.001', 'ether')})
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)
            const amount = await bet.amount
            let contractBalanceBefore = await flipcoin.contractBalance()
            contractBalanceBefore = contractBalanceBefore.toString().slice(0,4)
            contractBalanceBefore = parseInt(contractBalanceBefore)            
            // random number set to 0, to simulate the player loses 
            await flipcoin._checkResult(id, bet.player, amount*2, 0, 1)
            let contractBalanceAfter = await flipcoin.contractBalance()
            contractBalanceAfter = contractBalanceAfter.toString().slice(0,4)   
            contractBalanceAfter = parseInt(contractBalanceAfter)                  
            assert(contractBalanceAfter > contractBalanceBefore)
        })
        it('if player looses, player balance remains equal', async () => {
            await flipcoin.createBet(1, {from: player1, value: web3.utils.toWei('0.001', 'ether')})
            const id = await flipcoin.queryId();
            const bet = await flipcoin.bets(id)
            const amount = await bet.amount
            const plyrBalanceBefore = await flipcoin.playersBalance(bet.player)
            // random number set to 0, to simulate the player loses 
            await flipcoin._checkResult(id, bet.player, amount*2, 0, 1)
            const plyrBalanceAfter = await flipcoin.playersBalance(bet.player)
            assert.equal(plyrBalanceBefore.toNumber(), plyrBalanceAfter.toNumber())
        })
    })

    describe('withdrawals', async () => {
        it('players can withdraw their winnings', async () => {
            const playerBalBeforeSC = await flipcoin.playersBalance(player1)  
            const playerBalBeforeBC = await web3.eth.getBalance(player1)

            assert(playerBalBeforeSC > 0, 'player balance in the smart contract should be above zero')
            await flipcoin.payoutPlayer({from: player1})
            const playerBalAfterSC = await flipcoin.playersBalance(player1)  
            const playerBalAfterBC = await web3.eth.getBalance(player1)
            assert.equal(playerBalAfterSC, 0, 'player balance in the smart contract should be zero')
            assert(playerBalBeforeBC < playerBalAfterBC, 'after withdrawal player balance in the blockchain has to increase')
        })
        
        it('only the owner can withdraw balance available', async () => {
            await flipcoin.payoutOwner({from: player1}).should.be.rejected
            const balanceBefore = await web3.eth.getBalance(owner)
            await flipcoin.payoutOwner({from: owner})
            const balanceAfter = await web3.eth.getBalance(owner)
            assert(balanceBefore < balanceAfter, 'owner balance has to increase after withdrawal')
            const contractBalanceBefore = await flipcoin.contractBalance()
            assert.equal(contractBalanceBefore, 0, 'contract balance has to be zero after owner withdrawal')
            const contrBalanceAfter = await web3.eth.getBalance(flipcoin.address) 
            const contractBalanceAfter = await flipcoin.contractBalance()
            assert.equal(contractBalanceAfter, 0, 'contract balance in the smart contract has to be zero')
            assert.equal(contrBalanceAfter, contractBalanceAfter, 'contract balance on the blockchain and in the smart contract have to be the same')
        })
        
    })
})