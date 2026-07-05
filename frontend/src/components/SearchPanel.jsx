import { useState } from "react";
import { searchCards, addToCollection } from "../api";

function SearchPanel({ onCardAdded }) {

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSearch() {

        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const data = await searchCards(query);

            if (data.error) {
                setError(data.error);
                setResults([]);
            } else {
                setResults(data);
            }
        } catch (err) {
            setError("Search failed");
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") handleSearch();
    }

    async function handleAdd(cardId) {
        await addToCollection(cardId, 1);
        if (onCardAdded) onCardAdded();
    }

    return (

        <div>

            <h2>Search</h2>

            <input
                type="text"
                placeholder="Search Pokémon..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            <button onClick={handleSearch}>
                {loading ? "Searching..." : "Search"}
            </button>

            {error && <p className="error-text">{error}</p>}

            <div className="search-results">
                {results.map(card => (
                    <div key={card.id} className="collection-card">
                        <img src={card.image} alt={card.name} />
                        <div>
                            <b>{card.name}</b>
                            <br />
                            {card.set}
                            <br />
                            {card.price != null ? `$${card.price.toFixed(2)}` : "No price data"}
                            <br />
                            <button onClick={() => handleAdd(card.id)}>
                                Add to Collection
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>

    );

}

export default SearchPanel;