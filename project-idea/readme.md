```mermaid 
graph TD
    %% Styling
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    classDef backend fill:#4a90e2,stroke:#333,stroke-width:2px,color:#fff
    classDef queue fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef ai fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff 
    classDef data fill:#2ecc71,stroke:#333,stroke-width:2px,color:#000
    %% 1. Client Layer
    subgraph Frontend
        React[React User Interface]:::frontend
    end
    %% 2. API Gateway
    subgraph Backend_Server
        Flask[Flask API Gateway]:::backend
    end
    %% 3. Asynchronous Queue
    subgraph Async_Task_Queue
        Redis[(Redis Message Broker)]:::queue
        Celery[Celery Background Worker]:::queue
    end
    %% 4. Document Processing (The "Reader")
    subgraph Document_Pipeline
        Parser[Unstructured.io / pdfplumber]:::backend
        LangChain[LangChain Semantic Chunker]:::backend
        Embedder[Local HuggingFace Embedder]:::backend
    end
    %% 5. RAG Pipeline (The "Memory")
    subgraph RAG_System
        VectorDB[(FAISS / ChromaDB Vector Store)]:::data
        ComplaintsDB[(Historical Complaints Data)]:::data
    end
    %% 6. MCP Server (The "Hands")
    subgraph MCP_Environment
        MCPServer[MCP Server Protocol]:::ai
        ML_Model[ML Stress Predictor - .pkl]:::data
        SQL_DB[(EMI / Loan SQL Database)]:::data
    end
    %% 7. The Brain
    subgraph AI_Orchestrator
        Agents[Multi-Agent System / DSPy]:::ai
        LLM[Large Language Model]:::ai
    end
    %% --- Connections ---
    
    %% User Flow
    React -- "1. Uploads Contract PDF" --> Flask
    Flask -- "2. Returns 'Task ID' immediately" --> React
    Flask -- "3. Sends heavy job to queue" --> Redis
    Redis -- "4. Hands job to worker" --> Celery
    %% Processing Flow
    Celery -- "5. Extracts text" --> Parser
    Parser -- "6. Sends raw text" --> LangChain
    LangChain -- "7. Sends chunks" --> Embedder
    
    %% RAG Flow
    ComplaintsDB -. "Pre-loads vectors" .-> VectorDB
    Embedder -- "8. Searches for similar scams" --> VectorDB
    VectorDB -- "9. Returns flagged clauses" --> Agents
    %% MCP Flow
    MCPServer -- "Runs calculation" --> ML_Model
    MCPServer -- "Queries schema" --> SQL_DB
    Agents <--"10. Uses Tools to analyze numbers"--> MCPServer
    %% Generation Flow
    LangChain -- "11. Sends full context" --> Agents
    Agents <--"12. Drafts Risk Report"--> LLM
    
    %% Return Flow
    Agents -- "13. Final JSON Result" --> Celery
    Celery -- "14. Updates Task Status" --> Redis
    React -. "Continually polls Task ID" .-> Flask
    Flask -. "Checks status" .-> Redis
    Redis -- "15. Returns final Risk Report" --> Flask
    Flask -- "16. Displays to User" --> React




