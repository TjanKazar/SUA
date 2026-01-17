from fastapi import FastAPI, HTTPException, status, Query, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import logging
import pika
import json
import uuid
import os
import time
import hashlib

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="User Service API",
    version="1.0.0",
    description="Microservice za upravljanje uporabnikov"
)

MONGO_URI = "mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/user_service"
JWT_SECRET = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin123"
EXCHANGE_NAME = "logs_exchange"

rabbitmq_connection = None
rabbitmq_channel = None

def setup_rabbitmq():
    global rabbitmq_connection, rabbitmq_channel
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        rabbitmq_connection = pika.BlockingConnection(parameters)
        rabbitmq_channel = rabbitmq_connection.channel()
        rabbitmq_channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='fanout', durable=True)
        logger.info('RabbitMQ connected - User Service')
    except Exception as e:
        logger.error(f'Failed to connect to RabbitMQ: {str(e)}')

def send_log_to_rabbitmq(log_data):
    global rabbitmq_channel
    if rabbitmq_channel:
        try:
            message = json.dumps(log_data)
            rabbitmq_channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key='',
                body=message,
                properties=pika.BasicProperties(delivery_mode=2)
            )
        except Exception as e:
            logger.error(f'Failed to send log to RabbitMQ: {str(e)}')
            try:
                setup_rabbitmq()
            except:
                pass

security = HTTPBearer()

client = MongoClient(MONGO_URI)
db = client.user_service
users_collection = db.users

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)
    firstName: str
    lastName: str
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[str] = None

class PasswordChange(BaseModel):
    oldPassword: str
    newPassword: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    firstName: str
    lastName: str
    role: str
    isActive: bool
    createdAt: datetime

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": data.get("userId"),
        "name": data.get("email")
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired token"
        )

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    correlation_id = request.headers.get('x-correlation-id', str(uuid.uuid4()))
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = int((time.time() - start_time) * 1000)
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "logType": "ERROR" if response.status_code >= 400 else "INFO",
        "url": f"http://localhost:3005{request.url.path}",
        "correlationId": correlation_id,
        "serviceName": "user-service",
        "message": f"{request.method} {request.url.path} - {response.status_code} ({duration}ms)",
        "method": request.method,
        "statusCode": response.status_code,
        "duration": duration
    }
    
    logger.info(f"{log_data['timestamp']} {log_data['logType']} {log_data['url']} Correlation: {log_data['correlationId']} [user-service] - {log_data['message']}")
    send_log_to_rabbitmq(log_data)
    
    response.headers['x-correlation-id'] = correlation_id
    return response

@app.on_event("startup")
async def startup_event():
    setup_rabbitmq()
    try:
        users_collection.create_index("email", unique=True)
        users_collection.create_index("username", unique=True)
        users_collection.create_index("role")
        
        count = users_collection.count_documents({})
        if count == 0:
            hashed_password = hash_password("pass123")
            users_collection.insert_many([
                {
                    "username": "john_doe",
                    "email": "john@example.com",
                    "password": hashed_password,
                    "firstName": "John",
                    "lastName": "Doe",
                    "role": "user",
                    "isActive": True,
                    "createdAt": datetime.utcnow()
                },
                {
                    "username": "admin",
                    "email": "admin@example.com",
                    "password": hashed_password,
                    "firstName": "Admin",
                    "lastName": "User",
                    "role": "admin",
                    "isActive": True,
                    "createdAt": datetime.utcnow()
                }
            ])
            logger.info("Sample users created")
        
        logger.info("User Service initialized")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

@app.post("/users/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserRegister):
    try:
        if users_collection.find_one({"email": user.email}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        if users_collection.find_one({"username": user.username}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        user_dict = {
            "username": user.username,
            "email": user.email,
            "password": hash_password(user.password),
            "firstName": user.firstName,
            "lastName": user.lastName,
            "role": user.role,
            "isActive": True,
            "createdAt": datetime.utcnow()
        }
        
        result = users_collection.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        
        token_data = {
            "userId": str(result.inserted_id),
            "email": user.email,
            "role": user.role
        }
        token = create_access_token(token_data)
        
        return {
            "message": "User registered successfully",
            "token": token,
            "user": {
                "id": str(result.inserted_id),
                "username": user.username,
                "email": user.email,
                "firstName": user.firstName,
                "lastName": user.lastName,
                "role": user.role
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/users/login")
async def login_user(credentials: UserLogin):
    try:
        user = users_collection.find_one({"email": credentials.email})
        
        if not user or not verify_password(credentials.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not user.get("isActive", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        token_data = {
            "userId": str(user["_id"]),
            "email": user["email"],
            "role": user["role"]
        }
        token = create_access_token(token_data)
        
        return {
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "firstName": user["firstName"],
                "lastName": user["lastName"],
                "role": user["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/users")
async def get_all_users(
    role: Optional[str] = Query(None),
    isActive: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    try:
        query = {}
        if role:
            query["role"] = role
        if isActive is not None:
            query["isActive"] = isActive
        
        users = list(users_collection.find(query).skip(skip).limit(limit))
        
        return {
            "count": len(users),
            "users": [
                {
                    "id": str(user["_id"]),
                    "username": user["username"],
                    "email": user["email"],
                    "firstName": user["firstName"],
                    "lastName": user["lastName"],
                    "role": user["role"],
                    "isActive": user.get("isActive", True),
                    "createdAt": user["createdAt"]
                }
                for user in users
            ]
        }
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "firstName": user["firstName"],
            "lastName": user["lastName"],
            "role": user["role"],
            "isActive": user.get("isActive", True),
            "createdAt": user["createdAt"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(verify_token)
):
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        if current_user.get("userId") != user_id and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this user"
            )
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        if "username" in update_dict:
            existing = users_collection.find_one({
                "username": update_dict["username"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        result = users_collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "message": "User updated successfully",
            "user": {
                "id": str(result["_id"]),
                "username": result["username"],
                "email": result["email"],
                "firstName": result["firstName"],
                "lastName": result["lastName"],
                "role": result["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(verify_token)
):
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        if current_user.get("userId") != user_id and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this user"
            )
        
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.put("/users/{user_id}/password")
async def change_password(
    user_id: str,
    password_data: PasswordChange,
    current_user: dict = Depends(verify_token)
):
    try:
        if current_user.get("userId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to change this password"
            )
        
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not verify_password(password_data.oldPassword, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid old password"
            )
        
        new_hashed_password = hash_password(password_data.newPassword)
        
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_hashed_password}}
        )
        
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(verify_token)
):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can deactivate users"
            )
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"isActive": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "error", "database": "disconnected"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Zaganjam User Service")
    setup_rabbitmq()
    uvicorn.run(app, host="0.0.0.0", port=3005)
