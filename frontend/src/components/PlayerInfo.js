import React from 'react'
import './PlayerInfo.css';

function PlayerInfo({ player , player_balance }) {
    return (
        <div className='playerInfo'>
            <div className='playerInfo__player'>
                <h2>Player: </h2>
                <h4>{player}</h4>

            </div>
            <div className='playerInfo__earnings'>
                <h2>Earnings: </h2>
                <h2>{player_balance}</h2>
                <h4>ETH</h4>
            </div>           
        </div>
    )
}

export default PlayerInfo
