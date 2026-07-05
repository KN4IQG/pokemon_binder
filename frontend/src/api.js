const API_URL = "http://127.0.0.1:8000";

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isLoggedIn() {
    return !!getToken();
}

export function logout() {
    localStorage.removeItem("token");
}

async function authFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...authHeaders()
        }
    });

    if (response.status === 401) {
        logout();
        window.location.reload();
    }

    return response;
}

export async function register(username, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Registration failed");
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    return data;
}

export async function login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Login failed");
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    return data;
}

export async function getCollection() {
    const response = await authFetch(`${API_URL}/collection`);
    if (!response.ok) throw new Error("Failed to load collection");
    return await response.json();
}

export async function searchCards(name) {
    const response = await fetch(
        `${API_URL}/search-card?name=${encodeURIComponent(name)}`
    );
    if (!response.ok) throw new Error("Failed to search cards");
    return await response.json();
}

export async function addToCollection(cardId, quantity = 1) {
    const response = await authFetch(
        `${API_URL}/collection/add?card_id=${encodeURIComponent(cardId)}&quantity=${quantity}`,
        { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to add card");
    return await response.json();
}

export async function listBinders() {
    const response = await authFetch(`${API_URL}/binder/list`);
    if (!response.ok) throw new Error("Failed to list binders");
    return await response.json();
}

export async function createBinder(name, size) {
    const response = await authFetch(
        `${API_URL}/binder/create?name=${encodeURIComponent(name)}&size=${size}`,
        { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to create binder");
    return await response.json();
}

export async function listBinderPages(binderId) {
    const response = await authFetch(`${API_URL}/binder/${binderId}/pages`);
    if (!response.ok) throw new Error("Failed to list pages");
    return await response.json();
}

export async function addBinderPage(binderId) {
    const response = await authFetch(`${API_URL}/binder/${binderId}/pages`, {
        method: "POST"
    });
    if (!response.ok) throw new Error("Failed to add page");
    return await response.json();
}

export async function getBinderPage(pageId) {
    const response = await authFetch(`${API_URL}/binder/page/${pageId}`);
    if (!response.ok) throw new Error("Failed to load binder page");
    return await response.json();
}

export async function placeCard(pageId, position, cardId) {
    const response = await authFetch(
        `${API_URL}/binder/place?page_id=${pageId}&position=${position}&card_id=${encodeURIComponent(cardId)}`,
        { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to place card");
    return await response.json();
}

export async function sortBinderPage(pageId) {
    const response = await authFetch(`${API_URL}/binder/page/${pageId}/sort`, {
        method: "POST"
    });
    if (!response.ok) throw new Error("Failed to sort page");
    return await response.json();
}