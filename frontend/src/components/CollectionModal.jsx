import { useState } from "react";
import SearchPanel from "./SearchPanel";
import CollectionPanel from "./CollectionPanel";

function CollectionModal({ collection, selectedCard, onSelectCard, onDeleteCard, onUpdateCondition, onCardAdded, onClose }) {

    const [tab, setTab] = useState("collection");

    return (

        <div className="modal-overlay" onClick={onClose}>

            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header">

                    <div className="tabs">
                        <button
                            className={"tab" + (tab === "collection" ? " active" : "")}
                            onClick={() => setTab("collection")}
                        >
                            My Cards ({collection.length})
                        </button>
                        <button
                            className={"tab" + (tab === "search" ? " active" : "")}
                            onClick={() => setTab("search")}
                        >
                            Search
                        </button>
                    </div>

                    <button className="modal-close" onClick={onClose}>✕</button>

                </div>

                <div className="modal-body">

                    {tab === "collection" ? (
                        <CollectionPanel
                            collection={collection}
                            selectedCard={selectedCard}
                            onSelectCard={(card) => {
                                onSelectCard(card);
                                onClose();
                            }}
                            onDeleteCard={onDeleteCard}
                            onUpdateCondition={onUpdateCondition}
                        />
                    ) : (
                        <SearchPanel onCardAdded={onCardAdded} />
                    )}

                </div>

            </div>

        </div>

    );

}

export default CollectionModal;