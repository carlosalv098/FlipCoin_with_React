import React, { useState, useEffect } from 'react';
import getBlockchain from './getBlockchain.js';
import './App.css';
import PlayerInfo from './components/PlayerInfo';
import BetResult from './components/BetResult';
import ContractInfo from './components/ContractInfo';
import { 
  Button,
  FormControl,
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio,
  InputLabel,
  Input
} from '@material-ui/core';
import { ethers } from 'ethers';


function App() {

  const [flipCoin, setFlipCoin] = useState(undefined);
  const [player, setPlayer] = useState(undefined);
  const [playerWalletBalance, setPlayerWalletBalance] = useState('');
  const [provider, setProvider] = useState(undefined)
  const [contractOwner, setContractOwner] = useState(undefined);
  const [playerBalance, setPlayerBalance] = useState('');
  const [contractBalance, setContractBalance] = useState('');
  const [input, setInput] = useState('');
  const [choice, setChoice] = useState('0');
  const [message, setMessage] = useState('...');
  const [betStatus, setBetStatus] = useState('Not Placed Yet');
  const [betResult, setBetResult] = useState('...')
  const [amountFundContract, setAmountFundContract] = useState('')

  useEffect(() => {
    const init = async () => {
      const { signerAddress, flipCoin, signer } = await getBlockchain();
      const player = signerAddress;
      const owner = await flipCoin.contractOwner();
      const playerBalanceHex = await flipCoin.playersBalance(player);
      const playerBalance = ethers.utils.formatEther(playerBalanceHex);
      const contractBalanceHex = await flipCoin.contractBalance();
      const contractBalance = ethers.utils.formatEther(contractBalanceHex);
      const walletBalanceHex = await signer.getBalance();
      const walletBalance = ethers.utils.formatEther(walletBalanceHex._hex)

      setContractOwner(owner)
      setPlayerWalletBalance(walletBalance);
      setFlipCoin(flipCoin);
      setPlayer(player);
      setPlayerBalance(playerBalance);
      setContractBalance(contractBalance);
    };
    init();
  }, [player])

  useEffect(() => {
    const changeAccount = async () => {
      const { provider } = await getBlockchain();
      setProvider(provider)

      window.ethereum.on('accountsChanged', async () => {
        const signer = provider.getSigner();
        const player = await signer.getAddress();
        const walletBalanceHex = await signer.getBalance();
        const walletBalance = ethers.utils.formatEther(walletBalanceHex._hex)
        setPlayer(player);
        setPlayerWalletBalance(walletBalance);
      })
    }
    changeAccount();
  }, [])

  const placeBet = async e => {
    e.preventDefault();
    const betAmount = ethers.utils.parseUnits(input, 18);
    const minimumBet = 0.001;
    
    if(input > contractBalance ) {
      alert('Bet exceds contract balance')
    } else if (input < minimumBet) {
      alert('Bet is below minimum bet => 0.001 ETH')
    } else if (playerWalletBalance < minimumBet) {
      alert('Not enough balance in your wallet')
    }
    else {
      await flipCoin.createBet(choice, {value: betAmount})
      console.log(choice, player, input)
      checkIfFails();
      checkBetPlaced();
      checkResult();
      checkRandomNumber();
    }
  }

  const playerPayout = async e => {
    e.preventDefault();
    await flipCoin.payoutPlayer();

    const confirmedPlayerPayout = async () => {
      flipCoin.on('playerWithdraw', (player, amount) => {
        _checkPlayerBalance();
        alert(`Withdraw for ${amount} sent to player ${player}`)
      })
    }
    confirmedPlayerPayout();
  }

  const ownerPayout = async e => {
    e.preventDefault();
    await flipCoin.payoutOwner();

    const confirmOwnerPayout = async () => {
      flipCoin.on('contractWithdraw', (owner, amount) => {
        _checkContractBalance();
        alert(`Withdraw for ${ethers.utils.formatEther(amount, 18)} ETH sent to address ${owner}`)
      })
    }
    confirmOwnerPayout();
  }

  const _checkContractBalance = async () => {
    const contractBalanceHex = await flipCoin.contractBalance();
    const contractBalance = ethers.utils.formatEther(contractBalanceHex);
    setContractBalance(contractBalance);
  }

  const _checkPlayerBalance = async () => {
    const playerBalanceHex = await flipCoin.playersBalance(player);
    const playerBalance = ethers.utils.formatEther(playerBalanceHex);
    setPlayerBalance(playerBalance);
  }

  const ownerDeposit = async e => {
    e.preventDefault();
    const depositAmount = ethers.utils.parseUnits(amountFundContract, 18);

    if (playerWalletBalance < depositAmount) {
      alert('Not enough balance in your wallet')
    } else {
      await flipCoin.fundContract({value: depositAmount});
      const confirmDeposit = async () => {
        flipCoin.on('contractFunded', (sender, amount) => {
          _checkContractBalance();
          alert(`${ethers.utils.formatEther(amount, 18)} ETH succesfully deposited`)
        })
      }
      confirmDeposit();
    }

  }

  const checkBetPlaced = async () => {
    flipCoin.on('LogNewProbableQuery', (player, amount, choice) => {
      let betChoice = '';
      if(choice == 0) {
        betChoice = 'Head'
      } 
      else if (choice == 1) {
        betChoice = 'Tail'
      }
      const betToEth = ethers.utils.formatEther(amount)
      console.log(betChoice,betToEth,player)
      _checkContractBalance();
      setMessage(`Player ${player} placed a bet on ${betChoice} for ${betToEth} ETH`);
      setBetStatus('Bet placed. Waiting Oracle response');
    })
  }

  const checkRandomNumber = async () => {
    flipCoin.on('generatedRandomNumber', (random_Number) => {
      alert(`Random number recevied ${random_Number}`);
    })
  }

  const checkIfFails = async () => {
    flipCoin.on('proofVerificationFail', Id => {
      alert(`Failed ${Id}`)
    })
  }

  const checkResult = async () => {
    flipCoin.on('betResult', (player, amount, result) => {
      if(result === true){
        setBetResult('Congratulations you have WON')
        setMessage(`Player ${player} won ${amount} ETH`)
      } else {
        setBetResult('Sorry you have LOST')
        setMessage('...')
      }
      _checkPlayerBalance();
      _checkContractBalance();
      setBetStatus('Done');
    })
  }

  if(
    typeof player === 'undefined' ||
    typeof flipCoin === 'undefined'
  ) {
    return 'Loading...'
  }

  return (
    <div className="app">
      <div className='app__title'>
        <h1>Flip Coin dApp</h1>
      </div>
      <div className='app__players'>
        <div className='app__playerLeft'>
          <PlayerInfo player={player} player_balance={playerBalance}/>
          <Button 
            variant='contained' 
            color='secondary'
            onClick={playerPayout}
            disabled={playerBalance==0}
            >
              Withdraw
            </Button>
          <div className='app__playerLeft__choice'>
            <h3>Please place your bet</h3>
            <h4>Minimum bet is set to 0.001 ETH</h4>
            <div className='bet__options'>
                <FormControl component="fieldset">
                <FormLabel component="legend">Choose Head or Tail</FormLabel>
                <RadioGroup 
                    aria-label="BET" 
                    value={choice} 
                    onChange={e => setChoice(e.target.value)}
                    >
                        <FormControlLabel value="0" control={<Radio />} label="Head" />
                        <FormControlLabel value="1" control={<Radio />} label="Tail" />
                </RadioGroup>
                </FormControl>
            </div>
          </div>
          <div className='app__playerLeft__betAmount'>
            <FormControl>
              <InputLabel>Amount to bet...</InputLabel>
              <Input value={input} onChange={event => setInput(event.target.value)}/>
            </FormControl>
            <Button disabled={!input} variant='contained' color='primary' onClick={placeBet}>
              Place Bet
            </Button>
          </div>
        </div>
        <div className='app__playerRight'>
          <ContractInfo contract_balance={contractBalance}/>
          <BetResult message={message} bet_status={betStatus} bet_result={betResult}/>
        </div>
      </div>
      <div className='app__owner'>

          <div className='app__owner__withdraw'>
          <h2>Owner</h2>
            <h4>Withdraw balance Available</h4>
            <Button 
                variant='contained' 
                color='secondary'
                onClick={ownerPayout}
                disabled={contractBalance==0}
                disabled={player!=contractOwner}
                >
                  Withdraw
            </Button>
          </div>
          <div className='app__owner__deposit'>
            <FormControl>
                  <InputLabel>Amount to deposit...</InputLabel>
                  <Input value={amountFundContract} onChange={event => setAmountFundContract(event.target.value)}/>
                </FormControl>
            <Button 
                variant='contained' 
                color='primary'
                disabled={!amountFundContract}
                onClick={ownerDeposit}
                >
                  Deposit ETH
            </Button>
          </div>
      </div>
    </div>
      

  );
}

export default App;