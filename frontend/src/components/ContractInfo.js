import React from 'react';
import './ContractInfo.css';

function ContractInfo({ contract_balance }) {
    return (
        <div className='contractInfo'>
            <h2>Contract Balance: </h2>
            <h2>{contract_balance}</h2>
            <h4>ETH</h4>
        </div>
    )
}

export default ContractInfo
