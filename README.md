# Horizen Staking Services

This repo contains services to support the official Horizen Staking program.
Based on the official staker contracts: https://github.com/HorizenLabs/staker 

## Repository content

- frontend/
Frontend WEB UX dApp
Next.js 16 + React 19
Users are identified via MetaMask connection

The frontend reads indexed/historical data from the ZenStaker subgraph
(see `staker/subgraphs/`) and live data (unclaimed rewards, global state)
plus all write transactions directly from the chain via ethers v6.
No custom backend service is used.

