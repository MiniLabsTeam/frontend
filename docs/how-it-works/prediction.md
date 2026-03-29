# Prediction & Betting

## Overview

Predict race winners and earn OCT tokens. MiniGarage uses a pool-based prediction market where all bets on a race go into a shared pool, and winners split it proportionally.

## Depositing OCT for Predictions

Before placing bets, you need to deposit OCT into your prediction balance:

1. Go to **Prediction** page
2. Tap **Deposit**
3. Enter the amount of OCT to deposit
4. Confirm the on-chain transaction
5. Your prediction balance is updated

> Deposits are tracked by transaction digest to prevent double-crediting.

## Placing a Bet

1. Find an upcoming race on the **Prediction** page
2. View the participating players and their cars
3. Select who you think will win
4. Enter your bet amount
5. Confirm — deducted from your prediction balance

## Winning & Claiming

After the race finishes:

1. The actual winner is determined by the race engine
2. The backend signs the settlement
3. The smart contract verifies and finalizes
4. If your prediction was correct, tap **Claim** to receive your payout

### Payout Formula

```
Your Payout = (Your Bet / Total Bets on Winner) × Total Pool
```

## Withdrawing

You can withdraw your prediction balance back to your wallet at any time:

1. Go to **Prediction** page
2. Tap **Withdraw**
3. Enter the amount
4. Confirm the on-chain transaction

## Strategy Tips

* **Study car stats** — higher stats generally mean better race performance
* **Check equipped parts** — a well-equipped car has a significant advantage
* **Diversify bets** — don't put all your OCT on a single prediction
* **Watch race history** — some players consistently perform better
