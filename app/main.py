from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import api_router

app = FastAPI(title="Interview Automation")

# Add CORS middleware
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
