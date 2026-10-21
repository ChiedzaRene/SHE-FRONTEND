"""Creates the one account the tests start from (the app has no self sign-up). Everything else is done
through the screens."""
import os
import sys

sys.path.insert(0, os.environ["BACKEND_DIR"])

import main  # noqa: F401,E402  (creates the tables)
from database import SessionLocal  # noqa: E402
from models.user import User  # noqa: E402
from services.auth_services import hash_password  # noqa: E402

db = SessionLocal()
db.add(User(email=os.environ["E2E_ADMIN_EMAIL"], password=hash_password(os.environ["E2E_ADMIN_PASSWORD"]),
            full_name="Grace Admin", role="super_admin", must_change_password=False))
db.commit()
db.close()
