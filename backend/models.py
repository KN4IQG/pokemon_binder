from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class CollectionItem(Base):
    __tablename__ = "collection"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    card_id = Column(String)
    quantity = Column(Integer)


class Binder(Base):
    __tablename__ = "binders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    size = Column(Integer, default=3)  # rows == cols for every page in this binder
    cover_image = Column(String, nullable=True)


class BinderPage(Base):
    __tablename__ = "binder_pages"

    id = Column(Integer, primary_key=True)
    binder_id = Column(Integer, ForeignKey("binders.id"))
    page_number = Column(Integer, default=1)
    rows = Column(Integer, default=3)
    cols = Column(Integer, default=3)


class BinderSlot(Base):
    __tablename__ = "binder_slots"

    id = Column(Integer, primary_key=True)
    page_id = Column(Integer, ForeignKey("binder_pages.id"))
    position = Column(Integer)  # 0–8 for 3x3
    card_id = Column(String, nullable=True)