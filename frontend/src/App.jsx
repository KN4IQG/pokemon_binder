import { useEffect, useState } from "react";

import "./App.css";

import BinderGrid from "./components/BinderGrid";
import CollectionPanel from "./components/CollectionPanel";
import SearchPanel from "./components/SearchPanel";
import AuthPanel from "./components/AuthPanel";
import {
    isLoggedIn,
    logout,
    getCollection,
    listBinders,
    createBinder,
    listBinderPages,
    addBinderPage,
    getBinderPage,
    placeCard,
    sortBinderPage
} from "./api";

function App() {

    const [authed, setAuthed] = useState(isLoggedIn());

    const [binders, setBinders] = useState([]);
    const [activeBinderId, setActiveBinderId] = useState(null);
    const [pages, setPages] = useState([]);
    const [page, setPage] = useState(null);

    const [collection, setCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);

    const [newName, setNewName] = useState("");
    const [newSize, setNewSize] = useState(3);

    async function refreshCollection() {
        const data = await getCollection();
        setCollection(data);
    }

    async function openPage(pageId) {
        const pageData = await getBinderPage(pageId);
        setPage(pageData);
    }

    async function openBinder(binderId) {
        setActiveBinderId(binderId);
        const pageList = await listBinderPages(binderId);
        setPages(pageList);
        if (pageList.length > 0) {
            await openPage(pageList[0].page_id);
        } else {
            setPage(null);
        }
    }

    async function refreshBinders(preferBinderId = null) {
        const list = await listBinders();
        setBinders(list);
        if (list.length > 0) {
            await openBinder(preferBinderId ?? list[0].binder_id);
        }
    }

    useEffect(() => {

        if (!authed) return;

        async function loadData() {
            try {
                await refreshCollection();
                await refreshBinders();
            } catch (error) {
                console.error(error);
            }
        }
        loadData();

    }, [authed]);

    function handleLogout() {
        logout();
        setAuthed(false);
        setBinders([]);
        setActiveBinderId(null);
        setPages([]);
        setPage(null);
        setCollection([]);
    }

    async function handleCreateBinder() {
        if (!newName.trim()) return;
        const result = await createBinder(newName, newSize);
        setNewName("");
        await refreshBinders(result.binder_id);
    }

    async function handleAddPage() {
        if (!activeBinderId) return;
        const result = await addBinderPage(activeBinderId);
        const pageList = await listBinderPages(activeBinderId);
        setPages(pageList);
        await openPage(result.page_id);
    }

    async function handleSlotClick(position) {
        if (!selectedCard || !page) return;
        await placeCard(page.page_id, position, selectedCard.card_id);
        await openPage(page.page_id);
        setSelectedCard(null);
    }

    async function handleSort() {
        if (!page) return;
        await sortBinderPage(page.page_id);
        await openPage(page.page_id);
    }

    async function handleCardAdded() {
        await refreshCollection();
    }

    function goToAdjacentPage(direction) {
        if (!page) return;
        const idx = pages.findIndex(p => p.page_id === page.page_id);
        const nextIdx = idx + direction;
        if (nextIdx >= 0 && nextIdx < pages.length) {
            openPage(pages[nextIdx].page_id);
        }
    }

    if (!authed) {
        return <AuthPanel onAuthenticated={() => setAuthed(true)} />;
    }

    const activeBinder = binders.find(b => b.binder_id === activeBinderId);
    const currentPageIndex = page ? pages.findIndex(p => p.page_id === page.page_id) : -1;

    return (

        <div className="app">

            <div className="sidebar">

                <div className="sidebar-header">
                    <button className="logout-button" onClick={handleLogout}>Log Out</button>
                </div>

                <SearchPanel onCardAdded={handleCardAdded} />

                <CollectionPanel
                    collection={collection}
                    selectedCard={selectedCard}
                    onSelectCard={setSelectedCard}
                />

                <h2>Binders</h2>

                {binders.map(b => (
                    <div
                        key={b.binder_id}
                        className={
                            "collection-card" +
                            (activeBinderId === b.binder_id ? " selected" : "")
                        }
                        onClick={() => openBinder(b.binder_id)}
                    >
                        {b.name} ({b.size}x{b.size}) — {b.page_count} page{b.page_count !== 1 ? "s" : ""}
                    </div>
                ))}

                <input
                    placeholder="New binder name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                />

                <select value={newSize} onChange={e => setNewSize(Number(e.target.value))}>
                    <option value={2}>2x2</option>
                    <option value={3}>3x3</option>
                    <option value={4}>4x4</option>
                </select>

                <button onClick={handleCreateBinder}>Create Binder</button>

            </div>

            <div className="main">

                {page ? (
                    <>
                        <h1>{activeBinder?.name}</h1>

                        {selectedCard && (
                            <p className="hint">
                                Selected: <b>{selectedCard.name}</b> — click a slot to place it
                            </p>
                        )}

                        <div className="toolbar">
                            <button onClick={handleSort}>Sort A–Z</button>
                            <button onClick={handleAddPage}>+ Add Page</button>
                        </div>

                        <div className="page-nav">
                            <button
                                onClick={() => goToAdjacentPage(-1)}
                                disabled={currentPageIndex <= 0}
                            >
                                ← Prev
                            </button>

                            <span>
                                Page {page.page_number} of {page.total_pages}
                            </span>

                            <button
                                onClick={() => goToAdjacentPage(1)}
                                disabled={currentPageIndex === -1 || currentPageIndex >= pages.length - 1}
                            >
                                Next →
                            </button>
                        </div>

                        <BinderGrid binder={page} onSlotClick={handleSlotClick} />
                    </>
                ) : (
                    <h2>Create your first binder to get started</h2>
                )}

            </div>

        </div>

    );

}

export default App;