from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class CollectionItem(Base):
    __tablename__ = "collection"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    card_id = Column(String)
    quantity = Column(Integer)

class BinderPage(Base):
    __tablename__ = "binder_pages"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    name = Column(String)
    rows = Column(Integer, default=3)
    cols = Column(Integer, default=3)

class BinderSlot(Base):
    __tablename__ = "binder_slots"

    id = Column(Integer, primary_key=True)
    page_id = Column(Integer)
    position = Column(Integer)  # 0–8 for 3x3
    card_id = Column(String, nullable=True)