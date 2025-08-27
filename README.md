# SprintSync - AI-Powered Sprint Management Tool

A lean internal tool for AI consultancy teams to log work, track time, and leverage LLM assistance for quick planning help. Built with Node.js, Express, and SQLite.

## 🚀 Features

- **User Management**: JWT-based authentication with admin roles
- **Task Management**: Full CRUD operations with status transitions
- **Time Tracking**: Log time spent on tasks with detailed tracking
- **AI Assistance**: OpenAI integration for task descriptions and daily planning
- **Structured Logging**: Comprehensive API call logging with performance metrics
- **Auto-generated Docs**: Swagger/OpenAPI documentation
- **Production Ready**: Security headers, rate limiting, and error handling

## 🏗️ Architecture

```
src/
├── config/          # Database configuration
├── controllers/     # Business logic handlers
├── middleware/      # Authentication & validation
├── routes/          # API endpoint definitions
├── services/        # AI service integration
├── utils/           # Logging and utilities
└── database/        # Database scripts
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT + bcrypt
- **AI Integration**: OpenAI GPT-3.5
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for AI features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd sprintsync-backend
npm install
```

### 2. Environment Setup

```bash
cp env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key  # Optional
```

### 3. Initialize Database

```bash
npm run migrate
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Task Management

- `GET /api/tasks` - List user tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/time` - Log time spent

### AI Assistance

- `POST /api/ai/suggest` - Generate task description
- `GET /api/ai/daily-plan` - Get daily planning suggestions

### User Management (Admin Only)

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/change-password` - Change password

### Interactive Documentation

Visit `http://localhost:3000/api-docs` for interactive Swagger documentation.

## 🐳 Docker Deployment

### Local Development

```bash
docker-compose up --build
```

### Production Build

```bash
docker build -t sprintsync-backend .
docker run -p 3000:3000 sprintsync-backend
```

## 🌐 Cloud Deployment

### Render (Recommended for MVP)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Railway

1. Connect repository
2. Set environment variables
3. Deploy with one click

### AWS EC2

```bash
# SSH into your EC2 instance
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Clone and deploy
git clone <repository-url>
cd sprintsync-backend
docker build -t sprintsync .
docker run -d -p 80:3000 sprintsync
```

## 📊 Sample Data

After running `npm run seed`, you'll have:

- **Admin User**: `admin` / `admin123`
- **Regular Users**: `john_engineer` / `user123`, `sarah_dev` / `user123`
- **Sample Tasks**: 4 tasks with different statuses and time logs

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Security headers with Helmet
- CORS protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## 📝 Logging

Structured logging for every API call including:
- HTTP method and path
- User ID and authentication status
- Response status code
- Request latency
- User agent and IP address
- Error stack traces

Logs are stored in `logs/` directory and also output to console in development.

## 🧪 Testing

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
```

## 📈 Monitoring

- Health check endpoint: `GET /health`
- Docker health checks
- Structured logging for observability
- Performance metrics tracking

## 🚀 Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production database
- [ ] Set NODE_ENV=production
- [ ] Configure logging levels
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Configure domain and SSL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/api-docs`
2. Review the logs in `logs/` directory
3. Open an issue on GitHub

## 🔮 Future Enhancements

- [ ] Vector database integration for RAG
- [ ] Kanban board with drag-and-drop
- [ ] Analytics and reporting
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] Webhook integrations
- [ ] Advanced AI features
