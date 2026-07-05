import { useState } from "react";
import { login, register } from "../api";

function AuthPanel({ onAuthenticated }) {

    const [mode, setMode] = useState("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    async function handleSubmit() {

        if (!username.trim() || !password.trim()) return;

        setError(null);

        try {
            if (mode === "login") {
                await login(username, password);
            } else {
                await register(username, password);
            }
            onAuthenticated();
        } catch (err) {
            setError(err.message);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") handleSubmit();
    }

    return (

        <div className="auth-panel">

            <h1>Pokémon Binder</h1>

            <h2>{mode === "login" ? "Log In" : "Create Account"}</h2>

            <input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            {error && <p className="error-text">{error}</p>}

            <button onClick={handleSubmit}>
                {mode === "login" ? "Log In" : "Create Account"}
            </button>

            <p
                className="auth-toggle"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
                {mode === "login"
                    ? "Need an account? Register"
                    : "Already have an account? Log in"}
            </p>

        </div>

    );

}

export default AuthPanel;