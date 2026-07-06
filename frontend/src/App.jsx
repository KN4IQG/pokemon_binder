import { useEffect, useState } from "react";

import "./App.css";

import BinderGrid from "./components/BinderGrid";
import CollectionModal from "./components/CollectionModal";
import AuthPanel from "./components/AuthPanel";
import {
    isLoggedIn,
    logout,
    getCollection,
    deleteFromCollection,
    updateCondition,
    listBinders,
    createBinder,
    updateBinderCover,
    updateBinderStyle,
    deleteBinder,
    listBinderPages,
    addBinderPage,
    getBinderPage,
    placeCard,
    removeCard,
    sortBinderPage
} from "./api";

function App() {

    const [authed, setAuthed] = useState(isLoggedIn());

    const [binders, setBinders] = useState([]);
    const [activeBinderId, setActiveBinderId] = useState(null);
    const [pages, setPages] = useState([]);

    const [coverOpen, setCoverOpen] = useState(false);
    const [spreadIndex, setSpreadIndex] = useState(0);
    const [leftPage, setLeftPage] = useState(null);
    const [rightPage, setRightPage] = useState(null);

    const [collection, setCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [artOnly, setArtOnly] = useState(false);

    const [newName, setNewName] = useState("");
    const [newSize, setNewSize] = useState(3);
    const [newCoverUrl, setNewCoverUrl] = useState("");
    const [newPageColor, setNewPageColor] = useState("#f3ecdf");
    const [newBorderColor, setNewBorderColor] = useState("#3c2a20");
    const [showNewBinderForm, setShowNewBinderForm] = useState(false);

    const [styleEditorId, setStyleEditorId] = useState(null);
    const [styleDraftPage, setStyleDraftPage] = useState("#f3ecdf");
    const [styleDraftBorder, setStyleDraftBorder] = useState("#3c2a20");

    async function refreshCollection() {
        const data = await getCollection();
        setCollection(data);
    }

    // spread 0 = [blank inside cover, page 1]
    // spread k (k >= 1) = [page 2k, page 2k+1]
    async function loadSpread(pagesList, index) {
        const leftNumber = index === 0 ? null : index * 2;
        const rightNumber = index === 0 ? 1 : index * 2 + 1;

        const leftMeta = pagesList.find(p => p.page_number === leftNumber);
        const rightMeta = pagesList.find(p => p.page_number === rightNumber);

        const [leftData, rightData] = await Promise.all([
            leftMeta ? getBinderPage(leftMeta.page_id) : Promise.resolve(null),
            rightMeta ? getBinderPage(rightMeta.page_id) : Promise.resolve(null)
        ]);

        setLeftPage(leftData);
        setRightPage(rightData);
        setSpreadIndex(index);
    }

    async function openBinder(binderId) {
        setActiveBinderId(binderId);
        const pageList = await listBinderPages(binderId);
        setPages(pageList);
        setCoverOpen(false);
        setSpreadIndex(0);
        setLeftPage(null);
        setRightPage(null);
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
        setCoverOpen(false);
        setLeftPage(null);
        setRightPage(null);
        setCollection([]);
    }

    async function handleCreateBinder() {
        if (!newName.trim()) return;
        const result = await createBinder(
            newName,
            newSize,
            newCoverUrl.trim() || null,
            newPageColor,
            newBorderColor
        );
        setNewName("");
        setNewCoverUrl("");
        setNewPageColor("#f3ecdf");
        setNewBorderColor("#3c2a20");
        setShowNewBinderForm(false);
        await refreshBinders(result.binder_id);
    }

    function openStyleEditor(binder, e) {
        e.stopPropagation();
        setShowNewBinderForm(false);
        setStyleEditorId(binder.binder_id);
        setStyleDraftPage(binder.page_color || "#f3ecdf");
        setStyleDraftBorder(binder.border_color || "#3c2a20");
    }

    async function handleSaveStyle() {
        if (!styleEditorId) return;
        await updateBinderStyle(styleEditorId, styleDraftPage, styleDraftBorder);
        const savedId = styleEditorId;
        setStyleEditorId(null);
        await refreshBinders(savedId);
    }

    async function handleChangeCover(binderId) {
        const url = window.prompt("Paste an image URL for this binder's cover:");
        if (!url) return;
        await updateBinderCover(binderId, url.trim());
        await refreshBinders(binderId);
    }

    async function handleDeleteBinder(binderId, e) {
        e.stopPropagation();

        if (!window.confirm("Delete this binder and everything in it? This can't be undone.")) {
            return;
        }

        await deleteBinder(binderId);

        if (binderId === activeBinderId) {
            setActiveBinderId(null);
            setPages([]);
            setCoverOpen(false);
            setLeftPage(null);
            setRightPage(null);
        }

        await refreshBinders();
    }

    function handleOpenCover() {
        setCoverOpen(true);
        loadSpread(pages, 0);
    }

    function handleCloseCover() {
        setCoverOpen(false);
        setLeftPage(null);
        setRightPage(null);
        setSpreadIndex(0);
    }

    function handlePrevSpread() {
        if (spreadIndex === 0) {
            handleCloseCover();
        } else {
            loadSpread(pages, spreadIndex - 1);
        }
    }

    function handleNextSpread() {
        const maxSpread = Math.ceil((pages.length - 1) / 2);
        if (spreadIndex < maxSpread) {
            loadSpread(pages, spreadIndex + 1);
        }
    }

    async function handleAddPage() {
        if (!activeBinderId) return;
        await addBinderPage(activeBinderId);
        const pageList = await listBinderPages(activeBinderId);
        setPages(pageList);
        await loadSpread(pageList, spreadIndex);
    }

    async function handleSlotClick(side, position) {
        const targetPage = side === "left" ? leftPage : rightPage;
        if (!selectedCard || !targetPage) return;
        await placeCard(targetPage.page_id, position, selectedCard.card_id);
        await loadSpread(pages, spreadIndex);
        setSelectedCard(null);
    }

    async function handleRemoveCard(side, position) {
        const targetPage = side === "left" ? leftPage : rightPage;
        if (!targetPage) return;
        await removeCard(targetPage.page_id, position);
        await loadSpread(pages, spreadIndex);
    }

    async function handleSortSide(side) {
        const targetPage = side === "left" ? leftPage : rightPage;
        if (!targetPage) return;
        await sortBinderPage(targetPage.page_id);
        await loadSpread(pages, spreadIndex);
    }

    async function handleCardAdded() {
        await refreshCollection();
    }

    async function handleDeleteCard(itemId) {
        await deleteFromCollection(itemId);
        await refreshCollection();
    }

    async function handleUpdateCondition(itemId, condition) {
        await updateCondition(itemId, condition);
        await refreshCollection();
        if (coverOpen) await loadSpread(pages, spreadIndex);
    }

    if (!authed) {
        return <AuthPanel onAuthenticated={() => setAuthed(true)} />;
    }

    const activeBinder = binders.find(b => b.binder_id === activeBinderId);
    const maxSpread = Math.ceil((pages.length - 1) / 2);

    return (
        <>
        <div className="app">

            <header className="topbar">
                <div className="topbar-brand">
                    <span className="brand-icon">🗂️</span>
                    <h1 className="brand-title">Pokémon Binder</h1>
                </div>

                <div className="topbar-actions">
                    {selectedCard && (
                        <p className="hint topbar-hint">
                            Selected: <b>{selectedCard.name}</b> — click a slot to place it
                        </p>
                    )}

                    <button
                        className="open-collection-button"
                        onClick={() => setShowCollectionModal(true)}
                    >
                        📚 Collection ({collection.length})
                    </button>

                    <button className="logout-button" onClick={handleLogout}>Log Out</button>
                </div>
            </header>

            <div className="binder-shelf">
                <div className="binder-shelf-scroll">

                    {binders.map(b => (
                        <div
                            key={b.binder_id}
                            className={
                                "binder-tile" +
                                (activeBinderId === b.binder_id ? " selected" : "")
                            }
                            onClick={() => openBinder(b.binder_id)}
                        >
                            <div
                                className="binder-cover"
                                style={!b.cover_image ? { background: b.border_color || undefined } : undefined}
                            >
                                {b.cover_image ? (
                                    <img src={b.cover_image} alt={b.name} />
                                ) : (
                                    <span>📁</span>
                                )}
                            </div>

                            <div className="binder-info">
                                <b>{b.name}</b>
                                {b.size}x{b.size} — {b.page_count} page{b.page_count !== 1 ? "s" : ""}
                            </div>

                            <div className="binder-actions">
                                <button onClick={(e) => { e.stopPropagation(); handleChangeCover(b.binder_id); }}>
                                    Cover
                                </button>
                                <button onClick={(e) => openStyleEditor(b, e)}>
                                    Style
                                </button>
                                <button
                                    className="delete-button"
                                    onClick={(e) => handleDeleteBinder(b.binder_id, e)}
                                >
                                    Delete
                                </button>
                            </div>

                            {styleEditorId === b.binder_id && (
                                <div className="binder-popover style-popover" onClick={(e) => e.stopPropagation()}>
                                    <label className="color-field">
                                        Page color
                                        <input
                                            type="color"
                                            value={styleDraftPage}
                                            onChange={e => setStyleDraftPage(e.target.value)}
                                        />
                                    </label>

                                    <label className="color-field">
                                        Border color
                                        <input
                                            type="color"
                                            value={styleDraftBorder}
                                            onChange={e => setStyleDraftBorder(e.target.value)}
                                        />
                                    </label>

                                    <div className="popover-buttons">
                                        <button onClick={() => setStyleEditorId(null)}>Cancel</button>
                                        <button onClick={handleSaveStyle}>Save</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div
                        className="binder-tile new-binder-tile"
                        onClick={() => setShowNewBinderForm(v => !v)}
                    >
                        + New Binder
                    </div>

                </div>

                {showNewBinderForm && (
                    <div className="binder-popover new-binder-popover">
                        <input
                            placeholder="New binder name"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />

                        <input
                            placeholder="Cover image URL (optional)"
                            value={newCoverUrl}
                            onChange={e => setNewCoverUrl(e.target.value)}
                        />

                        <select value={newSize} onChange={e => setNewSize(Number(e.target.value))}>
                            <option value={2}>2x2</option>
                            <option value={3}>3x3</option>
                            <option value={4}>4x4</option>
                        </select>

                        <div className="color-row">
                            <label className="color-field">
                                Page color
                                <input
                                    type="color"
                                    value={newPageColor}
                                    onChange={e => setNewPageColor(e.target.value)}
                                />
                            </label>

                            <label className="color-field">
                                Border color
                                <input
                                    type="color"
                                    value={newBorderColor}
                                    onChange={e => setNewBorderColor(e.target.value)}
                                />
                            </label>
                        </div>

                        <button onClick={handleCreateBinder}>Create Binder</button>
                    </div>
                )}
            </div>

            <div className="main">

                {activeBinder ? (
                    <>
                        <h1>{activeBinder.name}</h1>

                        {!coverOpen ? (

                            <div
                                className="binder-viewport closed"
                                style={{
                                    "--page-color": activeBinder.page_color || "#f3ecdf",
                                    "--border-color": activeBinder.border_color || "#3c2a20"
                                }}
                            >

                                <div
                                    className="binder-cover-face"
                                    style={activeBinder.cover_image ? { backgroundImage: `url(${activeBinder.cover_image})` } : {}}
                                >
                                    {!activeBinder.cover_image && <span className="cover-placeholder">📁</span>}
                                </div>

                                <button className="open-cover-button" onClick={handleOpenCover}>
                                    Open Binder →
                                </button>

                            </div>

                        ) : (

                            <>
                                <div className="toolbar">
                                    <button onClick={handleAddPage}>+ Add Page</button>
                                    <button onClick={() => setArtOnly(!artOnly)}>
                                        {artOnly ? "Show Info" : "Art Only"}
                                    </button>
                                </div>

                                <div
                                    className="binder-viewport open"
                                    style={{
                                        "--page-color": activeBinder.page_color || "#f3ecdf",
                                        "--border-color": activeBinder.border_color || "#3c2a20"
                                    }}
                                >

                                    <button className="page-arrow left-arrow" onClick={handlePrevSpread}>
                                        {spreadIndex === 0 ? "✕" : "←"}
                                    </button>

                                    <div className="binder-spread">

                                        <div className="binder-half">
                                            {leftPage ? (
                                                <>
                                                    <div className="half-label">Page {leftPage.page_number}</div>
                                                    <BinderGrid
                                                        binder={leftPage}
                                                        onSlotClick={(pos) => handleSlotClick("left", pos)}
                                                        onRemoveCard={(pos) => handleRemoveCard("left", pos)}
                                                        artOnly={artOnly}
                                                    />
                                                    {!artOnly && (
                                                        <button className="sort-button" onClick={() => handleSortSide("left")}>
                                                            Sort A–Z
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="blank-panel" />
                                            )}
                                        </div>

                                        <div className="binder-spine">
                                            <div className="spine-ring" />
                                            <div className="spine-ring" />
                                            <div className="spine-ring" />
                                        </div>

                                        <div className="binder-half">
                                            {rightPage ? (
                                                <>
                                                    <div className="half-label">Page {rightPage.page_number}</div>
                                                    <BinderGrid
                                                        binder={rightPage}
                                                        onSlotClick={(pos) => handleSlotClick("right", pos)}
                                                        onRemoveCard={(pos) => handleRemoveCard("right", pos)}
                                                        artOnly={artOnly}
                                                    />
                                                    {!artOnly && (
                                                        <button className="sort-button" onClick={() => handleSortSide("right")}>
                                                            Sort A–Z
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="blank-panel add-page-panel" onClick={handleAddPage}>
                                                    + Add Page
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                    <button
                                        className="page-arrow right-arrow"
                                        onClick={handleNextSpread}
                                        disabled={spreadIndex >= maxSpread}
                                    >
                                        →
                                    </button>

                                </div>
                            </>

                        )}
                    </>
                ) : (
                    <h2>Create your first binder to get started</h2>
                )}

            </div>

        </div>

        {showCollectionModal && (
            <CollectionModal
                collection={collection}
                selectedCard={selectedCard}
                onSelectCard={setSelectedCard}
                onDeleteCard={handleDeleteCard}
                onUpdateCondition={handleUpdateCondition}
                onCardAdded={handleCardAdded}
                onClose={() => setShowCollectionModal(false)}
            />
        )}
        </>
    );

}

export default App;