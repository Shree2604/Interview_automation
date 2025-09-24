from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import api_router

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
security = HTTPBearer()

# JWT token verification dependency
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# WebSocket endpoint for interview
@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    try:
        # Verify JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=4002, reason="Invalid token payload")
            return

        await websocket.accept()
        
        print(f"✅ WebSocket connected for user: {user_id}")
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                
                # Echo back the message to the client
                await websocket.send_json({
                    "type": "interview_data",
                    "content": data,
                    "message": "Data received for interview",
                    "timestamp": datetime.now().isoformat()
                })
                
        except WebSocketDisconnect:
            print(f"❌ WebSocket disconnected for user: {user_id}")
                
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4003, reason="Token expired")
    except jwt.InvalidTokenError:
        await websocket.close(code=4004, reason="Invalid token")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=4000, reason="Internal server error")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for React build)
app.mount("/static", StaticFiles(directory="src"), name="static")

# Register Routers
app.include_router(api_router)


@app.get("/favicon.ico")
async def favicon():
    return FileResponse("public/favicon.ico")

@app.get("/sample")
async def root():
    return {"message": "Hello World"}
