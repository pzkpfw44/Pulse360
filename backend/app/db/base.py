# Import all models here so that Alembic can discover them
from app.db.base_class import Base
from app.models.user import User
from app.models.document import Document
from app.models.template import FeedbackTemplate
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.models.token import AccessToken
from app.models.cache import AICache