import React from 'react';
import './BetResult.css';

function BetResult({ message, bet_status, bet_result }) {

    return (
        <div className='betResult'>
            <div className='betResult__message'>
                <h3>Bet Details:</h3>
                <h4>{message}</h4>
            </div>
            <br/>
            <div className='betResult__status'>
                <h3>Bet Status:</h3>
                <h4>{bet_status}</h4>
            </div>
            <br/>
            <div className='betResult__result'>
                <h3>Bet Result:</h3>
                <h4>{bet_result}</h4>
            </div>
  

        </div>
    )
}

export default BetResult
