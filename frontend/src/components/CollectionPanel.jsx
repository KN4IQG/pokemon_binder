function CollectionPanel({ collection, selectedCard, onSelectCard }) {

    return (

        <div>

            <h2>Collection</h2>

            {collection.map(card => (

                <div
                    key={card.card_id}
                    className={
                        "collection-card" +
                        (selectedCard?.card_id === card.card_id ? " selected" : "")
                    }
                    onClick={() => onSelectCard(card)}
                >

                    <img
                        src={card.image}
                        alt={card.name}
                    />

                    <div>

                        <b>{card.name}</b>

                        <br />

                        x{card.quantity}

                        {card.price != null && (
                            <>
                                <br />
                                ${card.price.toFixed(2)}
                            </>
                        )}

                    </div>

                </div>

            ))}

        </div>

    );

}

export default CollectionPanel;