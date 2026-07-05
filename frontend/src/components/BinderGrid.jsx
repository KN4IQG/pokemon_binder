function BinderGrid({ binder, onSlotClick }) {

    return (

        <div
            className="grid"
            style={{
                gridTemplateColumns: `repeat(${binder.cols}, 1fr)`
            }}
        >

            {binder.cells.map(cell => (

                <div
                    key={cell.position}
                    className="slot"
                    onClick={() => onSlotClick(cell.position)}
                >

                    {cell.card ? (

                        <div className="card-wrapper">

                            <img
                                src={cell.card.image}
                                alt={cell.card.name}
                            />

                            {cell.card.price != null && (
                                <div className="price-tag">
                                    ${cell.card.price.toFixed(2)}
                                </div>
                            )}

                        </div>

                    ) : (

                        <div className="empty">
                            Empty
                        </div>

                    )}

                </div>

            ))}

        </div>

    );

}

export default BinderGrid;