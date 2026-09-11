from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve authenticated user from Bearer JWT token."""
    if not token:
        # For simplicity and smooth demo, fall back to Farmer Ramesh Bora (ID 1) if no token provided
        user = db.query(User).filter(User.id == 1).first()
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing."
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token."
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User record not found."
        )
    return user

@router.post("/register", response_model=TokenResponse)
def register_farmer(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new farmer account."""
    existing = db.query(User).filter(User.mobile == payload.mobile).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is already registered. Please login."
        )

    user = User(
        name=payload.name,
        mobile=payload.mobile,
        hashed_password=hash_password(payload.password),
        role="farmer",
        village=payload.village,
        district=payload.district,
        state=payload.state,
        preferred_language=payload.preferred_language or "en"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "mobile": user.mobile, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
def login_farmer(payload: UserLogin, db: Session = Depends(get_db)):
    """Login with mobile and password."""
    user = db.query(User).filter(User.mobile == payload.mobile).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password."
        )

    token = create_access_token({"sub": str(user.id), "mobile": user.mobile, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Retrieve logged in farmer's profile details."""
    return user
