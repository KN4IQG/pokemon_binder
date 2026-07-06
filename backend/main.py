import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests

from database import engine, get_db
from models import Base


Base.metadata.create_all(bind=engine)


# Comma-separated list of allowed frontend origins, e.g.:
# ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from models import User
from models import CollectionItem
from models import Binder
from models import BinderPage
from models import BinderSlot
from auth import hash_password, verify_password, create_access_token, get_current_user


VALID_SIZES = {2, 3, 4}

TCGDEX_BASE_URL = "https://api.tcgdex.net/v2/en"


def _extract_price(card: dict):
    pricing = card.get("pricing") or {}

    tcgplayer = pricing.get("tcgplayer") or {}
    preferred_variants = ["normal", "holofoil", "reverse", "reverse-holofoil", "unlimited", "1st-edition"]

    for key in preferred_variants:
        variant = tcgplayer.get(key)
        if variant and "marketPrice" in variant:
            return variant["marketPrice"]

    for variant in tcgplayer.values():
        if isinstance(variant, dict) and "marketPrice" in variant:
            return variant["marketPrice"]

    cardmarket = pricing.get("cardmarket") or {}
    if "avg" in cardmarket:
        return cardmarket["avg"]  # note: this fallback is in EUR, not USD

    return None


class AuthRequest(BaseModel):
    username: str
    password: str


class CoverUpdate(BaseModel):
    cover_image: str


def fetch_card(card_id: str):
    res = requests.get(f"{TCGDEX_BASE_URL}/cards/{card_id}")

    if res.status_code != 200:
        return None

    card = res.json()

    image_base = card.get("image")
    image = f"{image_base}/low.webp" if image_base else None

    set_info = card.get("set") or {}

    return {
        "id": card["id"],
        "name": card["name"],
        "image": image,
        "price": _extract_price(card),
        "set": set_info.get("name")
    }


def get_owned_binder(db: Session, binder_id: int, user: User) -> Binder:
    binder = (
        db.query(Binder)
        .filter(Binder.id == binder_id, Binder.user_id == user.id)
        .first()
    )
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")
    return binder


