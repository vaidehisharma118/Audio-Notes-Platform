from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from database import Base


class AudioNote(Base):
    __tablename__ = "audio_notes"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    storage_path = Column(String, nullable=True)

    file_size = Column(Integer, nullable=True)

    status = Column(String, nullable=False, default="QUEUED")

    transcript = Column(Text, nullable=True)

    summary = Column(Text, nullable=True)

    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )