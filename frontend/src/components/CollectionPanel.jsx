function CollectionPanel({ collection, selectedCard, onSelectCard, onDeleteCard }) {

    return (

        <div>

            {collection.length === 0 && (
                <p className="empty-hint">No cards yet — search for some to add them.</p>
            )}

            {collection.map(card => (

                <div
                    key={card.item_id}
                    className={
                        "collection-card" +
                        (selectedCard?.item_id === card.item_id ? " selected" : "")
                    }
                    onClick={() => onSelectCard(card)}
                >

                    <img
                        src={card.image}
                        alt={card.name}
                    />

                    <div className="collection-card-info">

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

                    <button
                        className="delete-button small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCard(card.item_id);
                        }}
                    >
                        ×
                    </button>

                </div>

            ))}

        </div>

    );

}

export default CollectionPanel;