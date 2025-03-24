import logging
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate

logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize the database with required initial data."""
    # Create default admin user if it doesn't exist
    admin_email = settings.FIRST_ADMIN_EMAIL
    if admin_email:
        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            user_in = UserCreate(
                email=admin_email,
                password=settings.FIRST_ADMIN_PASSWORD,
                full_name="Admin User",
                role="admin"
            )
            db_user = User(
                email=user_in.email,
                hashed_password=get_password_hash(user_in.password),
                full_name=user_in.full_name,
                role=user_in.role,
                is_active=True
            )
            db.add(db_user)
            db.commit()
            logger.info(f"Created admin user: {admin_email}")