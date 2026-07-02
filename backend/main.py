from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

from database import engine
from models import Base


Base.metadata.create_all(bind=engine)



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from database import SessionLocal
from models import CollectionItem
from models import BinderPage
from models import BinderSlot


def fetch_card(card_id: str):
    url = f"https://api.pokemontcg.io/v2/cards/{card_id}"
    res = requests.get(url)

    if res.status_code != 200:
        return None

    card = res.json()["data"]

    return {
        "id": card["id"],
        "name": card["name"],
        "image": card["images"]["small"]
    }

@app.get("/")
def root():
    return {"message": "Pokemon Binder API is running!"}


@app.get("/search-card")
def search_card(name: str):

    url = f"https://api.pokemontcg.io/v2/cards?q=name:{name}"

    response = requests.get(url)

    if response.status_code != 200:
        return {"error": "Failed to fetch cards"}

    data = response.json()

    cards = []

    for card in data["data"][:10]:
        cards.append({
            "id": card["id"],
            "name": card["name"],
            "set": card["set"]["name"],
            "image": card["images"]["small"]
        })

    return cards


@app.get("/card/{card_id}")
def get_card(card_id: str):

    url = f"https://api.pokemontcg.io/v2/cards/{card_id}"

    response = requests.get(url)

    if response.status_code != 200:
        return {"error": "Card not found"}

    return response.json()["data"]

@app.post("/collection/add")
def add_card(card_id: str, quantity: int = 1):

    db = SessionLocal()

    item = CollectionItem(
        user_id=1,
        card_id=card_id,
        quantity=quantity
    )

    db.add(item)
    db.commit()

    return {"message": "Card added"}

@app.get("/collection")
def get_collection():

    db = SessionLocal()

    items = db.query(CollectionItem).all()

    collection = []

    for item in items:

        card = fetch_card(item.card_id)

        if card:
            collection.append({
                "card_id": item.card_id,
                "quantity": item.quantity,
                "name": card["name"],
                "image": card["image"]
            })

    return collection

@app.post("/binder/create")
def create_binder(name: str):

    db = SessionLocal()

    page = BinderPage(
        user_id=1,
        name=name,
        rows=3,
        cols=3
    )

    db.add(page)
    db.commit()
    db.refresh(page)

    return {"page_id": page.id}

@app.post("/binder/place")
def place_card(page_id: int, position: int, card_id: str):

    db = SessionLocal()

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

@app.get("/binder/{page_id}")
def get_binder(page_id: int):

    db = SessionLocal()

    # 1. Get page info
    page = db.query(BinderPage).filter(BinderPage.id == page_id).first()

    if not page:
        return {"error": "Binder page not found"}

    # 2. Get slots for this page
    slots = db.query(BinderSlot).filter(BinderSlot.page_id == page_id).all()

    # 3. Convert slots into lookup map
    slot_map = {slot.position: slot.card_id for slot in slots}

    # 4. Build frontend grid
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

    # 5. Return frontend-ready structure
    return {
        "page_id": page.id,
        "name": page.name,
        "rows": page.rows,
        "cols": page.cols,
        "cells": cells
    }