def get_owned_page(db: Session, page_id: int, user: User) -> BinderPage:
    page = (
        db.query(BinderPage)
        .join(Binder, BinderPage.binder_id == Binder.id)
        .filter(BinderPage.id == page_id, Binder.user_id == user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Binder page not found")
    return page


@app.get("/")
def root():
    return {"message": "Pokemon Binder API is running!"}


@app.post("/auth/register")
def register(payload: AuthRequest, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})

    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login")
def login(payload: AuthRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == payload.username).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token({"sub": str(user.id)})

    return {"access_token": token, "token_type": "bearer"}


@app.get("/search-card")
def search_card(name: str):

    response = requests.get(f"{TCGDEX_BASE_URL}/cards", params={"name": name})

    if response.status_code != 200:
        return {"error": "Failed to fetch cards"}

    briefs = response.json()[:10]

    cards = []

    for brief in briefs:
        card = fetch_card(brief["id"])
        if card:
            cards.append(card)

    return cards


@app.get("/card/{card_id}")
def get_card(card_id: str):

    response = requests.get(f"{TCGDEX_BASE_URL}/cards/{card_id}")

    if response.status_code != 200:
        return {"error": "Card not found"}

    return response.json()


@app.post("/collection/add")
def add_card(
    card_id: str,
    quantity: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    item = CollectionItem(
        user_id=current_user.id,
        card_id=card_id,
        quantity=quantity
    )

    db.add(item)
    db.commit()

    return {"message": "Card added"}


@app.get("/collection")
def get_collection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    items = (
        db.query(CollectionItem)
        .filter(CollectionItem.user_id == current_user.id)
        .all()
    )

    collection = []

    for item in items:

        card = fetch_card(item.card_id)

        if card:
            collection.append({
                "card_id": item.card_id,
                "quantity": item.quantity,
                "name": card["name"],
                "image": card["image"],
                "price": card["price"]
            })

    return collection


@app.post("/binder/create")
def create_binder(
    name: str,
    size: int = 3,
    cover_image: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if size not in VALID_SIZES:
        return {"error": "size must be 2, 3, or 4"}

    binder = Binder(user_id=current_user.id, name=name, size=size, cover_image=cover_image)
    db.add(binder)
    db.commit()
    db.refresh(binder)

    page = BinderPage(
        binder_id=binder.id,
        page_number=1,
        rows=size,
        cols=size
    )
    db.add(page)
    db.commit()
    db.refresh(page)

    return {"binder_id": binder.id, "page_id": page.id}


@app.get("/binder/list")
def list_binders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    binders = db.query(Binder).filter(Binder.user_id == current_user.id).all()

    result = []

    for b in binders:

        page_count = (
            db.query(BinderPage)
            .filter(BinderPage.binder_id == b.id)
            .count()
        )

        first_page = (
            db.query(BinderPage)
            .filter(BinderPage.binder_id == b.id)
            .order_by(BinderPage.page_number)
            .first()
        )

        result.append({
            "binder_id": b.id,
            "name": b.name,
            "size": b.size,
            "cover_image": b.cover_image,
            "page_count": page_count,
            "first_page_id": first_page.id if first_page else None
        })

    return result


@app.post("/binder/{binder_id}/pages")
def add_page(
    binder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    binder = get_owned_binder(db, binder_id, current_user)

    last_page = (
        db.query(BinderPage)
        .filter(BinderPage.binder_id == binder_id)
        .order_by(BinderPage.page_number.desc())
        .first()
    )

    next_number = (last_page.page_number + 1) if last_page else 1

    page = BinderPage(
        binder_id=binder_id,
        page_number=next_number,
        rows=binder.size,
        cols=binder.size
    )

    db.add(page)
    db.commit()
    db.refresh(page)

    return {"page_id": page.id, "page_number": page.page_number}


@app.patch("/binder/{binder_id}/cover")
def update_binder_cover(
    binder_id: int,
    payload: CoverUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    binder = get_owned_binder(db, binder_id, current_user)
    binder.cover_image = payload.cover_image
    db.commit()

    return {"message": "cover updated"}


@app.delete("/binder/{binder_id}")
def delete_binder(
    binder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    binder = get_owned_binder(db, binder_id, current_user)

    page_ids = [
        p.id for p in
        db.query(BinderPage).filter(BinderPage.binder_id == binder_id).all()
    ]

    if page_ids:
        db.query(BinderSlot).filter(BinderSlot.page_id.in_(page_ids)).delete(synchronize_session=False)

    db.query(BinderPage).filter(BinderPage.binder_id == binder_id).delete(synchronize_session=False)

    db.delete(binder)
    db.commit()

    return {"message": "deleted"}


@app.get("/binder/{binder_id}/pages")
def list_binder_pages(
    binder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    get_owned_binder(db, binder_id, current_user)

    pages = (
        db.query(BinderPage)
        .filter(BinderPage.binder_id == binder_id)
        .order_by(BinderPage.page_number)
        .all()
    )

    return [{"page_id": p.id, "page_number": p.page_number} for p in pages]


@app.post("/binder/place")
def place_card(
    page_id: int,
    position: int,
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    get_owned_page(db, page_id, current_user)

    existing = (
        db.query(BinderSlot)
        .filter(
            BinderSlot.page_id == page_id,
            BinderSlot.position == position
        )
        .first()
    )

    if existing:
        existing.card_id = card_id
    else:
        slot = BinderSlot(
            page_id=page_id,
            position=position,
            card_id=card_id
        )
        db.add(slot)

    db.commit()

    return {"message": "placed"}


@app.post("/binder/page/{page_id}/sort")
def sort_binder_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Re-arranges a page's cards alphabetically by name into slot order."""

    get_owned_page(db, page_id, current_user)

    slots = (
        db.query(BinderSlot)
        .filter(BinderSlot.page_id == page_id, BinderSlot.card_id.isnot(None))
        .all()
    )

    cards = []
    for slot in slots:
        card = fetch_card(slot.card_id)
        if card:
            cards.append(card)

    cards.sort(key=lambda c: c["name"].lower())

    for slot in slots:
        db.delete(slot)
    db.commit()

    for position, card in enumerate(cards):
        db.add(BinderSlot(page_id=page_id, position=position, card_id=card["id"]))

    db.commit()

    return {"message": "sorted", "count": len(cards)}


@app.get("/binder/page/{page_id}")
def get_binder_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    page = get_owned_page(db, page_id, current_user)

    total_pages = (
        db.query(BinderPage)
        .filter(BinderPage.binder_id == page.binder_id)
        .count()
    )

    slots = db.query(BinderSlot).filter(BinderSlot.page_id == page_id).all()

    slot_map = {slot.position: slot.card_id for slot in slots}

    cells = []

    total_cells = page.rows * page.cols

    for pos in range(total_cells):

        card_id = slot_map.get(pos)

        if card_id:
            card = fetch_card(card_id)
        else:
            card = None

        cells.append({
            "position": pos,
            "card": card
        })

    return {
        "page_id": page.id,
        "binder_id": page.binder_id,
        "page_number": page.page_number,
        "total_pages": total_pages,
        "rows": page.rows,
        "cols": page.cols,
        "cells": cells
    }