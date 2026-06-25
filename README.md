# Horizen Staking Services

This repo contains services to support the official Horizen Staking program.
Based on the official staker contracts: https://github.com/HorizenLabs/staker 

## Repository content

-   [frontend/](frontend/)

    Frontend WEB UX dApp<br/>
    Next.js 16 + React 19<br/>
    Users are identified via MetaMask connection<br/>

    The frontend reads indexed/historical data from the ZenStaker subgraph
    (see `https://github.com/HorizenLabs/staker/subgraphs/`) and live data (unclaimed rewards, global state)
    plus all write transactions directly from the chain via ethers v6.
    No custom backend service is used.

See [claude.md](claude.md) for further info.

