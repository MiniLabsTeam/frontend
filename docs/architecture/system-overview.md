# System Overview

MiniLabs is composed of three main components: a **Next.js frontend**, an **Express backend**, and **smart contracts on OneChain**.

## High-Level Architecture

```mermaid
graph TB
    subgraph Client Layer
        A[Next.js 15 Frontend<br/>React 19 + Tailwind]
        B[Phaser 3 Game Client<br/>2D Racing]
        C[Three.js Game Client<br/>3D Racing]
    end

    subgraph Backend Layer
        D[Express + TypeScript API<br/>Port 3000]
        E[WebSocket Server<br/>Socket.io + ws]
        F[Game Engine<br/>60 FPS Physics]
        G[Blockchain Indexer<br/>Event Listener]
    end

    subgraph Data Layer
        H[(PostgreSQL<br/>Neon)]
        I[(Redis<br/>Upstash)]
    end

    subgraph Blockchain
        J[OneChain<br/>Sui-based]
        K[Smart Contracts<br/>Move Language]
    end

    A --> D
    A --> E
    B --> D
    C --> E
    D --> H
    D --> I
    E --> F
    F --> I
    D --> K
    G --> J
    G --> H
    K --> J
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant Auth as JWT Auth
    participant DB as PostgreSQL
    participant Cache as Redis
    participant Chain as OneChain

    Client->>API: HTTP Request + JWT
    API->>Auth: Validate Token
    Auth-->>API: User Context
    API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>API: Cached Data
    else Cache Miss
        API->>DB: Query Database
        DB-->>API: Data
        API->>Cache: Store in Cache
    end
    API-->>Client: JSON Response

    Note over Client,Chain: For blockchain operations
    Client->>Chain: Sign & Submit Transaction
    Chain-->>Client: Transaction Result
    Chain->>API: Event (via Indexer)
    API->>DB: Update State
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Frontend** | UI rendering, wallet integration, game display |
| **API Server** | Authentication, business logic, data access |
| **WebSocket** | Real-time game state during races |
| **Game Engine** | Server-authoritative physics simulation |
| **Indexer** | Listen for on-chain events, sync to database |
| **PostgreSQL** | Persistent storage for users, NFTs, races, quests |
| **Redis** | Game state cache, session management, rate limiting |
| **Smart Contracts** | NFT minting, marketplace, gacha, predictions |

## Deployment Architecture

```mermaid
graph LR
    subgraph Vercel
        A[Next.js Frontend<br/>+ API Routes]
    end
    subgraph Railway
        B[Express Backend<br/>+ WebSocket<br/>+ Game Engine]
    end
    subgraph Neon
        C[(PostgreSQL)]
    end
    subgraph Upstash
        D[(Redis + TLS)]
    end
    subgraph OneChain
        E[Smart Contracts]
        F[RPC Node]
    end

    A -->|HTTPS| B
    A -->|RPC Proxy| F
    B --> C
    B --> D
    B --> F
    B -.->|Indexer WSS| E
```
