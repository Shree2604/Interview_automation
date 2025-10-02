# 📝 AI-Powered Interview Automation System

![Interview Automation](https://img.shields.io/badge/Status-Active-success)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95.0-green)](https://fastapi.tiangolo.com/)

A sophisticated AI-powered interview automation system that conducts voice-based interviews, evaluates candidate responses, and provides detailed analytics. The system features both admin and candidate interfaces with real-time communication capabilities.

## 🌟 Features

- **Role-based Access Control** (Admin/Candidate)
- **Voice-based Interview** with real-time speech-to-text
- **AI-powered Question Generation**
- **Response Analysis** with sentiment and content evaluation
- **Real-time Dashboard** for monitoring interviews
- **WebSocket** for seamless communication
- **Responsive Design** for all devices

## 🚀 Demo Accounts

**Admin Panel:**
- Email: admin@gmail.com
- Password: admin1234

**Candidate Account:**
- Email: aravind@gmail.com
- Password: aravind

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI
- **Authentication**: JWT
- **Database**: SQLite (can be configured to PostgreSQL/MySQL)
- **WebSockets**: For real-time communication
- **ASGI Server**: Uvicorn

### Frontend
- **Library**: React 18
- **State Management**: React Context API
- **UI Components**: Custom CSS with Lucide Icons
- **Web Speech API**: For speech recognition and synthesis

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Interview_automation.git
   cd Interview_automation
   ```

2. **Set up Python environment**
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Set up the database**
   ```bash
   # Run database migrations
   alembic upgrade head
   
   # Seed initial data
   python seed_users.py
   python seed_sample_registrations.py
   ```

4. **Set up the frontend**
   ```bash
   # Install Node.js dependencies
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   # From project root
   uvicorn app.main:app --reload
   ```

2. **Start the frontend development server**
   ```bash
   # From the frontend directory
   npm start
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 📂 Project Structure

```
Interview_automation/
├── app/                      # Backend application
│   ├── models/               # Database models
│   ├── routers/              # API routes
│   ├── main.py               # FastAPI application
│   └── ...
├── src/                      # Frontend source
│   ├── components/           # React components
│   ├── assets/               # Static assets
│   ├── App.js                # Main React component
│   └── ...
├── alembic/                  # Database migrations
├── public/                   # Static files
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

## 🔒 Authentication Flow

1. User logs in with email/password
2. Server validates credentials and issues JWT token
3. Token is stored in localStorage/sessionStorage
4. Token is sent with each subsequent request in the Authorization header

## 🌐 API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/interview/questions` - Get interview questions
- `POST /api/interview/responses` - Submit interview responses
- `WS /ws/interview` - WebSocket for real-time communication

## 🤖 AI Features

- **Speech Recognition**: Converts candidate's speech to text
- **Natural Language Processing**: Analyzes response quality
- **Sentiment Analysis**: Evaluates candidate's tone and confidence
- **Automated Scoring**: Rates responses based on content and delivery

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablets
- Mobile devices

## 🛡️ Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- Rate limiting

## 📝 License

This project is licensed under the MIT License 

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web framework
- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - For speech recognition and synthesis

## 📬 Contact

For any queries or support, please contact:
- Email: shree.xai.dev@gmail.com
