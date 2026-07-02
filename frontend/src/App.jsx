import { useEffect, useState } from "react";
import "./App.css";


function App() {
    const [binder, setBinder] = useState(null);
    const [collection,setCollection]=useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/binder/1")
            .then(res => res.json())
            .then(data => setBinder(data));
        fetch("http://127.0.0.1:8000/collection")
            .then(res=>res.json())
            .then(data=>setCollection(data));
    }, []);

    if (!binder) return <h2>Loading...</h2>;

    return (

<div className="app">

    <div className="sidebar">

        <h2>Collection</h2>

{collection.map(card=>(

<div
    key={card.card_id}
    className="collection-card"
>

<img
    src={card.image}
    alt={card.name}
/>

<div>

<b>{card.name}</b>

<br/>

x{card.quantity}

</div>

</div>

))}

    </div>

    <div className="main">

        <h1>{binder.name}</h1>

        <div
            className="grid"
            style={{
                gridTemplateColumns:`repeat(${binder.cols},1fr)`
            }}
        >

            {binder.cells.map(cell=>(

                <div key={cell.position} className="slot">

                    {cell.card ?

                    <img
                        src={cell.card.image}
                        alt={cell.card.name}
                    />

                    :

                    <div className="empty">

                        Empty

                    </div>

                    }

                </div>

            ))}

        </div>

    </div>

</div>

)
}

export default App;